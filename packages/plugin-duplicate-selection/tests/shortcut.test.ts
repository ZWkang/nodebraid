import { expect, test } from 'bun:test';

import type { InteractionProjection } from '@nodebraid/interaction-api';
import { nodeId } from '@nodebraid/kernel';
import { commandPlugin } from '@nodebraid/plugin-command';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { interactionPlugin } from '@nodebraid/plugin-interaction';
import { createRendererPlugin } from '@nodebraid/plugin-renderer';
import { sessionPlugin, sessionService, type SessionService } from '@nodebraid/plugin-session';
import type {
  CanvasRenderer,
  HitResult,
  InputDisposition,
  RendererDocumentUpdate,
  RendererInput,
  RendererInputListener,
  ScreenPoint,
} from '@nodebraid/renderer-api';
import type { SessionSnapshot } from '@nodebraid/session-api';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

import { createDuplicateSelectionPlugin, createDuplicateSelectionShortcutPlugin } from '../src';

test('the default Duplicate Shortcut invokes the public behavior through Mod+D', async () => {
  const sourceId = nodeId('shortcut-source');
  const duplicateId = nodeId('shortcut-duplicate');
  const renderer = new InputRenderer();
  const mutableShortcut = {
    code: 'KeyD',
    modifierAlternatives: [{ alt: false, control: true, meta: false, shift: false }],
  };
  const shortcutPlugin = createDuplicateSelectionShortcutPlugin({ shortcut: mutableShortcut });
  mutableShortcut.code = 'KeyX';
  mutableShortcut.modifierAlternatives[0]!.control = false;
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
    host.install(
      createDuplicateSelectionPlugin({
        materializeIds: () => ({ nodes: [{ sourceId, duplicateId }], edges: [] }),
      }),
    ),
    host.install(shortcutPlugin),
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!kernel || !session) throw new Error('Expected Duplicate Shortcut Runtime Services.');
  kernel.transact((transaction) => {
    transaction.nodes.add({ id: sourceId, type: 'task', position: { x: 0, y: 0 }, data: null });
  });
  session.setSelection({ nodeIds: [sourceId], edgeIds: [] });

  expect(renderer.emit(modDInput())).toEqual({ defaultAction: 'prevent' });
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(kernel.read().query.getNode(duplicateId)?.position).toEqual({ x: 24, y: 24 });
  expect(session.getSnapshot().selection).toEqual({ nodeIds: [duplicateId], edgeIds: [] });
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

function modDInput(): RendererInput {
  return {
    type: 'key.down',
    key: 'd',
    code: 'KeyD',
    repeat: false,
    modifiers: { alt: false, control: true, meta: false, shift: false },
  };
}
