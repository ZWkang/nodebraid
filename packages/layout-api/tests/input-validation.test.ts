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

test('nested Nodes and Port Endpoints are rejected as unsupported Layout Inputs', () => {
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

  const sourceId = nodeId('source');
  const targetId = nodeId('target');
  const connectionId = edgeId('connection');
  const portKernel = createCanvasKernel();
  portKernel.transact((transaction) => {
    for (const id of [sourceId, targetId]) {
      transaction.nodes.add({
        id,
        type: 'task',
        position: { x: 0, y: 0 },
        size: { width: 80, height: 40 },
        data: null,
      });
    }
    transaction.edges.add({
      id: connectionId,
      type: 'flow',
      source: { nodeId: sourceId, portId: 'out' },
      target: { nodeId: targetId },
      data: null,
    });
  });

  const errors = [nestedKernel.read(), portKernel.read()].map((view) => {
    try {
      createLayoutInput(view, { mode: 'full', fixedNodeIds: [] });
      return undefined;
    } catch (reason) {
      const error = reason as LayoutError;
      return { code: error.code, details: error.details };
    }
  });

  expect(errors).toEqual([
    {
      code: 'INVALID_INPUT',
      details: { issue: 'UNSUPPORTED_NESTING', nodeId: childId, parentId },
    },
    {
      code: 'INVALID_INPUT',
      details: { issue: 'UNSUPPORTED_PORT', edgeId: connectionId, endpoint: 'source', portId: 'out' },
    },
  ]);
});
