import { StrictMode, Suspense, startTransition, useCallback, useState, type RefCallback } from 'react';
import { createRoot } from 'react-dom/client';

import type { CanvasView } from '@nodebraid/kernel';
import type { HistoryService, HistorySnapshot } from '@nodebraid/plugin-history';
import type { KernelService } from '@nodebraid/plugin-kernel';
import type { SessionService, SessionSnapshot } from '@nodebraid/plugin-session';

import {
  useHistorySnapshot,
  useKernelView,
  useRuntimeMount,
  useSessionSnapshot,
  type RuntimeMountFailure,
} from '../src';

interface ControlledRuntime {
  readonly id: number;
  dispose(): Promise<void>;
}

interface RuntimeAttempt {
  readonly id: number;
  readonly reject: (error: unknown) => void;
  readonly resolve: () => void;
}

interface ReportedFailure {
  readonly phase: RuntimeMountFailure['phase'];
  readonly sameError: boolean;
}

interface RuntimeRender {
  readonly generation: number;
  readonly runtimeId: number | null;
  readonly status: string;
}

class RuntimeController {
  readonly attempts: RuntimeAttempt[] = [];
  readonly events: string[] = [];
  readonly failures: ReportedFailure[] = [];
  readonly renders: RuntimeRender[] = [];
  expectedFailure: unknown;
  failDisposeId: number | undefined;
  remount: (() => void) | undefined;

  readonly create = async (target: HTMLDivElement): Promise<ControlledRuntime> => {
    const id = this.attempts.length + 1;
    this.events.push(`create:${id}`);
    let resolveAttempt: (() => void) | undefined;
    let rejectAttempt: ((error: unknown) => void) | undefined;
    const gate = new Promise<void>((resolve, reject) => {
      resolveAttempt = resolve;
      rejectAttempt = reject;
    });
    this.attempts.push({
      id,
      resolve: () => {
        this.events.push(`resolve:${id}`);
        resolveAttempt?.();
      },
      reject: (error) => {
        this.events.push(`reject:${id}`);
        rejectAttempt?.(error);
      },
    });
    await gate;
    target.dataset.runtimeId = String(id);
    return {
      id,
      dispose: async () => {
        this.events.push(`dispose:start:${id}`);
        if (this.failDisposeId === id) {
          this.events.push(`dispose:reject:${id}`);
          throw this.expectedFailure;
        }
        delete target.dataset.runtimeId;
        this.events.push(`dispose:end:${id}`);
      },
    };
  };

  report(failure: RuntimeMountFailure): void {
    this.events.push(`report:${failure.phase}`);
    this.failures.push({ phase: failure.phase, sameError: failure.error === this.expectedFailure });
  }

  recordRender(generation: number, status: string, runtimeId: number | null): void {
    this.renders.push({ generation, status, runtimeId });
  }
}

function RuntimeHarness({ controller }: Readonly<{ controller: RuntimeController }>) {
  const [generation, setGeneration] = useState(0);
  controller.remount = () => setGeneration((value) => value + 1);
  const factory = useCallback((target: HTMLDivElement) => controller.create(target), [controller, generation]);
  const reportFailure = useCallback((failure: RuntimeMountFailure) => controller.report(failure), [controller]);
  const mount = useRuntimeMount(factory, reportFailure);
  controller.recordRender(
    generation,
    mount.snapshot.status,
    mount.snapshot.status === 'ready' ? mount.snapshot.runtime.id : null,
  );

  return (
    <section
      data-runtime-status={mount.snapshot.status}
      data-runtime-id={mount.snapshot.status === 'ready' ? String(mount.snapshot.runtime.id) : undefined}
      data-failure-phase={mount.snapshot.status === 'failed' ? mount.snapshot.failure.phase : undefined}
    >
      <div data-runtime-target ref={mount.ref} />
    </section>
  );
}

async function runLifecycleScenario() {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const controller = new RuntimeController();
  root.render(
    <StrictMode>
      <RuntimeHarness controller={controller} />
    </StrictMode>,
  );

  await waitFor(() => controller.attempts.length === 1);
  controller.remount?.();
  await delay(50);
  const createCountWhileFirstPending = controller.attempts.length;
  controller.attempts[0]?.resolve();
  await waitFor(() => controller.attempts.length === 2);
  const staleResolutionEvents = [...controller.events];
  controller.attempts[1]?.resolve();
  await waitFor(() => readStatus(container).runtimeId === '2');
  const firstReady = readStatus(container);

  const renderCountBeforeReadyRemount = controller.renders.length;
  controller.remount?.();
  await waitFor(() => controller.renders.length > renderCountBeforeReadyRemount);
  const firstReadyRemountRender = controller.renders[renderCountBeforeReadyRemount];
  await waitFor(() => controller.attempts.length === 3);
  const readyRemountEvents = [...controller.events];
  controller.attempts[2]?.resolve();
  await waitFor(() => readStatus(container).runtimeId === '3');
  root.unmount();
  await waitFor(() => controller.events.includes('dispose:end:3'));
  const targetConnectedAfterUnmount = container.querySelector('[data-runtime-target]')?.isConnected ?? false;
  container.remove();

  return {
    createCountWhileFirstPending,
    staleResolutionEvents,
    firstReady,
    firstReadyRemountRender,
    readyRemountEvents,
    finalEvents: controller.events,
    failures: controller.failures,
    targetConnectedAfterUnmount,
  };
}

async function runFailureScenario() {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const controller = new RuntimeController();
  root.render(
    <StrictMode>
      <RuntimeHarness controller={controller} />
    </StrictMode>,
  );

  await waitFor(() => controller.attempts.length === 1);
  const createFailure = new Error('controlled create failure');
  controller.expectedFailure = createFailure;
  controller.attempts[0]?.reject(createFailure);
  await waitFor(() => readStatus(container).failurePhase === 'create' && controller.failures.length === 1);
  const createFailureState = readStatus(container);

  controller.remount?.();
  await waitFor(() => controller.attempts.length === 2);
  controller.attempts[1]?.resolve();
  await waitFor(() => readStatus(container).runtimeId === '2');
  const disposeFailure = new Error('controlled dispose failure');
  controller.expectedFailure = disposeFailure;
  controller.failDisposeId = 2;
  controller.remount?.();
  await waitFor(() => readStatus(container).failurePhase === 'dispose' && controller.failures.length === 2);
  await delay(50);
  const disposeFailureState = readStatus(container);
  const createCountAfterDisposeFailure = controller.attempts.length;
  root.unmount();
  container.remove();

  return {
    createFailureState,
    disposeFailureState,
    createCountAfterDisposeFailure,
    failures: controller.failures,
    events: controller.events,
  };
}

const suspendedForever = new Promise<never>(() => {});

class ReporterRaceController extends RuntimeController {
  readonly reporterCalls = { committed: 0, abandoned: 0 };
  renderAbandonedReporter: (() => void) | undefined;
  suspendedRenderCount = 0;

  readonly committedReporter = (_failure: RuntimeMountFailure) => {
    this.reporterCalls.committed += 1;
  };

  readonly abandonedReporter = (_failure: RuntimeMountFailure) => {
    this.reporterCalls.abandoned += 1;
  };
}

function ReporterRaceHarness({ controller }: Readonly<{ controller: ReporterRaceController }>) {
  const [renderAbandonedReporter, setRenderAbandonedReporter] = useState(false);
  controller.renderAbandonedReporter = () => {
    startTransition(() => setRenderAbandonedReporter(true));
  };
  return (
    <Suspense fallback={<span data-suspended-fallback />}>
      <ReporterRaceMount controller={controller} abandoned={renderAbandonedReporter} />
    </Suspense>
  );
}

function ReporterRaceMount({
  controller,
  abandoned,
}: Readonly<{ controller: ReporterRaceController; abandoned: boolean }>) {
  const mount = useRuntimeMount(
    controller.create,
    abandoned ? controller.abandonedReporter : controller.committedReporter,
  );
  if (abandoned) {
    controller.suspendedRenderCount += 1;
    throw suspendedForever;
  }
  return <div ref={mount.ref} data-reporter-race-target />;
}

async function runReporterRaceScenario() {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const controller = new ReporterRaceController();
  root.render(<ReporterRaceHarness controller={controller} />);
  await waitFor(() => controller.attempts.length === 1);
  controller.renderAbandonedReporter?.();
  await waitFor(() => controller.suspendedRenderCount > 0);
  controller.attempts[0]?.reject(new Error('committed reporter race failure'));
  await waitFor(() => controller.reporterCalls.committed + controller.reporterCalls.abandoned === 1);
  root.unmount();
  container.remove();
  return controller.reporterCalls;
}

interface RefProbeController {
  ref: RefCallback<HTMLDivElement> | undefined;
}

function RefProbe({ controller }: Readonly<{ controller: RefProbeController }>) {
  const mount = useRuntimeMount(
    async () => ({ dispose: async () => {} }),
    () => {},
  );
  controller.ref = mount.ref;
  return null;
}

async function runMultipleTargetScenario() {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const controller: RefProbeController = { ref: undefined };
  root.render(<RefProbe controller={controller} />);
  await waitFor(() => controller.ref !== undefined);
  const first = document.createElement('div');
  const second = document.createElement('div');
  let message: string | undefined;
  controller.ref?.(first);
  try {
    controller.ref?.(second);
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  } finally {
    controller.ref?.(null);
  }
  await delay(0);
  root.unmount();
  container.remove();
  return message;
}

interface SnapshotSources {
  readonly history: HistoryService;
  readonly historyListeners: Set<() => void>;
  readonly kernel: KernelService;
  readonly kernelListeners: Set<() => void>;
  readonly session: SessionService;
  readonly sessionListeners: Set<() => void>;
  update(): void;
}

function createSnapshotSources(): SnapshotSources {
  const kernelListeners = new Set<() => void>();
  const sessionListeners = new Set<() => void>();
  const historyListeners = new Set<() => void>();
  let view = Object.freeze({ snapshot: Object.freeze({ revision: 0 }) }) as CanvasView;
  let sessionSnapshot = Object.freeze({
    selection: Object.freeze({ nodeIds: Object.freeze([]), edgeIds: Object.freeze([]) }),
    viewport: Object.freeze({ x: 0, y: 0, zoom: 1 }),
  }) as SessionSnapshot;
  let historySnapshot = Object.freeze({ canUndo: false, canRedo: false }) as HistorySnapshot;

  const kernel = {
    read: () => view,
    transact: () => null,
    observeCommits(observer) {
      const listener = () => observer(undefined as never);
      kernelListeners.add(listener);
      return () => kernelListeners.delete(listener);
    },
  } satisfies KernelService;
  const session = {
    getSnapshot: () => sessionSnapshot,
    subscribe(listener) {
      sessionListeners.add(listener);
      return () => sessionListeners.delete(listener);
    },
    setSelection() {},
    clearSelection() {},
    setViewport() {},
  } satisfies SessionService;
  const history = {
    getSnapshot: () => historySnapshot,
    subscribe(listener) {
      historyListeners.add(listener);
      return () => historyListeners.delete(listener);
    },
  } satisfies HistoryService;

  return {
    history,
    historyListeners,
    kernel,
    kernelListeners,
    session,
    sessionListeners,
    update() {
      view = Object.freeze({ snapshot: Object.freeze({ revision: 4 }) }) as CanvasView;
      sessionSnapshot = Object.freeze({
        selection: Object.freeze({ nodeIds: Object.freeze([]), edgeIds: Object.freeze([]) }),
        viewport: Object.freeze({ x: 20, y: 30, zoom: 2 }),
      }) as SessionSnapshot;
      historySnapshot = Object.freeze({ canUndo: true, canRedo: false });
      for (const listener of kernelListeners) listener();
      for (const listener of sessionListeners) listener();
      for (const listener of historyListeners) listener();
    },
  };
}

function SnapshotHarness({ sources }: Readonly<{ sources: SnapshotSources }>) {
  const view = useKernelView(sources.kernel);
  const session = useSessionSnapshot(sources.session);
  const history = useHistorySnapshot(sources.history);
  return (
    <output data-snapshot-value>
      {view.snapshot.revision}|{session.viewport.zoom}|{String(history.canUndo)}
    </output>
  );
}

async function runSnapshotScenario() {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const sources = createSnapshotSources();
  root.render(<SnapshotHarness sources={sources} />);
  await waitFor(() => readSnapshotValue(container) === '0|1|false');
  const initial = readSnapshotValue(container);
  const subscriptionsWhileMounted = readSubscriptionCounts(sources);
  sources.update();
  await waitFor(() => readSnapshotValue(container) === '4|2|true');
  const updated = readSnapshotValue(container);
  root.unmount();
  const subscriptionsAfterUnmount = readSubscriptionCounts(sources);
  container.remove();
  return { initial, updated, subscriptionsWhileMounted, subscriptionsAfterUnmount };
}

function readStatus(container: HTMLElement) {
  const state = container.querySelector<HTMLElement>('[data-runtime-status]');
  return {
    status: state?.dataset.runtimeStatus ?? null,
    runtimeId: state?.dataset.runtimeId ?? null,
    failurePhase: state?.dataset.failurePhase ?? null,
    targetRuntimeId: container.querySelector<HTMLElement>('[data-runtime-target]')?.dataset.runtimeId ?? null,
  };
}

function readSnapshotValue(container: HTMLElement): string | null {
  return container.querySelector('[data-snapshot-value]')?.textContent ?? null;
}

function readSubscriptionCounts(sources: SnapshotSources) {
  return {
    kernel: sources.kernelListeners.size,
    session: sources.sessionListeners.size,
    history: sources.historyListeners.size,
  };
}

async function waitFor(predicate: () => boolean): Promise<void> {
  const deadline = performance.now() + 5_000;
  while (!predicate()) {
    if (performance.now() >= deadline) throw new Error('React Adapter browser scenario timed out.');
    await delay(10);
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

declare global {
  var __nodebraidReactAdapterLifecycle: typeof runLifecycleScenario;
  var __nodebraidReactAdapterFailures: typeof runFailureScenario;
  var __nodebraidReactAdapterSnapshots: typeof runSnapshotScenario;
  var __nodebraidReactAdapterReporterRace: typeof runReporterRaceScenario;
  var __nodebraidReactAdapterMultipleTarget: typeof runMultipleTargetScenario;
}

globalThis.__nodebraidReactAdapterLifecycle = runLifecycleScenario;
globalThis.__nodebraidReactAdapterFailures = runFailureScenario;
globalThis.__nodebraidReactAdapterSnapshots = runSnapshotScenario;
globalThis.__nodebraidReactAdapterReporterRace = runReporterRaceScenario;
globalThis.__nodebraidReactAdapterMultipleTarget = runMultipleTargetScenario;
