import { expect, test } from 'bun:test';

import { createCanvasKernel, edgeId, nodeId, type TransactionContext } from '../src';

test('Node add retains its accepted ID without overwriting an existing Node', () => {
  const kernel = createCanvasKernel();
  const a = nodeId('a');
  const b = nodeId('b');
  kernel.transact((transaction) =>
    transaction.nodes.add({ id: b, type: 'task', position: { x: 0, y: 0 }, data: 'original-b' }),
  );
  let reads = 0;
  const commit = kernel.transact((transaction) =>
    transaction.nodes.add({
      get id() {
        return ++reads === 1 ? a : b;
      },
      type: 'task',
      position: { x: 1, y: 2 },
      data: 'new-a',
    }),
  );
  expect(kernel.read().query.getNode(b)?.data).toBe('original-b');
  expect(kernel.read().query.getNode(a)?.data).toBe('new-a');
  expect(commit?.after.snapshot.nodes.map((node) => node.id)).toEqual([a, b]);
  expect(commit?.changeSet.changes).toEqual([
    { entity: 'node', id: a, before: null, after: { id: a, type: 'task', position: { x: 1, y: 2 }, data: 'new-a' } },
  ]);
  expect(reads).toBe(1);
});

test('Node replace keeps Query, Snapshot and replayable Change Set identities consistent', () => {
  const kernel = createCanvasKernel();
  const a = nodeId('a');
  const b = nodeId('b');
  kernel.transact((transaction) => {
    transaction.nodes.add({ id: a, type: 'task', position: { x: 0, y: 0 }, data: 'original-a' });
    transaction.nodes.add({ id: b, type: 'task', position: { x: 0, y: 0 }, data: 'original-b' });
  });
  let reads = 0;
  const commit = kernel.transact((transaction) =>
    transaction.nodes.replace(a, {
      get id() {
        return ++reads === 1 ? a : b;
      },
      type: 'task',
      position: { x: 1, y: 2 },
      data: 'replacement-a',
    }),
  );
  if (!commit) throw new Error('Expected a replacement commit.');
  expect(commit.after.snapshot.nodes.map((node) => node.id)).toEqual([a, b]);
  expect(commit.after.query.getNode(a)?.id).toBe(a);
  expect(commit.changeSet.changes[0]?.id).toBe(a);
  expect(commit.changeSet.changes[0]?.after?.id).toBe(a);
  expect(reads).toBe(1);
  kernel.transact((transaction) => transaction.applyChangeSet(commit.changeSet, 'reverse'));
  expect(kernel.read().query.getNode(a)?.data).toBe('original-a');
  kernel.transact((transaction) => transaction.applyChangeSet(commit.changeSet, 'forward'));
  expect(kernel.read().query.getNode(a)?.data).toBe('replacement-a');
  expect(kernel.read().query.getNode(b)?.data).toBe('original-b');
});

test('Edge add retains its accepted ID and relation indexes without overwriting another Edge', () => {
  const { kernel, a, b } = twoNodeKernel();
  const ea = edgeId('ea');
  const eb = edgeId('eb');
  const original = { id: eb, type: 'flow', source: { nodeId: b }, target: { nodeId: a }, data: 'original-eb' };
  kernel.transact((transaction) => transaction.edges.add(original));
  const before = kernel.read();
  const data = { opaque: true };
  let reads = 0;
  const commit = kernel.transact((transaction) => {
    transaction.edges.add({
      get id() {
        return ++reads === 1 ? ea : eb;
      },
      type: 'flow',
      source: { nodeId: a },
      target: { nodeId: b },
      data,
    });
    expect(transaction.query.getOutgoingEdges(a).map((edge) => edge.id)).toEqual([ea]);
    expect(transaction.query.getIncomingEdges(a).map((edge) => edge.id)).toEqual([eb]);
  });
  expect(commit?.before).toBe(before);
  expect(before.query.getEdge(ea)).toBeUndefined();
  expect(kernel.read().snapshot.edges.map((edge) => edge.id)).toEqual([ea, eb]);
  expect(kernel.read().query.getEdge(eb)?.data).toBe('original-eb');
  expect(kernel.read().query.getEdge(ea)?.data).toBe(data);
  expect(Object.isFrozen(data)).toBeFalse();
  expect(reads).toBe(1);
});

test('Edge replace retains its accepted ID across indexes and reverse/forward replay', () => {
  const { kernel, a, b } = twoNodeKernel();
  const ea = edgeId('ea');
  const eb = edgeId('eb');
  kernel.transact((transaction) => {
    for (const id of [ea, eb]) {
      transaction.edges.add({ id, type: 'flow', source: { nodeId: a }, target: { nodeId: b }, data: `original-${id}` });
    }
  });
  let reads = 0;
  const commit = kernel.transact((transaction) => {
    transaction.edges.replace(ea, {
      get id() {
        return ++reads === 1 ? ea : eb;
      },
      type: 'flow',
      source: { nodeId: b },
      target: { nodeId: a },
      data: 'replacement-ea',
    });
    expect(transaction.query.getOutgoingEdges(b).map((edge) => edge.id)).toEqual([ea]);
    expect(transaction.query.getOutgoingEdges(a).map((edge) => edge.id)).toEqual([eb]);
  });
  if (!commit) throw new Error('Expected an Edge replacement commit.');
  expect(commit.after.snapshot.edges.map((edge) => edge.id)).toEqual([ea, eb]);
  expect(commit.after.query.getEdge(ea)?.id).toBe(ea);
  expect(commit.changeSet.changes[0]?.id).toBe(ea);
  expect(commit.changeSet.changes[0]?.after?.id).toBe(ea);
  expect(Object.isFrozen(commit.changeSet.changes[0]?.after)).toBeTrue();
  expect(reads).toBe(1);
  kernel.transact((transaction) => transaction.applyChangeSet(commit.changeSet, 'reverse'));
  expect(
    kernel
      .read()
      .query.getOutgoingEdges(a)
      .map((edge) => edge.id),
  ).toEqual([ea, eb]);
  kernel.transact((transaction) => transaction.applyChangeSet(commit.changeSet, 'forward'));
  expect(
    kernel
      .read()
      .query.getOutgoingEdges(b)
      .map((edge) => edge.id),
  ).toEqual([ea]);
  expect(kernel.read().query.getEdge(eb)?.data).toBe('original-eb');
});

test('duplicate add reports the captured ID before reading other entity fields', () => {
  const { kernel, a } = twoNodeKernel();
  const before = kernel.read();
  let reads = 0;
  const result = kernel.transact((transaction) => {
    const error = thrownBy(() =>
      transaction.nodes.add({
        get id() {
          if (++reads > 1) throw new Error('Duplicate ID was consumed again.');
          return a;
        },
        get type(): never {
          throw new Error('Duplicate ID must fail before entity copying.');
        },
        position: { x: 0, y: 0 },
        data: null,
      }),
    );
    expect(error).toMatchObject({ code: 'ENTITY_ALREADY_EXISTS', details: { entity: 'node', id: a } });
  });
  expect(result).toBeNull();
  expect(kernel.read()).toBe(before);
  expect(reads).toBe(1);
});

test('replacement mismatch reports the captured ID before reading other entity fields', () => {
  const { kernel, a, b } = twoNodeKernel();
  const before = kernel.read();
  let reads = 0;
  const result = kernel.transact((transaction) => {
    const error = thrownBy(() =>
      transaction.nodes.replace(a, {
        get id() {
          if (++reads > 1) throw new Error('Mismatched ID was consumed again.');
          return b;
        },
        get type(): never {
          throw new Error('Mismatched ID must fail before entity copying.');
        },
        position: { x: 0, y: 0 },
        data: null,
      }),
    );
    expect(error).toMatchObject({ code: 'ENTITY_ID_MISMATCH', details: { entity: 'node', id: a, actualId: b } });
  });
  expect(result).toBeNull();
  expect(kernel.read()).toBe(before);
  expect(reads).toBe(1);
});

test('missing replacement targets fail before reading the incoming ID', () => {
  const kernel = createCanvasKernel();
  const missing = nodeId('missing');
  let reads = 0;
  const error = thrownBy(() =>
    kernel.transact((transaction) =>
      transaction.nodes.replace(missing, {
        get id(): never {
          reads++;
          throw new Error('ID must not be read for a missing replacement.');
        },
        type: 'task',
        position: { x: 0, y: 0 },
        data: null,
      }),
    ),
  );
  expect(error).toMatchObject({ code: 'ENTITY_NOT_FOUND', details: { entity: 'node', id: missing } });
  expect(reads).toBe(0);
  expect(kernel.read().snapshot.revision).toBe(0);
});

for (const operation of ['add', 'replace'] as const) {
  test(`${operation} preserves an original ID read failure and committed View`, () => {
    const { kernel, a } = twoNodeKernel();
    const before = kernel.read();
    const marker = new Error('ID read');
    let reads = 0;
    const error = thrownBy(() =>
      kernel.transact((transaction) => {
        const input = {
          get id(): never {
            reads++;
            throw marker;
          },
          type: 'task',
          position: { x: 0, y: 0 },
          data: null,
        };
        if (operation === 'add') transaction.nodes.add(input);
        else transaction.nodes.replace(a, input);
      }),
    );
    expect(error).toBe(marker);
    expect(reads).toBe(1);
    expect(kernel.read()).toBe(before);
  });
}

test('a failed owned entity copy leaves no partially added or replaced value', () => {
  const { kernel, a } = twoNodeKernel();
  const before = kernel.read();
  const fresh = nodeId('fresh');
  const marker = new Error('data read');
  const result = kernel.transact((transaction) => {
    for (const operation of ['add', 'replace'] as const) {
      const input = {
        id: operation === 'add' ? fresh : a,
        type: 'task',
        position: { x: 1, y: 2 },
        get data(): never {
          throw marker;
        },
      };
      expect(
        thrownBy(() => {
          if (operation === 'add') transaction.nodes.add(input);
          else transaction.nodes.replace(a, input);
        }),
      ).toBe(marker);
      expect(transaction.query.getNode(fresh)).toBeUndefined();
      expect(transaction.query.getNode(a)).toBe(before.query.getNode(a));
    }
  });
  expect(result).toBeNull();
  expect(kernel.read()).toBe(before);
});

test('captured replacement IDs retain net-zero View identity', () => {
  const { kernel, a, b } = twoNodeKernel();
  const before = kernel.read();
  const node = before.query.getNode(a)!;
  let reads = 0;
  expect(
    kernel.transact((transaction) =>
      transaction.nodes.replace(a, {
        ...node,
        get id() {
          return ++reads === 1 ? a : b;
        },
      }),
    ),
  ).toBeNull();
  expect(kernel.read()).toBe(before);
  expect(reads).toBe(1);
});

function twoNodeKernel() {
  const kernel = createCanvasKernel();
  const a = nodeId('a');
  const b = nodeId('b');
  kernel.transact((transaction) => {
    for (const id of [a, b])
      transaction.nodes.add({ id, type: 'task', position: { x: 0, y: 0 }, data: `original-${id}` });
  });
  return { kernel, a, b };
}

test('closed Transaction writers fail before reading an incoming ID', () => {
  const kernel = createCanvasKernel();
  const before = kernel.read();
  let transaction!: TransactionContext;
  kernel.transact((current) => {
    transaction = current;
  });
  let reads = 0;
  const input = {
    get id(): never {
      reads++;
      throw new Error('A closed writer must not consume the ID.');
    },
    type: 'task',
    position: { x: 0, y: 0 },
    data: null,
  };
  expect(thrownBy(() => transaction.nodes.add(input))).toMatchObject({ code: 'TRANSACTION_CLOSED' });
  expect(thrownBy(() => transaction.nodes.replace(nodeId('missing'), input))).toMatchObject({
    code: 'TRANSACTION_CLOSED',
  });
  expect(reads).toBe(0);
  expect(kernel.read()).toBe(before);
});

function thrownBy(action: () => void): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the public operation to throw.');
}
