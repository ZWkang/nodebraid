import { test } from 'bun:test';

import type { HistoryService } from '@nodebraid/plugin-history';
import type { KernelService } from '@nodebraid/plugin-kernel';
import type { SessionService } from '@nodebraid/plugin-session';

import {
  useHistorySnapshot,
  useKernelView,
  useRuntimeMount,
  useSessionSnapshot,
  type RuntimeFactory,
  type RuntimeMountFailureReporter,
} from '../src';

test('keeps the React Adapter interface narrow and type-safe', () => {
  interface Runtime {
    dispose(): Promise<void>;
    readonly marker: 'runtime';
  }

  const verifyRuntimeMount = (
    factory: RuntimeFactory<SVGSVGElement, Runtime>,
    reportFailure: RuntimeMountFailureReporter,
  ) => {
    const mount = useRuntimeMount(factory, reportFailure);
    const targetRef: typeof mount.ref = mount.ref;
    if (mount.snapshot.status === 'ready') {
      const target: SVGSVGElement = mount.snapshot.target;
      const runtime: Runtime = mount.snapshot.runtime;
      void target;
      void runtime;
    }
    if (mount.snapshot.status === 'failed') {
      const phase: 'create' | 'dispose' = mount.snapshot.failure.phase;
      void phase;
    }
    // @ts-expect-error Runtime lifecycle ownership stays inside the Adapter.
    mount.dispose();
    // @ts-expect-error A Runtime must provide deterministic async disposal.
    useRuntimeMount(async () => ({ marker: 'runtime' as const }), reportFailure);
    void targetRef;
  };

  const verifySnapshots = (kernel: KernelService, session: SessionService, history: HistoryService) => {
    const view = useKernelView(kernel);
    const sessionSnapshot = useSessionSnapshot(session);
    const historySnapshot = useHistorySnapshot(history);
    // @ts-expect-error Canvas Views remain immutable through the React projection.
    view.snapshot.revision = 2;
    // @ts-expect-error Session Snapshots remain immutable through the React projection.
    sessionSnapshot.viewport.zoom = 2;
    // @ts-expect-error History Snapshots remain immutable through the React projection.
    historySnapshot.canUndo = false;
  };

  void verifyRuntimeMount;
  void verifySnapshots;
});
