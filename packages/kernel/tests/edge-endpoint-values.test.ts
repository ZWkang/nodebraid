import { expect, test } from 'bun:test';

import { createCanvasKernel, edgeId, nodeId, type CanvasEdge, type EdgeEndpoint } from '../src';

test('an Edge Writer retains the first source Port ID while copying its Endpoint', () => {
  const kernel = createCanvasKernel();
  const source = nodeId('source');
  const target = nodeId('target');
  let reads = 0;
  const commit = kernel.transact((transaction) => {
    transaction.nodes.add({ id: source, type: 'task', position: { x: 0, y: 0 }, data: null });
    transaction.nodes.add({ id: target, type: 'task', position: { x: 1, y: 1 }, data: null });
    transaction.edges.add({
      id: edgeId('edge'),
      type: 'flow',
      source: {
        nodeId: source,
        get portId() {
          return ++reads === 1 ? 'first-port' : 'replacement-port';
        },
      },
      target: { nodeId: target },
      data: null,
    });
  });

  expect(commit?.after.query.getEdge(edgeId('edge'))?.source.portId).toBe('first-port');
  expect(reads).toBe(1);
});

const cases = [
  { writer: 'add', side: 'source' },
  { writer: 'add', side: 'target' },
  { writer: 'replace', side: 'source' },
  { writer: 'replace', side: 'target' },
] as const;

function fixture(writer: 'add' | 'replace') {
  const kernel = createCanvasKernel();
  const source = nodeId('source'),
    target = nodeId('target'),
    id = edgeId('edge');
  const data = new Map([['opaque', 17n]]);
  const edge: CanvasEdge = {
    id,
    type: 'flow',
    source: { nodeId: source, portId: 'source-before' },
    target: { nodeId: target, portId: 'target-before' },
    data,
  };
  kernel.transact((transaction) => {
    transaction.nodes.add({ id: source, type: 'task', position: { x: 0, y: 0 }, data: null });
    transaction.nodes.add({ id: target, type: 'task', position: { x: 1, y: 1 }, data: null });
    if (writer === 'replace') transaction.edges.add(edge);
  });
  return { kernel, source, target, id, edge, data };
}

for (const { writer, side } of cases) {
  test(writer + ' retains a changing first ' + side + ' Port ID', () => {
    const value = fixture(writer);
    let reads = 0;
    const endpoint: EdgeEndpoint = {
      nodeId: side === 'source' ? value.source : value.target,
      get portId() {
        return ++reads === 1 ? 'first-port' : 'replacement-port';
      },
    };
    const edge = { ...value.edge, [side]: endpoint };
    const commit = value.kernel.transact((transaction) => {
      if (writer === 'add') transaction.edges.add(edge);
      else transaction.edges.replace(value.id, edge);
    });
    expect(commit?.after.query.getEdge(value.id)?.[side].portId).toBe('first-port');
    expect(reads).toBe(1);
    expect(commit?.after.query.getEdge(value.id)?.data).toBe(value.data);
  });

  for (const kind of ['own', 'inherited', 'non-enumerable'] as const) {
    test(writer + ' accepts first ' + side + ' Port ID from ' + kind + ' getter without another read', () => {
      const value = fixture(writer);
      let reads = 0;
      const receiver = { nodeId: side === 'source' ? value.source : value.target };
      const endpoint = kind === 'inherited' ? Object.create(receiver) : receiver;
      Object.defineProperty(kind === 'inherited' ? receiver : endpoint, 'portId', {
        enumerable: kind !== 'non-enumerable',
        get() {
          expect(this).toBe(endpoint);
          if (++reads > 1) throw new Error('Later Endpoint Port read must not run.');
          return 'first-port';
        },
      });
      const before = value.kernel.read();
      const commit = value.kernel.transact((transaction) => {
        const edge = { ...value.edge, [side]: endpoint };
        if (writer === 'add') transaction.edges.add(edge);
        else transaction.edges.replace(value.id, edge);
      });
      expect(commit?.after.query.getEdge(value.id)?.[side].portId).toBe('first-port');
      expect(Object.isFrozen(commit?.after.query.getEdge(value.id)?.[side])).toBe(true);
      expect(commit?.after.query.getEdge(value.id)?.data).toBe(value.data);
      expect(before.query.getEdge(value.id)?.[side].portId).toBe(writer === 'replace' ? side + '-before' : undefined);
      expect(reads).toBe(1);
    });
  }

  for (const portId of ['', undefined]) {
    test(writer + ' preserves first ' + side + ' optional Port value ' + String(portId), () => {
      const value = fixture(writer);
      let reads = 0;
      const endpoint: EdgeEndpoint = {
        nodeId: side === 'source' ? value.source : value.target,
        get portId() {
          if (++reads > 1) throw new Error('Optional Port value was reread.');
          return portId;
        },
      };
      const commit = value.kernel.transact((transaction) => {
        const edge = { ...value.edge, [side]: endpoint };
        if (writer === 'add') transaction.edges.add(edge);
        else transaction.edges.replace(value.id, edge);
      });
      const captured = commit?.after.query.getEdge(value.id)?.[side];
      expect(captured?.portId).toBe(portId);
      expect(Object.hasOwn(captured!, 'portId')).toBe(portId !== undefined);
      expect(reads).toBe(1);
    });
  }

  test.each([undefined, null, false, 0, '', Symbol('Endpoint failure'), new Error('Endpoint failure')])(
    writer + ' preserves first ' + side + ' Port failure %p and leaves no partial Draft/index write',
    (failure) => {
      const value = fixture(writer);
      const before = value.kernel.read();
      let reads = 0,
        dataReads = 0;
      const edge: CanvasEdge = {
        ...value.edge,
        [side]: {
          nodeId: side === 'source' ? value.source : value.target,
          get portId(): string {
            reads++;
            throw failure;
          },
        },
        get data() {
          dataReads++;
          return value.data;
        },
      };
      let caught = false,
        original: unknown;
      const commit = value.kernel.transact((transaction) => {
        try {
          if (writer === 'add') transaction.edges.add(edge);
          else transaction.edges.replace(value.id, edge);
        } catch (error) {
          caught = true;
          original = error;
        }
        expect(caught).toBe(true);
        expect(original).toBe(failure);
        expect(transaction.query.getEdge(value.id)).toBe(before.query.getEdge(value.id));
        expect(transaction.query.getOutgoingEdges(value.source)).toEqual(before.query.getOutgoingEdges(value.source));
        expect(transaction.query.getIncomingEdges(value.target)).toEqual(before.query.getIncomingEdges(value.target));
        transaction.nodes.add({ id: nodeId('deliberate'), type: 'task', position: { x: 7, y: 8 }, data: null });
      });
      expect(commit?.changeSet.changes.map((change) => change.id)).toEqual([nodeId('deliberate')]);
      expect(value.kernel.read().query.getEdge(value.id)).toBe(before.query.getEdge(value.id));
      expect(reads).toBe(1);
      expect(dataReads).toBe(0);
    },
  );
}

for (const writer of ['add', 'replace'] as const) {
  test(writer + ' reads Endpoint values before opaque Edge data', () => {
    const value = fixture(writer);
    const order: string[] = [];
    const endpoint = (label: 'source' | 'target'): EdgeEndpoint => ({
      get nodeId() {
        order.push(label + '.nodeId');
        return value[label];
      },
      get portId() {
        order.push(label + '.portId');
        return label + '-port';
      },
    });
    const edge: CanvasEdge = {
      id: value.id,
      type: 'flow',
      source: endpoint('source'),
      target: endpoint('target'),
      get data() {
        order.push('data');
        return value.data;
      },
    };
    const commit = value.kernel.transact((transaction) => {
      if (writer === 'add') transaction.edges.add(edge);
      else transaction.edges.replace(value.id, edge);
    });
    expect(order).toEqual(['source.nodeId', 'source.portId', 'target.nodeId', 'target.portId', 'data']);
    expect(commit?.after.query.getEdge(value.id)?.data).toBe(value.data);
  });
}

test.each(['source', 'target'] as const)('equal first %s Port preserves net-zero replacement', (side) => {
  const value = fixture('replace'),
    before = value.kernel.read();
  let reads = 0;
  const commit = value.kernel.transact((transaction) =>
    transaction.edges.replace(value.id, {
      ...value.edge,
      [side]: {
        ...value.edge[side],
        get portId() {
          return ++reads === 1 ? side + '-before' : 'replacement-port';
        },
      },
    }),
  );
  expect(commit).toBeNull();
  expect(value.kernel.read()).toBe(before);
  expect(reads).toBe(1);
});

test('captured Edge Endpoints remain consistent through historical queries and both replay directions', () => {
  const value = fixture('replace'),
    before = value.kernel.read();
  const move = value.kernel.transact((transaction) =>
    transaction.edges.replace(value.id, {
      ...value.edge,
      source: {
        nodeId: value.target,
        get portId() {
          return 'new-source';
        },
      },
      target: {
        nodeId: value.source,
        get portId() {
          return '';
        },
      },
    }),
  );
  expect(move).not.toBeNull();
  const after = value.kernel.read();
  expect(before.query.getOutgoingEdges(value.source).map((edge) => edge.id)).toEqual([value.id]);
  expect(before.query.getIncomingEdges(value.target).map((edge) => edge.id)).toEqual([value.id]);
  expect(after.query.getOutgoingEdges(value.target).map((edge) => edge.id)).toEqual([value.id]);
  expect(after.query.getIncomingEdges(value.source).map((edge) => edge.id)).toEqual([value.id]);
  value.kernel.transact((transaction) => transaction.applyChangeSet(move!.changeSet, 'reverse'));
  expect(value.kernel.read().query.getEdge(value.id)).toEqual(before.query.getEdge(value.id));
  expect(value.kernel.read().query.getEdge(value.id)?.data).toBe(value.data);
  value.kernel.transact((transaction) => transaction.applyChangeSet(move!.changeSet, 'forward'));
  expect(value.kernel.read().query.getEdge(value.id)).toEqual(after.query.getEdge(value.id));
  expect(after.query.getEdge(value.id)?.source.portId).toBe('new-source');
  expect(after.query.getEdge(value.id)?.target.portId).toBe('');
  expect(before.query.getEdge(value.id)?.source.portId).toBe('source-before');
});
