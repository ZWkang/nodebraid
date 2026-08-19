import { expect, test } from 'bun:test';

import { createCanvasKernel, nodeId } from '@cflow/kernel';

import { createLayoutInput, defineLayoutEngine, type LayoutError, type LayoutProposal } from '../src';

test('a Layout Engine rejects incomplete, foreign, invalid, or constraint-breaking positions', async () => {
  const alphaId = nodeId('alpha');
  const betaId = nodeId('beta');
  const foreignId = nodeId('foreign');
  const kernel = createCanvasKernel();
  kernel.transact((transaction) => {
    for (const [id, x] of [
      [alphaId, 10],
      [betaId, 20],
    ] as const) {
      transaction.nodes.add({
        id,
        type: 'task',
        position: { x, y: 0 },
        size: { width: 80, height: 40 },
        data: null,
      });
    }
  });
  const input = createLayoutInput(kernel.read(), { mode: 'full', fixedNodeIds: [alphaId] });
  const proposals: LayoutProposal[] = [
    {
      sourceRevision: 1,
      positions: [
        { id: alphaId, position: { x: 10, y: 0 } },
        { id: alphaId, position: { x: 10, y: 0 } },
      ],
    },
    { sourceRevision: 1, positions: [{ id: alphaId, position: { x: 10, y: 0 } }] },
    {
      sourceRevision: 1,
      positions: [
        { id: alphaId, position: { x: 10, y: 0 } },
        { id: betaId, position: { x: 20, y: 0 } },
        { id: foreignId, position: { x: 30, y: 0 } },
      ],
    },
    {
      sourceRevision: 1,
      positions: [
        { id: alphaId, position: { x: 10, y: 0 } },
        { id: betaId, position: { x: Number.NaN, y: 0 } },
      ],
    },
    {
      sourceRevision: 1,
      positions: [
        { id: alphaId, position: { x: 11, y: 0 } },
        { id: betaId, position: { x: 20, y: 0 } },
      ],
    },
  ];

  const errors = [];
  for (const [index, proposal] of proposals.entries()) {
    const engine = defineLayoutEngine<Record<string, never>>({
      id: `invalid.${index}`,
      capabilities: { incremental: false, fixedNodes: true, selfLoops: false },
      compute: () => proposal,
    });
    try {
      await engine.compute(input, {}, { signal: new AbortController().signal });
      errors.push(undefined);
    } catch (reason) {
      const error = reason as LayoutError;
      errors.push({ code: error.code, details: error.details });
    }
  }

  expect(errors).toEqual([
    { code: 'INVALID_PROPOSAL', details: { issue: 'DUPLICATE_NODE', nodeId: alphaId } },
    { code: 'INVALID_PROPOSAL', details: { issue: 'MISSING_NODE', nodeId: betaId } },
    { code: 'INVALID_PROPOSAL', details: { issue: 'UNKNOWN_NODE', nodeId: foreignId } },
    {
      code: 'INVALID_PROPOSAL',
      details: { issue: 'INVALID_POSITION', nodeId: betaId, coordinate: 'x', value: Number.NaN },
    },
    {
      code: 'INVALID_PROPOSAL',
      details: {
        issue: 'FIXED_NODE_MOVED',
        nodeId: alphaId,
        expected: { x: 10, y: 0 },
        actual: { x: 11, y: 0 },
      },
    },
  ]);
});

test('a Proposal must identify the Layout Input revision', async () => {
  const kernel = createCanvasKernel();
  const input = createLayoutInput(kernel.read(), { mode: 'full', fixedNodeIds: [] });
  const engine = defineLayoutEngine<Record<string, never>>({
    id: 'invalid.revision',
    capabilities: { incremental: false, fixedNodes: false, selfLoops: false },
    compute: () => ({ sourceRevision: 1, positions: [] }),
  });

  let error: LayoutError | undefined;
  try {
    await engine.compute(input, {}, { signal: new AbortController().signal });
  } catch (reason) {
    error = reason as LayoutError;
  }

  expect(error && { code: error.code, details: error.details }).toEqual({
    code: 'INVALID_PROPOSAL',
    details: { issue: 'SOURCE_REVISION_MISMATCH', expectedRevision: 0, sourceRevision: 1 },
  });
});
