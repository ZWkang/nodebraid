import { expect, test } from 'bun:test';

import {
  KernelError,
  createCanvasKernel,
  edgeId,
  nodeId,
  type ChangeDirection,
  type ChangeSet,
  type GraphChange,
} from '../src';

test('a later revision read cannot make an initially non-adjacent Change Set valid', () => {
  const kernel = createCanvasKernel();
  const before = kernel.read();
  const id = nodeId('accepted');
  let revisionReads = 0;
  let changesReads = 0;
  const changeSet: ChangeSet = {
    beforeRevision: 0,
    get revision() {
      return ++revisionReads === 1 ? 5 : 1;
    },
    get changes() {
      changesReads += 1;
      return [
        {
          entity: 'node' as const,
          id,
          before: null,
          after: { id, type: 'task', position: { x: 1, y: 2 }, data: null },
        },
      ];
    },
  };

  expect(() => kernel.transact((transaction) => transaction.applyChangeSet(changeSet, 'forward'))).toThrow(
    expect.objectContaining({
      code: 'INVALID_CHANGE_SET',
      details: { issue: 'INVALID_REVISIONS', beforeRevision: { value: 0 }, revision: { value: 5 } },
    }),
  );
  expect(kernel.read()).toBe(before);
  expect(changesReads).toBe(0);
});

const remainingInvalidCases = [
  ['node', 'reverse', 'revision'],
  ['edge', 'forward', 'revision'],
  ['edge', 'reverse', 'revision'],
  ['node', 'forward', 'beforeRevision'],
  ['node', 'reverse', 'beforeRevision'],
  ['edge', 'forward', 'beforeRevision'],
  ['edge', 'reverse', 'beforeRevision'],
] as const;

test.each(remainingInvalidCases)('%s %s rejects the first invalid %s value', (kind, direction, field) => {
  const { kernel, change } = replayFixture(kind, direction);
  const before = kernel.read();
  const firstRevision = field === 'beforeRevision' ? 2 : 5;
  let beforeReads = 0;
  let revisionReads = 0;
  let changesReads = 0;
  const changeSet: ChangeSet = {
    get beforeRevision() {
      beforeReads += 1;
      return field === 'beforeRevision' && beforeReads > 1 ? 1 : 0;
    },
    get revision() {
      revisionReads += 1;
      return field === 'revision' && revisionReads > 1 ? 1 : firstRevision;
    },
    get changes() {
      changesReads += 1;
      return [change];
    },
  };

  expect(() => kernel.transact((transaction) => transaction.applyChangeSet(changeSet, direction))).toThrow(
    expect.objectContaining({
      code: 'INVALID_CHANGE_SET',
      details: { issue: 'INVALID_REVISIONS', beforeRevision: { value: 0 }, revision: { value: firstRevision } },
    }),
  );
  expect(kernel.read()).toBe(before);
  expect({ beforeReads, revisionReads, changesReads }).toEqual({ beforeReads: 1, revisionReads: 1, changesReads: 0 });
});

test.each([
  ['node', 'forward'],
  ['node', 'reverse'],
  ['edge', 'forward'],
  ['edge', 'reverse'],
] as const)('%s %s retains the first valid header pair without later reads', (kind, direction) => {
  const { kernel, change, data } = replayFixture(kind, direction);
  let beforeReads = 0;
  let revisionReads = 0;
  const changeSet: ChangeSet = {
    get beforeRevision() {
      if (++beforeReads > 1) throw new Error('The accepted beforeRevision must not be read again.');
      return 0;
    },
    get revision() {
      if (++revisionReads > 1) throw new Error('The accepted revision must not be read again.');
      return 1;
    },
    changes: [change],
  };

  const commit = kernel.transact((transaction) => transaction.applyChangeSet(changeSet, direction), {
    origin: 'public-replay',
    commandId: 'replay.header',
  });

  expect(commit?.after).toBe(kernel.read());
  expect(commit?.after.snapshot.revision).toBe(kind === 'node' && direction === 'forward' ? 1 : 2);
  expect(commit?.changeSet).toMatchObject({ origin: 'public-replay', commandId: 'replay.header' });
  const entity =
    change.entity === 'node' ? kernel.read().query.getNode(change.id) : kernel.read().query.getEdge(change.id);
  if (direction === 'forward') {
    expect(entity).toEqual(change.after!);
    expect(entity?.data).toBe(data);
    expect(Object.isFrozen(entity)).toBe(true);
  } else {
    expect(entity).toBeUndefined();
  }
  expect({ beforeReads, revisionReads }).toEqual({ beforeReads: 1, revisionReads: 1 });
  expect(Object.isFrozen(data)).toBe(false);
});

const invalidValues = [
  { name: 'negative', value: -1, details: { value: -1 } },
  { name: 'fractional', value: 0.5, details: { value: 0.5 } },
  { name: 'unsafe integer', value: 9007199254740992, details: { value: 9007199254740992 } },
  { name: 'NaN', value: Number.NaN, details: { receivedNumber: 'nan' } },
  { name: 'positive infinity', value: Number.POSITIVE_INFINITY, details: { receivedNumber: 'positive-infinity' } },
  { name: 'negative infinity', value: Number.NEGATIVE_INFINITY, details: { receivedNumber: 'negative-infinity' } },
  { name: 'string', value: '1', details: { receivedType: 'string' } },
  { name: 'null', value: null, details: { receivedType: 'null' } },
  { name: 'bigint', value: 1n, details: { receivedType: 'bigint' } },
  { name: 'object', value: { domain: 'opaque' }, details: { receivedType: 'object' } },
];

for (const field of ['beforeRevision', 'revision'] as const) {
  test.each(invalidValues)(`${field} header diagnostics retain the first $name value`, (invalid) => {
    const kernel = createCanvasKernel();
    const before = kernel.read();
    let reads = 0;
    let changesReads = 0;
    const input = {
      beforeRevision: 0,
      revision: 1,
      get changes(): never {
        changesReads += 1;
        throw new Error('Invalid headers must precede the collection read.');
      },
    };
    Object.defineProperty(input, field, {
      get() {
        return ++reads === 1 ? invalid.value : field === 'beforeRevision' ? 0 : 1;
      },
    });
    let failure: unknown;
    try {
      kernel.transact((transaction) => transaction.applyChangeSet(input, 'forward'));
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(KernelError);
    expect(failure).toMatchObject({
      code: 'INVALID_CHANGE_SET',
      details: {
        issue: 'INVALID_REVISIONS',
        beforeRevision: field === 'beforeRevision' ? invalid.details : { value: 0 },
        revision: field === 'revision' ? invalid.details : { value: 1 },
      },
    });
    expect(Object.isFrozen((failure as KernelError).details)).toBe(true);
    expect(kernel.read()).toBe(before);
    expect({ reads, changesReads }).toEqual({ reads: 1, changesReads: 0 });
  });
}

test('the largest valid adjacent header pair does not restore the input revision', () => {
  const { kernel, change } = replayFixture('node', 'forward');
  const commit = kernel.transact((transaction) =>
    transaction.applyChangeSet(
      {
        beforeRevision: 9007199254740990,
        revision: 9007199254740991,
        changes: [change],
      },
      'forward',
    ),
  );
  expect(commit?.changeSet.beforeRevision).toBe(0);
  expect(commit?.changeSet.revision).toBe(1);
  expect(kernel.read().snapshot.revision).toBe(1);
});

test.each(['beforeRevision', 'revision'] as const)('replay preserves the original %s read exception', (field) => {
  const kernel = createCanvasKernel();
  const before = kernel.read();
  const original = { external: field };
  const order: string[] = [];
  const input = {
    get beforeRevision(): number {
      order.push('beforeRevision');
      if (field === 'beforeRevision') throw original;
      return 0;
    },
    get revision(): number {
      order.push('revision');
      throw original;
    },
    get changes(): never {
      throw new Error('Failed header reads must precede collection reads.');
    },
  };
  let received: unknown;
  try {
    kernel.transact((transaction) => transaction.applyChangeSet(input, 'forward'));
  } catch (error) {
    received = error;
  }
  expect(received).toBe(original);
  expect(order).toEqual(field === 'beforeRevision' ? ['beforeRevision'] : ['beforeRevision', 'revision']);
  expect(kernel.read()).toBe(before);
});

test('direction and object guards precede revision property reads', () => {
  const kernel = createCanvasKernel();
  const before = kernel.read();
  let reads = 0;
  const input = {
    get beforeRevision(): never {
      reads += 1;
      throw new Error('Unexpected header read.');
    },
  };
  expect(() =>
    kernel.transact((transaction) => transaction.applyChangeSet(input as never, 'invalid' as never)),
  ).toThrow(
    expect.objectContaining({
      code: 'INVALID_CHANGE_SET',
      details: { issue: 'INVALID_DIRECTION', direction: 'invalid' },
    }),
  );
  expect(reads).toBe(0);
  expect(() => kernel.transact((transaction) => transaction.applyChangeSet(null as never, 'forward'))).toThrow(
    expect.objectContaining({ code: 'INVALID_CHANGE_SET', details: {} }),
  );
  expect(kernel.read()).toBe(before);
});

test('inherited revision getters keep their original receiver', () => {
  const { kernel, change } = replayFixture('node', 'forward');
  const receivers: unknown[] = [];
  const prototype = {
    get beforeRevision() {
      receivers.push(this);
      return 0;
    },
    get revision() {
      receivers.push(this);
      return 1;
    },
  };
  const input: ChangeSet = Object.assign(Object.create(prototype), { changes: [change] });
  const commit = kernel.transact((transaction) => transaction.applyChangeSet(input, 'forward'));
  expect(receivers).toEqual([input, input]);
  expect(commit?.after.query.getNode(nodeId('accepted'))).toMatchObject({
    id: nodeId('accepted'),
    position: { x: 1, y: 2 },
  });
});

test("a caught invalid header leaves only the caller's subsequent deliberate write", () => {
  const { kernel, change } = replayFixture('node', 'forward');
  let reads = 0;
  const input: ChangeSet = {
    beforeRevision: 0,
    get revision() {
      return ++reads === 1 ? 5 : 1;
    },
    changes: [change],
  };
  const deliberate = nodeId('deliberate');
  const commit = kernel.transact((transaction) => {
    expect(() => transaction.applyChangeSet(input, 'forward')).toThrow(
      expect.objectContaining({ code: 'INVALID_CHANGE_SET' }),
    );
    expect(transaction.query.getNode(nodeId('accepted'))).toBeUndefined();
    transaction.nodes.add({ id: deliberate, type: 'task', position: { x: 7, y: 8 }, data: null });
  });
  expect(commit?.changeSet.changes.map((entry) => entry.id)).toEqual([deliberate]);
  expect(kernel.read().snapshot.nodes.map((node) => node.id)).toEqual([deliberate]);
});

function replayFixture(kind: 'node' | 'edge', direction: ChangeDirection) {
  const kernel = createCanvasKernel();
  const data = { opaque: true };
  const change: GraphChange =
    kind === 'node'
      ? {
          entity: 'node',
          id: nodeId('accepted'),
          before: null,
          after: { id: nodeId('accepted'), type: 'task', position: { x: 1, y: 2 }, data },
        }
      : {
          entity: 'edge',
          id: edgeId('accepted'),
          before: null,
          after: {
            id: edgeId('accepted'),
            type: 'flow',
            source: { nodeId: nodeId('source') },
            target: { nodeId: nodeId('target') },
            data,
          },
        };
  if (kind === 'edge' || direction === 'reverse') {
    kernel.transact((transaction) => {
      if (kind === 'edge') {
        transaction.nodes.add({ id: nodeId('source'), type: 'task', position: { x: 0, y: 0 }, data: null });
        transaction.nodes.add({ id: nodeId('target'), type: 'task', position: { x: 1, y: 1 }, data: null });
      }
      if (direction === 'reverse') {
        if (change.entity === 'node') transaction.nodes.add(change.after!);
        else transaction.edges.add(change.after!);
      }
    });
  }
  return { kernel, change, data };
}
