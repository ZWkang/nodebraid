import { expect, test } from 'bun:test';

import { createCanvasKernel, edgeId, nodeId } from '@cflow/kernel';

import { createLayoutInput, defineLayoutEngine } from '../src';

test('a custom Layout Engine computes a full Layout Proposal from a committed Canvas View', async () => {
  const alphaId = nodeId('alpha');
  const betaId = nodeId('beta');
  const kernel = createCanvasKernel();
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: betaId,
      type: 'task',
      position: { x: 40, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    });
    transaction.nodes.add({
      id: alphaId,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 60, height: 30 },
      data: null,
    });
    transaction.edges.add({
      id: edgeId('alpha-beta'),
      type: 'flow',
      source: { nodeId: alphaId },
      target: { nodeId: betaId },
      data: null,
    });
  });

  const input = createLayoutInput(kernel.read(), { mode: 'full', fixedNodeIds: [] });
  const engine = defineLayoutEngine<{ offset: number }>({
    id: 'test.full',
    capabilities: { incremental: false, fixedNodes: false, selfLoops: false },
    compute(layoutInput, config) {
      return {
        sourceRevision: layoutInput.revision,
        positions: layoutInput.nodes.map((node, index) => ({
          id: node.id,
          position: { x: config.offset + index * 100, y: 50 },
        })),
      };
    },
  });

  const proposal = await engine.compute(input, { offset: 25 }, { signal: new AbortController().signal });

  expect({ input, proposal }).toEqual({
    input: {
      revision: 1,
      mode: 'full',
      nodes: [
        {
          id: alphaId,
          position: { x: 10, y: 20 },
          size: { width: 60, height: 30 },
          fixed: false,
        },
        {
          id: betaId,
          position: { x: 40, y: 20 },
          size: { width: 80, height: 40 },
          fixed: false,
        },
      ],
      edges: [{ id: edgeId('alpha-beta'), sourceNodeId: alphaId, targetNodeId: betaId }],
    },
    proposal: {
      sourceRevision: 1,
      positions: [
        { id: alphaId, position: { x: 25, y: 50 } },
        { id: betaId, position: { x: 125, y: 50 } },
      ],
    },
  });
});

test('Layout data crossing the computation seam is frozen', async () => {
  const taskId = nodeId('task');
  const kernel = createCanvasKernel();
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: taskId,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 60, height: 30 },
      data: null,
    });
  });
  const input = createLayoutInput(kernel.read(), { mode: 'full', fixedNodeIds: [] });
  const engine = defineLayoutEngine<Record<string, never>>({
    id: 'test.frozen',
    capabilities: { incremental: false, fixedNodes: false, selfLoops: false },
    compute(layoutInput) {
      return {
        sourceRevision: layoutInput.revision,
        positions: [{ id: taskId, position: { x: 30, y: 40 } }],
      };
    },
  });

  const proposal = await engine.compute(input, {}, { signal: new AbortController().signal });

  expect(
    [
      engine,
      engine.capabilities,
      input,
      input.nodes,
      input.nodes[0],
      input.nodes[0]?.position,
      input.nodes[0]?.size,
      input.edges,
      proposal,
      proposal.positions,
      proposal.positions[0],
      proposal.positions[0]?.position,
    ].every((value) => Object.isFrozen(value)),
  ).toBe(true);
});

test('a pre-aborted Layout Engine preserves the reason without invoking its Provider', async () => {
  let providerCalls = 0;
  const engine = defineLayoutEngine<Record<string, never>>({
    id: 'test.cancelled',
    capabilities: { incremental: false, fixedNodes: false, selfLoops: false },
    compute(input) {
      providerCalls += 1;
      return { sourceRevision: input.revision, positions: [] };
    },
  });
  const input = createLayoutInput(createCanvasKernel().read(), { mode: 'full', fixedNodeIds: [] });
  const controller = new AbortController();
  const cancellation = new Error('cancel direct Engine');
  controller.abort(cancellation);

  let error: unknown;
  try {
    await engine.compute(input, {}, { signal: controller.signal });
  } catch (reason) {
    error = reason;
  }

  expect({ preservedReason: error === cancellation, providerCalls }).toEqual({
    preservedReason: true,
    providerCalls: 0,
  });
});
