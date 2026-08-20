import { describe, expect, test } from 'bun:test';

import type { DiagnosticFault } from '@cflow/diagnostics';
import type { InteractionProjection } from '@cflow/interaction-api';
import { nodeId, type CanvasView } from '@cflow/kernel';
import { kernelPlugin, kernelService, type KernelService } from '@cflow/plugin-kernel';
import {
  RendererError,
  type CanvasRenderer,
  type HitResult,
  type RendererDocumentUpdate,
  type RendererInput,
  type RendererInputListener,
  type ScreenPoint,
} from '@cflow/renderer-api';
import { sessionPlugin, sessionService, type SessionService, type SessionSnapshot } from '@cflow/plugin-session';
import { createPluginHost, definePlugin } from '@cflow/runtime-cordis';

import {
  createRendererPlugin,
  rendererDiagnosticEvents,
  rendererService,
  RendererPluginError,
  type RendererService,
} from '../src';

describe('@cflow/plugin-renderer', () => {
  test('publishes the stable Renderer diagnostic event catalog', () => {
    expect(rendererDiagnosticEvents).toEqual({
      inputListenerFault: 'cflow.plugin.renderer.input-listener.fault',
      syncFault: 'cflow.plugin.renderer.sync.fault',
    });
  });

  test('creates one Renderer and publishes only the narrow Runtime Service', async () => {
    const recording = new RecordingRenderer();
    const plugin = createRendererPlugin<{ target: string }>((config) => {
      expect(config).toEqual({ target: 'surface' });
      return recording;
    });
    const runtime = await activateRenderer(plugin, { target: 'surface' });

    expect(recording.deliveries).toEqual(['document:reset:0', 'session:0:0:1']);
    expect(Object.keys(runtime.renderer).sort()).toEqual([
      'bindInteractionProjection',
      'capturePointer',
      'focus',
      'hitTest',
      'releasePointer',
      'subscribeInput',
    ]);

    await runtime.host.dispose();
    expect(recording.disposeCalls).toBe(1);
    expect(() => runtime.renderer.focus()).toThrow(RendererPluginError);
  });

  test('keeps every delivered Session resolvable while Document entities are removed', async () => {
    const recording = new RecordingRenderer();
    const plugin = createRendererPlugin(() => recording);
    const runtime = await activateRenderer(plugin);
    const selectedId = nodeId('selected');
    runtime.kernel.transact((transaction) => {
      transaction.nodes.add({ id: selectedId, type: 'task', position: { x: 0, y: 0 }, data: null });
    });
    runtime.session.setSelection({ nodeIds: [selectedId], edgeIds: [] });
    recording.deliveries.length = 0;

    runtime.kernel.transact((transaction) => {
      transaction.nodes.remove(selectedId);
    });

    expect(recording.deliveries).toEqual(['session:0:0:1', 'document:commit:2']);
    expect(recording.sessionIsResolvable).toBeTrue();

    await runtime.host.dispose();
  });

  test('waits for reentrant Session reconciliation before delivering a deleting Commit', async () => {
    const recording = new RecordingRenderer();
    const plugin = createRendererPlugin(() => recording);
    const runtime = await activateRenderer(plugin);
    const selectedId = nodeId('reentrant-selected');
    runtime.kernel.transact((transaction) => {
      transaction.nodes.add({ id: selectedId, type: 'task', position: { x: 0, y: 0 }, data: null });
    });
    runtime.session.setSelection({ nodeIds: [selectedId], edgeIds: [] });
    recording.deliveries.length = 0;
    runtime.session.subscribe(() => {
      const snapshot = runtime.session.getSnapshot();
      if (snapshot.viewport.x !== 1 || snapshot.selection.nodeIds.length === 0) return;
      runtime.kernel.transact((transaction) => {
        transaction.nodes.remove(selectedId);
      });
    });

    runtime.session.setViewport({ x: 1, y: 0, zoom: 1 });

    expect(recording.deliveries).toEqual(['session:1:1:1', 'session:0:1:1', 'document:commit:2']);
    expect(recording.sessionIsResolvable).toBeTrue();

    await runtime.host.dispose();
  });

  test('delegates input, hit testing, capture and focus without exposing update methods', async () => {
    const recording = new RecordingRenderer();
    recording.hit = { type: 'canvas', worldPoint: { x: 5, y: 10 } };
    const plugin = createRendererPlugin(() => recording);
    const runtime = await activateRenderer(plugin);
    const inputs: string[] = [];
    const stop = runtime.renderer.subscribeInput((input) => inputs.push(input.type));

    recording.emit(createPointerInput('pointer.down'));
    runtime.renderer.capturePointer(7);
    runtime.renderer.releasePointer(7);
    runtime.renderer.focus();

    expect(inputs).toEqual(['pointer.down']);
    expect(runtime.renderer.hitTest({ x: 10, y: 20 })).toEqual(recording.hit);
    expect(recording.controls).toEqual(['capture:7', 'release:7', 'focus']);
    stop();
    recording.emit(createPointerInput('pointer.move'));
    expect(inputs).toEqual(['pointer.down']);

    await runtime.host.dispose();
  });

  test('binds one exclusive Interaction Projection writer for the Renderer Activation', async () => {
    const recording = new RecordingRenderer();
    const runtime = await activateRenderer(createRendererPlugin(() => recording));
    const projection: InteractionProjection = {
      type: 'node-drag',
      nodes: [
        {
          nodeId: nodeId('binding-node'),
          basePosition: { x: 0, y: 0 },
          position: { x: 20, y: 30 },
        },
      ],
    };

    const binding = runtime.renderer.bindInteractionProjection();
    binding.update(projection);
    expect(recording.interactions).toEqual([projection]);
    expect(() => runtime.renderer.bindInteractionProjection()).toThrow(
      expect.objectContaining({ code: 'INTERACTION_ALREADY_BOUND' }),
    );

    binding.dispose();
    expect(recording.interactions).toEqual([projection, null]);
    expect(() => binding.update(projection)).toThrow(expect.objectContaining({ code: 'INTERACTION_BINDING_DISPOSED' }));
    const replacement = runtime.renderer.bindInteractionProjection();
    replacement.dispose();

    await runtime.host.dispose();
  });

  test('isolates Input listener faults through Host diagnostics', async () => {
    const faults: DiagnosticFault[] = [];
    const recording = new RecordingRenderer();
    const plugin = createRendererPlugin(() => recording);
    const runtime = await activateRenderer(plugin, undefined, faults);
    const seen: string[] = [];
    runtime.renderer.subscribeInput(() => {
      throw new Error('listener failed');
    });
    runtime.renderer.subscribeInput((input) => seen.push(input.type));

    recording.emit(createPointerInput('pointer.down'));

    expect(seen).toEqual(['pointer.down']);
    expect(faults).toHaveLength(1);
    expect(faults[0]?.event.name).toBe(rendererDiagnosticEvents.inputListenerFault);
    expect(faults[0]?.error).toEqual(new Error('listener failed'));

    await runtime.host.dispose();
  });

  test('reports an out-of-sync Renderer and re-establishes its current baseline', async () => {
    const faults: DiagnosticFault[] = [];
    const recording = new RecordingRenderer();
    recording.rejectNextCommitAsOutOfSync = true;
    const plugin = createRendererPlugin(() => recording);
    const runtime = await activateRenderer(plugin, undefined, faults);

    runtime.kernel.transact((transaction) => {
      transaction.nodes.add({ id: nodeId('node'), type: 'task', position: { x: 0, y: 0 }, data: null });
    });

    expect(recording.deliveries).toEqual(['document:reset:0', 'session:0:0:1', 'document:reset:1', 'session:0:0:1']);
    expect(faults).toHaveLength(1);
    expect(faults[0]?.event.name).toBe(rendererDiagnosticEvents.syncFault);
    expect(faults[0]?.error).toBeInstanceOf(RendererError);

    await runtime.host.dispose();
  });

  test('attempts one full recovery after an arbitrary internal synchronization fault', async () => {
    const faults: DiagnosticFault[] = [];
    const recording = new RecordingRenderer();
    const syncError = new Error('injected commit synchronization failure');
    recording.rejectNextCommitWith = syncError;
    const runtime = await activateRenderer(
      createRendererPlugin(() => recording),
      undefined,
      faults,
    );

    runtime.kernel.transact((transaction) => {
      transaction.nodes.add({ id: nodeId('recovered-node'), type: 'task', position: { x: 0, y: 0 }, data: null });
    });

    expect(recording.deliveries).toEqual(['document:reset:0', 'session:0:0:1', 'document:reset:1', 'session:0:0:1']);
    expect(faults.map((fault) => fault.error)).toEqual([syncError]);
    runtime.renderer.focus();
    expect(recording.controls).toEqual(['focus']);

    await runtime.host.dispose();
  });

  test('enters terminal Sync Failure when the single full recovery also fails', async () => {
    const faults: DiagnosticFault[] = [];
    const recording = new RecordingRenderer();
    const runtime = await activateRenderer(
      createRendererPlugin(() => recording),
      undefined,
      faults,
    );
    const inputs: string[] = [];
    runtime.renderer.subscribeInput((input) => inputs.push(input.type));
    const binding = runtime.renderer.bindInteractionProjection();
    const syncError = new Error('injected synchronization failure');
    const recoveryError = new Error('injected recovery failure');
    recording.rejectNextCommitWith = syncError;
    recording.rejectNextResetWith = recoveryError;

    runtime.kernel.transact((transaction) => {
      transaction.nodes.add({ id: nodeId('failed-node'), type: 'task', position: { x: 0, y: 0 }, data: null });
    });

    expect(faults).toHaveLength(2);
    expect(faults[0]?.error).toBe(syncError);
    const terminalError = faults[1]?.error;
    expect(terminalError).toMatchObject({ domain: 'plugin.renderer', code: 'SYNC_FAILED' });
    expect(terminalError).toHaveProperty('cause', expect.objectContaining({ errors: [syncError, recoveryError] }));
    recording.emit(createPointerInput('pointer.move'));
    expect(inputs).toEqual([]);
    expect(() => runtime.renderer.hitTest({ x: 10, y: 20 })).toThrow(terminalError);
    expect(() => runtime.renderer.focus()).toThrow(terminalError);
    expect(() => runtime.renderer.capturePointer(7)).toThrow(terminalError);
    expect(() => runtime.renderer.releasePointer(7)).toThrow(terminalError);
    expect(() => binding.update(null)).toThrow(terminalError);
    binding.dispose();

    await runtime.host.dispose();
  });

  test('does not report queued Commits already subsumed by an out-of-sync reset', async () => {
    const faults: DiagnosticFault[] = [];
    const recording = new RecordingRenderer();
    const rendererPlugin = createRendererPlugin(() => recording);
    let kernel: KernelService | undefined;
    let session: SessionService | undefined;
    let renderer: RendererService | undefined;
    const secondId = nodeId('second-after-gap');
    const earlierObserver = definePlugin({
      requires: { kernel: kernelService },
      setup(context) {
        kernel = context.services.kernel;
        context.own(
          context.services.kernel.observeCommits((commit) => {
            if (commit.changeSet.revision !== 1) return;
            context.services.kernel.transact((transaction) => {
              transaction.nodes.add({ id: secondId, type: 'task', position: { x: 20, y: 0 }, data: null });
            });
          }),
        );
      },
    });
    const consumer = definePlugin({
      requires: { session: sessionService, renderer: rendererService },
      setup(context) {
        session = context.services.session;
        renderer = context.services.renderer;
      },
    });
    const host = createPluginHost({ diagnostics: { faultReporter: (fault) => faults.push(fault) } });
    const kernelInstallation = host.install(kernelPlugin);
    const sessionInstallation = host.install(sessionPlugin);
    const observerInstallation = host.install(earlierObserver);
    await Promise.all([
      kernelInstallation.whenActive(),
      sessionInstallation.whenActive(),
      observerInstallation.whenActive(),
    ]);
    const rendererInstallation = host.install(rendererPlugin);
    const consumerInstallation = host.install(consumer);
    await Promise.all([rendererInstallation.whenActive(), consumerInstallation.whenActive()]);
    if (!kernel || !session || !renderer) throw new Error('Expected Renderer Runtime Services to activate.');
    recording.rejectNextCommitAsOutOfSync = true;

    kernel.transact((transaction) => {
      transaction.nodes.add({ id: nodeId('first-before-gap'), type: 'task', position: { x: 0, y: 0 }, data: null });
    });

    expect(kernel.read().snapshot.revision).toBe(2);
    expect(recording.deliveries).toEqual(['document:reset:0', 'session:0:0:1', 'document:reset:2', 'session:0:0:1']);
    expect(faults).toHaveLength(1);
    expect(faults[0]?.event.name).toBe(rendererDiagnosticEvents.syncFault);

    await host.dispose();
  });
});

interface ActivatedRenderer {
  readonly host: ReturnType<typeof createPluginHost>;
  readonly kernel: KernelService;
  readonly session: SessionService;
  readonly renderer: RendererService;
}

async function activateRenderer<Config>(
  plugin: ReturnType<typeof createRendererPlugin<Config>>,
  config?: Config,
  faults: DiagnosticFault[] = [],
): Promise<ActivatedRenderer> {
  let kernel: KernelService | undefined;
  let session: SessionService | undefined;
  let renderer: RendererService | undefined;
  const consumer = definePlugin({
    requires: { kernel: kernelService, session: sessionService, renderer: rendererService },
    setup(context) {
      kernel = context.services.kernel;
      session = context.services.session;
      renderer = context.services.renderer;
    },
  });
  const host = createPluginHost({ diagnostics: { faultReporter: (fault) => faults.push(fault) } });
  const configArguments = (config === undefined ? [] : [config]) as RendererInstallArguments<Config>;
  const installations = [
    host.install(kernelPlugin),
    host.install(sessionPlugin),
    host.install(plugin, ...configArguments),
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!kernel || !session || !renderer) throw new Error('Expected Renderer Runtime Services to activate.');
  return { host, kernel, session, renderer };
}

type RendererInstallArguments<Config> = undefined extends Config ? [config?: Config] : [config: Config];

class RecordingRenderer implements CanvasRenderer {
  readonly deliveries: string[] = [];
  readonly controls: string[] = [];
  readonly inputListeners: RendererInputListener[] = [];
  readonly interactions: Array<InteractionProjection | null> = [];
  disposeCalls = 0;
  hit: HitResult | null = null;
  rejectNextCommitAsOutOfSync = false;
  rejectNextCommitWith: unknown;
  rejectNextResetWith: unknown;
  sessionIsResolvable = true;
  #view: CanvasView | undefined;

  updateDocument(update: RendererDocumentUpdate): void {
    if (update.type === 'reset' && this.rejectNextResetWith !== undefined) {
      const error = this.rejectNextResetWith;
      this.rejectNextResetWith = undefined;
      throw error;
    }
    if (update.type === 'commit' && this.rejectNextCommitWith !== undefined) {
      const error = this.rejectNextCommitWith;
      this.rejectNextCommitWith = undefined;
      throw error;
    }
    if (update.type === 'commit' && this.rejectNextCommitAsOutOfSync) {
      this.rejectNextCommitAsOutOfSync = false;
      throw new RendererError('DOCUMENT_OUT_OF_SYNC', 'test gap');
    }
    this.#view = update.type === 'reset' ? update.view : update.commit.after;
    const revision = this.#view.snapshot.revision;
    this.deliveries.push(`document:${update.type}:${revision}`);
  }

  updateSession(snapshot: SessionSnapshot): void {
    const view = this.#view;
    if (!view) throw new Error('Expected Document before Session.');
    this.sessionIsResolvable &&=
      snapshot.selection.nodeIds.every((id) => view.query.getNode(id) !== undefined) &&
      snapshot.selection.edgeIds.every((id) => view.query.getEdge(id) !== undefined);
    this.deliveries.push(
      `session:${snapshot.selection.nodeIds.length}:${snapshot.viewport.x}:${snapshot.viewport.zoom}`,
    );
  }

  updateInteraction(projection: InteractionProjection | null): void {
    this.interactions.push(projection);
  }

  subscribeInput(listener: RendererInputListener): () => void {
    this.inputListeners.push(listener);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      const index = this.inputListeners.indexOf(listener);
      if (index >= 0) this.inputListeners.splice(index, 1);
    };
  }

  emit(input: RendererInput): void {
    for (const listener of Array.from(this.inputListeners)) listener(input);
  }

  hitTest(_point: ScreenPoint): HitResult | null {
    return this.hit;
  }

  capturePointer(pointerId: number): void {
    this.controls.push(`capture:${pointerId}`);
  }

  releasePointer(pointerId: number): void {
    this.controls.push(`release:${pointerId}`);
  }

  focus(): void {
    this.controls.push('focus');
  }

  async dispose(): Promise<void> {
    this.disposeCalls += 1;
    this.inputListeners.length = 0;
  }
}

function createPointerInput(type: 'pointer.down' | 'pointer.move'): RendererInput {
  return {
    type,
    pointerId: 7,
    pointerType: 'mouse',
    screenPoint: { x: 10, y: 20 },
    worldPoint: { x: 5, y: 10 },
    button: type === 'pointer.down' ? 'primary' : null,
    pressedButtons: ['primary'],
    modifiers: { alt: false, control: false, meta: false, shift: false },
  };
}
