import { expect, test } from 'bun:test';

import { edgeId, nodeId } from '@cflow/kernel';

import type { SessionSnapshot } from '../src';

test('describes immutable Session values without Runtime capabilities', () => {
  const snapshot: SessionSnapshot = {
    selection: {
      nodeIds: [nodeId('node')],
      edgeIds: [edgeId('edge')],
    },
    viewport: { x: 10, y: 20, zoom: 2 },
  };

  expect(snapshot).toEqual({
    selection: { nodeIds: [nodeId('node')], edgeIds: [edgeId('edge')] },
    viewport: { x: 10, y: 20, zoom: 2 },
  });
});
