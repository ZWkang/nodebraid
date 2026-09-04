---
title: '@nodebraid/adapter-react'
description: Bind an application Runtime Factory to a React Target lifecycle and project stable Snapshots.
---

# `@nodebraid/adapter-react`

::: warning Package is not publicly released
This name describes the current source-module boundary; it does not mean the package can be installed from npm. Follow the source-based [Quick Start](/en/guide/quick-start) to verify it.
:::

## Problems it solves

`@nodebraid/adapter-react` binds an application-provided, target-specific async Runtime Factory to a
React callback ref and exposes immutable `pending`, `ready`, and `failed` mount Snapshots. It hides
Strict Mode replay, stale generations, late-Runtime cleanup, serialized create/dispose, and final
cleanup Failure reporting.

It also provides `useKernelView()`, `useSessionSnapshot()`, and `useHistorySnapshot()` to project
existing stable Runtime Services into React through `useSyncExternalStore`. The Adapter does not
select a Renderer, create a Plugin Host, duplicate Document writes, or provide product UI.

## Public entry points

```tsx
import {
  useHistorySnapshot,
  useKernelView,
  useRuntimeMount,
  useSessionSnapshot,
  type RuntimeMountFailureReporter,
} from '@nodebraid/adapter-react';

const reportFailure: RuntimeMountFailureReporter = ({ error }) => {
  queueMicrotask(() => {
    throw error;
  });
};

function Canvas() {
  const mount = useRuntimeMount(createApplicationRuntime, reportFailure);

  return (
    <>
      <svg ref={mount.ref} />
      {mount.snapshot.status === 'ready' ? <RuntimeView runtime={mount.snapshot.runtime} /> : null}
    </>
  );
}

function RuntimeView({ runtime }: { runtime: ApplicationRuntime }) {
  const view = useKernelView(runtime.kernel);
  const session = useSessionSnapshot(runtime.session);
  const history = useHistorySnapshot(runtime.history);
  return <output>{`${view.snapshot.revision}:${session.viewport.zoom}:${history.canUndo}`}</output>;
}
```

The Runtime Factory identity must remain stable. Changing the Factory or Target identity expresses an
explicit remount or retry. The Adapter owns the lifecycle of `ready.runtime`; consumers must not call
`dispose()` themselves.

## Lifecycle and failures

- A later Factory waits for the preceding Factory and asynchronous Runtime disposal to settle;
- a stale Factory result is never published and is disposed once;
- a current Factory rejection publishes `failed`, retains the original error identity, and reaches the required Reporter;
- a dispose rejection also retains its identity and terminally prevents that Hook instance from acquiring more resources;
- React cannot await effect cleanup, so deterministic means exactly-once ownership and strict ordering, not a Promise returned by component unmount;
- the Factory remains responsible for rolling back partial initialization before it rejects.

## Limitations and non-goals

- No Provider, Context, selector, or optional Snapshot;
- no React Node Components, Renderer JSX, toolbars, panels, minimaps, or product UI;
- no controlled Document, write proxy, Tool Registry, Serialization, or Persistence;
- no dependency on DOM, a concrete Renderer Provider, the Cordis implementation, or the `@nodebraid/core` facade;
- no speculative shared React/Vue Interface; a Vue Adapter is still not implemented.

## Verification evidence

Package type and declaration checks lock down public entry points and dependency direction. Real
Chromium public-seam tests cover Strict Mode, cancellation while a Factory is pending, late Runtime
disposal, ready remount ordering, create/dispose Failure identity, terminal cleanup behavior, and
Kernel, Session, and History Snapshot updates and unsubscription. The Basic SVG Example consumes this
package and verifies that one SVG Target is cleaned before a new Runtime mounts, while Factory failure
reaches both UI state and the Reporter.
