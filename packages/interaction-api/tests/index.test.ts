import { expect, test } from 'bun:test';

import { nodeId } from '@cflow/kernel';

import type { InteractionProjection } from '../src';

test('describes backend-neutral Interaction Projection values', () => {
  const projection: InteractionProjection = {
    type: 'node-drag',
    nodes: [
      {
        nodeId: nodeId('node'),
        basePosition: { x: 10, y: 20 },
        position: { x: 30, y: 40 },
      },
    ],
  };

  expect(projection).toEqual({
    type: 'node-drag',
    nodes: [
      {
        nodeId: nodeId('node'),
        basePosition: { x: 10, y: 20 },
        position: { x: 30, y: 40 },
      },
    ],
  });
});
