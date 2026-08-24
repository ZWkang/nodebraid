import { expect, test } from 'bun:test';

import { createCanvasKernel, edgeId, nodeId } from '@nodebraid/kernel';
import { createLayoutInput } from '@nodebraid/layout-api';
import { registerFullLayoutProviderContract } from '../../../tests/layout-provider-contract';

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

registerFullLayoutProviderContract({
  name: 'ELK',
  engine: elkLayoutEngine,
  config: {},
  capabilities: { incremental: true, fixedNodes: true, selfLoops: true },
});

test('ELK rejects a non-finite Provider configuration before layout', async () => {
  const input = createLayoutInput(createCanvasKernel().read(), { mode: 'full', fixedNodeIds: [] });

  let error: unknown;
  try {
    await elkLayoutEngine.compute(input, { nodeSpacing: Number.NaN }, { signal: new AbortController().signal });
  } catch (reason) {
    error = reason;
  }

  expect({ type: error?.constructor.name, message: (error as Error | undefined)?.message }).toEqual({
    type: 'RangeError',
    message: 'ELK nodeSpacing must be a finite non-negative number.',
  });
});
