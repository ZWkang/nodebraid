import { expect, test } from 'bun:test';

import { createCanvasKernel, edgeId, nodeId, type GraphChange } from '../src';

test('replay retains the target whose kind and ID passed validation', () => {
  const kernel = createCanvasKernel();
  const accepted = { id: nodeId('accepted-a'), type: 'task', position: { x: 10, y: 20 }, data: null };
  const substitute = { id: nodeId('unvalidated-b'), type: 'task', position: { x: 100, y: 200 }, data: null };
  let reads = 0;
  const change: GraphChange = {
    entity: 'node',
    id: accepted.id,
    before: null,
    get after() {
      return ++reads <= 2 ? accepted : substitute;
    },
  };

  const commit = kernel.transact((transaction) =>
    transaction.applyChangeSet({ beforeRevision: 0, revision: 1, changes: [change] }, 'forward'),
  );

  expect(kernel.read().snapshot.nodes).toEqual([accepted]);
  expect(kernel.read().query.getNode(substitute.id)).toBeUndefined();
  expect(commit?.changeSet.changes[0]?.id).toBe(accepted.id);
  expect(reads).toBe(1);
});

test('a changing source record cannot bypass replay conflict preflight', () => {
  const kernel = createCanvasKernel();
  const id = nodeId('task');
  kernel.transact((transaction) => {
    transaction.nodes.add({ id, type: 'task', position: { x: 0, y: 0 }, data: null });
  });
  const original = kernel.read().query.getNode(id)!;
  kernel.transact((transaction) => {
    transaction.nodes.replace(id, { ...original, position: { x: 999, y: 999 } });
  });
  const before = kernel.read();
  const newer = before.query.getNode(id)!;
  let reads = 0;
  const change: GraphChange = {
    entity: 'node',
    id,
    get before() {
      return ++reads <= 2 ? original : newer;
    },
    after: { ...original, position: { x: 100, y: 100 } },
  };

  expect(() =>
    kernel.transact((transaction) =>
      transaction.applyChangeSet({ beforeRevision: 1, revision: 2, changes: [change] }, 'forward'),
    ),
  ).toThrow(expect.objectContaining({ code: 'CHANGE_SET_CONFLICT' }));
  expect(kernel.read()).toBe(before);
  expect(kernel.read().query.getNode(id)?.position).toEqual({ x: 999, y: 999 });
  expect(reads).toBe(1);
});

test('replay retains the entity ID accepted before target materialization', () => {
  const kernel = createCanvasKernel();
  const acceptedId = nodeId('accepted');
  const substituteId = nodeId('substitute');
  let reads = 0;
  const target = {
    get id() {
      return ++reads <= 2 ? acceptedId : substituteId;
    },
    type: 'task',
    position: { x: 10, y: 20 },
    data: null,
  };

  kernel.transact((transaction) =>
    transaction.applyChangeSet(
      { beforeRevision: 0, revision: 1, changes: [{ entity: 'node', id: acceptedId, before: null, after: target }] },
      'forward',
    ),
  );

  expect(kernel.read().snapshot.nodes.map((node) => node.id)).toEqual([acceptedId]);
  expect(kernel.read().query.getNode(substituteId)).toBeUndefined();
  expect(reads).toBe(1);
});

test('changing source coordinates cannot replace the values checked by replay validation', () => {
  const kernel = createCanvasKernel();
  const id = nodeId('task');
  kernel.transact((transaction) => {
    transaction.nodes.add({ id, type: 'task', position: { x: 0, y: 0 }, data: null });
  });
  const original = kernel.read().query.getNode(id)!;
  kernel.transact((transaction) => {
    transaction.nodes.replace(id, { ...original, position: { x: 999, y: 999 } });
  });
  const before = kernel.read();
  let xReads = 0;
  let yReads = 0;
  const source = {
    ...original,
    position: {
      get x() {
        return ++xReads === 1 ? 0 : 999;
      },
      get y() {
        return ++yReads === 1 ? 0 : 999;
      },
    },
  };

  expect(() =>
    kernel.transact((transaction) =>
      transaction.applyChangeSet(
        {
          beforeRevision: 1,
          revision: 2,
          changes: [{ entity: 'node', id, before: source, after: { ...original, position: { x: 100, y: 100 } } }],
        },
        'forward',
      ),
    ),
  ).toThrow(expect.objectContaining({ code: 'CHANGE_SET_CONFLICT' }));
  expect(kernel.read()).toBe(before);
  expect({ xReads, yReads }).toEqual({ xReads: 1, yReads: 1 });
});

test('a stale source rejects before reading opaque source or target data', () => {
  const kernel = createCanvasKernel();
  const id = nodeId('task');
  kernel.transact((transaction) => {
    transaction.nodes.add({ id, type: 'task', position: { x: 0, y: 0 }, data: null });
  });
  const original = kernel.read().query.getNode(id)!;
  kernel.transact((transaction) => {
    transaction.nodes.replace(id, { ...original, position: { x: 999, y: 999 } });
  });
  const before = kernel.read();
  let dataReads = 0;
  const value = (x: number) => ({
    ...original,
    position: { x, y: x },
    get data(): never {
      dataReads += 1;
      throw new Error('Opaque data must not precede a known conflict.');
    },
  });

  expect(() =>
    kernel.transact((transaction) =>
      transaction.applyChangeSet(
        { beforeRevision: 1, revision: 2, changes: [{ entity: 'node', id, before: value(0), after: value(100) }] },
        'forward',
      ),
    ),
  ).toThrow(expect.objectContaining({ code: 'CHANGE_SET_CONFLICT' }));
  expect(kernel.read()).toBe(before);
  expect(dataReads).toBe(0);
});

const directions = ['forward', 'reverse'] as const;
const nodeFields = [
  'id',
  'type',
  'position',
  'position.x',
  'position.y',
  'size',
  'size.width',
  'size.height',
  'parentId',
];
for (const direction of directions) {
  test.each(nodeFields)(`${direction} replay captures Node %s once`, (field) => {
    const kernel = createCanvasKernel();
    const id = nodeId('accepted');
    const parentId = nodeId('group');
    const data = { opaque: 'node' };
    kernel.transact((transaction) => {
      transaction.nodes.add({ id: parentId, type: 'group', position: { x: 0, y: 0 }, data: null });
    });
    const target = { id, type: 'task', position: { x: 10, y: 20 }, size: { width: 80, height: 40 }, parentId, data };
    const replacements: Record<string, unknown> = {
      id: nodeId('substitute'),
      type: 'changed',
      position: { x: 999, y: 999 },
      'position.x': 999,
      'position.y': 999,
      size: { width: 999, height: 999 },
      'size.width': 999,
      'size.height': 999,
      parentId: nodeId('missing-parent'),
    };
    const [outer, inner] = field.split('.');
    const reads = changing(inner ? Reflect.get(target, outer!) : target, inner ?? outer!, replacements[field]);
    const change: GraphChange = {
      entity: 'node',
      id,
      before: direction === 'reverse' ? target : null,
      after: direction === 'forward' ? target : null,
    };

    const commit = kernel.transact((transaction) =>
      transaction.applyChangeSet({ beforeRevision: 1, revision: 2, changes: [change] }, direction),
    );

    expect(kernel.read().query.getNode(id)).toEqual({
      id,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      parentId,
      data,
    });
    expect(
      kernel
        .read()
        .query.getChildren(parentId)
        .map((node) => node.id),
    ).toEqual([id]);
    expect(commit?.changeSet.changes[0]?.id).toBe(id);
    expect(kernel.read().query.getNode(id)?.data).toBe(data);
    expect(Object.isFrozen(data)).toBe(false);
    expect(reads()).toBe(1);
  });
}

const edgeFields = [
  'id',
  'type',
  'source',
  'source.nodeId',
  'source.portId',
  'target',
  'target.nodeId',
  'target.portId',
];
for (const direction of directions) {
  test.each(edgeFields)(`${direction} replay captures Edge %s once`, (field) => {
    const kernel = createCanvasKernel();
    const a = nodeId('a');
    const b = nodeId('b');
    const c = nodeId('c');
    kernel.transact((transaction) => {
      for (const id of [a, b, c]) transaction.nodes.add({ id, type: 'task', position: { x: 0, y: 0 }, data: null });
    });
    const id = edgeId('accepted');
    const data = { opaque: 'edge' };
    const target = {
      id,
      type: 'flow',
      source: { nodeId: a, portId: 'out' },
      target: { nodeId: b, portId: 'in' },
      data,
    };
    const replacements: Record<string, unknown> = {
      id: edgeId('substitute'),
      type: 'changed',
      source: { nodeId: c, portId: 'changed' },
      'source.nodeId': c,
      'source.portId': 'changed',
      target: { nodeId: c, portId: 'changed' },
      'target.nodeId': c,
      'target.portId': 'changed',
    };
    const [outer, inner] = field.split('.');
    const reads = changing(inner ? Reflect.get(target, outer!) : target, inner ?? outer!, replacements[field]);
    const change: GraphChange = {
      entity: 'edge',
      id,
      before: direction === 'reverse' ? target : null,
      after: direction === 'forward' ? target : null,
    };

    kernel.transact((transaction) =>
      transaction.applyChangeSet({ beforeRevision: 1, revision: 2, changes: [change] }, direction),
    );

    expect(kernel.read().query.getEdge(id)).toEqual({
      id,
      type: 'flow',
      source: { nodeId: a, portId: 'out' },
      target: { nodeId: b, portId: 'in' },
      data,
    });
    expect(
      kernel
        .read()
        .query.getOutgoingEdges(a)
        .map((edge) => edge.id),
    ).toEqual([id]);
    expect(
      kernel
        .read()
        .query.getIncomingEdges(b)
        .map((edge) => edge.id),
    ).toEqual([id]);
    expect(kernel.read().query.getIncidentEdges(c)).toEqual([]);
    expect(kernel.read().query.getEdge(id)?.data).toBe(data);
    expect(Object.isFrozen(data)).toBe(false);
    expect(reads()).toBe(1);
  });
}

test('a later replay record cannot mutate a previously accepted target shell', () => {
  const kernel = createCanvasKernel();
  const a = { id: nodeId('a'), type: 'task', position: { x: 10, y: 20 }, size: { width: 80, height: 40 }, data: null };
  const b = { id: nodeId('b'), type: 'task', position: { x: 30, y: 40 }, data: null };
  const changes: GraphChange[] = [
    { entity: 'node', id: a.id, before: null, after: a },
    {
      entity: 'node',
      id: b.id,
      before: null,
      get after() {
        a.type = 'changed';
        a.position.x = 999;
        a.size.width = 999;
        return b;
      },
    },
  ];

  kernel.transact((transaction) => transaction.applyChangeSet({ beforeRevision: 0, revision: 1, changes }, 'forward'));

  expect(kernel.read().query.getNode(a.id)).toMatchObject({
    type: 'task',
    position: { x: 10, y: 20 },
    size: { width: 80, height: 40 },
  });
  expect(a.position.x).toBe(999);
});

test('replay observes opaque data in its existing comparison and write phases', () => {
  const kernel = createCanvasKernel();
  const id = nodeId('task');
  const sourceData = { source: true };
  const targetData = { target: true };
  kernel.transact((transaction) => {
    transaction.nodes.add({ id, type: 'task', position: { x: 0, y: 0 }, data: sourceData });
  });
  const original = kernel.read().query.getNode(id)!;
  const observations: string[] = [];
  const source = {
    ...original,
    get data() {
      observations.push('source');
      return sourceData;
    },
  };
  const target = {
    ...original,
    position: { x: 10, y: 20 },
    get data() {
      observations.push('target');
      return targetData;
    },
  };

  const commit = kernel.transact((transaction) =>
    transaction.applyChangeSet(
      { beforeRevision: 1, revision: 2, changes: [{ entity: 'node', id, before: source, after: target }] },
      'forward',
    ),
  );

  expect(observations).toEqual(['source', 'target']);
  expect(commit?.before.query.getNode(id)?.data).toBe(sourceData);
  expect(commit?.after.query.getNode(id)?.data).toBe(targetData);
  expect(Object.isFrozen(sourceData) || Object.isFrozen(targetData)).toBe(false);
});

test.each(['source', 'target'] as const)('replay preserves the original opaque %s data error', (phase) => {
  const kernel = createCanvasKernel();
  const id = nodeId('task');
  kernel.transact((transaction) => {
    transaction.nodes.add({ id, type: 'task', position: { x: 0, y: 0 }, data: null });
  });
  const before = kernel.read();
  const original = before.query.getNode(id)!;
  const failure = new Error(`original ${phase} data failure`);
  const source = {
    ...original,
    get data() {
      if (phase === 'source') throw failure;
      return null;
    },
  };
  const target = {
    ...original,
    position: { x: 10, y: 20 },
    get data() {
      if (phase === 'target') throw failure;
      return null;
    },
  };

  let received: unknown;
  try {
    kernel.transact((transaction) =>
      transaction.applyChangeSet(
        { beforeRevision: 1, revision: 2, changes: [{ entity: 'node', id, before: source, after: target }] },
        'forward',
      ),
    );
  } catch (error) {
    received = error;
  }
  expect(received).toBe(failure);
  expect(kernel.read()).toBe(before);
});

test.each(['entity', 'id'] as const)('replay captures the record %s before later reads can replace it', (field) => {
  const kernel = createCanvasKernel();
  const id = nodeId('accepted');
  const target = { id, type: 'task', position: { x: 10, y: 20 }, data: null };
  const change: GraphChange = { entity: 'node', id, before: null, after: target };
  const reads = changing(change, field, field === 'entity' ? 'edge' : nodeId('substitute'));

  const commit = kernel.transact((transaction) =>
    transaction.applyChangeSet({ beforeRevision: 0, revision: 1, changes: [change] }, 'forward'),
  );

  expect(commit?.changeSet.changes[0]).toMatchObject({ entity: 'node', id });
  expect(kernel.read().query.getNode(id)?.position).toEqual({ x: 10, y: 20 });
  expect(reads()).toBe(1);
});

test.each(['id', 'type', 'position', 'size', 'parentId'] as const)(
  'replay retains the original Node %s read exception',
  (field) => {
    const kernel = createCanvasKernel();
    const before = kernel.read();
    const id = nodeId('accepted');
    const failure = new Error(`original ${field} read failed`);
    const target = { id, type: 'task', position: { x: 10, y: 20 }, data: null };
    Object.defineProperty(target, field, {
      get() {
        throw failure;
      },
    });

    let received: unknown;
    try {
      kernel.transact((transaction) =>
        transaction.applyChangeSet(
          { beforeRevision: 0, revision: 1, changes: [{ entity: 'node', id, before: null, after: target }] },
          'forward',
        ),
      );
    } catch (error) {
      received = error;
    }
    expect(received).toBe(failure);
    expect(kernel.read()).toBe(before);
  },
);

test('invalid first geometry keeps its structural error before a later getter failure', () => {
  const kernel = createCanvasKernel();
  const before = kernel.read();
  const id = nodeId('accepted');
  let laterReads = 0;
  const target = {
    id,
    type: 'task',
    position: {
      x: 'invalid' as never,
      get y(): never {
        laterReads += 1;
        throw new Error('Later coordinate must not replace the shape failure.');
      },
    },
    data: null,
  };
  expect(() =>
    kernel.transact((transaction) =>
      transaction.applyChangeSet(
        { beforeRevision: 0, revision: 1, changes: [{ entity: 'node', id, before: null, after: target }] },
        'forward',
      ),
    ),
  ).toThrow(
    expect.objectContaining({ code: 'INVALID_CHANGE_SET', details: { index: 0, side: 'after', entity: 'node', id } }),
  );
  expect(laterReads).toBe(0);
  expect(kernel.read()).toBe(before);
});

test('inherited values and the opaque data getter keep their original receiver', () => {
  const kernel = createCanvasKernel();
  const id = nodeId('accepted');
  const data = { application: true };
  const target = { id, type: 'task', position: { x: 10, y: 20 }, data, payload: data };
  const prototype = {
    id,
    type: 'task',
    position: { x: 10, y: 20 },
    get data() {
      return Reflect.get(this, 'payload');
    },
  };
  for (const key of ['id', 'type', 'position', 'data']) Reflect.deleteProperty(target, key);
  Object.setPrototypeOf(target, prototype);

  kernel.transact((transaction) =>
    transaction.applyChangeSet(
      { beforeRevision: 0, revision: 1, changes: [{ entity: 'node', id, before: null, after: target }] },
      'forward',
    ),
  );

  expect(kernel.read().query.getNode(id)?.data).toBe(data);
  expect(kernel.read().query.getNode(id)?.position).toEqual({ x: 10, y: 20 });
});

test('a caught value-based conflict leaves only subsequent deliberate writes', () => {
  const kernel = createCanvasKernel();
  const a = nodeId('a');
  const b = nodeId('b');
  kernel.transact((transaction) => {
    for (const id of [a, b]) transaction.nodes.add({ id, type: 'task', position: { x: 0, y: 0 }, data: null });
  });
  const originalA = kernel.read().query.getNode(a)!;
  const originalB = kernel.read().query.getNode(b)!;
  kernel.transact((transaction) => {
    transaction.nodes.replace(b, { ...originalB, position: { x: 999, y: 0 } });
  });
  let reads = 0;
  const source = {
    ...originalB,
    position: {
      get x() {
        return ++reads === 1 ? 0 : 999;
      },
      y: 0,
    },
  };
  const changes: GraphChange[] = [
    { entity: 'node', id: a, before: originalA, after: { ...originalA, position: { x: 100, y: 100 } } },
    { entity: 'node', id: b, before: source, after: { ...originalB, position: { x: 100, y: 100 } } },
  ];

  const commit = kernel.transact((transaction) => {
    expect(() => transaction.applyChangeSet({ beforeRevision: 1, revision: 2, changes }, 'forward')).toThrow(
      expect.objectContaining({ code: 'CHANGE_SET_CONFLICT' }),
    );
    expect(transaction.query.getNode(a)?.position).toEqual({ x: 0, y: 0 });
    expect(transaction.query.getNode(b)?.position).toEqual({ x: 999, y: 0 });
    transaction.nodes.add({ id: nodeId('deliberate'), type: 'task', position: { x: 7, y: 8 }, data: null });
  });

  expect(commit?.changeSet.changes.map((change) => change.id)).toEqual([nodeId('deliberate')]);
  expect(reads).toBe(1);
});

function changing(owner: object, key: string, replacement: unknown): () => number {
  const accepted = Reflect.get(owner, key);
  let reads = 0;
  Object.defineProperty(owner, key, {
    configurable: true,
    enumerable: true,
    get() {
      return ++reads === 1 ? accepted : replacement;
    },
  });
  return () => reads;
}
