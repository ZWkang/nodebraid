# `@nodebraid/adapter-react`

React lifecycle and stable Snapshot projection for NodeBraid Canvas Runtimes.

The package owns one deep lifecycle seam: `useRuntimeMount()` binds an
application-provided, target-specific async Runtime Factory to a stable React
callback ref. It serializes Strict Mode remounts, prevents stale Runtime
publication, disposes every returned Runtime at most once, and reports create or
dispose failures without changing their identity.

```tsx
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
```

Changing the Target or Factory identity creates a new mount generation. Keep the
Factory identity stable unless a remount or retry is intended. A stale Factory
result is never published and is disposed before the next Factory starts. React
cannot await effect cleanup, so deterministic disposal means exactly-once
ownership and strict create/dispose ordering; lifecycle failures are also sent to
the required Reporter when no mounted React caller remains.

`useKernelView()`, `useSessionSnapshot()`, and `useHistorySnapshot()` project the
existing stable Runtime Service Snapshots with `useSyncExternalStore`. They do not
copy state, expose writes, add selectors, or fabricate optional values. Render
their consumers only inside the ready branch so Hooks remain unconditional in
that child module.

The Adapter does not provide React Context, Providers, Renderer JSX, Node
components, product UI, controlled Documents, write proxies, registries,
serialization, persistence, or a cross-framework abstraction.
