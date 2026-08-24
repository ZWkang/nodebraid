---
title: '@nodebraid/diagnostics'
description: NodeBraid's structured errors, immutable Diagnostic Events, and safe error-description contract.
---

# `@nodebraid/diagnostics`

`@nodebraid/diagnostics` is a side-effect-free leaf package with zero runtime dependencies. It standardizes structural error identity, Diagnostic Event data contracts, and safe description functions across NodeBraid modules while leaving all output and persistence to the host.

::: warning Package is not publicly released
This name identifies the current source module boundary; it does not mean the package can be installed from npm. Follow the [Quick Start](/en/guide/quick-start) to verify it from source.
:::

## The problem it solves

If every package defines its own error shape and event payload, callers cannot classify failures reliably or convert an unknown Error into serializable data safely. `@nodebraid/diagnostics` provides one narrow seam that every pure module and Runtime Plugin can depend on downward:

- NodeBraid structural errors use a stable `domain + code` identity;
- details and event attributes can contain only safe, immutable Diagnostic Values;
- native Errors, AggregateErrors, and unknown thrown values can be described deterministically;
- Diagnostic Sinks and Fault Reporters share one Host-scoped event envelope.

## When to use it

- Define domain-specific structural errors in a NodeBraid package.
- Receive, describe, and forward Diagnostic Events from a Host Adapter.
- Convert unknown failures into safe JSON-ready descriptions before a process or transport boundary.
- Branch on `NodeBraidError.domain` and `code` instead of error message text.

Ordinary applications can use the same re-exports through `@nodebraid/core`. Depending on this package directly is appropriate for lower-level modules that need to preserve zero Runtime dependencies.

## What it provides

- `NodeBraidError`: the generic base class for every NodeBraid structural error, carrying `domain`, `code`, immutable details, and an optional cause.
- `DiagnosticsError`: structural failures in the diagnostics protocol itself.
- `DiagnosticEvent`, `DiagnosticEventInput`, and `DiagnosticScope`: immutable event envelopes and input contracts.
- `DiagnosticSink` and `FaultReporter`: synchronous boundaries through which the host takes over events and Faults.
- `PluginDiagnostics`: the narrow Plugin-side `emit()` and `reportFault()` interface.
- `normalizeDiagnosticAttributes()`: copies, validates, and recursively freezes Diagnostic attributes.
- `describeError()`: produces a JSON-ready description while preserving NodeBraid Error, native Error, AggregateError, cause, and cyclic-reference semantics.
- `describeDiagnosticEvent()`: preserves the event envelope while replacing the original error with a safe description.
- `describeNonFiniteNumber()`: provides one diagnostic representation for `NaN` and positive or negative infinity.
- `diagnosticEvents`: a stable, searchable catalog of Diagnostics-owned event names.

## Dependencies and composition

```text
Kernel / Layout API / Providers ──▶ @nodebraid/diagnostics
Runtime Host / Runtime Plugins ───▶ @nodebraid/diagnostics
@nodebraid/core ─────────────────────▶ re-export only
Host Adapter ◀─────────────────── DiagnosticSink / FaultReporter
```

This package has no runtime dependencies and does not depend on the Plugin Host. Pure computation packages can create and throw structural errors only. The Plugin Host and Runtime Plugins produce events at lifecycle, listener-isolation, or cleanup boundaries that they own. Host, Installation, Activation, Plugin, sequence, and time context are completed by the Runtime rather than guessed by this leaf package.

## Public entry points

| Category          | Public entry points                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Errors            | `NodeBraidError`, `NodeBraidErrorOptions`, `DiagnosticsError`, `DiagnosticsErrorCode`                                         |
| Diagnostic values | `DiagnosticValue`, `DiagnosticAttributes`, `normalizeDiagnosticAttributes`, `DiagnosticValueError`, `describeNonFiniteNumber` |
| Events            | `DiagnosticEvent`, `DiagnosticEventInput`, `DiagnosticScope`, `DiagnosticLevel`, `diagnosticEvents`                           |
| Host boundary     | `DiagnosticSink`, `FaultReporter`, `DiagnosticFault`, `PluginDiagnostics`                                                     |
| Safe descriptions | `describeError`, `describeDiagnosticEvent`, and their corresponding description types                                         |

The package has one public subpath: `@nodebraid/diagnostics`.

## Lifecycle and error semantics

This package has no Host, Plugin Installation, or background-task lifecycle of its own. Validation and description functions are synchronous.

### Structural errors

The cross-package identity of a `NodeBraidError` is `domain + code`. The Error `name` identifies only the concrete class, while the message is human-readable text rather than protocol identity. Details are recursively copied and frozen and accept only:

- `null`, boolean, string, and finite number values;
- arrays of those values;
- plain records with string keys and data properties only.

Accessors, Symbol keys, functions, class instances, cyclic references, and non-finite numbers fail explicitly at the precise offending path. One downstream reason is stored as `cause`; multiple peer failures remain hierarchical in `AggregateError.errors` and are not flattened by default.

External failures such as user Callbacks, Plugin Setup, Command Handlers, Providers, and Abort reasons are never forced into `NodeBraidError`. `describeError()` creates only an out-of-band description; it does not change the original object or propagation semantics.

### Diagnostic Events and Faults

A Diagnostic Event is immutable, in-process observational data. A `DiagnosticSink` receives events synchronously; asynchronous upload, batching, or disk writes must be scheduled by the Adapter behind the Sink. A Fault that cannot be returned through a call result is also passed to the `FaultReporter`. Successfully writing to the Sink does not mean the Fault has been handled.

Diagnostic Events do not replace throws or rejections, and constructing or rethrowing an error does not emit one automatically. The Runtime should record an event once, at the semantic boundary where it owns the failure or state transition.

## Limitations and non-goals

- Is not a logger and does not call the console.
- Does not write files, use the network, or integrate with Sentry or OpenTelemetry.
- Does not provide filtering, sampling, retries, batching, queues, or persistence.
- Does not expose Diagnostic Events as a Runtime Service or create a global mutable diagnostics object.
- Does not consume, replace, or alter the object identity or control flow of an original failure.
- Does not define severity, retryability, HTTP status, or transport policy on errors.
- Does not allow attributes or details to carry Plugin configuration, Runtime Services, Node or Edge business data, or arbitrary objects.

## Verification evidence

- `packages/diagnostics/tests/index.test.ts` verifies stable event names, safe-value validation, recursive freezing, `domain + code`, cause and AggregateError trees, cyclic references, and JSON-ready descriptions.
- `packages/diagnostics/tests/types.test.ts` verifies readonly Diagnostic Event types and the fixed error-level contract of `PluginDiagnostics.reportFault()`.
- `packages/diagnostics/tests/package-import.test.ts` verifies that a built package can expose `NodeBraidError` through its package name.
- Declaration isolation checks verify that the package's public types remain independent outside a workspace and confirm that it has no runtime dependencies.
