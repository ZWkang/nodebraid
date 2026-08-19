---
title: '@cflow/runtime-cordis'
description: CFlow-owned Plugin Host, Runtime Service, and Installation lifecycle.
---

# `@cflow/runtime-cordis`

`@cflow/runtime-cordis` provides an isolated Plugin Host for each Canvas Runtime. It connects Plugins with strongly typed Service Tokens, drives Activation through Runtime Service availability, and gives every resource a clear, awaitable release boundary.

Cordis exists only inside the package implementation. The public entry points use CFlow's own terminology and types exclusively.

::: warning Package is not publicly released
This name identifies the current source module boundary; it does not mean the package can be installed from npm. Follow the [Quick Start](/en/guide/quick-start) to verify it from source.
:::

## The problem it solves

Canvas capabilities have both dependencies and independent lifecycles. Without introducing a global Service locator, CFlow needs to answer:

- What state should a consumer be in while a Required Service is unavailable?
- How should dependents activate, deactivate, and reactivate as a Provider appears or disappears?
- How should a failed Plugin Setup roll back resources created during the current Activation?
- How do multiple Plugins prevent Service conflicts and dependency cycles?
- How does an entire Canvas Runtime perform asynchronous, idempotent disposal?

## When to use it

- Ordinary applications usually use this API through `@cflow/core`.
- Infrastructure and advanced integrations can depend directly on this narrow package when they need only the Plugin Runtime.
- New Runtime Plugins use it to declare Required Services, Provided Services, and Owned Resources statically.

It is not a Document or editor Runtime. Kernel, Command, Session, and other capabilities still require their corresponding Plugins to be installed.

## What it provides

- `defineService()` creates a strongly typed Service Token whose identity is independent from its human-readable diagnostic name.
- `definePlugin()` fixes the `requires`, `provides`, and `setup` contract.
- `createPluginHost()` creates an isolated and initially empty Plugin Host.
- `PluginContext.services` provides access to statically declared Required Services.
- `PluginContext.own()` registers an Owned Resource that is released with the current Activation.
- `PluginContext.install()` creates a Child Installation released with its parent Activation.
- `PluginInstallation` exposes stable Snapshots, state subscriptions, waiting for active, and explicit disposal.
- Optional Host-scoped `DiagnosticSink` and `FaultReporter` boundaries observe structured lifecycle events and Faults that cannot be returned to a caller.

## Dependencies and composition

```text
Plugin A provides Service Token
              │
              ▼
Plugin B requires Service Token ──▶ Activation
```

Plugins declare Service Bindings statically when they are defined. The first version has no Optional Services and no dynamic `get()` or `provide()`. Within one Host, only one Plugin Installation can reserve a Service Token at a time. The Token remains reserved from installation until that Installation is disposed; becoming `pending` or `failed` does not automatically release it to another Provider.

The Plugin Graph must remain acyclic. Dependents deactivate before their Providers. Independent Installations can activate concurrently, but setup and cleanup are serialized within each Installation.

This package depends directly on `@cflow/diagnostics` and uses a pinned Cordis lifecycle implementation internally. It does not depend on `@cflow/core`.

## Public entry points

| Category                  | Public entry points                                                            |
| ------------------------- | ------------------------------------------------------------------------------ |
| Creation functions        | `createPluginHost`, `definePlugin`, `defineService`                            |
| Host and Plugin           | `PluginHost`, `Plugin`, `PluginDefinition`, `PluginContext`                    |
| Service                   | `ServiceToken`, `ServiceTokenBase`, `ServiceBindings`, `BoundServices`         |
| Installation              | `PluginInstallation`, `InstallationSnapshot`, and four state Snapshot variants |
| Lifecycle helpers         | `Awaitable`, `OwnedResourceDisposer`                                           |
| Diagnostics configuration | `PluginHostOptions`, `PluginHostDiagnosticsOptions`, `runtimeDiagnosticEvents` |
| Structural errors         | `PluginHostError` and its code/details types                                   |

The public interface contains no Cordis Context, Fiber, Service, effect, or other Cordis type.

## Lifecycle and error semantics

### Installation states

```text
install() ─▶ pending ─▶ active
               ▲          │
               └──────────┘ cleanup completes after a Required Service disappears;
                            the Installation may activate again

pending/active ─▶ failed   setup or contract failure; terminal for this Installation
pending/active/failed ─▶ disposed   terminal after explicit disposal
```

- `install()` returns an Installation immediately. When a Required Service is missing, its Snapshot is `pending` and lists the missing Tokens.
- Once every Required Service is available, a new Activation begins. `setup` may be asynchronous and receives an `AbortSignal` that fires on deactivation or disposal.
- After `setup` succeeds, declared Provided Services are published once and atomically. Missing, extra, or invalid return values fail the Activation without publishing partial results.
- When an active Installation loses a dependency, the Host cleans up dependents before the Provider. If dependencies return later, a completely new Activation state is created from the fixed installation configuration.
- `failed` does not retry implicitly. The caller must dispose and install again.
- `dispose()` is asynchronous and idempotent. No Plugin can be installed after the Host finishes disposing.

### Owned Resources and waiting

Owned Resources are released in reverse registration order. If one disposer fails, the others still run, and the final `AggregateError` retains every failure and aggregation stage.

`whenActive()` completes immediately while active, waits for the next active state while pending, and rejects while failed or disposed. A Signal passed to `whenActive(signal)` cancels only that waiter; it does not alter the Installation lifecycle.

### Errors and diagnostics

Structural failures owned by the Plugin Host use `PluginHostError`, with a stable identity of `domain = "runtime.plugin-host"` plus one of these codes:

- `HOST_DISPOSED`
- `INSTALLATION_DISPOSED`
- `CONTRACT_VIOLATION`
- `PROVIDER_CONFLICT`
- `DEPENDENCY_CYCLE`
- `INVALID_DEFINITION`

Business errors thrown by Plugin Setup retain their original object identity and are not wrapped uniformly. Multiple cleanup failures use `AggregateError`.

The Diagnostic Sink is a synchronous, observational outlet. Successfully delivering an event cannot consume a throw or rejection and cannot change Installation state. A failure in the Sink or Fault Reporter itself is exposed explicitly through an independent Fault path instead of being written recursively into the same failing outlet.

## Limitations and non-goals

- The Host starts empty and does not install any Canvas capability implicitly.
- Does not own Document, Kernel, Command, Session, History, Layout, or Renderer.
- Does not provide Optional Services, dynamic Service lookup, dynamic provide, or a global Registry.
- Does not allow Service Provider conflicts or cycles in the Plugin Graph within one Host.
- Does not own persistence, restoration, configuration schemas, or business configuration validation.
- Does not participate in high-frequency canvas paths such as dragging, hit testing, or frame-by-frame rendering.
- Does not provide a logging system. The host Adapter owns Diagnostics output, upload, filtering, and storage.
- Does not expose Cordis types or require consumers to understand Cordis lifecycle objects.

## Verification evidence

- `packages/runtime-cordis/tests/index.test.ts` covers Service Token identity, static Bindings, `pending`/`active`/`failed`/`disposed`, Provider reservation, dependency ordering, reactivation, Child Installations, concurrent Activation, and idempotent cleanup.
- The same suite verifies dependency cycles, Provider conflicts, atomic publication of Provided Services, original Setup failures, and aggregation of multiple cleanup failures.
- `packages/runtime-cordis/tests/diagnostics.test.ts` verifies Host-scoped immutable events, the synchronous Sink, Fault isolation, and ordering between events and Snapshots.
- `packages/runtime-cordis/tests/error-contract.test.ts` verifies that `PluginHostError` extends the shared `CFlowError` contract.
