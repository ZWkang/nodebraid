---
title: '@nodebraid/plugin-session'
description: A Session Runtime Plugin that manages local Selection and Viewport while keeping them consistent with the current Kernel View.
---

# `@nodebraid/plugin-session`

::: warning Package is not publicly released
This name identifies the current source module boundary; it does not mean the package can be installed from npm. Follow the [Quick Start](/en/guide/quick-start) to verify it from source.
:::

`@nodebraid/plugin-session` provides a local Session for one active Canvas Runtime. It does not modify the Document; it manages only the current Selection and Viewport and removes selections that no longer exist after a Kernel Commit.

::: info Current status
Implemented and re-exported by the `@nodebraid/core` facade. It depends on the current Kernel Service and is not an independent global UI Store.
:::

## The problem it solves

Selection and Viewport change frequently, but they should not enter Document History, Persistence, or Collaboration. At the same time, every Selection must remain resolvable against the current Document. The Session Plugin creates a one-way coordination boundary between local view state and the authoritative Kernel View.

## When to use it

- Provide subscribable Selection and Viewport state to a Renderer, Interaction capability, or framework adapter.
- Remove invalid Selection automatically after a Node or Edge is deleted, without creating a second Kernel Commit.
- Keep Snapshot references stable for equivalent inputs, supporting external-store Consumers such as React.
- Handle reentrant Session mutations or Kernel Transactions from subscribers predictably.
- Deactivate and rebuild the Session with the Kernel Provider lifecycle.

## What it provides

- `sessionPlugin`: a configuration-free Runtime Plugin that statically requires `kernelService` and provides `sessionService`.
- `sessionService`: the strongly typed Runtime Service Token.
- `SessionService.getSnapshot()`: reads the current immutable Session Snapshot.
- `SessionService.subscribe()`: subscribes to state transitions; listeners read the current value through `getSnapshot()`.
- `setSelection()` / `clearSelection()`: replace or clear Selection.
- `setViewport()`: replaces and validates Viewport.
- `SelectionInput`: caller mutation input; Snapshot value types are re-exported from `@nodebraid/session-api`.
- `SessionError`: stable codes for input, entity, subscriber, and disposed errors.
- `sessionDiagnosticEvents`: exposes the `nodebraid.plugin.session.subscriber.fault` event name.

## Dependencies and composition

The Plugin Graph relationship of `sessionPlugin` is explicit:

```text
kernelPlugin ──provides──▶ kernelService
                                  ▲
                                  │ requires
                            sessionPlugin ──provides──▶ sessionService
```

The package depends directly on `@nodebraid/session-api`, `@nodebraid/kernel`, `@nodebraid/plugin-kernel`, `@nodebraid/runtime-cordis`, and `@nodebraid/diagnostics`. It does not depend on Command, History, Renderer, or `@nodebraid/core`.

## Public entry points

```ts
import { kernelPlugin } from '@nodebraid/plugin-kernel';
import {
  sessionDiagnosticEvents,
  SessionError,
  sessionPlugin,
  sessionService,
  type SelectionInput,
  type SessionService,
} from '@nodebraid/plugin-session';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

const consumer = definePlugin({
  requires: { session: sessionService },
  setup(context) {
    const stop = context.services.session.subscribe(() => {
      console.log(context.services.session.getSnapshot());
    });
    context.own(stop);
  },
});

const host = createPluginHost();
try {
  const installations = [host.install(kernelPlugin), host.install(sessionPlugin), host.install(consumer)];
  await Promise.all(installations.map((installation) => installation.whenActive()));
} finally {
  await host.dispose();
}
```

## State and lifecycle semantics

- `sessionPlugin` activates after `kernelService` becomes available. Every Activation starts with an empty Selection and `{ x: 0, y: 0, zoom: 1 }`.
- `setSelection()` validates input shape, deduplicates and sorts by canonical ID, then validates every Node and Edge against the current Canvas View. If any entity is unknown, the entire call is rejected and the Snapshot remains unchanged.
- Kernel Commit reconciliation uses the `after` View carried by that Commit. It never rereads a Kernel that may already have advanced and does not create another Change Set or History entry.
- `setViewport()` requires finite x/y values and a finite positive zoom, and normalizes `-0` to `0`. It does not add silent minimum or maximum zoom limits.
- An equivalent Selection or Viewport does not replace the Snapshot or notify subscribers. When only one part changes, the unchanged child Snapshot keeps its original reference.
- Each transition freezes the current subscriber set for that round. Reentrant mutations and Kernel reconciliation during notification enter a FIFO breadth-first queue, so every subscriber reads the same Snapshot before the next round begins.
- Each `subscribe()` call owns an independent, idempotent unsubscribe function, even when several subscriptions use the same listener.
- A subscriber throwing does not corrupt the Session or prevent later subscribers. The Fault goes to Host-scoped diagnostics.
- When the Kernel Provider disappears, the Session Activation ends and old Service handles fail with `SessionError/SERVICE_DISPOSED`. A recovered Kernel creates a completely fresh default Session.

## Limitations and non-goals

- Session state is not the Document, owns no Node or Edge, and cannot bypass Kernel Transactions to write the graph.
- Session state does not enter History, Persistence, or Collaboration. A new Activation does not restore old Selection or Viewport state.
- The first version of Selection has no primary item, selection ordering, preselection, hover, or cross-Document preselection.
- Viewport defines no product-level minimum or maximum zoom and does not own device pixel ratio, a Renderer backing store, or coordinate conversion helpers.
- The Service has no generic patch/batch update, asynchronous listener, or lifecycle disposal method; the Plugin Host owns lifecycle.
- Does not include Renderer, Interaction, Command, keyboard shortcuts, or tool state.

## Verification evidence

- [Public exports](https://github.com/ZWkang/nodebraid/blob/main/packages/plugin-session/src/index.ts) confirm that the Plugin, Service Token, Snapshot types, errors, and diagnostic events are all published.
- [Session Runtime implementation](https://github.com/ZWkang/nodebraid/blob/main/packages/plugin-session/src/session-plugin.ts) contains input validation, Kernel Commit reconciliation, reference stability, and the breadth-first transition queue.
- [Public-seam behavior tests](https://github.com/ZWkang/nodebraid/blob/main/packages/plugin-session/tests/index.test.ts) cover the default Session, canonical Selection, Viewport, reentrant ordering, subscriber Faults, and Provider recovery.
- ADR-0017, 0018, 0022, and 0035 establish the binding between Selection and Kernel View, logical screen units, breadth-first notifications, and the independent value contract.
