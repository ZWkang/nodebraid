import { expect, test } from 'bun:test';

import type { DiagnosticFault } from '@nodebraid/diagnostics';
import type { InteractionProjection } from '@nodebraid/interaction-api';
import { commandPlugin, commandService, type CommandService } from '@nodebraid/plugin-command';
import { nodeId } from '@nodebraid/kernel';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { createRendererPlugin, rendererService, type RendererService } from '@nodebraid/plugin-renderer';
import { sessionPlugin } from '@nodebraid/plugin-session';
import type {
  CanvasRenderer,
  HitResult,
  RendererDocumentUpdate,
  RendererInput,
  RendererInputListener,
  ScreenPoint,
} from '@nodebraid/renderer-api';
import type { SessionSnapshot } from '@nodebraid/session-api';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

import { interactionPlugin, moveNodesCommand } from '../src';

test('Connection materializer failure keeps identity and reports exactly once after terminal cleanup', async () => {
  const faults: DiagnosticFault[] = [];
  const recording = new CleanupFailureRenderer();
  recording.connectionMode = true;
  const materializerError = new Error('injected Connection materializer failure');
  const host = createPluginHost({ diagnostics: { faultReporter: (fault) => faults.push(fault) } });
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    host.install(createRendererPlugin(() => recording)),
    host.install(interactionPlugin, {
      connection: {
        materializeEdge() {
          throw materializerError;
        },
      },
    }),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));

  recording.emit(pointerInput('pointer.down', 0));
  recording.emit(pointerInput('pointer.up', 10));
  await nextTask();

  expect(recording.projectionClearCount).toBe(1);
  expect(recording.releasePointerCount).toBe(1);
  expect(faults).toHaveLength(1);
  expect(faults[0]?.event.name).toBe('nodebraid.plugin.interaction.connection-materializer.fault');
  expect(faults[0]?.error).toBe(materializerError);
  await host.dispose();
});

test('Connection dependency recovery creates a fresh idle Activation', async () => {
  const first = new LifecycleRenderer();
  const second = new LifecycleRenderer();
  first.connectionMode = true;
  second.connectionMode = true;
  const host = createPluginHost();
  const rendererInstallation = host.install(createRendererPlugin(() => first));
  const interaction = host.install(interactionPlugin, {
    connection: {
      materializeEdge({ source, target }) {
        return { id: 'connection' as never, type: 'flow', source, target, data: null };
      },
    },
  });
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    rendererInstallation,
    interaction,
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  first.emit(pointerInput('pointer.down', 0));
  expect(first.interactions.at(-1)?.type).toBe('connection-preview');

  await rendererInstallation.dispose();
  expect(interaction.getSnapshot().status).toBe('pending');
  expect(first.interactions.at(-1)).toBeNull();
  const replacement = host.install(createRendererPlugin(() => second));
  await Promise.all([replacement.whenActive(), interaction.whenActive()]);
  expect(second.interactions).toEqual([]);
  second.emit(pointerInput('pointer.down', 0));
  expect(second.interactions.at(-1)?.type).toBe('connection-preview');
  await host.dispose();
});

test('Connection final Hit Test failure still clears Preview and releases Capture', async () => {
  const faults: DiagnosticFault[] = [];
  const recording = new CleanupFailureRenderer();
  recording.connectionMode = true;
  const hitError = new Error('injected final Connection Hit Test failure');
  let materialized = 0;
  const host = createPluginHost({ diagnostics: { faultReporter: (fault) => faults.push(fault) } });
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    host.install(createRendererPlugin(() => recording)),
    host.install(interactionPlugin, {
      connection: {
        materializeEdge({ source, target }) {
          materialized += 1;
          return { id: 'never' as never, type: 'flow', source, target, data: null };
        },
      },
    }),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));

  recording.emit(pointerInput('pointer.down', 0));
  recording.hitTestError = hitError;
  recording.emit(pointerInput('pointer.up', 10));

  expect(recording.projectionClearCount).toBe(1);
  expect(recording.releasePointerCount).toBe(1);
  expect(materialized).toBe(0);
  expect(faults).toHaveLength(1);
  expect(faults[0]?.error).toBe(hitError);
  recording.hitTestError = undefined;
  await host.dispose();
});

test('Connection Escape attempts every terminal cleanup and never materializes after cleanup failure', async () => {
  const faults: DiagnosticFault[] = [];
  const recording = new CleanupFailureRenderer();
  recording.connectionMode = true;
  let materialized = 0;
  const host = createPluginHost({ diagnostics: { faultReporter: (fault) => faults.push(fault) } });
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    host.install(createRendererPlugin(() => recording)),
    host.install(interactionPlugin, {
      connection: {
        materializeEdge({ source, target }) {
          materialized += 1;
          return { id: 'never' as never, type: 'flow', source, target, data: null };
        },
      },
    }),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));

  recording.emit(pointerInput('pointer.down', 0));
  recording.failCleanup = true;
  recording.emit(escapeInput());

  expect(recording.cleanupCalls).toEqual(['clear-projection', 'release:7']);
  expect(materialized).toBe(0);
  expect(faults).toHaveLength(1);
  const fault = faults[0];
  if (!fault) throw new Error('Expected the Connection cleanup Fault.');
  expect(fault.error).toBeInstanceOf(AggregateError);
  expect((fault.error as AggregateError).errors).toEqual([
    recording.clearProjectionError,
    recording.releasePointerError,
  ]);
  recording.failCleanup = false;
  await host.dispose();
});

test('Interaction cleanup continues after every public Renderer cleanup failure', async () => {
  const recording = new CleanupFailureRenderer();
  let commands: CommandService | undefined;
  let renderer: RendererService | undefined;
  const consumer = definePlugin({
    requires: { commands: commandService, renderer: rendererService },
    setup(context) {
      commands = context.services.commands;
      renderer = context.services.renderer;
    },
  });
  const host = createPluginHost();
  const interaction = host.install(interactionPlugin);
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    host.install(createRendererPlugin(() => recording)),
    interaction,
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!commands || !renderer) throw new Error('Expected Interaction cleanup Runtime Services.');
  const activeRenderer = renderer;

  recording.emit(pointerInput('pointer.down', 0));
  recording.emit(pointerInput('pointer.move', 10));
  recording.failCleanup = true;

  let cleanupFailure: unknown;
  try {
    await interaction.dispose();
  } catch (error) {
    cleanupFailure = error;
  }
  expect(cleanupFailure).toBeInstanceOf(AggregateError);
  const activationFailure = (cleanupFailure as AggregateError).errors[0];
  expect(activationFailure).toBeInstanceOf(AggregateError);
  const interactionFailure = (activationFailure as AggregateError).errors[0];
  expect(interactionFailure).toBeInstanceOf(AggregateError);
  expect((interactionFailure as AggregateError).errors).toEqual([
    recording.stopInputError,
    recording.clearProjectionError,
    recording.releasePointerError,
  ]);
  expect(recording.cleanupCalls).toEqual(['stop-input', 'clear-projection', 'release:7']);
  await expect(commands.execute(moveNodesCommand, { moves: [] })).rejects.toMatchObject({
    code: 'COMMAND_NOT_FOUND',
  });
  expect(() => activeRenderer.bindInteractionProjection()).toThrow(
    expect.objectContaining({ code: 'INTERACTION_ALREADY_BOUND' }),
  );

  await host.dispose();
});

test('Interaction dependency recovery creates a fresh idle Activation', async () => {
  const first = new LifecycleRenderer();
  const second = new LifecycleRenderer();
  let commands: CommandService | undefined;
  let kernel: KernelService | undefined;
  const consumer = definePlugin({
    requires: { commands: commandService, kernel: kernelService },
    setup(context) {
      commands = context.services.commands;
      kernel = context.services.kernel;
    },
  });
  const host = createPluginHost();
  const rendererInstallation = host.install(createRendererPlugin(() => first));
  const interaction = host.install(interactionPlugin);
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    rendererInstallation,
    interaction,
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!commands || !kernel) throw new Error('Expected Interaction recovery Runtime Services.');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: nodeId('recovered-interaction-node'),
      type: 'task',
      position: { x: 0, y: 0 },
      data: null,
    });
  });

  first.emit(spaceInput('key.down'));
  first.emit(pointerInput('pointer.down', 0));
  first.emit(pointerInput('pointer.move', 10));
  expect(first.interactions.at(-1)?.type).toBe('viewport-pan');

  await rendererInstallation.dispose();
  expect(interaction.getSnapshot().status).toBe('pending');
  expect(first.interactions.at(-1)).toBeNull();
  expect(first.controls.at(-1)).toBe('release:7');

  const replacement = host.install(createRendererPlugin(() => second));
  await Promise.all([replacement.whenActive(), interaction.whenActive()]);
  second.emit(pointerInput('pointer.down', 0));
  second.emit(pointerInput('pointer.move', 10));
  expect(second.interactions.at(-1)?.type).toBe('node-drag');
  await expect(commands.execute(moveNodesCommand, { moves: [] })).rejects.toMatchObject({
    domain: 'interaction',
    code: 'INVALID_MOVE',
  });

  await host.dispose();
});

test('an input-driven Command rejection is reported exactly once while Interaction is active', async () => {
  const faults: DiagnosticFault[] = [];
  const runtime = await activateCommandFaultScenario(faults);

  runtime.renderer.emit(pointerInput('pointer.down', 0));
  runtime.renderer.emit(pointerInput('pointer.move', Number.NaN));
  runtime.renderer.emit(pointerInput('pointer.up', Number.NaN));
  await nextTask();

  expect(faults).toHaveLength(1);
  expect(faults[0]?.event.name).toBe('nodebraid.plugin.interaction.command.fault');
  expect(faults[0]?.error).toMatchObject({ domain: 'interaction', code: 'INVALID_MOVE' });
  await runtime.host.dispose();
});

test('a late Command rejection cannot report through an ended Interaction Activation', async () => {
  const faults: DiagnosticFault[] = [];
  const runtime = await activateCommandFaultScenario(faults);

  runtime.renderer.emit(pointerInput('pointer.down', 0));
  runtime.renderer.emit(pointerInput('pointer.move', Number.NaN));
  runtime.renderer.emit(pointerInput('pointer.up', Number.NaN));
  await runtime.interaction.dispose();
  await nextTask();

  expect(faults).toEqual([]);
  await runtime.host.dispose();
});

test('a recovered Renderer reset receives the still-compatible Active Gesture again', async () => {
  const faults: DiagnosticFault[] = [];
  const renderer = new LifecycleRenderer();
  let kernel: KernelService | undefined;
  const consumer = definePlugin({
    requires: { kernel: kernelService },
    setup(context) {
      kernel = context.services.kernel;
    },
  });
  const host = createPluginHost({ diagnostics: { faultReporter: (fault) => faults.push(fault) } });
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    host.install(createRendererPlugin(() => renderer)),
    host.install(interactionPlugin),
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!kernel) throw new Error('Expected recovered Gesture Kernel Service.');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: nodeId('recovered-interaction-node'),
      type: 'task',
      position: { x: 0, y: 0 },
      data: null,
    });
  });
  renderer.emit(pointerInput('pointer.down', 0));
  renderer.emit(pointerInput('pointer.move', 10));
  const preview = renderer.interactions.at(-1);
  if (!preview) throw new Error('Expected Active Gesture Preview before Renderer recovery.');
  const syncError = new Error('injected active Gesture synchronization failure');
  renderer.rejectNextCommitWith = syncError;

  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: nodeId('unrelated-during-drag'),
      type: 'task',
      position: { x: 100, y: 100 },
      data: null,
    });
  });

  expect(faults.map((fault) => fault.error)).toEqual([syncError]);
  expect(renderer.interactions).toEqual([preview, preview]);
  renderer.emit(pointerInput('pointer.up', 10));
  await nextTask();
  expect(kernel.read().query.getNode(nodeId('recovered-interaction-node'))?.position).toEqual({ x: 10, y: 10 });
  await host.dispose();
});

async function activateCommandFaultScenario(faults: DiagnosticFault[]): Promise<{
  readonly host: ReturnType<typeof createPluginHost>;
  readonly interaction: ReturnType<ReturnType<typeof createPluginHost>['install']>;
  readonly renderer: LifecycleRenderer;
}> {
  const renderer = new LifecycleRenderer();
  let kernel: KernelService | undefined;
  const consumer = definePlugin({
    requires: { kernel: kernelService },
    setup(context) {
      kernel = context.services.kernel;
    },
  });
  const host = createPluginHost({ diagnostics: { faultReporter: (fault) => faults.push(fault) } });
  const interaction = host.install(interactionPlugin);
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    host.install(createRendererPlugin(() => renderer)),
    interaction,
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!kernel) throw new Error('Expected Command fault Kernel Service.');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: nodeId('recovered-interaction-node'),
      type: 'task',
      position: { x: 0, y: 0 },
      data: null,
    });
  });
  return { host, interaction, renderer };
}

class CleanupFailureRenderer implements CanvasRenderer {
  readonly stopInputError = new Error('injected Input unsubscribe failure');
  readonly clearProjectionError = new Error('injected Projection clear failure');
  readonly releasePointerError = new Error('injected Pointer release failure');
  readonly cleanupCalls: string[] = [];
  readonly #listeners = new Set<RendererInputListener>();
  failCleanup = false;
  connectionMode = false;
  hitTestError: unknown;
  projectionClearCount = 0;
  releasePointerCount = 0;

  updateDocument(_update: RendererDocumentUpdate): void {}
  updateSession(_snapshot: SessionSnapshot): void {}
  updateInteraction(projection: InteractionProjection | null): void {
    if (projection !== null) return;
    this.projectionClearCount += 1;
    if (!this.failCleanup) return;
    this.cleanupCalls.push('clear-projection');
    throw this.clearProjectionError;
  }
  subscribeInput(listener: RendererInputListener): () => void {
    this.#listeners.add(listener);
    return () => {
      if (this.failCleanup) {
        this.cleanupCalls.push('stop-input');
        throw this.stopInputError;
      }
      this.#listeners.delete(listener);
    };
  }
  hitTest(point: ScreenPoint): HitResult {
    if (point.x !== 0 && this.hitTestError !== undefined) throw this.hitTestError;
    if (this.connectionMode) {
      return {
        type: 'connection-anchor',
        nodeId: nodeId(point.x === 0 ? 'source' : 'target'),
        role: point.x === 0 ? 'source' : 'target',
        worldPoint: point,
      };
    }
    return { type: 'canvas', worldPoint: { x: 0, y: 0 } };
  }
  capturePointer(_pointerId: number): void {}
  releasePointer(pointerId: number): void {
    this.releasePointerCount += 1;
    if (!this.failCleanup) return;
    this.cleanupCalls.push(`release:${pointerId}`);
    throw this.releasePointerError;
  }
  focus(): void {}
  dispose(): Promise<void> {
    this.#listeners.clear();
    return Promise.resolve();
  }
  emit(input: RendererInput): void {
    for (const listener of this.#listeners) listener(input);
  }
}

class LifecycleRenderer implements CanvasRenderer {
  readonly controls: string[] = [];
  readonly interactions: Array<InteractionProjection | null> = [];
  readonly #listeners = new Set<RendererInputListener>();
  rejectNextCommitWith: unknown;
  connectionMode = false;

  updateDocument(update: RendererDocumentUpdate): void {
    if (update.type !== 'commit' || this.rejectNextCommitWith === undefined) return;
    const error = this.rejectNextCommitWith;
    this.rejectNextCommitWith = undefined;
    throw error;
  }
  updateSession(_snapshot: SessionSnapshot): void {}
  updateInteraction(projection: InteractionProjection | null): void {
    this.interactions.push(projection);
  }
  subscribeInput(listener: RendererInputListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
  hitTest(point: ScreenPoint): HitResult {
    if (this.connectionMode) {
      return {
        type: 'connection-anchor',
        nodeId: nodeId(point.x === 0 ? 'source' : 'target'),
        role: point.x === 0 ? 'source' : 'target',
        worldPoint: point,
      };
    }
    return { type: 'node', nodeId: nodeId('recovered-interaction-node'), worldPoint: { x: 0, y: 0 } };
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
  dispose(): Promise<void> {
    this.#listeners.clear();
    return Promise.resolve();
  }
  emit(input: RendererInput): void {
    for (const listener of this.#listeners) listener(input);
  }
}

function pointerInput(type: 'pointer.down' | 'pointer.move' | 'pointer.up', coordinate: number): RendererInput {
  return {
    type,
    pointerId: 7,
    pointerType: 'mouse',
    screenPoint: { x: coordinate, y: coordinate },
    worldPoint: { x: coordinate, y: coordinate },
    button: type === 'pointer.move' ? null : 'primary',
    pressedButtons: type === 'pointer.up' ? [] : ['primary'],
    modifiers: { alt: false, control: false, meta: false, shift: false },
  };
}

function spaceInput(type: 'key.down' | 'key.up'): RendererInput {
  return {
    type,
    key: ' ',
    code: 'Space',
    repeat: false,
    modifiers: { alt: false, control: false, meta: false, shift: false },
  };
}

function escapeInput(): RendererInput {
  return {
    type: 'key.down',
    key: 'Escape',
    code: 'Escape',
    repeat: false,
    modifiers: { alt: false, control: false, meta: false, shift: false },
  };
}

function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
