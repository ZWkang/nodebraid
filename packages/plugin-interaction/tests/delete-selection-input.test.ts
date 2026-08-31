import { expect, test } from 'bun:test';

import type { DiagnosticEvent, DiagnosticFault } from '@nodebraid/diagnostics';
import type { InteractionProjection } from '@nodebraid/interaction-api';
import { edgeId, nodeId } from '@nodebraid/kernel';
import { commandPlugin, commandService, defineCommand } from '@nodebraid/plugin-command';
import { historyPlugin, historyService, type HistoryService } from '@nodebraid/plugin-history';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { createRendererPlugin } from '@nodebraid/plugin-renderer';
import { sessionPlugin, sessionService, type SessionService } from '@nodebraid/plugin-session';
import type {
  CanvasRenderer,
  HitResult,
  RendererDocumentUpdate,
  RendererInput,
  RendererInputListener,
  ScreenPoint,
} from '@nodebraid/renderer-api';
import type { SessionSnapshot } from '@nodebraid/session-api';
import { createPluginHost, definePlugin, type PluginHostOptions } from '@nodebraid/runtime-cordis';

import { interactionPlugin, interactionShortcutService, type InteractionConfig } from '../src';

test('a live Interaction Shortcut Binding executes its Command and prevents the matched input default', async () => {
  const events: DiagnosticEvent[] = [];
  const renderer = new InputRenderer();
  const command = defineCommand<void, void>('test.shortcut.execute');
  let executions = 0;
  const commandProvider = definePlugin({
    requires: { commands: commandService },
    setup(context) {
      const registration = context.services.commands.register(command, () => {
        executions += 1;
      });
      context.own(() => registration.dispose());
    },
  });
  const shortcutProvider = definePlugin({
    requires: { shortcuts: interactionShortcutService },
    setup(context) {
      const registration = context.services.shortcuts.register({
        shortcut: {
          code: 'KeyD',
          modifierAlternatives: [{ alt: false, control: true, meta: false, shift: false }],
        },
        command,
      });
      context.own(() => registration.dispose());
    },
  });
  const host = createPluginHost({ diagnostics: { sink: (event) => events.push(event) } });
  const commandInstallation = host.install(commandProvider);
  const shortcutInstallation = host.install(shortcutProvider);
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    host.install(createRendererPlugin(() => renderer)),
    host.install(interactionPlugin),
    commandInstallation,
    shortcutInstallation,
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));

  expect(renderer.emit(keyInput('d', 'KeyD', false, { alt: false, control: true, meta: false, shift: false }))).toEqual(
    {
      defaultAction: 'prevent',
    },
  );
  await nextTask();
  expect(executions).toBe(1);

  const conflictingShortcut = host.install(shortcutProvider);
  await expect(conflictingShortcut.whenActive()).rejects.toMatchObject({
    domain: 'interaction',
    code: 'SHORTCUT_ALREADY_REGISTERED',
  });
  await conflictingShortcut.dispose();

  expect(renderer.emit(keyInput('d', 'KeyD', true, { alt: false, control: true, meta: false, shift: false }))).toEqual({
    defaultAction: 'prevent',
  });
  renderer.emit(pointerInput('pointer.down', 'primary', 0));
  expect(renderer.emit(keyInput('d', 'KeyD', false, { alt: false, control: true, meta: false, shift: false }))).toEqual(
    {
      defaultAction: 'prevent',
    },
  );
  renderer.emit(pointerInput('pointer.cancel', 'primary', 0));
  expect(executions).toBe(1);

  await commandInstallation.dispose();
  expect(renderer.emit(keyInput('d', 'KeyD', false, { alt: false, control: true, meta: false, shift: false }))).toEqual(
    {
      defaultAction: 'prevent',
    },
  );
  await nextTask();
  expect(
    events
      .filter((event) => event.name === 'nodebraid.plugin.interaction.input.rejected')
      .map((event) => event.attributes),
  ).toEqual([
    { inputType: 'key.down', reason: 'repeat' },
    { inputType: 'key.down', gestureType: 'box-selection', reason: 'active-gesture' },
    { inputType: 'key.down', reason: 'capability-unavailable' },
  ]);

  await shortcutInstallation.dispose();
  expect(
    renderer.emit(keyInput('d', 'KeyD', false, { alt: false, control: true, meta: false, shift: false })),
  ).toBeUndefined();
  await host.dispose();
});

test('logical Delete key removes the current Selection through the public Renderer Input seam', async () => {
  const { host, kernel, renderer, session } = await activateInputRuntime();

  const sourceId = nodeId('source');
  const targetId = nodeId('target');
  const selectedEdgeId = edgeId('selected-edge');
  kernel.transact((transaction) => {
    transaction.nodes.add({ id: sourceId, type: 'task', position: { x: 0, y: 0 }, data: null });
    transaction.nodes.add({ id: targetId, type: 'task', position: { x: 100, y: 0 }, data: null });
    transaction.edges.add({
      id: selectedEdgeId,
      type: 'flow',
      source: { nodeId: sourceId },
      target: { nodeId: targetId },
      data: null,
    });
  });
  session.setSelection({ nodeIds: [], edgeIds: [selectedEdgeId] });

  renderer.emit({
    type: 'key.down',
    key: 'Delete',
    code: 'Unidentified',
    repeat: false,
    modifiers: { alt: false, control: false, meta: false, shift: false },
  });
  await nextTask();

  expect(kernel.read().snapshot).toMatchObject({ revision: 2, edges: [] });
  expect(session.getSnapshot().selection).toEqual({ nodeIds: [], edgeIds: [] });
  await host.dispose();
});

test('physical Delete accepts modifiers and repeat while empty Selection and Backspace remain no-ops', async () => {
  const { history, host, kernel, renderer, session } = await activateInputRuntime();
  const selectedId = nodeId('selected-for-repeat');
  kernel.transact((transaction) => {
    transaction.nodes.add({ id: selectedId, type: 'task', position: { x: 0, y: 0 }, data: null });
  });
  session.setSelection({ nodeIds: [selectedId], edgeIds: [] });

  renderer.emit(keyInput('Backspace', 'Backspace', false));
  renderer.emit(keyInput('Unidentified', 'Delete', false, { alt: true, control: true, meta: true, shift: true }));
  renderer.emit(keyInput('Unidentified', 'Delete', true));
  await nextTask();

  expect(kernel.read().snapshot).toMatchObject({ revision: 2, nodes: [] });
  expect(session.getSnapshot().selection).toEqual({ nodeIds: [], edgeIds: [] });
  expect(history.getSnapshot()).toEqual({ canUndo: true, canRedo: false });
  renderer.emit(keyInput('Delete', 'Delete', true));
  await nextTask();
  expect(kernel.read().snapshot.revision).toBe(2);
  expect(history.getSnapshot()).toEqual({ canUndo: true, canRedo: false });
  await host.dispose();
});

test('Delete rejects active Box Selection, Node Drag, Viewport Pan, and Connection without cancelling them', async () => {
  for (const gesture of ['box-selection', 'node-drag', 'viewport-pan', 'connection'] as const) {
    const events: DiagnosticEvent[] = [];
    const selectedId = nodeId(`${gesture}-selected`);
    const targetId = nodeId(`${gesture}-target`);
    const { host, kernel, renderer, session } = await activateInputRuntime({
      host: { diagnostics: { sink: (event) => events.push(event) } },
      interaction:
        gesture === 'connection'
          ? {
              connection: {
                materializeEdge({ source, target }) {
                  return { id: edgeId('never-created'), type: 'flow', source, target, data: null };
                },
              },
            }
          : undefined,
    });
    kernel.transact((transaction) => {
      transaction.nodes.add({ id: selectedId, type: 'task', position: { x: 0, y: 0 }, data: null });
      if (gesture === 'connection') {
        transaction.nodes.add({ id: targetId, type: 'task', position: { x: 100, y: 0 }, data: null });
      }
    });
    session.setSelection({ nodeIds: [selectedId], edgeIds: [] });
    renderer.hit =
      gesture === 'node-drag'
        ? { type: 'node', nodeId: selectedId, worldPoint: { x: 0, y: 0 } }
        : gesture === 'connection'
          ? { type: 'connection-anchor', nodeId: selectedId, role: 'source', worldPoint: { x: 0, y: 0 } }
          : { type: 'canvas', worldPoint: { x: 0, y: 0 } };
    const button = gesture === 'viewport-pan' ? 'auxiliary' : 'primary';
    renderer.emit(pointerInput('pointer.down', button, 0));
    renderer.emit(pointerInput('pointer.move', button, 10));
    const projectionBeforeDelete = renderer.interactions.at(-1);

    renderer.emit(
      keyInput('Delete', gesture === 'box-selection' || gesture === 'connection' ? 'Escape' : 'Space', false),
    );
    await nextTask();

    expect(kernel.read().snapshot.revision).toBe(1);
    expect(session.getSnapshot().selection).toEqual({ nodeIds: [selectedId], edgeIds: [] });
    expect(renderer.interactions.at(-1)).toBe(projectionBeforeDelete);
    expect(
      events
        .filter((event) => event.name === 'nodebraid.plugin.interaction.input.rejected')
        .map((event) => event.attributes),
    ).toEqual([{ inputType: 'key.down', gestureType: gesture, reason: 'active-gesture' }]);
    renderer.emit(pointerInput('pointer.cancel', button, 10));
    if (gesture === 'node-drag' || gesture === 'viewport-pan') {
      renderer.hit = { type: 'node', nodeId: selectedId, worldPoint: { x: 0, y: 0 } };
      renderer.emit(pointerInput('pointer.down', 'primary', 0));
      renderer.emit(pointerInput('pointer.move', 'primary', 10));
      expect(renderer.interactions.at(-1)?.type).toBe('node-drag');
      renderer.emit(pointerInput('pointer.cancel', 'primary', 10));
    }
    await host.dispose();
  }
});

test('Delete Transaction failure preserves state and reports the original diagnostic identity exactly once', async () => {
  const faults: DiagnosticFault[] = [];
  const { host, kernel, renderer, session } = await activateInputRuntime({
    host: { diagnostics: { faultReporter: (fault) => faults.push(fault) } },
  });
  const parentId = nodeId('input-parent');
  const childId = nodeId('input-child');
  kernel.transact((transaction) => {
    transaction.nodes.add({ id: parentId, type: 'group', position: { x: 0, y: 0 }, data: null });
    transaction.nodes.add({ id: childId, type: 'task', position: { x: 10, y: 10 }, parentId, data: null });
  });
  session.setSelection({ nodeIds: [parentId], edgeIds: [] });
  const before = kernel.read();

  renderer.emit(keyInput('Delete', 'Delete', false));
  await nextTask();

  expect(kernel.read()).toBe(before);
  expect(session.getSnapshot().selection).toEqual({ nodeIds: [parentId], edgeIds: [] });
  expect(faults).toHaveLength(1);
  expect(faults[0]).toMatchObject({
    event: {
      name: 'nodebraid.plugin.interaction.command.fault',
      attributes: { commandId: 'interaction.selection.delete' },
    },
    error: { domain: 'kernel', code: 'INVALID_GRAPH' },
  });
  await host.dispose();
});

async function activateInputRuntime(
  options: Readonly<{ host?: PluginHostOptions; interaction?: InteractionConfig }> = {},
): Promise<{
  readonly history: HistoryService;
  readonly host: ReturnType<typeof createPluginHost>;
  readonly kernel: KernelService;
  readonly renderer: InputRenderer;
  readonly session: SessionService;
}> {
  let history: HistoryService | undefined;
  let kernel: KernelService | undefined;
  let session: SessionService | undefined;
  const renderer = new InputRenderer();
  const consumer = definePlugin({
    requires: { history: historyService, kernel: kernelService, session: sessionService },
    setup(context) {
      history = context.services.history;
      kernel = context.services.kernel;
      session = context.services.session;
    },
  });
  const host = createPluginHost(options.host);
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    host.install(createRendererPlugin(() => renderer)),
    host.install(interactionPlugin, options.interaction),
    host.install(historyPlugin),
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!history || !kernel || !session) throw new Error('Expected Delete Selection Input Runtime Services.');
  return { history, host, kernel, renderer, session };
}

class InputRenderer implements CanvasRenderer {
  readonly #listeners = new Set<RendererInputListener>();
  readonly interactions: Array<InteractionProjection | null> = [];
  hit: HitResult = { type: 'canvas', worldPoint: { x: 0, y: 0 } };

  updateDocument(_update: RendererDocumentUpdate): void {}
  updateSession(_snapshot: SessionSnapshot): void {}
  updateInteraction(projection: InteractionProjection | null): void {
    this.interactions.push(projection);
  }
  subscribeInput(listener: RendererInputListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
  hitTest(_point: ScreenPoint): HitResult {
    return this.hit;
  }
  capturePointer(_pointerId: number): void {}
  releasePointer(_pointerId: number): void {}
  focus(): void {}
  dispose(): Promise<void> {
    this.#listeners.clear();
    return Promise.resolve();
  }
  emit(input: RendererInput) {
    let disposition;
    for (const listener of this.#listeners) disposition = listener(input) ?? disposition;
    return disposition;
  }
}

function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function keyInput(
  key: string,
  code: string,
  repeat: boolean,
  modifiers = { alt: false, control: false, meta: false, shift: false },
): RendererInput {
  return { type: 'key.down', key, code, repeat, modifiers };
}

function pointerInput(
  type: 'pointer.down' | 'pointer.move' | 'pointer.cancel',
  button: 'primary' | 'auxiliary',
  coordinate: number,
): RendererInput {
  return {
    type,
    pointerId: 7,
    pointerType: 'mouse',
    screenPoint: { x: coordinate, y: coordinate },
    worldPoint: { x: coordinate, y: coordinate },
    button: type === 'pointer.move' || type === 'pointer.cancel' ? null : button,
    pressedButtons: type === 'pointer.cancel' ? [] : [button],
    modifiers: { alt: false, control: false, meta: false, shift: false },
  };
}
