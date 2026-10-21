import { expect, test } from 'bun:test';

import { createCanvasKernel, edgeId, nodeId } from '@nodebraid/kernel';

import { createLayoutInput, type LayoutError, type LayoutInputOptions } from '../src';

test('invalid mode and Fixed Node identities are rejected as invalid Layout Requests', () => {
  const taskId = nodeId('task');
  const missingId = nodeId('missing');
  const kernel = createCanvasKernel();
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: taskId,
      type: 'task',
      position: { x: 0, y: 0 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });

  const invalidOptions: LayoutInputOptions[] = [
    { mode: 'unknown' as LayoutInputOptions['mode'], fixedNodeIds: [] },
    { mode: { secret: 'domain-data' } as never, fixedNodeIds: [] },
    { mode: 'full', fixedNodeIds: [taskId, taskId] },
    { mode: 'full', fixedNodeIds: [missingId] },
  ];
  const errors = invalidOptions.map((options) => {
    try {
      createLayoutInput(kernel.read(), options);
      return undefined;
    } catch (reason) {
      const error = reason as LayoutError;
      return { code: error.code, details: error.details };
    }
  });

  expect(errors).toEqual([
    { code: 'INVALID_REQUEST', details: { issue: 'INVALID_MODE', mode: 'unknown' } },
    { code: 'INVALID_REQUEST', details: { issue: 'INVALID_MODE', receivedType: 'object' } },
    { code: 'INVALID_REQUEST', details: { issue: 'DUPLICATE_FIXED_NODE', nodeId: taskId } },
    { code: 'INVALID_REQUEST', details: { issue: 'UNKNOWN_FIXED_NODE', nodeId: missingId } },
  ]);
});

test('nested Nodes are rejected as unsupported Layout Inputs', () => {
  const parentId = nodeId('parent');
  const childId = nodeId('child');
  const nestedKernel = createCanvasKernel();
  nestedKernel.transact((transaction) => {
    transaction.nodes.add({
      id: parentId,
      type: 'group',
      position: { x: 0, y: 0 },
      size: { width: 200, height: 120 },
      data: null,
    });
    transaction.nodes.add({
      id: childId,
      type: 'task',
      position: { x: 20, y: 20 },
      size: { width: 80, height: 40 },
      parentId,
      data: null,
    });
  });

  let failure: LayoutError | undefined;
  try {
    createLayoutInput(nestedKernel.read(), { mode: 'full', fixedNodeIds: [] });
  } catch (error) {
    failure = error as LayoutError;
  }
  expect({ code: failure?.code, details: failure?.details }).toEqual({
    code: 'INVALID_INPUT',
    details: { issue: 'UNSUPPORTED_NESTING', nodeId: childId, parentId },
  });
});

test('mixed Port Endpoints project to Node topology without changing the Document', () => {
  const sourceId = nodeId('source');
  const targetId = nodeId('target');
  const kernel = createCanvasKernel();
  kernel.transact((transaction) => {
    for (const id of [sourceId, targetId]) {
      transaction.nodes.add({
        id,
        type: 'task',
        position: { x: 0, y: 0 },
        size: { width: 80, height: 40 },
        data: null,
      });
    }
    for (const [id, source, target] of [
      ['both', { nodeId: sourceId, portId: 'out-a' }, { nodeId: targetId, portId: 'in-a' }],
      ['plain', { nodeId: sourceId }, { nodeId: targetId }],
      ['source', { nodeId: sourceId, portId: 'out-b' }, { nodeId: targetId }],
      ['target', { nodeId: sourceId }, { nodeId: targetId, portId: 'in-b' }],
    ] as const) {
      transaction.edges.add({ id: edgeId(id), type: 'flow', source, target, data: null });
    }
  });
  const view = kernel.read();
  const input = createLayoutInput(view, { mode: 'full', fixedNodeIds: [] });
  expect(input.edges).toEqual([
    { id: edgeId('both'), sourceNodeId: sourceId, targetNodeId: targetId },
    { id: edgeId('plain'), sourceNodeId: sourceId, targetNodeId: targetId },
    { id: edgeId('source'), sourceNodeId: sourceId, targetNodeId: targetId },
    { id: edgeId('target'), sourceNodeId: sourceId, targetNodeId: targetId },
  ]);
  expect(kernel.read()).toBe(view);
  expect(view.query.getEdge(edgeId('both'))?.source.portId).toBe('out-a');
  expect(view.query.getEdge(edgeId('both'))?.target.portId).toBe('in-a');
});
