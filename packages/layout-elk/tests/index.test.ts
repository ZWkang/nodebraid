import { expect, test } from 'bun:test';

import { createCanvasKernel, edgeId, nodeId } from '@cflow/kernel';
import { createLayoutInput } from '@cflow/layout-api';

import { elkLayoutEngine } from '../src';

test('ELK computes deterministic top-left world positions for a full Layout Input', async () => {
  const alphaId = nodeId('alpha');
  const betaId = nodeId('beta');
  const kernel = createCanvasKernel();
  kernel.transact((transaction) => {
    for (const id of [alphaId, betaId]) {
      transaction.nodes.add({
        id,
        type: 'task',
        position: { x: 999, y: 999 },
        size: { width: 100, height: 40 },
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
  });
  const input = createLayoutInput(kernel.read(), { mode: 'full', fixedNodeIds: [] });

  const proposal = await elkLayoutEngine.compute(
    input,
    {
      algorithm: 'layered',
      direction: 'RIGHT',
      nodeSpacing: 20,
      layerSpacing: 50,
      padding: 0,
    },
    { signal: new AbortController().signal },
  );

  expect(proposal).toEqual({
    sourceRevision: 1,
    positions: [
      { id: alphaId, position: { x: 0, y: 0 } },
      { id: betaId, position: { x: 150, y: 0 } },
    ],
  });
});

test('ELK full layout supports the baseline graph shapes and self-loops', async () => {
  const alphaId = nodeId('alpha');
  const betaId = nodeId('beta');
  const detachedId = nodeId('detached');
  const kernel = createCanvasKernel();
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: alphaId,
      type: 'task',
      position: { x: 0, y: 0 },
      size: { width: 0, height: 0 },
      data: null,
    });
    for (const id of [betaId, detachedId]) {
      transaction.nodes.add({
        id,
        type: 'task',
        position: { x: 0, y: 0 },
        size: { width: 80, height: 40 },
        data: null,
      });
    }
    transaction.edges.add({
      id: edgeId('alpha-beta-1'),
      type: 'flow',
      source: { nodeId: alphaId },
      target: { nodeId: betaId },
      data: null,
    });
    transaction.edges.add({
      id: edgeId('alpha-beta-2'),
      type: 'flow',
      source: { nodeId: alphaId },
      target: { nodeId: betaId },
      data: null,
    });
    transaction.edges.add({
      id: edgeId('beta-alpha'),
      type: 'flow',
      source: { nodeId: betaId },
      target: { nodeId: alphaId },
      data: null,
    });
    transaction.edges.add({
      id: edgeId('beta-self'),
      type: 'flow',
      source: { nodeId: betaId },
      target: { nodeId: betaId },
      data: null,
    });
  });
  const input = createLayoutInput(kernel.read(), { mode: 'full', fixedNodeIds: [] });
  const emptyInput = createLayoutInput(createCanvasKernel().read(), { mode: 'full', fixedNodeIds: [] });
  const context = { signal: new AbortController().signal };

  const [first, second, empty] = await Promise.all([
    elkLayoutEngine.compute(input, {}, context),
    elkLayoutEngine.compute(input, {}, context),
    elkLayoutEngine.compute(emptyInput, {}, context),
  ]);

  expect({
    capabilities: elkLayoutEngine.capabilities,
    ids: first.positions.map((position) => position.id),
    finite: first.positions.every(({ position }) => Number.isFinite(position.x) && Number.isFinite(position.y)),
    deterministic: JSON.stringify(first) === JSON.stringify(second),
    empty,
  }).toEqual({
    capabilities: { incremental: true, fixedNodes: true, selfLoops: true },
    ids: [alphaId, betaId, detachedId],
    finite: true,
    deterministic: true,
    empty: { sourceRevision: 0, positions: [] },
  });
});
