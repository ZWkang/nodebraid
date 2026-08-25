import { expect, test } from 'bun:test';

import { edgeId, nodeId, type CanvasNode } from '@nodebraid/kernel';

import { computeBoxSelection, createWorldRect } from '../src';

test('createWorldRect normalizes reverse and zero-area drags into frozen World Rect values', () => {
  const reverse = createWorldRect({ x: 90, y: 70 }, { x: 20, y: 10 });
  const horizontal = createWorldRect({ x: 20, y: 40 }, { x: 80, y: 40 });

  expect(reverse).toEqual({ x: 20, y: 10, width: 70, height: 60 });
  expect(horizontal).toEqual({ x: 20, y: 40, width: 60, height: 0 });
  expect(Object.isFrozen(reverse)).toBeTrue();
  expect(Object.isFrozen(horizontal)).toBeTrue();
});

test('computeBoxSelection replaces Selection with canonically ordered intersecting Nodes only', () => {
  const nodes = [
    canvasNode('node-a', 20, 20, 40, 40),
    canvasNode('node-b', 100, 20, 40, 40),
    canvasNode('node-c', 200, 20, 40, 40),
    { id: nodeId('node-without-size'), type: 'task', position: { x: 30, y: 30 }, data: null },
  ];

  expect(
    computeBoxSelection(
      { nodeIds: [nodeId('node-c')], edgeIds: [edgeId('selected-edge')] },
      nodes,
      { x: 60, y: 40, width: 40, height: 0 },
      false,
    ),
  ).toEqual({ nodeIds: [nodeId('node-a'), nodeId('node-b')], edgeIds: [] });
});

test('computeBoxSelection additive transition merges Nodes and preserves selected Edges', () => {
  expect(
    computeBoxSelection(
      { nodeIds: [nodeId('node-c')], edgeIds: [edgeId('selected-edge')] },
      [canvasNode('node-a', 20, 20, 40, 40), canvasNode('node-b', 100, 20, 40, 40)],
      { x: 0, y: 0, width: 160, height: 80 },
      true,
    ),
  ).toEqual({
    nodeIds: [nodeId('node-a'), nodeId('node-b'), nodeId('node-c')],
    edgeIds: [edgeId('selected-edge')],
  });
});

function canvasNode(id: string, x: number, y: number, width: number, height: number): CanvasNode {
  return {
    id: nodeId(id),
    type: 'task',
    position: { x, y },
    size: { width, height },
    data: null,
  };
}
