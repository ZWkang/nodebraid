import { expect, test } from 'bun:test';

import { createCanvasKernel, edgeId, nodeId } from '@nodebraid/kernel';

import { acceptCanvasFragment, captureCanvasFragment, materializeCanvasFragment } from '../src';

test('captures the selected-node induced subgraph and explicit Selection in canonical order', () => {
  const kernel = createCanvasKernel();
  const parent = nodeId('parent');
  const child = nodeId('child');
  const outside = nodeId('outside');
  const internal = edgeId('internal');
  const boundary = edgeId('boundary');
  const data = Object.freeze({ opaque: true });
  kernel.transact((transaction) => {
    transaction.nodes.add({ id: parent, type: 'group', position: { x: 0, y: 0 }, data });
    transaction.nodes.add({ id: child, type: 'task', position: { x: 10, y: 20 }, parentId: parent, data });
    transaction.nodes.add({ id: outside, type: 'task', position: { x: 100, y: 100 }, data: null });
    transaction.edges.add({
      id: internal,
      type: 'flow',
      source: { nodeId: parent, portId: 'out' },
      target: { nodeId: child, portId: 'in' },
      data,
    });
    transaction.edges.add({
      id: boundary,
      type: 'flow',
      source: { nodeId: child },
      target: { nodeId: outside },
      data: null,
    });
  });

  const fragment = captureCanvasFragment(kernel.read(), {
    nodeIds: [parent, child],
    edgeIds: [boundary, internal],
  });

  expect(fragment).not.toBeNull();
  expect(fragment?.type).toBe('nodebraid.canvas-fragment');
  expect(fragment?.nodes.map((node) => node.id)).toEqual([child, parent]);
  expect(fragment?.edges.map((edge) => edge.id)).toEqual([internal]);
  expect(fragment?.selection).toEqual({ nodeIds: [child, parent], edgeIds: [internal] });
  expect(fragment?.nodes[0]?.data).toBe(data);
  expect(fragment?.edges[0]?.source.portId).toBe('out');
  expect(Object.isFrozen(fragment)).toBeTrue();
});

test('materializes nested Nodes and port-qualified Edges with fresh IDs and one world offset', () => {
  const parent = nodeId('parent-source');
  const child = nodeId('child-source');
  const externalParent = nodeId('external-parent');
  const internal = edgeId('internal-source');
  const fragment = acceptCanvasFragment({
    type: 'nodebraid.canvas-fragment',
    nodes: [
      { id: parent, type: 'group', position: { x: 0, y: 0 }, parentId: externalParent, data: null },
      { id: child, type: 'task', position: { x: 10, y: 20 }, parentId: parent, data: null },
    ],
    edges: [
      {
        id: internal,
        type: 'flow',
        source: { nodeId: child, portId: 'out' },
        target: { nodeId: child, portId: 'in' },
        data: null,
      },
    ],
    selection: { nodeIds: [parent, child], edgeIds: [internal] },
  });
  const parentCopy = nodeId('parent-copy');
  const childCopy = nodeId('child-copy');
  const edgeCopy = edgeId('edge-copy');

  const result = materializeCanvasFragment(
    fragment,
    {
      nodes: [
        { sourceId: parent, materializedId: parentCopy },
        { sourceId: child, materializedId: childCopy },
      ],
      edges: [{ sourceId: internal, materializedId: edgeCopy }],
    },
    { x: 24, y: 12 },
  );

  expect(result.nodes).toEqual([
    { id: childCopy, type: 'task', position: { x: 34, y: 32 }, parentId: parentCopy, data: null },
    { id: parentCopy, type: 'group', position: { x: 24, y: 12 }, parentId: externalParent, data: null },
  ]);
  expect(result.edges).toEqual([
    {
      id: edgeCopy,
      type: 'flow',
      source: { nodeId: childCopy, portId: 'out' },
      target: { nodeId: childCopy, portId: 'in' },
      data: null,
    },
  ]);
  expect(result.selection).toEqual({ nodeIds: [childCopy, parentCopy], edgeIds: [edgeCopy] });
});

test('accepts one decoded Fragment shell and rejects edges outside its Node set', () => {
  const source = nodeId('source');
  const target = nodeId('target');
  const connection = edgeId('connection');
  const fragment = acceptCanvasFragment({
    type: 'nodebraid.canvas-fragment',
    nodes: [
      { id: target, type: 'task', position: { x: 20, y: 20 }, data: null },
      { id: source, type: 'task', position: { x: 0, y: 0 }, data: null },
    ],
    edges: [
      {
        id: connection,
        type: 'flow',
        source: { nodeId: source },
        target: { nodeId: target },
        data: null,
      },
    ],
    selection: { nodeIds: [target, source], edgeIds: [] },
  });

  expect(fragment.nodes.map((node) => node.id)).toEqual([source, target]);
  expect(fragment.selection.nodeIds).toEqual([source, target]);
  expect(() =>
    acceptCanvasFragment({
      ...fragment,
      edges: [
        {
          id: connection,
          type: 'flow',
          source: { nodeId: source },
          target: { nodeId: nodeId('outside') },
          data: null,
        },
      ],
    }),
  ).toThrow(expect.objectContaining({ domain: 'canvas-fragment', code: 'INVALID_FRAGMENT' }));
});
