import { useCallback, useSyncExternalStore } from 'react';

import type { CanvasView } from '@nodebraid/kernel';
import type { HistoryService, HistorySnapshot } from '@nodebraid/plugin-history';
import type { KernelService } from '@nodebraid/plugin-kernel';
import type { SessionService, SessionSnapshot } from '@nodebraid/plugin-session';

export function useKernelView(kernel: KernelService): CanvasView {
  const subscribe = useCallback((listener: () => void) => kernel.observeCommits(() => listener()), [kernel]);
  const getSnapshot = useCallback(() => kernel.read(), [kernel]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useSessionSnapshot(session: SessionService): SessionSnapshot {
  const subscribe = useCallback((listener: () => void) => session.subscribe(listener), [session]);
  const getSnapshot = useCallback(() => session.getSnapshot(), [session]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useHistorySnapshot(history: HistoryService): HistorySnapshot {
  const subscribe = useCallback((listener: () => void) => history.subscribe(listener), [history]);
  const getSnapshot = useCallback(() => history.getSnapshot(), [history]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
