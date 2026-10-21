import { expect, test } from 'bun:test';

import { createCanvasKernel, edgeId, nodeId, type ChangeDirection, type GraphChange } from '../src';

test('a changing replay iterator cannot overwrite a later Node edit', () => {
  const kernel = createCanvasKernel();
  const a = nodeId('a');
  const b = nodeId('b');
  kernel.transact((transaction) => {
    transaction.nodes.add({ id: a, type: 'task', position: { x: 0, y: 0 }, data: null });
    transaction.nodes.add({ id: b, type: 'task', position: { x: 10, y: 0 }, data: null });
  });
  const move = kernel.transact((transaction) => {
    for (const id of [a, b]) {
      transaction.nodes.replace(id, { ...transaction.query.getNode(id)!, position: { x: 100, y: 100 } });
    }
  });
  if (!move) throw new Error('Expected source move Commit.');
  kernel.transact((transaction) => transaction.applyChangeSet(move.changeSet, 'reverse'));
  kernel.transact((transaction) => {
    transaction.nodes.replace(b, { ...transaction.query.getNode(b)!, position: { x: 999, y: 999 } });
  });
  const before = kernel.read();
  const changes = [...move.changeSet.changes];
  let iterations = 0;
  Object.defineProperty(changes, Symbol.iterator, {
    value: function* () {
      iterations += 1;
      yield changes[0]!;
      if (iterations > 1) yield changes[1]!;
    },
  });

  expect(() =>
    kernel.transact((transaction) => transaction.applyChangeSet({ ...move.changeSet, changes }, 'forward')),
  ).toThrow(expect.objectContaining({ code: 'CHANGE_SET_CONFLICT' }));
  expect(kernel.read()).toBe(before);
  expect(kernel.read().query.getNode(b)?.position).toEqual({ x: 999, y: 999 });
});

test('an entries hook cannot hide duplicate replay entries from validation', () => {
  const kernel = createCanvasKernel();
  const original = { id: nodeId('a'), type: 'task', position: { x: 0, y: 0 }, data: null };
  kernel.transact((transaction) => transaction.nodes.add(original));
  const before = kernel.read();
  const change: GraphChange = {
    entity: 'node',
    id: original.id,
    before: original,
    after: { ...original, position: { x: 100, y: 100 } },
  };
  const changes = [change, change];
  Object.defineProperty(changes, 'entries', {
    value: function* () {
      yield [0, change];
    },
  });

  expect(() =>
    kernel.transact((transaction) =>
      transaction.applyChangeSet(
        {
          beforeRevision: 0,
          revision: 1,
          changes,
        },
        'forward',
      ),
    ),
  ).toThrow(expect.objectContaining({ code: 'INVALID_CHANGE_SET' }));
  expect(kernel.read()).toBe(before);
});

test.each([
  { kind: 'node', direction: 'forward' },
  { kind: 'node', direction: 'reverse' },
  { kind: 'edge', direction: 'forward' },
  { kind: 'edge', direction: 'reverse' },
] as const)('caught $kind $direction conflict leaves no partial replay', ({ kind, direction }) => {
  const { kernel, changeSet } = createStaleReplay(kind, direction);
  const before = kernel.read();
  const changes = [...changeSet.changes];
  let iterations = 0;
  Object.defineProperty(changes, Symbol.iterator, {
    value: function* () {
      iterations += 1;
      yield changes[0]!;
      if (iterations > 1) yield changes[1]!;
    },
  });

  const commit = kernel.transact((transaction) => {
    expect(() => transaction.applyChangeSet({ ...changeSet, changes }, direction)).toThrow(
      expect.objectContaining({ code: 'CHANGE_SET_CONFLICT' }),
    );
    expect(transaction.query.getNode(nodeId('a'))).toBe(before.query.getNode(nodeId('a')));
    expect(transaction.query.getNode(nodeId('b'))).toBe(before.query.getNode(nodeId('b')));
    if (kind === 'edge') {
      expect(transaction.query.getEdge(edgeId('first'))).toBe(before.query.getEdge(edgeId('first')));
      expect(transaction.query.getEdge(edgeId('second'))).toBe(before.query.getEdge(edgeId('second')));
    }
    transaction.nodes.add({ id: nodeId('deliberate'), type: 'task', position: { x: 7, y: 8 }, data: null });
  });

  expect(commit?.changeSet.changes).toHaveLength(1);
  expect(commit?.changeSet.revision).toBe(before.snapshot.revision + 1);
  expect(kernel.read().query.getNode(nodeId('deliberate'))?.position).toEqual({ x: 7, y: 8 });
});

test('valid forward and reverse replay ignores input traversal hooks and preserves opaque data', () => {
  const kernel = createCanvasKernel();
  const data = Object.freeze({ private: 'application-owned' });
  const original = { id: nodeId('a'), type: 'task', position: { x: 0, y: 0 }, data };
  kernel.transact((transaction) => transaction.nodes.add(original));
  const change: GraphChange = {
    entity: 'node',
    id: original.id,
    before: original,
    after: { ...original, position: { x: 100, y: 100 } },
  };
  const changes = [change];
  for (const key of ['entries', Symbol.iterator]) {
    Object.defineProperty(changes, key, {
      get(): never {
        throw new Error('Input traversal hooks must not run.');
      },
    });
  }
  const changeSet = { beforeRevision: 0, revision: 1, changes };
  const forward = kernel.transact((transaction) => transaction.applyChangeSet(changeSet, 'forward'), {
    origin: 'external-replay',
    commandId: 'example.replay',
  });
  expect(forward?.changeSet).toMatchObject({ revision: 2, origin: 'external-replay', commandId: 'example.replay' });
  expect(kernel.read().query.getNode(original.id)?.position).toEqual({ x: 100, y: 100 });
  expect(kernel.read().query.getNode(original.id)?.data).toBe(data);
  const reverse = kernel.transact((transaction) => transaction.applyChangeSet(changeSet, 'reverse'));
  expect(reverse?.changeSet.revision).toBe(3);
  expect(kernel.read().query.getNode(original.id)?.position).toEqual({ x: 0, y: 0 });
  expect(kernel.read().query.getNode(original.id)?.data).toBe(data);
  expect(changes.length).toBe(1);
  expect(changes[0]).toBe(change);
});

test('replay captures the outer collection and each indexed entry once', () => {
  const kernel = createCanvasKernel();
  const original = { id: nodeId('a'), type: 'task', position: { x: 0, y: 0 }, data: null };
  kernel.transact((transaction) => transaction.nodes.add(original));
  const change: GraphChange = {
    entity: 'node',
    id: original.id,
    before: original,
    after: { ...original, position: { x: 100, y: 100 } },
  };
  const entries = [change];
  let elementReads = 0;
  Object.defineProperty(entries, 0, {
    get() {
      elementReads += 1;
      return elementReads === 1 ? change : undefined;
    },
  });
  let collectionReads = 0;
  const changeSet = {
    beforeRevision: 0,
    revision: 1,
    get changes(): readonly GraphChange[] {
      collectionReads += 1;
      if (collectionReads > 1) throw new Error('The accepted collection must not be read again.');
      return entries;
    },
  };

  const commit = kernel.transact((transaction) => transaction.applyChangeSet(changeSet, 'forward'));

  expect(commit?.changeSet.revision).toBe(2);
  expect(kernel.read().query.getNode(original.id)?.position).toEqual({ x: 100, y: 100 });
  expect({ collectionReads, elementReads }).toEqual({ collectionReads: 1, elementReads: 1 });
});

test('a traversal hook cannot hide a sparse replay entry', () => {
  const kernel = createCanvasKernel();
  const original = { id: nodeId('a'), type: 'task', position: { x: 0, y: 0 }, data: null };
  kernel.transact((transaction) => transaction.nodes.add(original));
  const before = kernel.read();
  const change: GraphChange = {
    entity: 'node',
    id: original.id,
    before: original,
    after: { ...original, position: { x: 100, y: 100 } },
  };
  const changes = [change];
  changes.length = 2;
  Object.defineProperty(changes, 'entries', {
    value: function* () {
      yield [0, change];
    },
  });

  expect(() =>
    kernel.transact((transaction) =>
      transaction.applyChangeSet(
        {
          beforeRevision: 0,
          revision: 1,
          changes,
        },
        'forward',
      ),
    ),
  ).toThrow(expect.objectContaining({ code: 'INVALID_CHANGE_SET' }));
  expect(kernel.read()).toBe(before);
});

test.each([1.5, '1.5', { valueOf: () => 1.5 }])('replay preserves native length coercion: %p', (length) => {
  const kernel = createCanvasKernel();
  const original = { id: nodeId('a'), type: 'task', position: { x: 0, y: 0 }, data: null };
  kernel.transact((transaction) => transaction.nodes.add(original));
  const change: GraphChange = {
    entity: 'node',
    id: original.id,
    before: original,
    after: { ...original, position: { x: 100, y: 100 } },
  };
  const changes = new Proxy([change], {
    get(target, property, receiver) {
      return property === 'length' ? length : Reflect.get(target, property, receiver);
    },
  });

  const commit = kernel.transact((transaction) =>
    transaction.applyChangeSet(
      {
        beforeRevision: 0,
        revision: 1,
        changes,
      },
      'forward',
    ),
  );

  expect(commit?.changeSet.revision).toBe(2);
  expect(kernel.read().query.getNode(original.id)?.position).toEqual({ x: 100, y: 100 });
});

test.each([0.5, -1, NaN, undefined, '0'])('replay preserves native empty iteration for Proxy length %p', (length) => {
  const kernel = createCanvasKernel();
  const before = kernel.read();
  const changes = new Proxy([], {
    get(target, property, receiver) {
      return property === 'length' ? length : Reflect.get(target, property, receiver);
    },
  });

  expect(
    kernel.transact((transaction) =>
      transaction.applyChangeSet(
        {
          beforeRevision: 0,
          revision: 1,
          changes,
        },
        'forward',
      ),
    ),
  ).toBeNull();
  expect(kernel.read()).toBe(before);
});

test.each([1n, Symbol('length')])('replay preserves native length conversion failure: %p', (length) => {
  const kernel = createCanvasKernel();
  const before = kernel.read();
  const changes = new Proxy([], {
    get(target, property, receiver) {
      return property === 'length' ? length : Reflect.get(target, property, receiver);
    },
  });

  expect(() =>
    kernel.transact((transaction) =>
      transaction.applyChangeSet(
        {
          beforeRevision: 0,
          revision: 1,
          changes,
        },
        'forward',
      ),
    ),
  ).toThrow(TypeError);
  expect(kernel.read()).toBe(before);
});

test('invalid first entry retains its error before an infinite Proxy length could allocate a snapshot', () => {
  const kernel = createCanvasKernel();
  const before = kernel.read();
  const changes = new Proxy([], {
    get(target, property, receiver) {
      return property === 'length' ? Infinity : Reflect.get(target, property, receiver);
    },
  });

  expect(() =>
    kernel.transact((transaction) =>
      transaction.applyChangeSet(
        {
          beforeRevision: 0,
          revision: 1,
          changes,
        },
        'forward',
      ),
    ),
  ).toThrow(expect.objectContaining({ code: 'INVALID_CHANGE_SET' }));
  expect(kernel.read()).toBe(before);
});

function createStaleReplay(kind: GraphChange['entity'], direction: ChangeDirection) {
  const kernel = createCanvasKernel();
  const a = nodeId('a');
  const b = nodeId('b');
  const c = nodeId('c');
  const first = edgeId('first');
  const second = edgeId('second');
  kernel.transact((transaction) => {
    transaction.nodes.add({ id: a, type: 'task', position: { x: 0, y: 0 }, data: null });
    transaction.nodes.add({ id: b, type: 'task', position: { x: 10, y: 0 }, data: null });
    transaction.nodes.add({ id: c, type: 'task', position: { x: 20, y: 0 }, data: null });
    if (kind === 'edge') {
      transaction.edges.add({ id: first, type: 'flow', source: { nodeId: a }, target: { nodeId: b }, data: null });
      transaction.edges.add({ id: second, type: 'flow', source: { nodeId: b }, target: { nodeId: c }, data: null });
    }
  });
  const change = kernel.transact((transaction) => {
    if (kind === 'node') {
      for (const id of [a, b]) {
        transaction.nodes.replace(id, { ...transaction.query.getNode(id)!, position: { x: 100, y: 100 } });
      }
    } else {
      transaction.edges.replace(first, { ...transaction.query.getEdge(first)!, target: { nodeId: c } });
      transaction.edges.replace(second, { ...transaction.query.getEdge(second)!, source: { nodeId: a } });
    }
  });
  if (!change) throw new Error('Expected source replay Commit.');
  if (direction === 'forward')
    kernel.transact((transaction) => transaction.applyChangeSet(change.changeSet, 'reverse'));
  kernel.transact((transaction) => {
    if (kind === 'node') {
      transaction.nodes.replace(b, { ...transaction.query.getNode(b)!, position: { x: 999, y: 999 } });
    } else {
      transaction.edges.replace(second, {
        ...transaction.query.getEdge(second)!,
        source: { nodeId: c },
        target: { nodeId: c },
      });
    }
  });
  return { kernel, changeSet: change.changeSet };
}
