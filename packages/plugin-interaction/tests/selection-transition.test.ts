import { expect, test } from 'bun:test';

import { nodeId } from '@nodebraid/kernel';

import { computeClickSelection } from '../src/selection-transition';

test('a Port click selects its owning Node without inventing a Port selection', () => {
  const ownerId = nodeId('port-owner');

  expect(
    computeClickSelection(
      { nodeIds: [], edgeIds: [] },
      { type: 'port', nodeId: ownerId, portId: 'output', worldPoint: { x: 10, y: 20 } },
      false,
    ),
  ).toEqual({ nodeIds: [ownerId], edgeIds: [] });
});
