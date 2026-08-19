import { test } from 'bun:test';

import { nodeId } from '@cflow/kernel';
import { createPluginHost } from '@cflow/runtime-cordis';

import { sessionPlugin, type SessionService } from '../src';

test('keeps the public Session Service contract narrow and immutable', () => {
  const verifyServiceTypes = (service: SessionService) => {
    const snapshot = service.getSnapshot();
    service.setSelection({ nodeIds: [nodeId('task')], edgeIds: [] });
    service.clearSelection();
    service.setViewport({ x: 0, y: 0, zoom: 1 });
    // @ts-expect-error Session Snapshots stay immutable.
    snapshot.viewport.zoom = 2;
    // @ts-expect-error Selection collections stay immutable.
    snapshot.selection.nodeIds.push(nodeId('other'));
    // @ts-expect-error Session has no generic patch or batch update seam.
    service.update({ viewport: { x: 0, y: 0, zoom: 1 } });
    // @ts-expect-error Lifecycle disposal belongs to the Plugin Activation.
    service.dispose();
  };
  const verifyPluginTypes = () => {
    const host = createPluginHost();
    host.install(sessionPlugin);
    // @ts-expect-error The official Session Plugin has no configuration.
    host.install(sessionPlugin, {});
  };
  void verifyServiceTypes;
  void verifyPluginTypes;
});
