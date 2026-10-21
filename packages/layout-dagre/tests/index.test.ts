import { expect, test } from 'bun:test';

import { createCanvasKernel, edgeId, nodeId } from '@nodebraid/kernel';
import { createLayoutInput } from '@nodebraid/layout-api';
import { registerFullLayoutProviderContract } from '../../../tests/layout-provider-contract';

import { dagreLayoutEngine } from '../src';

test('Dagre computes deterministic top-left world positions for a full Layout Input', async () => {
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

  const proposal = await dagreLayoutEngine.compute(
    input,
    {
      direction: 'LR',
      nodeSpacing: 20,
      edgeSpacing: 10,
      rankSpacing: 50,
      marginX: 0,
      marginY: 0,
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

registerFullLayoutProviderContract({
  name: 'Dagre',
  engine: dagreLayoutEngine,
  config: {},
  capabilities: { incremental: false, fixedNodes: false, selfLoops: true },
});

test('Dagre preserves every edge constraint when opaque IDs contain graphlib delimiters', async () => {
  const kernel = createCanvasKernel();
  const sourceId = nodeId('A');
  const targetIds = [nodeId('B'), nodeId('B\u0001D')];
  kernel.transact((transaction) => {
    for (const id of [sourceId, ...targetIds]) {
      transaction.nodes.add({
        id,
        type: 'task',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 40 },
        data: null,
      });
    }
    for (const [index, id] of [edgeId('D\u0001E'), edgeId('E')].entries()) {
      transaction.edges.add({
        id,
        type: 'flow',
        source: { nodeId: sourceId },
        target: { nodeId: targetIds[index]! },
        data: null,
      });
    }
  });
  const proposal = await dagreLayoutEngine.compute(
    createLayoutInput(kernel.read(), { mode: 'full', fixedNodeIds: [] }),
    { direction: 'LR', rankSpacing: 50 },
    { signal: new AbortController().signal },
  );
  const source = proposal.positions.find((position) => position.id === sourceId)!;
  expect(proposal.positions.map((position) => position.id)).toEqual([sourceId, ...targetIds]);
  for (const id of targetIds) {
    const target = proposal.positions.find((position) => position.id === id)!;
    expect(target.position.x - source.position.x).toBeGreaterThanOrEqual(150);
  }
});

test('Dagre rejects a non-finite Provider configuration before layout', async () => {
  const input = createLayoutInput(createCanvasKernel().read(), { mode: 'full', fixedNodeIds: [] });

  let error: unknown;
  try {
    await dagreLayoutEngine.compute(input, { nodeSpacing: Number.NaN }, { signal: new AbortController().signal });
  } catch (reason) {
    error = reason;
  }

  expect({ type: error?.constructor.name, message: (error as Error | undefined)?.message }).toEqual({
    type: 'RangeError',
    message: 'Dagre nodeSpacing must be a finite non-negative number.',
  });
});
