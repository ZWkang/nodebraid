import { useCallback, useSyncExternalStore } from 'react';

import type { ExampleRuntime } from './create-example-runtime';

export function useClipboardFailure(runtime: ExampleRuntime) {
  const subscribe = useCallback((listener: () => void) => runtime.subscribeClipboardFailure(listener), [runtime]);
  const getSnapshot = useCallback(() => runtime.getClipboardFailure(), [runtime]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
