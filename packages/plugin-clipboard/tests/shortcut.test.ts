import { expect, test } from 'bun:test';

import type { CanvasFragment } from '@nodebraid/canvas-fragment';
import type { InteractionProjection } from '@nodebraid/interaction-api';
import { nodeId } from '@nodebraid/kernel';
import { commandPlugin } from '@nodebraid/plugin-command';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { interactionPlugin } from '@nodebraid/plugin-interaction';
import { portPlugin } from '@nodebraid/plugin-port';
import { createRendererPlugin } from '@nodebraid/plugin-renderer';
import { sessionPlugin, sessionService, type SessionService } from '@nodebraid/plugin-session';
import type {
  CanvasRenderer,
  HitResult,
  InputDisposition,
  KeyboardInput,
  RendererDocumentUpdate,
  RendererInput,
  RendererInputListener,
  ScreenPoint,
} from '@nodebraid/renderer-api';
import type { SessionSnapshot } from '@nodebraid/session-api';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

import { createClipboardPlugin, createClipboardShortcutPlugin } from '../src';

test('default Clipboard Shortcuts route exact Mod+C and Mod+V through Interaction', async () => {
  const renderer = new InputRenderer();
  let text = '';
  let fragment: CanvasFragment | undefined;
  let encodeCount = 0;
  const sourceId = nodeId('shortcut-source');
  const pastedId = nodeId('shortcut-pasted');
  let kernel: KernelService | undefined;
  let session: SessionService | undefined;
  const consumer = definePlugin({
    requires: { kernel: kernelService, session: sessionService },
    setup(context) {
      kernel = context.services.kernel;
      session = context.services.session;
    },
  });
  const host = createPluginHost();
  const installations = [
    host.install(kernelPlugin),
    host.install(portPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    host.install(createRendererPlugin(() => renderer)),
    host.install(interactionPlugin),
    host.install(
      createClipboardPlugin({
        transport: {
          async readText() {
            return text;
          },
          async writeText(value) {
            text = value;
          },
        },
        codec: {
          encode(value) {
            encodeCount += 1;
            fragment = value;
            return 'nodebraid:test';
          },
          decode() {
            return fragment;
          },
        },
        materializeIds: ({ nodeIds }) => ({
          nodes: nodeIds.map((sourceId) => ({ sourceId, materializedId: pastedId })),
          edges: [],
        }),
      }),
    ),
    host.install(createClipboardShortcutPlugin()),
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!kernel || !session) throw new Error('Expected Clipboard Shortcut Runtime Services.');
  kernel.transact((transaction) => {
    transaction.nodes.add({ id: sourceId, type: 'task', position: { x: 0, y: 0 }, data: null });
  });
  session.setSelection({ nodeIds: [sourceId], edgeIds: [] });

  expect(renderer.emit(modInput('KeyC'))).toEqual({ defaultAction: 'prevent' });
  await nextTask();
  expect(text).toBe('nodebraid:test');
  expect(renderer.emit(modInput('KeyV'))).toEqual({ defaultAction: 'prevent' });
  await nextTask();
  expect(kernel.read().query.getNode(pastedId)?.position).toEqual({ x: 24, y: 24 });
  expect(
    renderer.emit({ ...modInput('KeyC'), modifiers: { ...modInput('KeyC').modifiers, shift: true } }),
  ).toBeUndefined();
  expect(
    renderer.emit({ ...modInput('KeyC'), modifiers: { ...modInput('KeyC').modifiers, alt: true } }),
  ).toBeUndefined();
  expect(renderer.emit({ ...modInput('KeyC'), repeat: true })).toEqual({ defaultAction: 'prevent' });
  renderer.emit(pointerInput('pointer.down'));
  expect(renderer.emit(modInput('KeyC'))).toEqual({ defaultAction: 'prevent' });
  renderer.emit(pointerInput('pointer.cancel'));
  await nextTask();
  expect(encodeCount).toBe(1);
  await host.dispose();
});

class InputRenderer implements CanvasRenderer {
  readonly #listeners = new Set<RendererInputListener>();

  updateDocument(_update: RendererDocumentUpdate): void {}
  updateSession(_snapshot: SessionSnapshot): void {}
  updateInteraction(_projection: InteractionProjection | null): void {}
  subscribeInput(listener: RendererInputListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
  hitTest(point: ScreenPoint): HitResult {
    return { type: 'canvas', worldPoint: point };
  }
  capturePointer(_pointerId: number): void {}
  releasePointer(_pointerId: number): void {}
  focus(): void {}
  dispose(): Promise<void> {
    this.#listeners.clear();
    return Promise.resolve();
  }
  emit(input: RendererInput): InputDisposition | undefined {
    let disposition: InputDisposition | undefined;
    for (const listener of this.#listeners) disposition = listener(input) ?? disposition;
    return disposition;
  }
}

function modInput(code: 'KeyC' | 'KeyV'): KeyboardInput {
  return {
    type: 'key.down',
    key: code === 'KeyC' ? 'c' : 'v',
    code,
    repeat: false,
    modifiers: { alt: false, control: false, meta: true, shift: false },
  };
}

function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function pointerInput(type: 'pointer.down' | 'pointer.cancel'): RendererInput {
  return {
    type,
    pointerId: 7,
    pointerType: 'mouse',
    screenPoint: { x: 10, y: 10 },
    worldPoint: { x: 10, y: 10 },
    button: type === 'pointer.down' ? 'primary' : null,
    pressedButtons: type === 'pointer.down' ? ['primary'] : [],
    modifiers: { alt: false, control: false, meta: false, shift: false },
  };
}
