import { expect, test } from 'bun:test';

import { createCanvasKernel, edgeId, nodeId } from '../src';

const sourceId = nodeId('source');
const targetId = nodeId('target');
const connectionId = edgeId('connection');

function createGraph() {
  const kernel = createCanvasKernel();
  kernel.transact((transaction) => {
    transaction.nodes.add({ id: sourceId, type: 'node', position: { x: 0, y: 0 }, data: null });
    transaction.nodes.add({ id: targetId, type: 'node', position: { x: 10, y: 0 }, data: null });
    transaction.edges.add({
      id: connectionId,
      type: 'edge',
      source: { nodeId: sourceId },
      target: { nodeId: targetId },
      data: null,
    });
  });
  return kernel;
}

test('reuses the frozen Edge Snapshot collection when only Nodes are written', () => {
  const kernel = createGraph();
  const before = kernel.read();
  const source = before.query.getNode(sourceId)!;
  const commit = kernel.transact((transaction) => {
    transaction.nodes.replace(sourceId, { ...source, position: { x: 1, y: 0 } });
  })!;

  expect(commit.after.snapshot.edges).toBe(before.snapshot.edges);
  expect(Object.isFrozen(commit.after.snapshot.edges)).toBe(true);
  expect(commit.after.snapshot.nodes).not.toBe(before.snapshot.nodes);
  expect(commit.after.snapshot.nodes[0]).toBe(commit.after.query.getNode(sourceId)!);
  expect(commit.after.snapshot.edges[0]).toBe(commit.after.query.getEdge(connectionId)!);
  expect(before.query.getNode(sourceId)).toBe(source);
  expect(source.position).toEqual({ x: 0, y: 0 });
});

test('reuses the frozen Node Snapshot collection when only Edges are written', () => {
  const kernel = createGraph();
  const before = kernel.read();
  const edge = before.query.getEdge(connectionId)!;
  const commit = kernel.transact((transaction) => {
    transaction.edges.replace(connectionId, {
      ...edge,
      source: edge.target,
      target: edge.source,
    });
  })!;

  expect(commit.after.snapshot.nodes).toBe(before.snapshot.nodes);
  expect(Object.isFrozen(commit.after.snapshot.nodes)).toBe(true);
  expect(commit.after.snapshot.edges).not.toBe(before.snapshot.edges);
  expect(commit.after.snapshot.edges[0]).toBe(commit.after.query.getEdge(connectionId)!);
  expect(commit.after.query.getIncomingEdges(sourceId)).toEqual(commit.after.snapshot.edges);
  expect(before.query.getIncomingEdges(sourceId)).toEqual([]);
  expect(before.query.getOutgoingEdges(sourceId)).toEqual([edge]);
});

test.each(['node', 'edge'] as const)(
  'keeps Snapshot and Query identity aligned when a touched %s has no net value change',
  (unchangedKind) => {
    const kernel = createGraph();
    const before = kernel.read();
    const source = before.query.getNode(sourceId)!;
    const edge = before.query.getEdge(connectionId)!;
    const commit = kernel.transact((transaction) => {
      transaction.nodes.replace(sourceId, {
        ...source,
        data: unchangedKind === 'node' ? source.data : 'changed',
      });
      transaction.edges.replace(connectionId, {
        ...edge,
        data: unchangedKind === 'edge' ? edge.data : 'changed',
      });
    })!;

    expect(commit.changeSet.changes).toHaveLength(1);
    expect(commit.changeSet.changes[0]?.entity).toBe(unchangedKind === 'node' ? 'edge' : 'node');
    expect(commit.after.snapshot.nodes[0]).toBe(commit.after.query.getNode(sourceId)!);
    expect(commit.after.snapshot.edges[0]).toBe(commit.after.query.getEdge(connectionId)!);
    expect(commit.after.query.getNode(sourceId)).not.toBe(source);
    expect(commit.after.query.getEdge(connectionId)).not.toBe(edge);
    expect(Object.isFrozen(commit.after.snapshot.nodes)).toBe(true);
    expect(Object.isFrozen(commit.after.snapshot.edges)).toBe(true);
    expect(before.query.getNode(sourceId)).toBe(source);
    expect(before.query.getEdge(connectionId)).toBe(edge);
  },
);

test('keeps net-zero and failed Transactions on the previous Snapshot collections', () => {
  const kernel = createGraph();
  const before = kernel.read();
  const source = before.query.getNode(sourceId)!;
  const moved = { ...source, position: { x: 1, y: 0 } };
  expect(
    kernel.transact((transaction) => {
      transaction.nodes.replace(sourceId, moved);
      transaction.nodes.replace(sourceId, source);
    }),
  ).toBeNull();
  expect(kernel.read()).toBe(before);

  const failure = new Error('commit metadata failed');
  let caught: unknown;
  try {
    kernel.transact((transaction) => transaction.nodes.replace(sourceId, moved), {
      get origin(): string {
        throw failure;
      },
    });
  } catch (error) {
    caught = error;
  }
  expect(caught).toBe(failure);
  expect(kernel.read()).toBe(before);
  expect(before.snapshot.nodes[0]).toBe(source);
  expect(before.query.getOutgoingEdges(sourceId)).toEqual(before.snapshot.edges);
});
