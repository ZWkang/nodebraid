---
title: '@nodebraid/plugin-kernel'
description: Expose the pure Kernel as a narrow Runtime Service and propagate Canvas Commits in revision order.
---

# `@nodebraid/plugin-kernel`

::: warning Package is not publicly released
This name identifies the current source module boundary; it does not mean the package can be installed from npm. Follow the [Quick Start](/en/guide/quick-start) to verify it from source.
:::

`@nodebraid/plugin-kernel` is the delivered Kernel Runtime adapter. It creates an independent Kernel for every Plugin Activation and lets other Plugins use the authoritative Document only through `KernelService`.

::: info Current status
Implemented and re-exported by the `@nodebraid/core` facade. It is not a placeholder for future work and does not expose a bare `CanvasKernel` to Runtime Consumers.
:::

## The problem it solves

The pure Kernel should not know about the Plugin Host, but a Canvas Runtime still needs to manage Kernel creation, Service publication, dependency withdrawal, and Commit propagation. This adapter places lifecycle and observation responsibilities outside the Kernel while keeping the Runtime Consumer interface narrow.

## When to use it

- Create an active canvas isolated by a Plugin Host.
- Let Feature Plugins read or modify the Document through a statically declared Required Service.
- Let Session, History, Layout, or Renderer Runtime Plugins receive complete Canvas Commits in revision order.
- Deactivate Consumers before closing old Service handles when the Kernel Provider disappears.
- Isolate Observer failures without rolling back a successful Kernel Transaction.

## What it provides

- `kernelPlugin`: the configuration-free official Runtime Plugin that provides `kernelService`.
- `kernelService`: the strongly typed Service Token declared by Consumers in `requires`.
- `KernelService.read()`: reads the current revision-bound Canvas View.
- `KernelService.transact()`: runs a synchronous Transaction and returns `CanvasCommit | null`.
- `KernelService.observeCommits()`: observes successful net-change Commits synchronously and returns an unsubscribe function.
- `KernelPluginError`: a stable `SERVICE_DISPOSED` error for old Service handles.
- `kernelPluginDiagnosticEvents`: exposes the stable `nodebraid.plugin.kernel.observer.fault` event name.

## Dependencies and composition

`@nodebraid/plugin-kernel` depends directly on:

- `@nodebraid/kernel` to create and operate the pure Kernel;
- `@nodebraid/runtime-cordis` for the NodeBraid-owned Plugin Host, Service Token, and Activation seam;
- `@nodebraid/diagnostics` for the shared Observer-fault diagnostics contract.

It does not depend on `@nodebraid/core`. A Consumer receives `KernelService` through a local Service Binding. [`@nodebraid/plugin-session`](/en/modules/plugin-session) is one official Consumer that statically requires `kernelService`.

## Public entry points

```ts
import {
  kernelPlugin,
  kernelPluginDiagnosticEvents,
  KernelPluginError,
  kernelService,
  type CommitObserver,
  type KernelService,
} from '@nodebraid/plugin-kernel';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

const consumer = definePlugin({
  requires: { kernel: kernelService },
  setup(context) {
    const stop = context.services.kernel.observeCommits((commit) => {
      console.log(commit.changeSet.revision);
    });
    context.own(stop);
  },
});

const host = createPluginHost();
try {
  const installations = [host.install(kernelPlugin), host.install(consumer)];
  await Promise.all(installations.map((installation) => installation.whenActive()));
} finally {
  await host.dispose();
}
```

## State and lifecycle semantics

- `kernelPlugin` has no Required Services and accepts no configuration. Every Activation creates a fresh revision-zero Kernel.
- A `KernelService` has the same lifetime as its current Activation. Release authority belongs to the Plugin Host, not to Service Consumers.
- Only successful Transactions with a net change reach Observers. Failed and net-zero Transactions publish no Commit.
- Commits are delivered synchronously in local revision order. If an Observer starts a new Transaction while processing revision N, that Commit is queued so every current Observer sees N before N+1.
- One Observer throwing does not roll back the Kernel, prevent later Observers, or truncate the Commit queue. The Fault goes to Host-scoped diagnostics with the commit revision.
- When an Activation ends, Observers are cleared. `read()`, `transact()`, and `observeCommits()` on the old Service all fail with `KernelPluginError/SERVICE_DISPOSED`.
- A new Kernel Installation produces a new Service and a completely fresh revision-zero Document. Graph state from an old Activation is not inherited.

## Limitations and non-goals

- Does not expose the underlying `CanvasKernel` or provide dynamic Service lookup.
- Does not provide asynchronous Transactions, Commit-buffer replay, event persistence, or cross-Runtime broadcast.
- Observers are not History, a domain event bus, or a remote synchronization protocol. They propagate complete local Canvas Commit evidence.
- Observer failures produce diagnostics and Fault reports; they are not swallowed as “success” and do not change committed state.
- Does not install Session, Command, History, Layout, or Renderer. Canvas Composition must select those Plugins explicitly.

## Verification evidence

- [Public exports](https://github.com/ZWkang/nodebraid/blob/main/packages/plugin-kernel/src/index.ts) confirm that the module currently provides the Plugin, Service Token, error, and diagnostic event.
- [Runtime implementation](https://github.com/ZWkang/nodebraid/blob/main/packages/plugin-kernel/src/kernel-plugin.ts) shows that each Activation creates a pure Kernel and owns the Commit queue and Observers inside the adapter.
- [Public-seam behavior tests](https://github.com/ZWkang/nodebraid/blob/main/packages/plugin-kernel/tests/index.test.ts) cover the revision-zero Service, net-change filtering, reentrant ordering, Observer Faults, and a fresh Kernel after dependency recovery.
- ADR-0013 identifies `@nodebraid/plugin-kernel` as the chosen narrow Kernel Runtime Service seam.
