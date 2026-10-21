import { expect, test } from 'bun:test';

import { edgeId, nodeId } from '@nodebraid/kernel';
import { commandPlugin, commandService, type CommandService } from '@nodebraid/plugin-command';
import {
  historyPlugin,
  historyService,
  redoCommand,
  type HistoryService,
  undoCommand,
} from '@nodebraid/plugin-history';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import {
  sessionPlugin,
  sessionService,
  type SelectionInput,
  type SessionService,
  type Viewport,
} from '@nodebraid/plugin-session';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

import { createDuplicateSelectionPlugin, duplicateSelectionCommand, type DuplicateIdMaterializer } from '../src';

test('Duplicate Selection factories reject malformed config structurally', () => {
  expect(() =>
    createDuplicateSelectionPlugin({ materializeIds: () => ({ nodes: [], edges: [] }), offset: null as never }),
  ).toThrow(expect.objectContaining({ domain: 'plugin.duplicate-selection', code: 'INVALID_CONFIG' }));
});

test('Duplicate Selection copies the current Node and selects its duplicate as one History entry', async () => {
  const sourceId = nodeId('source');
  const duplicateId = nodeId('duplicate');
  const data = Object.freeze({ label: 'opaque' });
  const runtime = await activateRuntime(
    createDuplicateSelectionPlugin({
      materializeIds({ nodeIds, edgeIds }) {
        expect(nodeIds).toEqual([sourceId]);
        expect(edgeIds).toEqual([]);
        return { nodes: [{ sourceId, duplicateId }], edges: [] };
      },
    }),
  );
  runtime.kernel.transact((transaction) => {
    transaction.nodes.add({
      id: sourceId,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data,
    });
  });
  runtime.session.setSelection({ nodeIds: [sourceId], edgeIds: [] });

  const commit = await runtime.commands.execute(duplicateSelectionCommand, undefined);

  expect(commit?.changeSet).toMatchObject({
    beforeRevision: 1,
    revision: 2,
    origin: 'duplicate-selection',
    commandId: duplicateSelectionCommand.id,
  });
  expect(runtime.kernel.read().query.getNode(duplicateId)).toEqual({
    id: duplicateId,
    type: 'task',
    position: { x: 34, y: 44 },
    size: { width: 80, height: 40 },
    data,
  });
  expect(runtime.kernel.read().query.getNode(duplicateId)?.data).toBe(data);
  expect(runtime.session.getSnapshot().selection).toEqual({ nodeIds: [duplicateId], edgeIds: [] });
  expect(runtime.history.getSnapshot()).toEqual({ canUndo: true, canRedo: false });
  await runtime.host.dispose();
});

test('Duplicate Selection captures the validated materializer for execution', async () => {
  const sourceId = nodeId('captured-materializer-source');
  const duplicateId = nodeId('captured-materializer-copy');
  let reads = 0;
  let materializations = 0;
  const materializeIds = () => {
    materializations++;
    return { nodes: [{ sourceId, duplicateId }], edges: [] };
  };
  const runtime = await activateRuntime(
    createDuplicateSelectionPlugin({
      get materializeIds() {
        return ++reads === 1 ? materializeIds : (null as never);
      },
    }),
  );
  runtime.kernel.transact((transaction) => {
    transaction.nodes.add({ id: sourceId, type: 'task', position: { x: 10, y: 20 }, data: null });
  });
  runtime.session.setSelection({ nodeIds: [sourceId], edgeIds: [] });

  try {
    await expect(runtime.commands.execute(duplicateSelectionCommand, undefined)).resolves.toMatchObject({
      changeSet: { revision: 2, commandId: duplicateSelectionCommand.id },
    });
    expect(runtime.kernel.read().query.getNode(duplicateId)?.position).toEqual({ x: 34, y: 44 });
    expect({ reads, materializations }).toEqual({ reads: 1, materializations: 1 });
  } finally {
    await runtime.host.dispose();
  }
});

test('Duplicate Selection captures the finite offset coordinates accepted at creation', async () => {
  const sourceId = nodeId('captured-offset-source');
  const duplicateId = nodeId('captured-offset-copy');
  let xReads = 0;
  let yReads = 0;
  const offset = {
    get x() {
      return ++xReads === 1 ? 5 : Number.NaN;
    },
    get y() {
      return ++yReads === 1 ? 6 : Number.POSITIVE_INFINITY;
    },
  };
  const runtime = await activateRuntime(
    createDuplicateSelectionPlugin({
      materializeIds: () => ({ nodes: [{ sourceId, duplicateId }], edges: [] }),
      offset,
    }),
  );
  runtime.kernel.transact((transaction) => {
    transaction.nodes.add({ id: sourceId, type: 'task', position: { x: 10, y: 20 }, data: null });
  });
  runtime.session.setSelection({ nodeIds: [sourceId], edgeIds: [] });

  try {
    await expect(runtime.commands.execute(duplicateSelectionCommand, undefined)).resolves.toBeDefined();
    expect(runtime.kernel.read().query.getNode(duplicateId)?.position).toEqual({ x: 15, y: 26 });
    expect({ xReads, yReads, inputFrozen: Object.isFrozen(offset) }).toEqual({
      xReads: 1,
      yReads: 1,
      inputFrozen: false,
    });
  } finally {
    await runtime.host.dispose();
  }
});

test('Duplicate Selection captures its offset reference and retains an explicit zero copy', async () => {
  const sourceId = nodeId('offset-reference-source');
  const duplicateId = nodeId('offset-reference-copy');
  const offset = { x: 0, y: 0 };
  let reads = 0;
  const plugin = createDuplicateSelectionPlugin({
    materializeIds: () => ({ nodes: [{ sourceId, duplicateId }], edges: [] }),
    get offset() {
      return ++reads === 1 ? offset : (null as never);
    },
  });
  offset.x = 99;
  offset.y = 99;
  const runtime = await activateRuntime(plugin);
  runtime.kernel.transact((transaction) => {
    transaction.nodes.add({ id: sourceId, type: 'task', position: { x: 10, y: 20 }, data: null });
  });
  runtime.session.setSelection({ nodeIds: [sourceId], edgeIds: [] });

  try {
    await expect(runtime.commands.execute(duplicateSelectionCommand, undefined)).resolves.toBeDefined();
    expect(runtime.kernel.read().query.getNode(duplicateId)?.position).toEqual({ x: 10, y: 20 });
    expect({ reads, inputFrozen: Object.isFrozen(offset) }).toEqual({ reads: 1, inputFrozen: false });
  } finally {
    await runtime.host.dispose();
  }
});

test('Duplicate Selection preserves validation short circuits before later option reads', () => {
  let materializerReads = 0;
  let offsetReads = 0;
  const options = {
    get materializeIds(): DuplicateIdMaterializer {
      materializerReads++;
      return null as never;
    },
    get offset(): never {
      offsetReads++;
      throw new Error('Invalid materializer must fail before reading offset.');
    },
  };
  expect(() => createDuplicateSelectionPlugin(options)).toThrow(expect.objectContaining({ code: 'INVALID_CONFIG' }));
  expect({ materializerReads, offsetReads }).toEqual({ materializerReads: 1, offsetReads: 0 });
  let yReads = 0;
  expect(() =>
    createDuplicateSelectionPlugin({
      materializeIds: () => ({ nodes: [], edges: [] }),
      offset: {
        x: Number.NaN,
        get y(): number {
          yReads++;
          throw new Error('Invalid x must fail before reading y.');
        },
      },
    }),
  ).toThrow(expect.objectContaining({ code: 'INVALID_CONFIG' }));
  expect(yReads).toBe(0);
  let unknownFieldReads = 0;
  expect(() =>
    createDuplicateSelectionPlugin({
      extra: true,
      get materializeIds(): DuplicateIdMaterializer {
        unknownFieldReads++;
        throw new Error('Unknown field must fail first.');
      },
    } as never),
  ).toThrow(expect.objectContaining({ code: 'INVALID_CONFIG' }));
  expect(unknownFieldReads).toBe(0);
});

test('Duplicate Selection preserves original option getter failures', () => {
  const failure = new Error('original option read failure');
  const valid = () => ({ nodes: [], edges: [] });
  const attempts = [
    () =>
      createDuplicateSelectionPlugin({
        get materializeIds(): never {
          throw failure;
        },
      }),
    () =>
      createDuplicateSelectionPlugin({
        materializeIds: valid,
        get offset(): never {
          throw failure;
        },
      }),
    () =>
      createDuplicateSelectionPlugin({
        materializeIds: valid,
        offset: {
          get x(): number {
            throw failure;
          },
          y: 0,
        },
      }),
    () =>
      createDuplicateSelectionPlugin({
        materializeIds: valid,
        offset: {
          x: 0,
          get y(): number {
            throw failure;
          },
        },
      }),
  ];
  for (const attempt of attempts) {
    let received: unknown;
    try {
      attempt();
    } catch (error) {
      received = error;
    }
    expect(received).toBe(failure);
  }
});

test('Duplicate Selection remaps nested Nodes, ports, self-loops, and parallel internal Edges only', async () => {
  const parentId = nodeId('parent');
  const childId = nodeId('child');
  const externalId = nodeId('external');
  const duplicateParentId = nodeId('duplicate-parent');
  const duplicateChildId = nodeId('duplicate-child');
  const parallelA = edgeId('parallel-a');
  const parallelB = edgeId('parallel-b');
  const selfLoop = edgeId('self-loop');
  const externalEdge = edgeId('external-edge');
  const duplicateParallelA = edgeId('duplicate-parallel-a');
  const duplicateParallelB = edgeId('duplicate-parallel-b');
  const duplicateSelfLoop = edgeId('duplicate-self-loop');
  const runtime = await activateRuntime(
    createDuplicateSelectionPlugin({
      materializeIds(input) {
        expect(input).toEqual({
          nodeIds: [childId, parentId],
          edgeIds: [parallelA, parallelB, selfLoop],
        });
        return {
          nodes: [
            { sourceId: parentId, duplicateId: duplicateParentId },
            { sourceId: childId, duplicateId: duplicateChildId },
          ],
          edges: [
            { sourceId: selfLoop, duplicateId: duplicateSelfLoop },
            { sourceId: parallelB, duplicateId: duplicateParallelB },
            { sourceId: parallelA, duplicateId: duplicateParallelA },
          ],
        };
      },
    }),
  );
  runtime.kernel.transact((transaction) => {
    transaction.nodes.add({ id: parentId, type: 'group', position: { x: 0, y: 0 }, data: null });
    transaction.nodes.add({ id: childId, type: 'task', position: { x: 10, y: 20 }, parentId, data: null });
    transaction.nodes.add({ id: externalId, type: 'task', position: { x: 200, y: 0 }, data: null });
    transaction.edges.add({
      id: parallelA,
      type: 'flow',
      source: { nodeId: parentId, portId: 'out-a' },
      target: { nodeId: childId, portId: 'in-a' },
      data: null,
    });
    transaction.edges.add({
      id: parallelB,
      type: 'flow',
      source: { nodeId: parentId, portId: 'out-b' },
      target: { nodeId: childId, portId: 'in-b' },
      data: null,
    });
    transaction.edges.add({
      id: selfLoop,
      type: 'loop',
      source: { nodeId: childId, portId: 'loop-out' },
      target: { nodeId: childId, portId: 'loop-in' },
      data: null,
    });
    transaction.edges.add({
      id: externalEdge,
      type: 'external',
      source: { nodeId: childId },
      target: { nodeId: externalId },
      data: null,
    });
  });
  runtime.session.setSelection({ nodeIds: [parentId, childId], edgeIds: [parallelA, externalEdge] });

  await runtime.commands.execute(duplicateSelectionCommand, undefined);

  expect(runtime.kernel.read().query.getNode(duplicateParentId)?.position).toEqual({ x: 24, y: 24 });
  expect(runtime.kernel.read().query.getNode(duplicateChildId)).toMatchObject({
    position: { x: 34, y: 44 },
    parentId: duplicateParentId,
  });
  expect(runtime.kernel.read().query.getEdge(duplicateParallelA)).toMatchObject({
    source: { nodeId: duplicateParentId, portId: 'out-a' },
    target: { nodeId: duplicateChildId, portId: 'in-a' },
  });
  expect(runtime.kernel.read().query.getEdge(duplicateParallelB)).toMatchObject({
    source: { nodeId: duplicateParentId, portId: 'out-b' },
    target: { nodeId: duplicateChildId, portId: 'in-b' },
  });
  expect(runtime.kernel.read().query.getEdge(duplicateSelfLoop)).toMatchObject({
    source: { nodeId: duplicateChildId, portId: 'loop-out' },
    target: { nodeId: duplicateChildId, portId: 'loop-in' },
  });
  expect(runtime.kernel.read().snapshot.edges).toHaveLength(7);
  expect(runtime.session.getSnapshot().selection).toEqual({
    nodeIds: [duplicateChildId, duplicateParentId],
    edgeIds: [duplicateParallelA],
  });
  await runtime.host.dispose();
});

test('Duplicate Selection preserves an unselected parent and does not copy unselected descendants', async () => {
  const parentId = nodeId('asymmetric-parent');
  const childId = nodeId('asymmetric-child');
  const duplicateParentId = nodeId('asymmetric-parent-copy');
  const duplicateChildId = nodeId('asymmetric-child-copy');
  const runtime = await activateRuntime(
    createDuplicateSelectionPlugin({
      materializeIds({ nodeIds }) {
        return {
          nodes: nodeIds.map((sourceId) => ({
            sourceId,
            duplicateId: sourceId === childId ? duplicateChildId : duplicateParentId,
          })),
          edges: [],
        };
      },
    }),
  );
  runtime.kernel.transact((transaction) => {
    transaction.nodes.add({ id: parentId, type: 'group', position: { x: 0, y: 0 }, data: null });
    transaction.nodes.add({ id: childId, type: 'task', position: { x: 10, y: 10 }, parentId, data: null });
  });

  runtime.session.setSelection({ nodeIds: [childId], edgeIds: [] });
  await runtime.commands.execute(duplicateSelectionCommand, undefined);
  expect(runtime.kernel.read().query.getNode(duplicateChildId)?.parentId).toBe(parentId);

  runtime.session.setSelection({ nodeIds: [parentId], edgeIds: [] });
  await runtime.commands.execute(duplicateSelectionCommand, undefined);
  expect(runtime.kernel.read().query.getChildren(duplicateParentId)).toEqual([]);
  expect(runtime.kernel.read().query.getNode(childId)?.parentId).toBe(parentId);
  await runtime.host.dispose();
});

test('Duplicate Selection keeps empty and edge-only Selection as no-ops without materialization', async () => {
  let materializations = 0;
  const runtime = await activateRuntime(
    createDuplicateSelectionPlugin({
      materializeIds() {
        materializations += 1;
        return { nodes: [], edges: [] };
      },
    }),
  );
  const firstId = nodeId('edge-only-first');
  const secondId = nodeId('edge-only-second');
  const selectedEdgeId = edgeId('edge-only');
  runtime.kernel.transact((transaction) => {
    transaction.nodes.add({ id: firstId, type: 'task', position: { x: 0, y: 0 }, data: null });
    transaction.nodes.add({ id: secondId, type: 'task', position: { x: 100, y: 0 }, data: null });
    transaction.edges.add({
      id: selectedEdgeId,
      type: 'flow',
      source: { nodeId: firstId },
      target: { nodeId: secondId },
      data: null,
    });
  });
  const revision = runtime.kernel.read().snapshot.revision;

  expect(await runtime.commands.execute(duplicateSelectionCommand, undefined)).toBeNull();
  runtime.session.setSelection({ nodeIds: [], edgeIds: [selectedEdgeId] });
  expect(await runtime.commands.execute(duplicateSelectionCommand, undefined)).toBeNull();

  expect(materializations).toBe(0);
  expect(runtime.kernel.read().snapshot.revision).toBe(revision);
  expect(runtime.session.getSnapshot().selection).toEqual({ nodeIds: [], edgeIds: [selectedEdgeId] });
  await runtime.host.dispose();
});

test('Duplicate Selection rejects incomplete ID mapping atomically', async () => {
  const sourceId = nodeId('invalid-source');
  const runtime = await activateRuntime(
    createDuplicateSelectionPlugin({ materializeIds: () => ({ nodes: [], edges: [] }) }),
  );
  runtime.kernel.transact((transaction) => {
    transaction.nodes.add({ id: sourceId, type: 'task', position: { x: 0, y: 0 }, data: null });
  });
  runtime.session.setSelection({ nodeIds: [sourceId], edgeIds: [] });
  const before = runtime.kernel.read();

  await expect(runtime.commands.execute(duplicateSelectionCommand, undefined)).rejects.toMatchObject({
    domain: 'plugin.duplicate-selection',
    code: 'INVALID_MATERIALIZATION',
  });

  expect(runtime.kernel.read()).toBe(before);
  expect(runtime.session.getSnapshot().selection).toEqual({ nodeIds: [sourceId], edgeIds: [] });
  await runtime.host.dispose();
});

test('Duplicate Selection rejects extra, duplicate, colliding, and async ID materialization', async () => {
  for (const scenario of ['extra', 'duplicate', 'collision', 'thenable'] as const) {
    const sourceId = nodeId(`${scenario}-source`);
    const secondId = nodeId(`${scenario}-second`);
    const duplicateId = nodeId(`${scenario}-duplicate`);
    const runtime = await activateRuntime(
      createDuplicateSelectionPlugin({
        materializeIds() {
          if (scenario === 'thenable') return Promise.resolve({ nodes: [], edges: [] }) as never;
          if (scenario === 'extra') {
            return {
              nodes: [
                { sourceId, duplicateId },
                { sourceId: nodeId('not-selected'), duplicateId: nodeId('extra-duplicate') },
              ],
              edges: [],
            };
          }
          if (scenario === 'duplicate') {
            return {
              nodes: [
                { sourceId, duplicateId },
                { sourceId: secondId, duplicateId },
              ],
              edges: [],
            };
          }
          return { nodes: [{ sourceId, duplicateId: secondId }], edges: [] };
        },
      }),
    );
    runtime.kernel.transact((transaction) => {
      transaction.nodes.add({ id: sourceId, type: 'task', position: { x: 0, y: 0 }, data: null });
      transaction.nodes.add({ id: secondId, type: 'task', position: { x: 100, y: 0 }, data: null });
    });
    runtime.session.setSelection({
      nodeIds: scenario === 'duplicate' ? [sourceId, secondId] : [sourceId],
      edgeIds: [],
    });

    await expect(runtime.commands.execute(duplicateSelectionCommand, undefined)).rejects.toMatchObject({
      code: 'INVALID_MATERIALIZATION',
    });
    expect(runtime.kernel.read().query.getNode(duplicateId)).toBeUndefined();
    await runtime.host.dispose();
  }
});

test('Duplicate Selection preserves an application materializer failure identity', async () => {
  const failure = new Error('materializer failed');
  const sourceId = nodeId('failure-source');
  const runtime = await activateRuntime(
    createDuplicateSelectionPlugin({
      materializeIds() {
        throw failure;
      },
    }),
  );
  runtime.kernel.transact((transaction) => {
    transaction.nodes.add({ id: sourceId, type: 'task', position: { x: 0, y: 0 }, data: null });
  });
  runtime.session.setSelection({ nodeIds: [sourceId], edgeIds: [] });

  await expect(runtime.commands.execute(duplicateSelectionCommand, undefined)).rejects.toBe(failure);
  await runtime.host.dispose();
});

test('Duplicate Selection rejects same-value source ABA without blocking unrelated Commits', async () => {
  const sourceId = nodeId('aba-source');
  const duplicateId = nodeId('aba-duplicate');
  const unrelatedId = nodeId('unrelated');
  let runtime: Awaited<ReturnType<typeof activateRuntime>>;
  const plugin = createDuplicateSelectionPlugin({
    materializeIds() {
      const current = runtime.kernel.read().query.getNode(sourceId);
      if (!current) throw new Error('Expected ABA source.');
      runtime.kernel.transact((transaction) => {
        transaction.nodes.add({ id: unrelatedId, type: 'note', position: { x: 5, y: 5 }, data: null });
        transaction.nodes.replace(sourceId, { ...current, position: { x: 1, y: 0 } });
      });
      runtime.kernel.transact((transaction) => {
        const changed = transaction.query.getNode(sourceId);
        if (!changed) throw new Error('Expected changed ABA source.');
        transaction.nodes.replace(sourceId, { ...changed, position: { x: 0, y: 0 } });
      });
      return { nodes: [{ sourceId, duplicateId }], edges: [] };
    },
  });
  runtime = await activateRuntime(plugin);
  runtime.kernel.transact((transaction) => {
    transaction.nodes.add({ id: sourceId, type: 'task', position: { x: 0, y: 0 }, data: null });
  });
  runtime.session.setSelection({ nodeIds: [sourceId], edgeIds: [] });

  await expect(runtime.commands.execute(duplicateSelectionCommand, undefined)).rejects.toMatchObject({
    code: 'STALE_DUPLICATE',
  });

  expect(runtime.kernel.read().query.getNode(duplicateId)).toBeUndefined();
  expect(runtime.kernel.read().query.getNode(unrelatedId)).toBeDefined();
  expect(runtime.session.getSnapshot().selection).toEqual({ nodeIds: [sourceId], edgeIds: [] });
  await runtime.host.dispose();
});

test('Duplicate Selection rejects a new internal Edge and same-value internal Edge ABA', async () => {
  for (const scenario of ['new-edge', 'edge-aba'] as const) {
    const firstId = nodeId(`${scenario}-first`);
    const secondId = nodeId(`${scenario}-second`);
    const duplicateFirstId = nodeId(`${scenario}-duplicate-first`);
    const duplicateSecondId = nodeId(`${scenario}-duplicate-second`);
    const internalEdgeId = edgeId(`${scenario}-internal`);
    const duplicateEdgeId = edgeId(`${scenario}-duplicate-edge`);
    let runtime: Awaited<ReturnType<typeof activateRuntime>>;
    const plugin = createDuplicateSelectionPlugin({
      materializeIds() {
        if (scenario === 'new-edge') {
          runtime.kernel.transact((transaction) => {
            transaction.edges.add({
              id: internalEdgeId,
              type: 'flow',
              source: { nodeId: firstId },
              target: { nodeId: secondId },
              data: null,
            });
          });
        } else {
          const original = runtime.kernel.read().query.getEdge(internalEdgeId);
          if (!original) throw new Error('Expected ABA Edge.');
          runtime.kernel.transact((transaction) => {
            transaction.edges.replace(internalEdgeId, { ...original, type: 'changed' });
          });
          runtime.kernel.transact((transaction) => {
            const changed = transaction.query.getEdge(internalEdgeId);
            if (!changed) throw new Error('Expected changed ABA Edge.');
            transaction.edges.replace(internalEdgeId, { ...changed, type: original.type });
          });
        }
        return {
          nodes: [
            { sourceId: firstId, duplicateId: duplicateFirstId },
            { sourceId: secondId, duplicateId: duplicateSecondId },
          ],
          edges: scenario === 'edge-aba' ? [{ sourceId: internalEdgeId, duplicateId: duplicateEdgeId }] : [],
        };
      },
    });
    runtime = await activateRuntime(plugin);
    runtime.kernel.transact((transaction) => {
      transaction.nodes.add({ id: firstId, type: 'task', position: { x: 0, y: 0 }, data: null });
      transaction.nodes.add({ id: secondId, type: 'task', position: { x: 100, y: 0 }, data: null });
      if (scenario === 'edge-aba') {
        transaction.edges.add({
          id: internalEdgeId,
          type: 'flow',
          source: { nodeId: firstId },
          target: { nodeId: secondId },
          data: null,
        });
      }
    });
    runtime.session.setSelection({ nodeIds: [firstId, secondId], edgeIds: [] });

    await expect(runtime.commands.execute(duplicateSelectionCommand, undefined)).rejects.toMatchObject({
      code: 'STALE_DUPLICATE',
    });
    expect(runtime.kernel.read().query.getNode(duplicateFirstId)).toBeUndefined();
    await runtime.host.dispose();
  }
});

test('Undo removes Duplicate Selection and Redo restores Document without reselecting', async () => {
  const sourceId = nodeId('history-source');
  const duplicateId = nodeId('history-duplicate');
  const runtime = await activateRuntime(
    createDuplicateSelectionPlugin({
      materializeIds: () => ({ nodes: [{ sourceId, duplicateId }], edges: [] }),
    }),
  );
  runtime.kernel.transact((transaction) => {
    transaction.nodes.add({ id: sourceId, type: 'task', position: { x: 0, y: 0 }, data: null });
  });
  runtime.session.setSelection({ nodeIds: [sourceId], edgeIds: [] });
  await runtime.commands.execute(duplicateSelectionCommand, undefined);

  await runtime.commands.execute(undoCommand, undefined);
  expect(runtime.kernel.read().query.getNode(duplicateId)).toBeUndefined();
  expect(runtime.session.getSnapshot().selection).toEqual({ nodeIds: [], edgeIds: [] });

  await runtime.commands.execute(redoCommand, undefined);
  expect(runtime.kernel.read().query.getNode(duplicateId)).toBeDefined();
  expect(runtime.session.getSnapshot().selection).toEqual({ nodeIds: [], edgeIds: [] });
  await runtime.host.dispose();
});

test('Duplicate Selection preserves a Commit but does not overwrite newer Selection from a Commit observer', async () => {
  const sourceId = nodeId('selection-race-source');
  const otherId = nodeId('selection-race-other');
  const duplicateId = nodeId('selection-race-duplicate');
  const runtime = await activateRuntime(
    createDuplicateSelectionPlugin({
      materializeIds: () => ({ nodes: [{ sourceId, duplicateId }], edges: [] }),
    }),
  );
  runtime.kernel.transact((transaction) => {
    transaction.nodes.add({ id: sourceId, type: 'task', position: { x: 0, y: 0 }, data: null });
    transaction.nodes.add({ id: otherId, type: 'task', position: { x: 100, y: 0 }, data: null });
  });
  runtime.session.setSelection({ nodeIds: [sourceId], edgeIds: [] });
  const stop = runtime.kernel.observeCommits((commit) => {
    if (commit.changeSet.commandId === duplicateSelectionCommand.id) {
      runtime.session.setSelection({ nodeIds: [otherId], edgeIds: [] });
    }
  });

  await expect(runtime.commands.execute(duplicateSelectionCommand, undefined)).rejects.toMatchObject({
    domain: 'plugin.duplicate-selection',
    code: 'SELECTION_UPDATE_FAILED',
    details: { committedRevision: 2 },
  });

  expect(runtime.kernel.read().query.getNode(duplicateId)).toBeDefined();
  expect(runtime.session.getSnapshot().selection).toEqual({ nodeIds: [otherId], edgeIds: [] });
  stop();
  await runtime.host.dispose();
});

test('Duplicate Selection wraps post-Commit Session loss with the committed revision', async () => {
  const sourceId = nodeId('post-commit-session-source');
  const duplicateId = nodeId('post-commit-session-duplicate');
  const sessionFailure = new Error('Session became unavailable after Commit.');
  let failSessionReads = false;
  let sessionSnapshot: ReturnType<SessionService['getSnapshot']> = Object.freeze({
    selection: Object.freeze({ nodeIds: Object.freeze([sourceId]), edgeIds: Object.freeze([]) }),
    viewport: Object.freeze({ x: 0, y: 0, zoom: 1 }),
  });
  const listeners = new Set<() => void>();
  const failingSessionPlugin = definePlugin({
    provides: { session: sessionService },
    setup() {
      const service: SessionService = {
        getSnapshot() {
          if (failSessionReads) throw sessionFailure;
          return sessionSnapshot;
        },
        setSelection(selection: SelectionInput) {
          sessionSnapshot = Object.freeze({
            selection: Object.freeze({
              nodeIds: Object.freeze([...selection.nodeIds]),
              edgeIds: Object.freeze([...selection.edgeIds]),
            }),
            viewport: sessionSnapshot.viewport,
          });
          for (const listener of listeners) listener();
        },
        clearSelection() {
          this.setSelection({ nodeIds: [], edgeIds: [] });
        },
        setViewport(viewport: Viewport) {
          sessionSnapshot = Object.freeze({
            selection: sessionSnapshot.selection,
            viewport: Object.freeze({ ...viewport }),
          });
          for (const listener of listeners) listener();
        },
        subscribe(listener: () => void) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      };
      return { session: Object.freeze(service) };
    },
  });
  let commands: CommandService | undefined;
  let kernel: KernelService | undefined;
  const consumer = definePlugin({
    requires: { commands: commandService, kernel: kernelService },
    setup(context) {
      commands = context.services.commands;
      kernel = context.services.kernel;
    },
  });
  const host = createPluginHost();
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(failingSessionPlugin),
    host.install(
      createDuplicateSelectionPlugin({
        materializeIds: () => ({ nodes: [{ sourceId, duplicateId }], edges: [] }),
      }),
    ),
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!commands || !kernel) throw new Error('Expected post-Commit Session failure Runtime Services.');
  kernel.transact((transaction) => {
    transaction.nodes.add({ id: sourceId, type: 'task', position: { x: 0, y: 0 }, data: null });
  });
  const stop = kernel.observeCommits((commit) => {
    if (commit.changeSet.commandId === duplicateSelectionCommand.id) failSessionReads = true;
  });

  const received = await commands.execute(duplicateSelectionCommand, undefined).catch((error: unknown) => error);
  expect(received).toMatchObject({
    domain: 'plugin.duplicate-selection',
    code: 'SELECTION_UPDATE_FAILED',
    details: { committedRevision: 2 },
  });
  expect((received as Error).cause).toBe(sessionFailure);
  expect(kernel.read().query.getNode(duplicateId)).toBeDefined();
  stop();
  await host.dispose();
});

async function activateRuntime(plugin: ReturnType<typeof createDuplicateSelectionPlugin>): Promise<{
  readonly commands: CommandService;
  readonly history: HistoryService;
  readonly host: ReturnType<typeof createPluginHost>;
  readonly kernel: KernelService;
  readonly session: SessionService;
}> {
  let commands: CommandService | undefined;
  let history: HistoryService | undefined;
  let kernel: KernelService | undefined;
  let session: SessionService | undefined;
  const consumer = definePlugin({
    requires: { commands: commandService, history: historyService, kernel: kernelService, session: sessionService },
    setup(context) {
      commands = context.services.commands;
      history = context.services.history;
      kernel = context.services.kernel;
      session = context.services.session;
    },
  });
  const host = createPluginHost();
  const sessionInstallation = host.install(sessionPlugin);
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    sessionInstallation,
    host.install(historyPlugin),
    host.install(plugin),
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!commands || !history || !kernel || !session) throw new Error('Expected Duplicate Selection Runtime Services.');
  return { commands, history, host, kernel, session };
}
