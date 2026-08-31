import { test } from 'bun:test';

import type { InteractionProjection } from '@nodebraid/interaction-api';
import type { SessionSnapshot } from '@nodebraid/session-api';

import type { CanvasRenderer, InputDisposition, RendererDocumentUpdate, RendererFactory, RendererInput } from '../src';

test('keeps Renderer construction and updates strongly typed', () => {
  const verifyTypes = (
    renderer: CanvasRenderer,
    update: RendererDocumentUpdate,
    snapshot: SessionSnapshot,
    factory: RendererFactory<{ target: string }>,
    input: RendererInput,
  ) => {
    renderer.updateDocument(update);
    renderer.updateSession(snapshot);
    const interaction: InteractionProjection = { type: 'node-drag', nodes: [] };
    renderer.updateInteraction(interaction);
    renderer.updateInteraction(null);
    const created: CanvasRenderer | PromiseLike<CanvasRenderer> = factory({ target: 'surface' });
    renderer.subscribeInput(
      (received): InputDisposition | void => {
        void received;
        return input === received ? { defaultAction: 'prevent' } : undefined;
      },
      (received): InputDisposition | void => (input === received ? { defaultAction: 'prevent' } : undefined),
    );
    // @ts-expect-error Renderer has no universal mount target.
    renderer.mount(document.body);
    // @ts-expect-error Session updates require the shared Session Snapshot contract.
    renderer.updateSession({ selection: { nodeIds: [] }, viewport: { x: 0, y: 0, zoom: 1 } });
    return created;
  };
  void verifyTypes;
});
