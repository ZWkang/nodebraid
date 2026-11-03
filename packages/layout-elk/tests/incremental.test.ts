import { expect, test } from 'bun:test';

import { createCanvasKernel, edgeId, nodeId } from '@nodebraid/kernel';
import { createLayoutInput, type LayoutError } from '@nodebraid/layout-api';

import { elkLayoutEngine } from '../src';

test('ELK Stress keeps Fixed Nodes and their connected layout in absolute world coordinates', async () => {
  const leftId = nodeId('left');
  const movableId = nodeId('movable');
  const rightId = nodeId('right');
  const kernel = createCanvasKernel();
  kernel.transact((transaction) => {
    for (const [id, position] of [
      [leftId, { x: 100, y: 100 }],
      [movableId, { x: 250, y: 260 }],
      [rightId, { x: 400, y: 100 }],
    ] as const) {
      transaction.nodes.add({
        id,
        type: 'task',
        position,
        size: { width: 80, height: 40 },
        data: null,
      });
    }
    transaction.edges.add({
      id: edgeId('left-movable'),
      type: 'flow',
      source: { nodeId: leftId },
      target: { nodeId: movableId },
      data: null,
    });
    transaction.edges.add({
      id: edgeId('movable-right'),
      type: 'flow',
      source: { nodeId: movableId },
      target: { nodeId: rightId },
      data: null,
    });
  });
  const input = createLayoutInput(kernel.read(), {
    mode: 'full',
    fixedNodeIds: [leftId, rightId],
  });

  const proposal = await elkLayoutEngine.compute(
    input,
    { algorithm: 'stress', padding: 0, randomSeed: 1 },
    { signal: new AbortController().signal },
  );
  const positions = new Map(proposal.positions.map((position) => [position.id, position.position]));

  expect(positions.get(leftId)).toEqual({ x: 100, y: 100 });
  expect(positions.get(rightId)).toEqual({ x: 400, y: 100 });
  expect(Math.abs(positions.get(movableId)!.y - 100)).toBeLessThan(160);

  const offset = { x: 1000, y: -700 };
  kernel.transact((transaction) => {
    for (const node of input.nodes) {
      transaction.nodes.replace(node.id, {
        ...transaction.query.getNode(node.id)!,
        position: { x: node.position.x + offset.x, y: node.position.y + offset.y },
      });
    }
  });
  const translated = await elkLayoutEngine.compute(
    createLayoutInput(kernel.read(), { mode: 'full', fixedNodeIds: [leftId, rightId] }),
    { algorithm: 'stress', padding: 0, randomSeed: 1 },
    { signal: new AbortController().signal },
  );
  const moved = translated.positions.find(({ id }) => id === movableId)!.position;
  expect(moved.x).toBeCloseTo(positions.get(movableId)!.x + offset.x, 6);
  expect(moved.y).toBeCloseTo(positions.get(movableId)!.y + offset.y, 6);
});

test('ELK Stress incremental layout uses current positions as a deterministic soft constraint', async () => {
  const alphaId = nodeId('alpha');
  const betaId = nodeId('beta');
  const gammaId = nodeId('gamma');
  const kernel = createCanvasKernel();
  kernel.transact((transaction) => {
    for (const [id, position] of [
      [alphaId, { x: 500, y: 300 }],
      [betaId, { x: 650, y: 450 }],
      [gammaId, { x: 800, y: 300 }],
    ] as const) {
      transaction.nodes.add({
        id,
        type: 'task',
        position,
        size: { width: 80, height: 40 },
        data: null,
      });
    }
    transaction.edges.add({
      id: edgeId('alpha-beta'),
      type: 'flow',
      source: { nodeId: alphaId },
      target: { nodeId: betaId },
      data: null,
    });
    transaction.edges.add({
      id: edgeId('beta-gamma'),
      type: 'flow',
      source: { nodeId: betaId },
      target: { nodeId: gammaId },
      data: null,
    });
  });
  const fullInput = createLayoutInput(kernel.read(), { mode: 'full', fixedNodeIds: [] });
  const incrementalInput = createLayoutInput(kernel.read(), { mode: 'incremental', fixedNodeIds: [] });
  const config = { algorithm: 'stress' as const, padding: 0, randomSeed: 1 };
  const context = { signal: new AbortController().signal };

  const [full, incremental, repeated] = await Promise.all([
    elkLayoutEngine.compute(fullInput, config, context),
    elkLayoutEngine.compute(incrementalInput, config, context),
    elkLayoutEngine.compute(incrementalInput, config, context),
  ]);
  const sourcePositions = new Map(incrementalInput.nodes.map((node) => [node.id, node.position]));
  const movement = (positions: typeof full.positions) =>
    positions.reduce((total, result) => {
      const source = sourcePositions.get(result.id)!;
      return total + Math.abs(result.position.x - source.x) + Math.abs(result.position.y - source.y);
    }, 0);

  expect(movement(incremental.positions)).toBeGreaterThan(0);
  expect(movement(incremental.positions)).toBeLessThan(movement(full.positions));
  expect(incremental).toEqual(repeated);
});

test('ELK rejects incremental and Fixed Node requests for unproven algorithms', async () => {
  const taskId = nodeId('task');
  const kernel = createCanvasKernel();
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: taskId,
      type: 'task',
      position: { x: 100, y: 100 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  const inputs = [
    createLayoutInput(kernel.read(), { mode: 'incremental', fixedNodeIds: [] }),
    createLayoutInput(kernel.read(), { mode: 'full', fixedNodeIds: [taskId] }),
  ];
  const errors = [];
  for (const input of inputs) {
    try {
      await elkLayoutEngine.compute(input, { algorithm: 'layered' }, { signal: new AbortController().signal });
      errors.push(undefined);
    } catch (reason) {
      const error = reason as LayoutError;
      errors.push({ code: error.code, details: error.details });
    }
  }

  expect(errors).toEqual([
    {
      code: 'UNSUPPORTED_FEATURE',
      details: { feature: 'incremental', providerId: 'elk', algorithm: 'layered' },
    },
    {
      code: 'UNSUPPORTED_FEATURE',
      details: { feature: 'fixedNodes', providerId: 'elk', algorithm: 'layered' },
    },
  ]);
});
