import { expect, test } from 'bun:test';

import type { InteractionProjection } from '@nodebraid/interaction-api';
import { nodeId } from '@nodebraid/kernel';
import { commandPlugin } from '@nodebraid/plugin-command';
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
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

import { interactionPlugin } from '../src';

test('Box Selection writes intersecting Node IDs to Session only on pointerup', async () => {
  const runtime = await createBoxSelectionRuntime();
  const beforeRevision = runtime.kernel.read().snapshot.revision;

  runtime.renderer.emit(pointerInput('pointer.down', 20, 20));
  runtime.renderer.emit(pointerInput('pointer.move', 180, 100));

  expect(runtime.renderer.interactions.at(-1)).toEqual({
    type: 'box-selection',
    rect: { x: 20, y: 20, width: 160, height: 80 },
  });
  expect(runtime.session.getSnapshot().selection).toEqual({ nodeIds: [], edgeIds: [] });

  runtime.renderer.emit(pointerInput('pointer.up', 180, 100));

  expect(runtime.renderer.interactions.at(-1)).toBeNull();
  expect(runtime.session.getSnapshot().selection).toEqual({ nodeIds: [nodeId('box-a')], edgeIds: [] });
  expect(runtime.kernel.read().snapshot.revision).toBe(beforeRevision);
  await runtime.host.dispose();
});

for (const modifier of ['shift', 'control', 'meta'] as const) {
  test(`Box Selection ${modifier} modifier merges with the current Selection`, async () => {
    const runtime = await createBoxSelectionRuntime();
    runtime.session.setSelection({ nodeIds: [nodeId('box-a')], edgeIds: [] });

    runtime.renderer.emit(pointerInput('pointer.down', 200, 20, modifier));
    runtime.renderer.emit(pointerInput('pointer.move', 360, 100, modifier));
    runtime.renderer.emit(pointerInput('pointer.up', 360, 100, modifier));

    expect(runtime.session.getSnapshot().selection).toEqual({
      nodeIds: [nodeId('box-a'), nodeId('box-b')],
      edgeIds: [],
    });
    await runtime.host.dispose();
  });
}

test('Box Selection pointer cancellation clears Preview without changing Session', async () => {
  const runtime = await createBoxSelectionRuntime();
  runtime.session.setSelection({ nodeIds: [nodeId('box-b')], edgeIds: [] });

  runtime.renderer.emit(pointerInput('pointer.down', 20, 20));
  runtime.renderer.emit(pointerInput('pointer.move', 360, 100));
  runtime.renderer.emit(pointerInput('pointer.cancel', 360, 100));

  expect(runtime.renderer.interactions.at(-1)).toBeNull();
  expect(runtime.renderer.controls.at(-1)).toBe('release:7');
  expect(runtime.session.getSnapshot().selection).toEqual({ nodeIds: [nodeId('box-b')], edgeIds: [] });
  await runtime.host.dispose();
});

async function createBoxSelectionRuntime(): Promise<{
  readonly host: ReturnType<typeof createPluginHost>;
  readonly renderer: BoxSelectionRenderer;
  readonly kernel: KernelService;
  readonly session: SessionService;
}> {
  const renderer = new BoxSelectionRenderer();
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
    host.install(commandPlugin),
    host.install(sessionPlugin),
    host.install(createRendererPlugin(() => renderer)),
    host.install(interactionPlugin),
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!kernel || !session) throw new Error('Expected Box Selection Runtime Services.');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: nodeId('box-a'),
      type: 'task',
      position: { x: 40, y: 40 },
      size: { width: 80, height: 40 },
      data: null,
    });
    transaction.nodes.add({
      id: nodeId('box-b'),
      type: 'task',
      position: { x: 240, y: 40 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  return { host, renderer, kernel, session };
}

class BoxSelectionRenderer implements CanvasRenderer {
  readonly interactions: Array<InteractionProjection | null> = [];
  readonly controls: string[] = [];
  readonly #listeners = new Set<RendererInputListener>();

  updateDocument(_update: RendererDocumentUpdate): void {}
  updateSession(_snapshot: SessionSnapshot): void {}
  updateInteraction(projection: InteractionProjection | null): void {
    this.interactions.push(projection);
  }
  subscribeInput(listener: RendererInputListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
  hitTest(point: ScreenPoint): HitResult {
    return { type: 'canvas', worldPoint: point };
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

function pointerInput(
  type: 'pointer.down' | 'pointer.move' | 'pointer.up' | 'pointer.cancel',
  x: number,
  y: number,
  modifier?: 'shift' | 'control' | 'meta',
): RendererInput {
  return {
    type,
    pointerId: 7,
    pointerType: 'mouse',
    screenPoint: { x, y },
    worldPoint: { x, y },
    button: type === 'pointer.move' ? null : 'primary',
    pressedButtons: type === 'pointer.up' || type === 'pointer.cancel' ? [] : ['primary'],
    modifiers: {
      alt: false,
      control: modifier === 'control',
      meta: modifier === 'meta',
      shift: modifier === 'shift',
    },
  };
}
