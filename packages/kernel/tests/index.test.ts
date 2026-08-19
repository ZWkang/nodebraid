import { describe, expect, test } from 'bun:test';

import { createCanvasKernel, edgeId, nodeId, type EdgeId, type NodeId, type TransactionContext } from '../src';

describe('@cflow/kernel', () => {
  test('creates one stable revision-zero Canvas View', () => {
    const kernel = createCanvasKernel();

    const firstView = kernel.read();
    const secondView = kernel.read();

    expect(firstView).toBe(secondView);
    expect(firstView.snapshot).toEqual({
      revision: 0,
      nodes: [],
      edges: [],
    });
    expect(Object.isFrozen(firstView)).toBe(true);
    expect(Object.isFrozen(firstView.snapshot)).toBe(true);
    expect(Object.isFrozen(firstView.snapshot.nodes)).toBe(true);
    expect(Object.isFrozen(firstView.snapshot.edges)).toBe(true);
  });

  test('creates distinct Node and Edge identifiers and rejects empty values', () => {
    const node: NodeId = nodeId('shared');
    const edge: EdgeId = edgeId('shared');

    expect(String(node)).toBe('shared');
    expect(String(edge)).toBe('shared');
    // @ts-expect-error Node and Edge identifier namespaces stay distinct.
    const invalidNode: NodeId = edge;
    void invalidNode;

    expect(() => nodeId('')).toThrow(
      expect.objectContaining({
        name: 'KernelError',
        code: 'INVALID_ID',
        details: { entity: 'node', value: '' },
      }),
    );
    expect(() => edgeId('')).toThrow(
      expect.objectContaining({
        name: 'KernelError',
        code: 'INVALID_ID',
        details: { entity: 'edge', value: '' },
      }),
    );
  });

  test('distinguishes missing entities from relationships of a missing Node', () => {
    const query = createCanvasKernel().read().query;
    const missingNode = nodeId('missing-node');

    expect(query.getNode(missingNode)).toBeUndefined();
    expect(query.getEdge(edgeId('missing-edge'))).toBeUndefined();

    for (const readRelationships of [
      () => query.getIncomingEdges(missingNode),
      () => query.getOutgoingEdges(missingNode),
      () => query.getIncidentEdges(missingNode),
      () => query.getChildren(missingNode),
    ]) {
      expect(readRelationships).toThrow(
        expect.objectContaining({
          code: 'ENTITY_NOT_FOUND',
          details: { entity: 'node', id: missingNode },
        }),
      );
    }

    expect(Object.isFrozen(query)).toBe(true);
  });

  test('commits one Node with matching before and after Canvas Views', () => {
    const kernel = createCanvasKernel();
    const before = kernel.read();
    const taskId = nodeId('task');
    const task = {
      id: taskId,
      type: 'task',
      position: { x: 10, y: 20 },
      data: { label: 'Task' },
    };

    const commit = kernel.transact(
      (transaction) => {
        transaction.nodes.add(task);
        expect(transaction.query.getNode(taskId)).toEqual(task);
        expect(kernel.read()).toBe(before);
      },
      { origin: 'user', commandId: 'node.add' },
    );

    expect(commit).not.toBeNull();
    if (!commit) throw new Error('Expected the Node Transaction to commit.');

    expect(commit.before).toBe(before);
    expect(commit.after).toBe(kernel.read());
    expect(commit.after.snapshot).toEqual({ revision: 1, nodes: [task], edges: [] });
    expect(commit.changeSet).toEqual({
      beforeRevision: 0,
      revision: 1,
      origin: 'user',
      commandId: 'node.add',
      changes: [{ entity: 'node', id: taskId, before: null, after: task }],
    });
    expect(Object.isFrozen(commit)).toBe(true);
    expect(Object.isFrozen(commit.changeSet)).toBe(true);
    expect(Object.isFrozen(commit.changeSet.changes)).toBe(true);
    expect(Object.isFrozen(commit.after.snapshot.nodes[0])).toBe(true);
    expect(Object.isFrozen(commit.after.snapshot.nodes[0]?.position)).toBe(true);
    expect(Object.isFrozen(task.data)).toBe(false);
  });

  test('keeps undeclared caller fields outside committed Node and Edge values', () => {
    const kernel = createCanvasKernel();
    const sourceId = nodeId('source');
    const targetId = nodeId('target');
    const connectionId = edgeId('connection');
    const nodeExtension = { nested: { value: 1 } };
    const edgeExtension = { nested: { value: 2 } };
    const source = {
      id: sourceId,
      type: 'task',
      position: { x: 0, y: 0 },
      data: null,
      extension: nodeExtension,
    };
    const connection = {
      id: connectionId,
      type: 'flow',
      source: { nodeId: sourceId },
      target: { nodeId: targetId },
      data: null,
      extension: edgeExtension,
    };

    const commit = kernel.transact((transaction) => {
      transaction.nodes.add(source);
      transaction.nodes.add({
        id: targetId,
        type: 'task',
        position: { x: 1, y: 0 },
        data: null,
      });
      transaction.edges.add(connection);
    });
    if (!commit) throw new Error('Expected graph creation to commit.');

    const committedSource = commit.after.query.getNode(sourceId);
    const committedConnection = commit.after.query.getEdge(connectionId);
    expect(committedSource).toEqual({
      id: sourceId,
      type: 'task',
      position: { x: 0, y: 0 },
      data: null,
    });
    expect(committedConnection).toEqual({
      id: connectionId,
      type: 'flow',
      source: { nodeId: sourceId },
      target: { nodeId: targetId },
      data: null,
    });

    nodeExtension.nested.value = 10;
    edgeExtension.nested.value = 20;
    expect('extension' in (committedSource as object)).toBe(false);
    expect('extension' in (committedConnection as object)).toBe(false);
  });

  test('rolls back callback and invalid-position failures without replacing the Canvas View', () => {
    const kernel = createCanvasKernel();
    const before = kernel.read();
    const callbackFailure = new Error('command failed');

    expect(() =>
      kernel.transact((transaction) => {
        transaction.nodes.add({
          id: nodeId('callback-node'),
          type: 'task',
          position: { x: 0, y: 0 },
          data: null,
        });
        throw callbackFailure;
      }),
    ).toThrow(callbackFailure);
    expect(kernel.read()).toBe(before);

    expect(() =>
      kernel.transact((transaction) => {
        transaction.nodes.add({
          id: nodeId('invalid-node'),
          type: 'task',
          position: { x: Number.POSITIVE_INFINITY, y: Number.NaN },
          data: null,
        });
      }),
    ).toThrow(
      expect.objectContaining({
        code: 'INVALID_GRAPH',
        details: {
          issues: [
            {
              code: 'INVALID_POSITION',
              nodeId: nodeId('invalid-node'),
              coordinate: 'x',
              receivedNumber: 'positive-infinity',
            },
            {
              code: 'INVALID_POSITION',
              nodeId: nodeId('invalid-node'),
              coordinate: 'y',
              receivedNumber: 'nan',
            },
          ],
        },
      }),
    );
    expect(kernel.read()).toBe(before);
  });

  test('rejects an asynchronous Transaction callback and rolls back its staged writes', () => {
    const kernel = createCanvasKernel();
    const before = kernel.read();

    expect(() =>
      kernel.transact(async (transaction) => {
        transaction.nodes.add({
          id: nodeId('async-node'),
          type: 'task',
          position: { x: 0, y: 0 },
          data: null,
        });
        await Promise.resolve();
      }),
    ).toThrow(expect.objectContaining({ code: 'ASYNC_TRANSACTION' }));
    expect(kernel.read()).toBe(before);
    expect(kernel.read().query.getNode(nodeId('async-node'))).toBeUndefined();
  });

  test('rejects a nested Transaction and rolls back the outer callback when the error escapes', () => {
    const kernel = createCanvasKernel();
    const before = kernel.read();

    expect(() =>
      kernel.transact((outer) => {
        outer.nodes.add({
          id: nodeId('outer-node'),
          type: 'task',
          position: { x: 0, y: 0 },
          data: null,
        });
        kernel.transact((inner) => {
          inner.nodes.add({
            id: nodeId('inner-node'),
            type: 'task',
            position: { x: 0, y: 0 },
            data: null,
          });
        });
      }),
    ).toThrow(expect.objectContaining({ code: 'TRANSACTION_REENTRANT' }));

    expect(kernel.read()).toBe(before);
    expect(kernel.read().snapshot.nodes).toEqual([]);
  });

  test('closes the Transaction Context and its capabilities after the callback', () => {
    const kernel = createCanvasKernel();
    let leaked: TransactionContext | undefined;

    kernel.transact((transaction) => {
      leaked = transaction;
      transaction.nodes.add({
        id: nodeId('closed-node'),
        type: 'task',
        position: { x: 0, y: 0 },
        data: null,
      });
    });

    const context = leaked;
    if (!context) throw new Error('Expected to capture the Transaction Context.');
    expect(() => context.query.getNode(nodeId('closed-node'))).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_CLOSED' }),
    );
    expect(() =>
      context.nodes.add({
        id: nodeId('late-node'),
        type: 'task',
        position: { x: 0, y: 0 },
        data: null,
      }),
    ).toThrow(expect.objectContaining({ code: 'TRANSACTION_CLOSED' }));
    expect(() => context.edges.remove(edgeId('late-edge'))).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_CLOSED' }),
    );
  });

  test('can catch a failed nested or strict operation and continue the outer Transaction', () => {
    const kernel = createCanvasKernel();
    const firstId = nodeId('first');
    const secondId = nodeId('second');

    const commit = kernel.transact((transaction) => {
      transaction.nodes.add({
        id: firstId,
        type: 'task',
        position: { x: 0, y: 0 },
        data: null,
      });
      try {
        transaction.nodes.add({
          id: firstId,
          type: 'duplicate',
          position: { x: 1, y: 1 },
          data: null,
        });
      } catch (error) {
        expect(error).toEqual(expect.objectContaining({ code: 'ENTITY_ALREADY_EXISTS' }));
      }
      try {
        kernel.transact(() => {});
      } catch (error) {
        expect(error).toEqual(expect.objectContaining({ code: 'TRANSACTION_REENTRANT' }));
      }
      transaction.nodes.add({
        id: secondId,
        type: 'task',
        position: { x: 2, y: 2 },
        data: null,
      });
    });

    expect(commit?.after.snapshot.nodes.map((node) => node.id)).toEqual([firstId, secondId]);
  });

  test('strictly replaces and removes an existing Node', () => {
    const kernel = createCanvasKernel();
    const taskId = nodeId('task');
    const original = {
      id: taskId,
      type: 'task',
      position: { x: 0, y: 0 },
      data: { label: 'Original' },
    };
    kernel.transact((transaction) => transaction.nodes.add(original));

    const replacement = {
      ...original,
      position: { x: 40, y: 20 },
      data: { label: 'Replacement' },
    };
    const replaceCommit = kernel.transact((transaction) => transaction.nodes.replace(taskId, replacement));

    expect(replaceCommit?.changeSet.changes).toEqual([
      { entity: 'node', id: taskId, before: original, after: replacement },
    ]);
    expect(replaceCommit?.after.query.getNode(taskId)).toEqual(replacement);

    const removeCommit = kernel.transact((transaction) => transaction.nodes.remove(taskId));
    expect(removeCommit?.changeSet.changes).toEqual([{ entity: 'node', id: taskId, before: replacement, after: null }]);
    expect(removeCommit?.after.query.getNode(taskId)).toBeUndefined();
  });

  test('collapses a Node restored to its original value into a net-zero Transaction', () => {
    const kernel = createCanvasKernel();
    const taskId = nodeId('task');
    const data = { label: 'Stable reference' };
    const original = {
      id: taskId,
      type: 'task',
      position: { x: 0, y: 0 },
      data,
    };
    kernel.transact((transaction) => transaction.nodes.add(original));
    const before = kernel.read();

    const commit = kernel.transact((transaction) => {
      transaction.nodes.replace(taskId, { ...original, position: { x: 10, y: 20 } });
      transaction.nodes.replace(taskId, { ...original, position: { x: 0, y: 0 } });
    });

    expect(commit).toBeNull();
    expect(kernel.read()).toBe(before);
    expect(kernel.read().snapshot.revision).toBe(1);

    const temporaryId = nodeId('temporary');
    expect(
      kernel.transact((transaction) => {
        transaction.nodes.add({
          id: temporaryId,
          type: 'task',
          position: { x: 0, y: 0 },
          data: null,
        });
        transaction.nodes.remove(temporaryId);
      }),
    ).toBeNull();
    expect(kernel.read()).toBe(before);
  });

  test('reports strict Node writer errors without changing the Draft', () => {
    const kernel = createCanvasKernel();
    const taskId = nodeId('task');
    const missingId = nodeId('missing');
    const task = { id: taskId, type: 'task', position: { x: 0, y: 0 }, data: null };

    const commit = kernel.transact((transaction) => {
      transaction.nodes.add(task);
      expect(() => transaction.nodes.add(task)).toThrow(
        expect.objectContaining({ code: 'ENTITY_ALREADY_EXISTS', details: { entity: 'node', id: taskId } }),
      );
      expect(() => transaction.nodes.replace(missingId, { ...task, id: missingId })).toThrow(
        expect.objectContaining({ code: 'ENTITY_NOT_FOUND', details: { entity: 'node', id: missingId } }),
      );
      expect(() => transaction.nodes.remove(missingId)).toThrow(
        expect.objectContaining({ code: 'ENTITY_NOT_FOUND', details: { entity: 'node', id: missingId } }),
      );
      expect(() => transaction.nodes.replace(taskId, { ...task, id: nodeId('other') })).toThrow(
        expect.objectContaining({
          code: 'ENTITY_ID_MISMATCH',
          details: { entity: 'node', id: taskId, actualId: nodeId('other') },
        }),
      );
    });

    expect(commit?.after.snapshot.nodes).toEqual([task]);
  });

  test('coalesces Node operation sequences and compares data by reference', () => {
    const kernel = createCanvasKernel();
    const taskId = nodeId('task');
    const data = { label: 'Task' };
    const original = { id: taskId, type: 'task', position: { x: 0, y: 0 }, data };
    kernel.transact((transaction) => transaction.nodes.add(original));

    const replaced = { ...original, position: { x: 1, y: 2 } };
    const removed = kernel.transact((transaction) => {
      transaction.nodes.replace(taskId, replaced);
      transaction.nodes.remove(taskId);
    });
    expect(removed?.changeSet.changes).toEqual([{ entity: 'node', id: taskId, before: original, after: null }]);

    const restored = kernel.transact((transaction) => {
      transaction.nodes.add(replaced);
      transaction.nodes.replace(taskId, original);
    });
    expect(restored?.changeSet.changes).toEqual([{ entity: 'node', id: taskId, before: null, after: original }]);

    const beforeIdenticalRestore = kernel.read();
    expect(
      kernel.transact((transaction) => {
        transaction.nodes.remove(taskId);
        transaction.nodes.add({ ...original, position: { ...original.position } });
      }),
    ).toBeNull();
    expect(kernel.read()).toBe(beforeIdenticalRestore);

    const deepEqualDataCommit = kernel.transact((transaction) => {
      transaction.nodes.replace(taskId, { ...original, data: { label: 'Task' } });
    });
    expect(deepEqualDataCommit).not.toBeNull();
  });

  test('connects Nodes with an Edge and queries its directed relationships', () => {
    const kernel = createCanvasKernel();
    const sourceId = nodeId('source');
    const targetId = nodeId('target');
    const connectionId = edgeId('connection');
    const source = { id: sourceId, type: 'task', position: { x: 0, y: 0 }, data: null };
    const target = { id: targetId, type: 'task', position: { x: 100, y: 0 }, data: null };
    const connection = {
      id: connectionId,
      type: 'flow',
      source: { nodeId: sourceId },
      target: { nodeId: targetId, portId: 'input' },
      data: { label: 'Flow' },
    };

    const commit = kernel.transact((transaction) => {
      transaction.nodes.add(target);
      transaction.nodes.add(source);
      transaction.edges.add(connection);

      expect(transaction.query.getOutgoingEdges(sourceId)).toEqual([connection]);
      expect(transaction.query.getIncomingEdges(targetId)).toEqual([connection]);
      expect(transaction.query.getIncidentEdges(sourceId)).toEqual([connection]);
      expect(transaction.query.getEdge(connectionId)).toEqual(connection);
    });

    expect(commit?.after.snapshot.nodes.map((node) => node.id)).toEqual([sourceId, targetId]);
    expect(commit?.after.snapshot.edges).toEqual([connection]);
    expect(commit?.changeSet.changes.map((change) => [change.entity, change.id])).toEqual([
      ['node', sourceId],
      ['node', targetId],
      ['edge', connectionId],
    ]);
    expect(Object.isFrozen(commit?.after.snapshot.edges[0]?.source)).toBe(true);
    expect(Object.isFrozen(commit?.after.snapshot.edges[0]?.target)).toBe(true);
    expect(Object.isFrozen(connection.data)).toBe(false);
  });

  test('rejects an Edge whose final Endpoint references a missing Node', () => {
    const kernel = createCanvasKernel();
    const before = kernel.read();
    const sourceId = nodeId('source');
    const missingId = nodeId('missing');
    const connectionId = edgeId('invalid-connection');

    expect(() =>
      kernel.transact((transaction) => {
        transaction.nodes.add({
          id: sourceId,
          type: 'task',
          position: { x: 0, y: 0 },
          data: null,
        });
        transaction.edges.add({
          id: connectionId,
          type: 'flow',
          source: { nodeId: sourceId },
          target: { nodeId: missingId },
          data: null,
        });
      }),
    ).toThrow(
      expect.objectContaining({
        code: 'INVALID_GRAPH',
        details: {
          issues: [
            {
              code: 'MISSING_EDGE_ENDPOINT',
              edgeId: connectionId,
              endpoint: 'target',
              nodeId: missingId,
            },
          ],
        },
      }),
    );
    expect(kernel.read()).toBe(before);
  });

  test('allows temporary Endpoints, self-loops, and separate Node and Edge ID namespaces', () => {
    const kernel = createCanvasKernel();
    const sharedNodeId = nodeId('shared');
    const sharedEdgeId = edgeId('shared');
    const laterId = nodeId('later');
    const loopId = edgeId('a-loop');

    const commit = kernel.transact((transaction) => {
      transaction.edges.add({
        id: sharedEdgeId,
        type: 'flow',
        source: { nodeId: sharedNodeId },
        target: { nodeId: laterId },
        data: null,
      });
      transaction.nodes.add({
        id: laterId,
        type: 'task',
        position: { x: 1, y: 0 },
        data: null,
      });
      transaction.nodes.add({
        id: sharedNodeId,
        type: 'task',
        position: { x: 0, y: 0 },
        data: null,
      });
      transaction.edges.add({
        id: loopId,
        type: 'loop',
        source: { nodeId: sharedNodeId, portId: 'output' },
        target: { nodeId: sharedNodeId, portId: 'input' },
        data: null,
      });
    });

    expect(commit?.after.snapshot.edges.map((edge) => edge.id)).toEqual([loopId, sharedEdgeId]);
    expect(commit?.after.query.getIncidentEdges(sharedNodeId).map((edge) => edge.id)).toEqual([loopId, sharedEdgeId]);
    expect(commit?.after.query.getIncomingEdges(sharedNodeId).map((edge) => edge.id)).toEqual([loopId]);
    expect(commit?.after.query.getOutgoingEdges(sharedNodeId).map((edge) => edge.id)).toEqual([loopId, sharedEdgeId]);
  });

  test('strictly edits Edges and collapses an identical restoration', () => {
    const kernel = createCanvasKernel();
    const leftId = nodeId('left');
    const rightId = nodeId('right');
    const connectionId = edgeId('connection');
    const data = { label: 'Flow' };
    const original = {
      id: connectionId,
      type: 'flow',
      source: { nodeId: leftId },
      target: { nodeId: rightId },
      data,
    };
    kernel.transact((transaction) => {
      transaction.nodes.add({ id: leftId, type: 'task', position: { x: 0, y: 0 }, data: null });
      transaction.nodes.add({ id: rightId, type: 'task', position: { x: 1, y: 0 }, data: null });
      transaction.edges.add(original);
    });
    const before = kernel.read();

    expect(
      kernel.transact((transaction) => {
        transaction.edges.replace(connectionId, {
          ...original,
          source: { nodeId: leftId, portId: 'output' },
        });
        transaction.edges.replace(connectionId, {
          ...original,
          source: { ...original.source },
          target: { ...original.target },
        });
      }),
    ).toBeNull();
    expect(kernel.read()).toBe(before);

    expect(() => kernel.transact((transaction) => transaction.edges.remove(edgeId('missing-edge')))).toThrow(
      expect.objectContaining({ code: 'ENTITY_NOT_FOUND' }),
    );
    expect(() =>
      kernel.transact((transaction) =>
        transaction.edges.replace(connectionId, { ...original, id: edgeId('other-edge') }),
      ),
    ).toThrow(expect.objectContaining({ code: 'ENTITY_ID_MISMATCH' }));
  });

  test('keeps parent relationships and queries direct children in canonical order', () => {
    const kernel = createCanvasKernel();
    const parentId = nodeId('parent');
    const firstChildId = nodeId('a-child');
    const secondChildId = nodeId('b-child');

    const commit = kernel.transact((transaction) => {
      transaction.nodes.add({
        id: secondChildId,
        type: 'task',
        position: { x: 2, y: 2 },
        size: { width: 20, height: 10 },
        parentId,
        data: null,
      });
      transaction.nodes.add({
        id: parentId,
        type: 'group',
        position: { x: 0, y: 0 },
        size: { width: 0, height: 0 },
        data: null,
      });
      transaction.nodes.add({
        id: firstChildId,
        type: 'task',
        position: { x: 1, y: 1 },
        parentId,
        data: null,
      });
    });

    expect(commit?.after.query.getChildren(parentId).map((node) => node.id)).toEqual([firstChildId, secondChildId]);
    expect(Object.isFrozen(commit?.after.query.getNode(secondChildId)?.size)).toBe(true);
  });

  test('updates Draft relationship indexes when Nodes and Edges are replaced', () => {
    const kernel = createCanvasKernel();
    const firstParentId = nodeId('first-parent');
    const secondParentId = nodeId('second-parent');
    const childId = nodeId('child');
    const targetId = nodeId('target');
    const connectionId = edgeId('connection');
    const child = {
      id: childId,
      type: 'task',
      position: { x: 0, y: 0 },
      parentId: firstParentId,
      data: null,
    };
    const connection = {
      id: connectionId,
      type: 'flow',
      source: { nodeId: childId },
      target: { nodeId: targetId },
      data: null,
    };
    kernel.transact((transaction) => {
      transaction.nodes.add({ id: firstParentId, type: 'group', position: { x: 0, y: 0 }, data: null });
      transaction.nodes.add({ id: secondParentId, type: 'group', position: { x: 0, y: 0 }, data: null });
      transaction.nodes.add({ id: targetId, type: 'task', position: { x: 1, y: 0 }, data: null });
      transaction.nodes.add(child);
      transaction.edges.add(connection);
    });

    kernel.transact((transaction) => {
      transaction.nodes.replace(childId, { ...child, parentId: secondParentId });
      transaction.edges.replace(connectionId, {
        ...connection,
        source: { nodeId: targetId },
        target: { nodeId: childId },
      });

      expect(transaction.query.getChildren(firstParentId)).toEqual([]);
      expect(transaction.query.getChildren(secondParentId).map((node) => node.id)).toEqual([childId]);
      expect(transaction.query.getOutgoingEdges(childId)).toEqual([]);
      expect(transaction.query.getIncomingEdges(childId).map((edge) => edge.id)).toEqual([connectionId]);
      expect(transaction.query.getOutgoingEdges(targetId).map((edge) => edge.id)).toEqual([connectionId]);
    });
  });

  test('reports every missing relationship, parent cycle, and invalid geometry in the final graph', () => {
    const kernel = createCanvasKernel();
    const before = kernel.read();
    const cycleA = nodeId('cycle-a');
    const cycleB = nodeId('cycle-b');
    const invalidId = nodeId('invalid');
    const missingParent = nodeId('missing-parent');
    const missingEndpoint = nodeId('missing-endpoint');
    const invalidEdge = edgeId('invalid-edge');

    expect(() =>
      kernel.transact((transaction) => {
        transaction.nodes.add({
          id: cycleA,
          type: 'group',
          position: { x: 0, y: 0 },
          parentId: cycleB,
          data: null,
        });
        transaction.nodes.add({
          id: cycleB,
          type: 'group',
          position: { x: 0, y: 0 },
          parentId: cycleA,
          data: null,
        });
        transaction.nodes.add({
          id: invalidId,
          type: 'task',
          position: { x: Number.POSITIVE_INFINITY, y: 0 },
          size: { width: -1, height: Number.NaN },
          parentId: missingParent,
          data: null,
        });
        transaction.edges.add({
          id: invalidEdge,
          type: 'flow',
          source: { nodeId: cycleA },
          target: { nodeId: missingEndpoint },
          data: null,
        });
      }),
    ).toThrow(
      expect.objectContaining({
        code: 'INVALID_GRAPH',
        details: {
          issues: [
            {
              code: 'MISSING_EDGE_ENDPOINT',
              edgeId: invalidEdge,
              endpoint: 'target',
              nodeId: missingEndpoint,
            },
            { code: 'MISSING_PARENT', nodeId: invalidId, parentId: missingParent },
            { code: 'PARENT_CYCLE', nodeIds: [cycleA, cycleB] },
            {
              code: 'INVALID_POSITION',
              nodeId: invalidId,
              coordinate: 'x',
              receivedNumber: 'positive-infinity',
            },
            { code: 'INVALID_SIZE', nodeId: invalidId, dimension: 'width', value: -1 },
            {
              code: 'INVALID_SIZE',
              nodeId: invalidId,
              dimension: 'height',
              receivedNumber: 'nan',
            },
          ],
        },
      }),
    );
    expect(kernel.read()).toBe(before);
  });

  test('requires callers to reparent children explicitly when removing a parent', () => {
    const kernel = createCanvasKernel();
    const parentId = nodeId('parent');
    const childId = nodeId('child');
    const child = {
      id: childId,
      type: 'task',
      position: { x: 0, y: 0 },
      parentId,
      data: null,
    };
    kernel.transact((transaction) => {
      transaction.nodes.add({ id: parentId, type: 'group', position: { x: 0, y: 0 }, data: null });
      transaction.nodes.add(child);
    });
    const before = kernel.read();

    expect(() => kernel.transact((transaction) => transaction.nodes.remove(parentId))).toThrow(
      expect.objectContaining({
        code: 'INVALID_GRAPH',
        details: {
          issues: [{ code: 'MISSING_PARENT', nodeId: childId, parentId }],
        },
      }),
    );
    expect(kernel.read()).toBe(before);

    const commit = kernel.transact((transaction) => {
      transaction.nodes.remove(parentId);
      transaction.nodes.replace(childId, {
        id: childId,
        type: child.type,
        position: child.position,
        data: child.data,
      });
    });
    expect(commit?.after.query.getNode(parentId)).toBeUndefined();
    expect(commit?.after.query.getNode(childId)?.parentId).toBeUndefined();
  });

  test('applies a Change Set in reverse and forward through new Transactions', () => {
    const kernel = createCanvasKernel();
    const taskId = nodeId('task');
    const original = {
      id: taskId,
      type: 'task',
      position: { x: 0, y: 0 },
      data: { label: 'Task' },
    };
    kernel.transact((transaction) => transaction.nodes.add(original));

    const moved = { ...original, position: { x: 80, y: 40 } };
    const move = kernel.transact((transaction) => transaction.nodes.replace(taskId, moved), {
      origin: 'user',
      commandId: 'node.move',
    });
    if (!move) throw new Error('Expected the move Transaction to commit.');

    const undo = kernel.transact((transaction) => transaction.applyChangeSet(move.changeSet, 'reverse'), {
      origin: 'history',
      commandId: 'history.undo',
    });
    expect(undo?.after.snapshot.revision).toBe(3);
    expect(undo?.after.query.getNode(taskId)).toEqual(original);
    expect(undo?.changeSet).toEqual({
      beforeRevision: 2,
      revision: 3,
      origin: 'history',
      commandId: 'history.undo',
      changes: [{ entity: 'node', id: taskId, before: moved, after: original }],
    });

    const redo = kernel.transact((transaction) => transaction.applyChangeSet(move.changeSet, 'forward'), {
      origin: 'history',
      commandId: 'history.redo',
    });
    expect(redo?.after.snapshot.revision).toBe(4);
    expect(redo?.after.query.getNode(taskId)).toEqual(moved);
  });

  test('rejects a malformed Change Set before changing the Draft', () => {
    const kernel = createCanvasKernel();
    const before = kernel.read();
    const malformed = {
      beforeRevision: 0,
      revision: 1,
      changes: [
        {
          entity: 'node' as const,
          id: nodeId('missing'),
          before: null,
          after: null,
        },
      ],
    };

    expect(() => kernel.transact((transaction) => transaction.applyChangeSet(malformed, 'forward'))).toThrow(
      expect.objectContaining({ code: 'INVALID_CHANGE_SET' }),
    );
    expect(kernel.read()).toBe(before);
  });

  test('rejects stale replay before applying any matching entity changes', () => {
    const kernel = createCanvasKernel();
    const firstId = nodeId('first');
    const secondId = nodeId('second');
    const first = { id: firstId, type: 'task', position: { x: 0, y: 0 }, data: null };
    const second = { id: secondId, type: 'task', position: { x: 10, y: 0 }, data: null };
    kernel.transact((transaction) => {
      transaction.nodes.add(first);
      transaction.nodes.add(second);
    });
    const moved = kernel.transact((transaction) => {
      transaction.nodes.replace(firstId, { ...first, position: { x: 1, y: 1 } });
      transaction.nodes.replace(secondId, { ...second, position: { x: 11, y: 1 } });
    });
    if (!moved) throw new Error('Expected the move Transaction to commit.');
    kernel.transact((transaction) => {
      transaction.nodes.replace(secondId, { ...second, position: { x: 99, y: 99 } });
    });
    const beforeReplay = kernel.read();

    let replayError: unknown;
    try {
      kernel.transact((transaction) => transaction.applyChangeSet(moved.changeSet, 'reverse'));
    } catch (error) {
      replayError = error;
    }
    expect(replayError).toMatchObject({
      code: 'CHANGE_SET_CONFLICT',
      details: {
        entity: 'node',
        id: secondId,
        direction: 'reverse',
        expectedState: 'present',
        actualState: 'present',
      },
    });
    expect(kernel.read()).toBe(beforeReplay);
    expect(kernel.read().query.getNode(firstId)?.position).toEqual({ x: 1, y: 1 });
    expect(kernel.read().query.getNode(secondId)?.position).toEqual({ x: 99, y: 99 });
  });

  test('reverses and reapplies a complete Node and Edge creation Change Set', () => {
    const kernel = createCanvasKernel();
    const sourceId = nodeId('source');
    const targetId = nodeId('target');
    const connectionId = edgeId('connection');
    const created = kernel.transact((transaction) => {
      transaction.nodes.add({ id: sourceId, type: 'task', position: { x: 0, y: 0 }, data: null });
      transaction.nodes.add({ id: targetId, type: 'task', position: { x: 1, y: 0 }, data: null });
      transaction.edges.add({
        id: connectionId,
        type: 'flow',
        source: { nodeId: sourceId },
        target: { nodeId: targetId },
        data: null,
      });
    });
    if (!created) throw new Error('Expected graph creation to commit.');

    const removed = kernel.transact((transaction) => transaction.applyChangeSet(created.changeSet, 'reverse'));
    expect(removed?.after.snapshot).toEqual({ revision: 2, nodes: [], edges: [] });

    const restored = kernel.transact((transaction) => transaction.applyChangeSet(created.changeSet, 'forward'));
    expect(restored?.after.snapshot.nodes.map((node) => node.id)).toEqual([sourceId, targetId]);
    expect(restored?.after.snapshot.edges.map((edge) => edge.id)).toEqual([connectionId]);
  });
});
