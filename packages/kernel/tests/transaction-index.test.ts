import { expect, test } from 'bun:test';

import { createCanvasKernel, edgeId, nodeId, type TransactionContext } from '../src';

test('keeps Draft and committed parent indexes aligned after a getter replaces the same Node', () => {
  const kernel = createCanvasKernel();
  const firstParent = nodeId('a');
  const secondParent = nodeId('b');
  const childId = nodeId('child');
  kernel.transact((transaction) => {
    transaction.nodes.add({ id: firstParent, type: 'group', position: { x: 0, y: 0 }, data: null });
    transaction.nodes.add({ id: secondParent, type: 'group', position: { x: 0, y: 0 }, data: null });
    transaction.nodes.add({
      id: childId,
      type: 'child',
      position: { x: 0, y: 0 },
      parentId: firstParent,
      data: 'original',
    });
  });
  const before = kernel.read();
  const child = before.query.getNode(childId)!;
  const commit = kernel.transact((transaction) => {
    transaction.nodes.replace(childId, {
      ...child,
      position: { x: 1, y: 0 },
      get data() {
        transaction.nodes.replace(childId, { ...child, parentId: secondParent, data: 'inner' });
        return 'outer';
      },
    });
    const accepted = transaction.query.getNode(childId)!;
    expect(accepted.data).toBe('outer');
    expect(transaction.query.getChildren(firstParent)).toEqual([accepted]);
    expect(transaction.query.getChildren(secondParent)).toEqual([]);
  })!;

  expect(commit.after.query.getChildren(firstParent)).toEqual([commit.after.query.getNode(childId)!]);
  expect(commit.after.query.getChildren(secondParent)).toEqual([]);
  expect(before.query.getChildren(firstParent)).toEqual([child]);
  expect(before.query.getChildren(secondParent)).toEqual([]);
});

const nodeReentryCases = [
  ['add', 'add'],
  ['add', 'add-then-replace'],
  ['replace', 'remove'],
  ['replace', 'remove-then-add'],
] as const;
const edgeReentryCases = [...nodeReentryCases, ['replace', 'replace']] as const;

test.each(nodeReentryCases)('Node %s keeps parent indexes current after nested %s', (outer, inner) => {
  const { kernel, a, b, childId } = relationFixture();
  if (outer === 'add') kernel.transact((transaction) => transaction.nodes.remove(childId));
  const before = kernel.read();
  const original = before.query.getNode(childId);
  const child = { id: childId, type: 'child', position: { x: 1, y: 0 }, parentId: a, data: 'outer' };
  let reads = 0;
  const commit = kernel.transact((transaction) => {
    const input = {
      ...child,
      get data() {
        reads++;
        if (inner === 'add' || inner === 'add-then-replace')
          transaction.nodes.add({ ...child, parentId: b, data: 'inner' });
        if (inner === 'add-then-replace')
          transaction.nodes.replace(childId, { ...child, parentId: b, data: 'inner-replaced' });
        if (inner === 'remove' || inner === 'remove-then-add') transaction.nodes.remove(childId);
        if (inner === 'remove-then-add') transaction.nodes.add({ ...child, parentId: b, data: 'inner-readded' });
        return 'outer';
      },
    };
    if (outer === 'add') transaction.nodes.add(input);
    else transaction.nodes.replace(childId, input);
    const accepted = transaction.query.getNode(childId)!;
    expect(accepted).toEqual(child);
    expect(transaction.query.getChildren(a)).toHaveLength(1);
    expect(transaction.query.getChildren(a)[0]).toBe(accepted);
    expect(transaction.query.getChildren(b)).toEqual([]);
  })!;
  const accepted = commit.after.query.getNode(childId)!;
  expect(reads).toBe(1);
  expect(commit.after.query.getChildren(a)).toHaveLength(1);
  expect(commit.after.query.getChildren(a)[0]).toBe(accepted);
  expect(commit.after.query.getChildren(b)).toEqual([]);
  expect(commit.after.snapshot.nodes.find((node) => node.id === childId)).toBe(accepted);
  expect(commit.changeSet.changes).toEqual([
    { entity: 'node', id: childId, before: original ?? null, after: accepted },
  ]);
  expect(before.query.getChildren(a)).toEqual(original ? [original] : []);
  expect(before.query.getChildren(b)).toEqual([]);
});

test.each(edgeReentryCases)('Edge %s keeps endpoint indexes current after nested %s', (outer, inner) => {
  const { kernel, a, b, c, connectionId } = relationFixture();
  if (outer === 'add') kernel.transact((transaction) => transaction.edges.remove(connectionId));
  const before = kernel.read();
  const original = before.query.getEdge(connectionId);
  const edge = { id: connectionId, type: 'flow', source: { nodeId: a }, target: { nodeId: b }, data: 'outer' };
  const innerEdge = { ...edge, source: { nodeId: b }, target: { nodeId: c }, data: 'inner' };
  let reads = 0;
  const commit = kernel.transact((transaction) => {
    const input = {
      ...edge,
      get data() {
        reads++;
        if (inner === 'add' || inner === 'add-then-replace') transaction.edges.add(innerEdge);
        if (inner === 'replace' || inner === 'add-then-replace') transaction.edges.replace(connectionId, innerEdge);
        if (inner === 'remove' || inner === 'remove-then-add') transaction.edges.remove(connectionId);
        if (inner === 'remove-then-add') transaction.edges.add(innerEdge);
        return 'outer';
      },
    };
    if (outer === 'add') transaction.edges.add(input);
    else transaction.edges.replace(connectionId, input);
    const accepted = transaction.query.getEdge(connectionId)!;
    expect(accepted).toEqual(edge);
    expect(transaction.query.getOutgoingEdges(a)).toHaveLength(1);
    expect(transaction.query.getOutgoingEdges(a)[0]).toBe(accepted);
    expect(transaction.query.getIncomingEdges(b)).toHaveLength(1);
    expect(transaction.query.getIncomingEdges(b)[0]).toBe(accepted);
    expect(transaction.query.getOutgoingEdges(b)).toEqual([]);
    expect(transaction.query.getIncomingEdges(c)).toEqual([]);
  })!;
  const accepted = commit.after.query.getEdge(connectionId)!;
  expect(reads).toBe(1);
  expect(commit.after.query.getOutgoingEdges(a)).toHaveLength(1);
  expect(commit.after.query.getOutgoingEdges(a)[0]).toBe(accepted);
  expect(commit.after.query.getIncomingEdges(b)).toHaveLength(1);
  expect(commit.after.query.getIncomingEdges(b)[0]).toBe(accepted);
  expect(commit.after.query.getOutgoingEdges(b)).toEqual([]);
  expect(commit.after.query.getIncomingEdges(c)).toEqual([]);
  expect(commit.after.snapshot.edges.find((item) => item.id === connectionId)).toBe(accepted);
  expect(commit.changeSet.changes).toEqual([
    { entity: 'edge', id: connectionId, before: original ?? null, after: accepted },
  ]);
  expect(before.query.getOutgoingEdges(a)).toEqual(original ? [original] : []);
  expect(before.query.getIncomingEdges(b)).toEqual(original ? [original] : []);
  expect(before.query.getOutgoingEdges(b)).toEqual([]);
  expect(before.query.getIncomingEdges(c)).toEqual([]);
});

for (const entity of ['node', 'edge'] as const) {
  test.each(['caught', 'escape'] as const)(`${entity} input failure preserves nested writes only when %s`, (mode) => {
    const { kernel, a, b, c, childId, connectionId } = relationFixture();
    const before = kernel.read();
    const child = before.query.getNode(childId)!;
    const edge = before.query.getEdge(connectionId)!;
    const failure = Symbol('original input failure');
    let caught = false;
    let escaped = false;
    let reads = 0;
    try {
      kernel.transact((transaction) => {
        const attempt = () => {
          if (entity === 'node') {
            transaction.nodes.replace(childId, {
              ...child,
              get data() {
                reads++;
                transaction.nodes.replace(childId, { ...child, parentId: b, data: 'inner' });
                throw failure;
              },
            });
          } else {
            transaction.edges.replace(connectionId, {
              ...edge,
              get data() {
                reads++;
                transaction.edges.replace(connectionId, {
                  ...edge,
                  source: { nodeId: b },
                  target: { nodeId: c },
                  data: 'inner',
                });
                throw failure;
              },
            });
          }
        };
        if (mode === 'escape') attempt();
        else {
          try {
            attempt();
          } catch (error) {
            caught = true;
            expect(error).toBe(failure);
          }
          expect(caught).toBeTrue();
          if (entity === 'node') {
            expect(transaction.query.getChildren(a)).toEqual([]);
            expect(transaction.query.getChildren(b)).toEqual([transaction.query.getNode(childId)!]);
          } else {
            expect(transaction.query.getOutgoingEdges(a)).toEqual([]);
            expect(transaction.query.getIncomingEdges(b)).toEqual([]);
            expect(transaction.query.getOutgoingEdges(b)).toEqual([transaction.query.getEdge(connectionId)!]);
            expect(transaction.query.getIncomingEdges(c)).toEqual([transaction.query.getEdge(connectionId)!]);
          }
        }
      });
    } catch (error) {
      escaped = true;
      expect(error).toBe(failure);
    }
    expect(reads).toBe(1);
    expect(escaped).toBe(mode === 'escape');
    expect(caught).toBe(mode === 'caught');
    if (mode === 'escape') expect(kernel.read()).toBe(before);
    else if (entity === 'node') {
      const current = kernel.read().query.getNode(childId)!;
      expect(current.data).toBe('inner');
      expect(kernel.read().query.getChildren(a)).toEqual([]);
      expect(kernel.read().query.getChildren(b)).toEqual([current]);
    } else {
      const current = kernel.read().query.getEdge(connectionId)!;
      expect(current.data).toBe('inner');
      expect(kernel.read().query.getOutgoingEdges(a)).toEqual([]);
      expect(kernel.read().query.getIncomingEdges(b)).toEqual([]);
      expect(kernel.read().query.getOutgoingEdges(b)).toEqual([current]);
      expect(kernel.read().query.getIncomingEdges(c)).toEqual([current]);
    }
    expect(before.query.getChildren(a)).toEqual([child]);
    expect(before.query.getChildren(b)).toEqual([]);
    expect(before.query.getOutgoingEdges(a)).toEqual([edge]);
    expect(before.query.getIncomingEdges(b)).toEqual([edge]);
    expect(before.query.getOutgoingEdges(b)).toEqual([]);
    expect(before.query.getIncomingEdges(c)).toEqual([]);
  });
}

test('historical indexes survive later writes, closed writers and both replay directions', () => {
  const { kernel, a, b, c, childId, connectionId } = relationFixture();
  const original = kernel.read();
  const child = original.query.getNode(childId)!;
  const edge = original.query.getEdge(connectionId)!;
  let leaked!: TransactionContext;
  const moved = kernel.transact((transaction) => {
    leaked = transaction;
    transaction.nodes.replace(childId, { ...child, parentId: b });
    transaction.edges.replace(connectionId, { ...edge, source: { nodeId: b }, target: { nodeId: c } });
  })!;
  const movedChild = moved.after.query.getNode(childId)!;
  const movedEdge = moved.after.query.getEdge(connectionId)!;
  const removed = kernel.transact((transaction) => {
    transaction.edges.remove(connectionId);
    transaction.nodes.remove(childId);
  })!;
  expect(() => leaked.nodes.replace(childId, child)).toThrow(expect.objectContaining({ code: 'TRANSACTION_CLOSED' }));
  expect(() => leaked.edges.add(edge)).toThrow(expect.objectContaining({ code: 'TRANSACTION_CLOSED' }));
  expect(() => leaked.query.getChildren(b)).toThrow(expect.objectContaining({ code: 'TRANSACTION_CLOSED' }));
  kernel.transact((transaction) => transaction.applyChangeSet(removed.changeSet, 'reverse'));
  expect(kernel.read().query.getChildren(b)).toEqual([movedChild]);
  expect(kernel.read().query.getOutgoingEdges(b)).toEqual([movedEdge]);
  kernel.transact((transaction) => transaction.applyChangeSet(moved.changeSet, 'reverse'));
  expect(kernel.read().query.getChildren(a)).toEqual([child]);
  expect(kernel.read().query.getOutgoingEdges(a)).toEqual([edge]);
  kernel.transact((transaction) => transaction.applyChangeSet(moved.changeSet, 'forward'));
  expect(kernel.read().query.getChildren(b)).toEqual([movedChild]);
  expect(kernel.read().query.getOutgoingEdges(b)).toEqual([movedEdge]);
  expect(original.query.getChildren(a)).toEqual([child]);
  expect(original.query.getChildren(b)).toEqual([]);
  expect(original.query.getOutgoingEdges(a)).toEqual([edge]);
  expect(original.query.getOutgoingEdges(b)).toEqual([]);
  expect(moved.after.query.getChildren(a)).toEqual([]);
  expect(moved.after.query.getChildren(b)[0]).toBe(movedChild);
  expect(moved.after.query.getOutgoingEdges(a)).toEqual([]);
  expect(moved.after.query.getOutgoingEdges(b)[0]).toBe(movedEdge);
  expect(removed.after.query.getChildren(a)).toEqual([]);
  expect(removed.after.query.getChildren(b)).toEqual([]);
  expect(removed.after.query.getOutgoingEdges(a)).toEqual([]);
  expect(removed.after.query.getOutgoingEdges(b)).toEqual([]);
});

function relationFixture() {
  const kernel = createCanvasKernel();
  const a = nodeId('a'),
    b = nodeId('b'),
    c = nodeId('c'),
    childId = nodeId('child');
  const connectionId = edgeId('connection');
  kernel.transact((transaction) => {
    for (const id of [a, b, c]) transaction.nodes.add({ id, type: 'group', position: { x: 0, y: 0 }, data: null });
    transaction.nodes.add({ id: childId, type: 'child', position: { x: 0, y: 0 }, parentId: a, data: 'original' });
    transaction.edges.add({
      id: connectionId,
      type: 'flow',
      source: { nodeId: a },
      target: { nodeId: b },
      data: 'original',
    });
  });
  return { kernel, a, b, c, childId, connectionId };
}
