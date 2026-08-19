import { expect, test } from 'bun:test';

import { createCanvasKernel, edgeId, nodeId } from '@cflow/kernel';

import { createLayoutInput, defineLayoutEngine, type LayoutError } from '../src';

test('a low-level Layout Engine rejects unsupported Input capabilities before its Provider runs', async () => {
  const taskId = nodeId('task');
  const kernel = createCanvasKernel();
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: taskId,
      type: 'task',
      position: { x: 0, y: 0 },
      size: { width: 80, height: 40 },
      data: null,
    });
    transaction.edges.add({
      id: edgeId('self'),
      type: 'flow',
      source: { nodeId: taskId },
      target: { nodeId: taskId },
      data: null,
    });
  });
  let providerCalls = 0;
  const engine = defineLayoutEngine<Record<string, never>>({
    id: 'limited',
    capabilities: { incremental: false, fixedNodes: false, selfLoops: false },
    compute(input) {
      providerCalls += 1;
      return {
        sourceRevision: input.revision,
        positions: input.nodes.map((node) => ({ id: node.id, position: node.position })),
      };
    },
  });
  const inputs = [
    createLayoutInput(kernel.read(), { mode: 'incremental', fixedNodeIds: [] }),
    createLayoutInput(kernel.read(), { mode: 'full', fixedNodeIds: [taskId] }),
    createLayoutInput(kernel.read(), { mode: 'full', fixedNodeIds: [] }),
  ];
  const errors = [];
  for (const input of inputs) {
    try {
      await engine.compute(input, {}, { signal: new AbortController().signal });
      errors.push(undefined);
    } catch (reason) {
      const error = reason as LayoutError;
      errors.push({ code: error.code, details: error.details });
    }
  }

  expect({ errors, providerCalls }).toEqual({
    errors: [
      { code: 'UNSUPPORTED_FEATURE', details: { feature: 'incremental', providerId: 'limited' } },
      { code: 'UNSUPPORTED_FEATURE', details: { feature: 'fixedNodes', providerId: 'limited' } },
      { code: 'UNSUPPORTED_FEATURE', details: { feature: 'selfLoops', providerId: 'limited' } },
    ],
    providerCalls: 0,
  });
});
