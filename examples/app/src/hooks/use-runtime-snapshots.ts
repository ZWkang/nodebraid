import { useCallback, useSyncExternalStore } from 'react';

import type { ExampleRuntime } from '@/example-runtime/create-example-runtime';

const unavailableHistorySnapshot = Object.freeze({ canUndo: false, canRedo: false });

export function useKernelView(runtime: ExampleRuntime) {
  const subscribe = useCallback((listener: () => void) => runtime.kernel.observeCommits(() => listener()), [runtime]);
  const getSnapshot = useCallback(() => runtime.kernel.read(), [runtime]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useSessionSnapshot(runtime: ExampleRuntime) {
  const subscribe = useCallback((listener: () => void) => runtime.session.subscribe(listener), [runtime]);
  const getSnapshot = useCallback(() => runtime.session.getSnapshot(), [runtime]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useHistorySnapshot(runtime: ExampleRuntime) {
  const subscribe = useCallback((listener: () => void) => runtime.history.subscribe(listener), [runtime]);
  const getSnapshot = useCallback(() => runtime.history.getSnapshot(), [runtime]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useOptionalHistorySnapshot(runtime: ExampleRuntime | undefined) {
  const subscribe = useCallback(
    (listener: () => void) => runtime?.history.subscribe(listener) ?? (() => {}),
    [runtime],
  );
  const getSnapshot = useCallback(() => runtime?.history.getSnapshot() ?? unavailableHistorySnapshot, [runtime]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
