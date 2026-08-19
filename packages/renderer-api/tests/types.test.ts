import { test } from 'bun:test';

import type { SessionSnapshot } from '@cflow/session-api';

import type { CanvasRenderer, RendererDocumentUpdate, RendererFactory } from '../src';

test('keeps Renderer construction and updates strongly typed', () => {
  const verifyTypes = (
    renderer: CanvasRenderer,
    update: RendererDocumentUpdate,
    snapshot: SessionSnapshot,
    factory: RendererFactory<{ target: string }>,
  ) => {
    renderer.updateDocument(update);
    renderer.updateSession(snapshot);
    const created: CanvasRenderer | PromiseLike<CanvasRenderer> = factory({ target: 'surface' });
    // @ts-expect-error Renderer has no universal mount target.
    renderer.mount(document.body);
    // @ts-expect-error Session updates require the shared Session Snapshot contract.
    renderer.updateSession({ selection: { nodeIds: [] }, viewport: { x: 0, y: 0, zoom: 1 } });
    return created;
  };
  void verifyTypes;
});
