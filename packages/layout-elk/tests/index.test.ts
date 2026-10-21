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

for (const { algorithm, mode } of [
  { algorithm: 'layered', mode: 'full' },
  { algorithm: 'stress', mode: 'full' },
  { algorithm: 'stress', mode: 'incremental' },
] as const) {
  test(`ELK ${algorithm} ${mode} treats seed zero as the fixed default seed`, async () => {
    const kernel = createCanvasKernel();
    const ids = Array.from({ length: 12 }, (_, index) => nodeId(`zero-seed-${index}`));
    kernel.transact((transaction) => {
      for (const [index, id] of ids.entries()) {
        transaction.nodes.add({
          id,
          type: 'task',
          position: mode === 'full' ? { x: 0, y: 0 } : { x: (index % 4) * 100, y: Math.floor(index / 4) * 80 },
          size: { width: 40, height: 20 },
          data: null,
        });
        for (const delta of [1, 4]) {
          transaction.edges.add({
            id: edgeId(`zero-seed-${index}-${delta}`),
            type: 'flow',
            source: { nodeId: id },
            target: { nodeId: ids[(index + delta) % ids.length]! },
            data: null,
          });
        }
      }
    });
    const input = createLayoutInput(kernel.read(), { mode, fixedNodeIds: mode === 'incremental' ? [ids[0]!] : [] });
    const context = { signal: new AbortController().signal };
    const compute = (randomSeed: number) =>
      elkLayoutEngine.compute(input, Object.freeze({ algorithm, randomSeed }), context);
    const expected = await compute(1);

    for (const seed of [0, -0, 0]) expect(await compute(seed)).toEqual(expected);
  });
}

test('ELK rejects non-integer and unsafe seeds', async () => {
  const input = createLayoutInput(createCanvasKernel().read(), { mode: 'full', fixedNodeIds: [] });
  for (const randomSeed of [Number.NaN, Number.POSITIVE_INFINITY, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
    await expect(
      elkLayoutEngine.compute(input, { randomSeed }, { signal: new AbortController().signal }),
    ).rejects.toBeInstanceOf(RangeError);
  }
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
