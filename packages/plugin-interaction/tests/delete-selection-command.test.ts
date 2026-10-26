import { expect, test } from 'bun:test';

import { edgeId, nodeId } from '@nodebraid/kernel';
import { commandPlugin, commandService, type CommandService } from '@nodebraid/plugin-command';
import {
  historyPlugin,
  historyService,
  redoCommand,
  undoCommand,
  type HistoryService,
} from '@nodebraid/plugin-history';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { portPlugin } from '@nodebraid/plugin-port';
import { createRendererPlugin } from '@nodebraid/plugin-renderer';
import { sessionPlugin, sessionService, type SessionService } from '@nodebraid/plugin-session';
import type {
  CanvasRenderer,
  HitResult,
  RendererDocumentUpdate,
  RendererInputListener,
  ScreenPoint,
} from '@nodebraid/renderer-api';
import type { SessionSnapshot } from '@nodebraid/session-api';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

import { deleteSelectionCommand, interactionPlugin, type DeleteSelectionInput } from '../src';

test('Delete Selection removes a selected Node and its incident Edge as one undoable Commit', async () => {
  const { commands, history, host, kernel, session } = await activateDeleteCommandRuntime();

  const selectedNodeId = nodeId('selected');
  const retainedNodeId = nodeId('retained');
  const incidentEdgeId = edgeId('incident');
  const selectedNode = {
    id: selectedNodeId,
    type: 'task',
    position: { x: 0, y: 0 },
    size: { width: 80, height: 40 },
    data: Object.freeze({ label: 'Selected' }),
  };
  const retainedNode = {
    id: retainedNodeId,
    type: 'task',
    position: { x: 100, y: 0 },
    size: { width: 90, height: 50 },
    data: Object.freeze({ label: 'Retained' }),
  };
  const incidentEdge = {
    id: incidentEdgeId,
    type: 'flow',
    source: { nodeId: selectedNodeId, portId: 'output' },
    target: { nodeId: retainedNodeId, portId: 'input' },
    data: Object.freeze({ label: 'Complete edge evidence' }),
  };
  kernel.transact((transaction) => {
    transaction.nodes.add(selectedNode);
    transaction.nodes.add(retainedNode);
    transaction.edges.add(incidentEdge);
  });
  session.setSelection({ nodeIds: [selectedNodeId], edgeIds: [] });
  const evidence = kernel.read().snapshot;

  const commit = await commands.execute(deleteSelectionCommand, {
    selection: session.getSnapshot().selection,
    evidence,
  });

  expect(commit?.changeSet).toMatchObject({
    beforeRevision: 1,
    revision: 2,
    origin: 'interaction',
    commandId: 'interaction.selection.delete',
  });
  expect(kernel.read().snapshot).toEqual({
    revision: 2,
    nodes: [retainedNode],
    edges: [],
  });
  expect(session.getSnapshot().selection).toEqual({ nodeIds: [], edgeIds: [] });
  expect(history.getSnapshot()).toEqual({ canUndo: true, canRedo: false });

  await commands.execute(undoCommand, undefined);
  expect(kernel.read().snapshot).toEqual({
    revision: 3,
    nodes: [retainedNode, selectedNode],
    edges: [incidentEdge],
  });
  await commands.execute(redoCommand, undefined);
  expect(kernel.read().snapshot).toEqual({
    revision: 4,
    nodes: [retainedNode],
    edges: [],
  });

  await host.dispose();
});

test('Delete Selection canonicalizes overlapping Node, explicit Edge, self-loop, and parallel Edge targets', async () => {
  const runtime = await activateDeleteCommandRuntime();
  const firstId = nodeId('a-node');
  const secondId = nodeId('b-node');
  const retainedId = nodeId('c-node');
  const detachedId = nodeId('d-node');
  const edgeIds = [
    edgeId('a-parallel'),
    edgeId('b-parallel'),
    edgeId('c-self-loop'),
    edgeId('d-external'),
    edgeId('e-explicit'),
  ] as const;
  runtime.kernel.transact((transaction) => {
    for (const [id, x] of [firstId, secondId, retainedId, detachedId].map((id, index) => [id, index * 100] as const)) {
      transaction.nodes.add({ id, type: 'task', position: { x, y: 0 }, data: null });
    }
    transaction.edges.add({
      id: edgeIds[0],
      type: 'flow',
      source: { nodeId: firstId },
      target: { nodeId: secondId },
      data: null,
    });
    transaction.edges.add({
      id: edgeIds[1],
      type: 'flow',
      source: { nodeId: firstId },
      target: { nodeId: secondId },
      data: null,
    });
    transaction.edges.add({
      id: edgeIds[2],
      type: 'loop',
      source: { nodeId: secondId },
      target: { nodeId: secondId },
      data: null,
    });
    transaction.edges.add({
      id: edgeIds[3],
      type: 'flow',
      source: { nodeId: firstId },
      target: { nodeId: retainedId },
      data: null,
    });
    transaction.edges.add({
      id: edgeIds[4],
      type: 'flow',
      source: { nodeId: retainedId },
      target: { nodeId: detachedId },
      data: null,
    });
  });
  runtime.session.setSelection({
    nodeIds: [secondId, firstId],
    edgeIds: [edgeIds[0], edgeIds[4]],
  });

  const commit = await runtime.commands.execute(deleteSelectionCommand, {
    selection: runtime.session.getSnapshot().selection,
    evidence: runtime.kernel.read().snapshot,
  });

  expect(commit?.changeSet.changes.map((change) => `${change.entity}:${change.id}`)).toEqual([
    `node:${firstId}`,
    `node:${secondId}`,
    ...edgeIds.map((id) => `edge:${id}`),
  ]);
  expect(runtime.kernel.read().snapshot).toMatchObject({
    nodes: [expect.objectContaining({ id: retainedId }), expect.objectContaining({ id: detachedId })],
    edges: [],
  });
  await runtime.host.dispose();
});

test('Delete Selection allows unrelated Commits but rejects changed targets and incident Edge closure', async () => {
  const compatible = await activateDeleteCommandRuntime();
  const compatibleSelectedId = nodeId('compatible-selected');
  compatible.kernel.transact((transaction) => {
    transaction.nodes.add({ id: compatibleSelectedId, type: 'task', position: { x: 0, y: 0 }, data: null });
  });
  compatible.session.setSelection({ nodeIds: [compatibleSelectedId], edgeIds: [] });
  const compatibleInput = {
    selection: compatible.session.getSnapshot().selection,
    evidence: compatible.kernel.read().snapshot,
  };
  compatible.kernel.transact((transaction) => {
    transaction.nodes.add({ id: nodeId('unrelated'), type: 'task', position: { x: 100, y: 0 }, data: null });
  });
  await expect(compatible.commands.execute(deleteSelectionCommand, compatibleInput)).resolves.toMatchObject({
    changeSet: { beforeRevision: 2, revision: 3 },
  });
  await compatible.host.dispose();

  const changed = await activateDeleteCommandRuntime();
  const changedId = nodeId('changed-selected');
  changed.kernel.transact((transaction) => {
    transaction.nodes.add({ id: changedId, type: 'task', position: { x: 0, y: 0 }, data: null });
  });
  changed.session.setSelection({ nodeIds: [changedId], edgeIds: [] });
  const changedInput = {
    selection: changed.session.getSnapshot().selection,
    evidence: changed.kernel.read().snapshot,
  };
  changed.kernel.transact((transaction) => {
    const node = transaction.query.getNode(changedId);
    if (!node) throw new Error('Expected changed Delete target.');
    transaction.nodes.replace(changedId, { ...node, position: { x: 1, y: 1 } });
  });
  const beforeChangedDelete = changed.kernel.read();
  await expect(changed.commands.execute(deleteSelectionCommand, changedInput)).rejects.toMatchObject({
    domain: 'interaction',
    code: 'STALE_SELECTION',
  });
  expect(changed.kernel.read()).toBe(beforeChangedDelete);
  await changed.host.dispose();

  const incident = await activateDeleteCommandRuntime();
  const incidentSelectedId = nodeId('incident-selected');
  const incidentTargetId = nodeId('incident-target');
  incident.kernel.transact((transaction) => {
    transaction.nodes.add({ id: incidentSelectedId, type: 'task', position: { x: 0, y: 0 }, data: null });
    transaction.nodes.add({ id: incidentTargetId, type: 'task', position: { x: 100, y: 0 }, data: null });
  });
  incident.session.setSelection({ nodeIds: [incidentSelectedId], edgeIds: [] });
  const incidentInput = {
    selection: incident.session.getSnapshot().selection,
    evidence: incident.kernel.read().snapshot,
  };
  incident.kernel.transact((transaction) => {
    transaction.edges.add({
      id: edgeId('new-incident'),
      type: 'flow',
      source: { nodeId: incidentSelectedId },
      target: { nodeId: incidentTargetId },
      data: null,
    });
  });
  const beforeIncidentDelete = incident.kernel.read();
  await expect(incident.commands.execute(deleteSelectionCommand, incidentInput)).rejects.toMatchObject({
    domain: 'interaction',
    code: 'STALE_SELECTION',
  });
  expect(incident.kernel.read()).toBe(beforeIncidentDelete);
  await incident.host.dispose();
});

test('Delete Selection rejects missing targets and replaced or removed explicit and incident Edges atomically', async () => {
  for (const scenario of [
    'missing-node',
    'replaced-explicit-edge',
    'removed-explicit-edge',
    'replaced-incident-edge',
    'removed-incident-edge',
  ] as const) {
    const runtime = await activateDeleteCommandRuntime();
    const selectedId = nodeId(`${scenario}-selected`);
    const targetId = nodeId(`${scenario}-target`);
    const targetEdgeId = edgeId(`${scenario}-edge`);
    runtime.kernel.transact((transaction) => {
      transaction.nodes.add({ id: selectedId, type: 'task', position: { x: 0, y: 0 }, data: null });
      transaction.nodes.add({ id: targetId, type: 'task', position: { x: 100, y: 0 }, data: null });
      transaction.edges.add({
        id: targetEdgeId,
        type: 'flow',
        source: { nodeId: selectedId },
        target: { nodeId: targetId },
        data: Object.freeze({ scenario }),
      });
    });
    const selectsNode = scenario === 'missing-node' || scenario.includes('incident');
    runtime.session.setSelection({
      nodeIds: selectsNode ? [selectedId] : [],
      edgeIds: selectsNode ? [] : [targetEdgeId],
    });
    const input = {
      selection: runtime.session.getSnapshot().selection,
      evidence: runtime.kernel.read().snapshot,
    };
    runtime.kernel.transact((transaction) => {
      if (scenario === 'missing-node') {
        transaction.edges.remove(targetEdgeId);
        transaction.nodes.remove(selectedId);
      } else if (scenario === 'replaced-explicit-edge' || scenario === 'replaced-incident-edge') {
        const edge = transaction.query.getEdge(targetEdgeId);
        if (!edge) throw new Error('Expected stale Delete Edge target.');
        transaction.edges.replace(targetEdgeId, { ...edge, type: 'updated-flow' });
      } else {
        transaction.edges.remove(targetEdgeId);
      }
    });
    const beforeDelete = runtime.kernel.read();

    await expect(runtime.commands.execute(deleteSelectionCommand, input)).rejects.toMatchObject({
      domain: 'interaction',
      code: 'STALE_SELECTION',
    });
    expect(runtime.kernel.read()).toBe(beforeDelete);
    await runtime.host.dispose();
  }
});

test('Delete Selection rejects same-value ABA replacement of selected Nodes and explicit or incident Edges', async () => {
  for (const scenario of ['selected-node', 'explicit-edge', 'incident-edge'] as const) {
    const runtime = await activateDeleteCommandRuntime();
    const selectedId = nodeId(`${scenario}-aba-selected`);
    const targetId = nodeId(`${scenario}-aba-target`);
    const targetEdgeId = edgeId(`${scenario}-aba-edge`);
    const sharedNodeData = Object.freeze({ label: 'same Node data reference' });
    const sharedEdgeData = Object.freeze({ label: 'same Edge data reference' });
    runtime.kernel.transact((transaction) => {
      transaction.nodes.add({
        id: selectedId,
        type: 'task',
        position: { x: 0, y: 0 },
        data: sharedNodeData,
      });
      transaction.nodes.add({ id: targetId, type: 'task', position: { x: 100, y: 0 }, data: null });
      transaction.edges.add({
        id: targetEdgeId,
        type: 'flow',
        source: { nodeId: selectedId },
        target: { nodeId: targetId },
        data: sharedEdgeData,
      });
    });
    runtime.session.setSelection({
      nodeIds: scenario === 'explicit-edge' ? [] : [selectedId],
      edgeIds: scenario === 'explicit-edge' ? [targetEdgeId] : [],
    });
    const input = {
      selection: runtime.session.getSnapshot().selection,
      evidence: runtime.kernel.read().snapshot,
    };
    const evidenceNode = input.evidence.nodes.find((node) => node.id === selectedId);
    const evidenceEdge = input.evidence.edges.find((edge) => edge.id === targetEdgeId);
    if (!evidenceNode || !evidenceEdge) throw new Error('Expected Delete ABA evidence.');

    if (scenario === 'selected-node') {
      runtime.kernel.transact((transaction) => {
        transaction.edges.remove(targetEdgeId);
        transaction.nodes.remove(selectedId);
      });
      runtime.kernel.transact((transaction) => {
        transaction.nodes.add(evidenceNode);
        transaction.edges.add(evidenceEdge);
      });
    } else {
      runtime.kernel.transact((transaction) => transaction.edges.remove(targetEdgeId));
      runtime.kernel.transact((transaction) => transaction.edges.add(evidenceEdge));
    }
    const beforeDelete = runtime.kernel.read();

    await expect(runtime.commands.execute(deleteSelectionCommand, input)).rejects.toMatchObject({
      domain: 'interaction',
      code: 'STALE_SELECTION',
    });
    expect(runtime.kernel.read()).toBe(beforeDelete);
    await runtime.host.dispose();
  }
});

test('Delete Selection keeps Selection and History unchanged when the Kernel rejects the Transaction', async () => {
  const runtime = await activateDeleteCommandRuntime();
  const parentId = nodeId('parent');
  const childId = nodeId('child');
  runtime.kernel.transact((transaction) => {
    transaction.nodes.add({ id: parentId, type: 'group', position: { x: 0, y: 0 }, data: null });
    transaction.nodes.add({
      id: childId,
      type: 'task',
      position: { x: 10, y: 10 },
      parentId,
      data: null,
    });
  });
  runtime.session.setSelection({ nodeIds: [parentId], edgeIds: [] });
  const before = runtime.kernel.read();
  const historyBefore = runtime.history.getSnapshot();

  await expect(
    runtime.commands.execute(deleteSelectionCommand, {
      selection: runtime.session.getSnapshot().selection,
      evidence: before.snapshot,
    }),
  ).rejects.toMatchObject({ domain: 'kernel', code: 'INVALID_GRAPH' });

  expect(runtime.kernel.read()).toBe(before);
  expect(runtime.session.getSnapshot().selection).toEqual({ nodeIds: [parentId], edgeIds: [] });
  expect(runtime.history.getSnapshot()).toBe(historyBefore);
  await runtime.host.dispose();
});

test('Delete Selection validates malformed evidence and returns null for an empty Selection', async () => {
  const runtime = await activateDeleteCommandRuntime();
  const before = runtime.kernel.read();

  await expect(runtime.commands.execute(deleteSelectionCommand, undefined as never)).rejects.toMatchObject({
    domain: 'interaction',
    code: 'INVALID_DELETE',
  });
  await expect(
    runtime.commands.execute(deleteSelectionCommand, {
      selection: { nodeIds: [nodeId('missing')], edgeIds: [] },
      evidence: before.snapshot,
    }),
  ).rejects.toMatchObject({ domain: 'interaction', code: 'INVALID_DELETE' });
  await expect(
    runtime.commands.execute(deleteSelectionCommand, {
      selection: { nodeIds: [], edgeIds: [] },
      evidence: before.snapshot,
    }),
  ).resolves.toBeNull();
  expect(runtime.kernel.read()).toBe(before);
  expect(runtime.history.getSnapshot()).toEqual({ canUndo: false, canRedo: false });
  await runtime.host.dispose();
});

test('Delete Selection rejects the first stale Snapshot when later evidence reads would return current state', async () => {
  const runtime = await activateDeleteCommandRuntime();
  const id = nodeId('changing-evidence');
  runtime.kernel.transact((transaction) => {
    transaction.nodes.add({ id, type: 'task', position: { x: 0, y: 0 }, data: null });
  });
  runtime.session.setSelection({ nodeIds: [id], edgeIds: [] });
  const evidence = runtime.kernel.read().snapshot;
  for (const x of [10, 0]) {
    runtime.kernel.transact((transaction) => {
      const node = transaction.query.getNode(id);
      if (!node) throw new Error('Expected changing-evidence target.');
      transaction.nodes.replace(id, { ...node, position: { x, y: 0 } });
    });
  }
  const before = runtime.kernel.read();
  const historyBefore = runtime.history.getSnapshot();
  const sessionBefore = runtime.session.getSnapshot();
  expect(evidence.nodes[0]).toEqual(before.snapshot.nodes[0]);
  expect(evidence.nodes[0]).not.toBe(before.snapshot.nodes[0]);
  let reads = 0;

  await expect(
    runtime.commands.execute(deleteSelectionCommand, {
      selection: sessionBefore.selection,
      get evidence() {
        reads += 1;
        return reads === 1 ? evidence : before.snapshot;
      },
    }),
  ).rejects.toMatchObject({ domain: 'interaction', code: 'STALE_SELECTION' });
  expect(reads).toBe(1);
  expect(runtime.kernel.read()).toBe(before);
  expect(runtime.session.getSnapshot()).toBe(sessionBefore);
  expect(runtime.history.getSnapshot()).toBe(historyBefore);
  await runtime.host.dispose();
});

test.each(['explicit-edge', 'incident-edge', 'new-incident-edge'] as const)(
  'Delete Selection retains the first Snapshot for %s preflight',
  async (scenario) => {
    const runtime = await activateDeleteCommandRuntime();
    const sourceId = nodeId('evidence-source');
    const targetId = nodeId('evidence-target');
    const id = edgeId('evidence-edge');
    runtime.kernel.transact((transaction) => {
      transaction.nodes.add({ id: sourceId, type: 'task', position: { x: 0, y: 0 }, data: null });
      transaction.nodes.add({ id: targetId, type: 'task', position: { x: 100, y: 0 }, data: null });
      if (scenario !== 'new-incident-edge') {
        transaction.edges.add({
          id,
          type: 'flow',
          source: { nodeId: sourceId },
          target: { nodeId: targetId },
          data: null,
        });
      }
    });
    runtime.session.setSelection({
      nodeIds: scenario === 'explicit-edge' ? [] : [sourceId],
      edgeIds: scenario === 'explicit-edge' ? [id] : [],
    });
    const selection = runtime.session.getSnapshot().selection;
    const evidence = runtime.kernel.read().snapshot;
    if (scenario !== 'new-incident-edge') {
      runtime.kernel.transact((transaction) => transaction.edges.remove(id));
    }
    runtime.kernel.transact((transaction) => {
      transaction.edges.add({
        id,
        type: 'flow',
        source: { nodeId: sourceId },
        target: { nodeId: targetId },
        data: null,
      });
    });
    const before = runtime.kernel.read();
    const sessionBefore = runtime.session.getSnapshot();
    const historyBefore = runtime.history.getSnapshot();
    let reads = 0;
    await expect(
      runtime.commands.execute(deleteSelectionCommand, {
        selection,
        get evidence() {
          reads += 1;
          return reads === 1 ? evidence : before.snapshot;
        },
      }),
    ).rejects.toMatchObject({ domain: 'interaction', code: 'STALE_SELECTION' });
    expect(reads).toBe(1);
    expect(runtime.kernel.read()).toBe(before);
    expect(runtime.session.getSnapshot()).toBe(sessionBefore);
    expect(runtime.history.getSnapshot()).toBe(historyBefore);
    await runtime.host.dispose();
  },
);

test.each(['own', 'inherited', 'non-enumerable'] as const)(
  'Delete Selection accepts the first valid %s evidence getter and preserves replay data',
  async (kind) => {
    const runtime = await activateDeleteCommandRuntime();
    const parentId = nodeId('evidence-parent');
    const id = nodeId('evidence-child');
    const data = new Map([['opaque', 'retained']]);
    runtime.kernel.transact((transaction) => {
      transaction.nodes.add({ id: parentId, type: 'group', position: { x: 0, y: 0 }, data: null });
      transaction.nodes.add({
        id,
        type: 'task',
        position: { x: 10, y: 20 },
        size: { width: 80, height: 40 },
        parentId,
        data,
      });
    });
    runtime.session.setSelection({ nodeIds: [id], edgeIds: [] });
    const evidence = runtime.kernel.read().snapshot;
    let reads = 0;
    const source: DeleteSelectionInput = {
      selection: runtime.session.getSnapshot().selection,
      get evidence() {
        expect(this).toBe(input);
        reads += 1;
        if (reads > 1) throw new Error('A later evidence getter result must not replace the first Snapshot.');
        return evidence;
      },
    };
    const input: DeleteSelectionInput = kind === 'inherited' ? Object.create(source) : source;
    if (kind === 'non-enumerable') Object.defineProperty(input, 'evidence', { enumerable: false });
    const commit = await runtime.commands.execute(deleteSelectionCommand, input);
    expect(commit?.changeSet).toMatchObject({ origin: 'interaction', commandId: deleteSelectionCommand.id });
    expect(reads).toBe(1);
    expect(runtime.kernel.read().query.getNode(id)).toBeUndefined();
    expect(runtime.kernel.read().query.getNode(parentId)).toBe(evidence.nodes.find((node) => node.id === parentId));
    expect(runtime.session.getSnapshot().selection).toEqual({ nodeIds: [], edgeIds: [] });
    await runtime.commands.execute(undoCommand, undefined);
    expect(runtime.kernel.read().query.getNode(id)).toEqual(evidence.nodes.find((node) => node.id === id));
    expect(runtime.kernel.read().query.getNode(id)?.data).toBe(data);
    await runtime.commands.execute(redoCommand, undefined);
    expect(runtime.kernel.read().query.getNode(id)).toBeUndefined();
    expect(reads).toBe(1);
    expect(Object.isFrozen(data)).toBe(false);
    expect([...data]).toEqual([['opaque', 'retained']]);
    await runtime.host.dispose();
  },
);

test('Delete Selection rejects malformed first evidence before a later valid Snapshot can replace it', async () => {
  const runtime = await activateDeleteCommandRuntime();
  const before = runtime.kernel.read();
  const historyBefore = runtime.history.getSnapshot();
  let reads = 0;
  await expect(
    runtime.commands.execute(deleteSelectionCommand, {
      selection: { nodeIds: [], edgeIds: [] },
      get evidence() {
        reads += 1;
        return reads === 1 ? { ...before.snapshot, revision: -1 } : before.snapshot;
      },
    }),
  ).rejects.toMatchObject({ domain: 'interaction', code: 'INVALID_DELETE' });
  expect(reads).toBe(1);
  expect(runtime.kernel.read()).toBe(before);
  expect(runtime.history.getSnapshot()).toBe(historyBefore);
  await runtime.host.dispose();
});

test.each([undefined, null, false, 0, '', Symbol('evidence failure'), new Error('evidence failure')])(
  'Delete Selection preserves the original evidence getter failure %p',
  async (failure) => {
    const runtime = await activateDeleteCommandRuntime();
    const before = runtime.kernel.read();
    const historyBefore = runtime.history.getSnapshot();
    let caught = false;
    let actual: unknown;
    try {
      await runtime.commands.execute(deleteSelectionCommand, {
        selection: { nodeIds: [], edgeIds: [] },
        get evidence(): DeleteSelectionInput['evidence'] {
          throw failure;
        },
      });
    } catch (error) {
      caught = true;
      actual = error;
    }
    expect(caught).toBe(true);
    expect(actual).toBe(failure);
    expect(runtime.kernel.read()).toBe(before);
    expect(runtime.history.getSnapshot()).toBe(historyBefore);
    await runtime.host.dispose();
  },
);

test('Delete Selection preserves abort and malformed Selection short circuits before evidence reads', async () => {
  const runtime = await activateDeleteCommandRuntime();
  const controller = new AbortController();
  const reason = new Error('aborted before Delete input');
  controller.abort(reason);
  let reads = 0;
  const input = {
    get selection(): DeleteSelectionInput['selection'] {
      reads += 1;
      throw new Error('unexpected Selection read');
    },
    get evidence(): DeleteSelectionInput['evidence'] {
      reads += 1;
      throw new Error('unexpected evidence read');
    },
  };
  await expect(runtime.commands.execute(deleteSelectionCommand, input, { signal: controller.signal })).rejects.toBe(
    reason,
  );
  expect(reads).toBe(0);
  await expect(
    runtime.commands.execute(deleteSelectionCommand, {
      selection: { nodeIds: [undefined], edgeIds: [] } as never,
      get evidence(): DeleteSelectionInput['evidence'] {
        reads += 1;
        throw new Error('unexpected evidence read');
      },
    }),
  ).rejects.toMatchObject({ domain: 'interaction', code: 'INVALID_DELETE' });
  expect(reads).toBe(0);
  const before = runtime.kernel.read();
  await expect(
    runtime.commands.execute(deleteSelectionCommand, {
      selection: { nodeIds: [], edgeIds: [] },
      get evidence() {
        reads += 1;
        if (reads > 1) throw new Error('unexpected later evidence read');
        return before.snapshot;
      },
    }),
  ).resolves.toBeNull();
  expect(reads).toBe(1);
  expect(runtime.kernel.read()).toBe(before);
  expect(runtime.history.getSnapshot()).toEqual({ canUndo: false, canRedo: false });
  await runtime.host.dispose();
});

test('Delete Selection applies the first Selection when later root reads would choose another Node', async () => {
  const runtime = await activateDeleteCommandRuntime();
  try {
    const a = nodeId('first-selection-a');
    const b = nodeId('first-selection-b');
    runtime.kernel.transact((transaction) => {
      transaction.nodes.add({ id: a, type: 'task', position: { x: 0, y: 0 }, data: null });
      transaction.nodes.add({ id: b, type: 'task', position: { x: 100, y: 0 }, data: null });
    });
    runtime.session.setSelection({ nodeIds: [a], edgeIds: [] });
    const first = runtime.session.getSnapshot().selection;
    runtime.session.setSelection({ nodeIds: [b], edgeIds: [] });
    const later = runtime.session.getSnapshot().selection;
    const evidence = runtime.kernel.read().snapshot;
    let reads = 0;
    const commit = await runtime.commands.execute(deleteSelectionCommand, {
      get selection() {
        reads += 1;
        return reads === 1 ? first : later;
      },
      evidence,
    });
    expect(commit).not.toBeNull();
    expect(runtime.kernel.read().query.getNode(a)).toBeUndefined();
    expect(runtime.kernel.read().query.getNode(b)).toBe(evidence.nodes.find((node) => node.id === b));
    expect(runtime.session.getSnapshot().selection).toBe(later);
    expect(reads).toBe(1);
  } finally {
    await runtime.host.dispose();
  }
});

for (const kind of ['node', 'edge'] as const) {
  test.each([
    'root-own',
    'root-inherited',
    'root-non-enumerable',
    'collection-root',
    'inherited-collection',
    'iterator',
    'array-hooks',
    'index-once',
    'evidence-mutates-ids',
  ] as const)('Delete Selection captures %s for ' + kind + ' targets', async (mode) => {
    const fixture = await activateSelectionValueRuntime(kind);
    try {
      let rootReads = 0,
        fieldReads = 0,
        indexReads = 0,
        hookReads = 0,
        evidenceReads = 0;
      const ids = [fixture.firstId];
      if (mode === 'iterator') {
        Object.defineProperty(ids, Symbol.iterator, {
          value: function* () {
            hookReads += 1;
            yield fixture.secondId;
          },
        });
      } else if (mode === 'array-hooks') {
        const constructor = Object.defineProperty(function () {}, Symbol.species, {
          get() {
            hookReads += 1;
            throw new Error('Unexpected caller species');
          },
        });
        for (const key of [Symbol.iterator, 'every', 'map', 'slice', 'keys', 'values']) {
          Object.defineProperty(ids, key, {
            get() {
              hookReads += 1;
              throw new Error('Unexpected caller traversal');
            },
          });
        }
        Object.defineProperty(ids, 'constructor', {
          get() {
            hookReads += 1;
            return constructor;
          },
        });
      } else if (mode === 'index-once') {
        Object.defineProperty(ids, '0', {
          get() {
            expect(this).toBe(ids);
            indexReads += 1;
            return indexReads === 1 ? fixture.firstId : fixture.secondId;
          },
        });
      }
      const selectionBase = { ...fixture.first };
      Object.defineProperty(selectionBase, fixture.field, {
        get() {
          expect(this).toBe(selection);
          fieldReads += 1;
          return mode === 'collection-root' && fieldReads > 1 ? fixture.later[fixture.field] : ids;
        },
        enumerable: false,
      });
      const selection: DeleteSelectionInput['selection'] =
        mode === 'inherited-collection' ? Object.create(selectionBase) : selectionBase;
      const source: DeleteSelectionInput = {
        get selection() {
          expect(this).toBe(input);
          rootReads += 1;
          if (rootReads > 1) throw new Error('Later Selection root must not be consumed');
          return selection;
        },
        get evidence() {
          evidenceReads += 1;
          if (evidenceReads > 1) throw new Error('Later evidence root must not be consumed');
          if (mode === 'evidence-mutates-ids') ids[0] = fixture.secondId;
          return fixture.evidence;
        },
      };
      const input: DeleteSelectionInput = mode === 'root-inherited' ? Object.create(source) : source;
      if (mode === 'root-non-enumerable') Object.defineProperty(input, 'selection', { enumerable: false });
      const commit = await fixture.commands.execute(deleteSelectionCommand, input);
      expect(commit?.changeSet).toMatchObject({ origin: 'interaction', commandId: deleteSelectionCommand.id });
      expectFirstSelectionDeleted(fixture);
      expect(rootReads).toBe(1);
      expect(fieldReads).toBe(1);
      expect(evidenceReads).toBe(1);
      expect(hookReads).toBe(0);
      expect(indexReads).toBe(mode === 'index-once' ? 1 : 0);
      await fixture.commands.execute(undoCommand, undefined);
      const restored =
        kind === 'node'
          ? fixture.kernel.read().query.getNode(fixture.a)
          : fixture.kernel.read().query.getEdge(fixture.firstEdgeId);
      expect(restored).toBeDefined();
      expect(restored?.data).toBe(fixture.data);
      await fixture.commands.execute(redoCommand, undefined);
      expectFirstSelectionDeleted(fixture);
      expect(rootReads).toBe(1);
      expect(fieldReads).toBe(1);
      expect(evidenceReads).toBe(1);
      expect(Object.isFrozen(fixture.data)).toBe(false);
      expect([...fixture.data]).toEqual([['opaque', 'selection capture']]);
    } finally {
      await fixture.host.dispose();
    }
  });

  test.each([
    1.5,
    '1.5',
    {
      valueOf() {
        return 1.5;
      },
    },
  ])('Delete Selection keeps native fractional length %p for ' + kind + ' targets', async (length) => {
    const fixture = await activateSelectionValueRuntime(kind);
    try {
      let reads = 0;
      const ids = new Proxy([fixture.firstId, fixture.secondId], {
        get(target, key, receiver) {
          if (key === 'length') {
            reads += 1;
            return length;
          }
          return Reflect.get(target, key, receiver);
        },
      });
      const selection = { ...fixture.first };
      Object.defineProperty(selection, fixture.field, { value: ids });
      await fixture.commands.execute(deleteSelectionCommand, { selection, evidence: fixture.evidence });
      expectFirstSelectionDeleted(fixture);
      expect(reads).toBe(1);
    } finally {
      await fixture.host.dispose();
    }
  });

  test.each([0.5, -1, NaN, undefined, '0'])(
    'Delete Selection validates evidence and preserves native empty length %p for ' + kind + ' targets',
    async (length) => {
      const fixture = await activateSelectionValueRuntime(kind);
      try {
        let lengthReads = 0,
          indexReads = 0,
          evidenceReads = 0;
        const ids = new Proxy([fixture.firstId], {
          get(target, key, receiver) {
            if (key === 'length') {
              lengthReads += 1;
              return length;
            }
            if (key === '0') {
              indexReads += 1;
              throw new Error('Empty native traversal must not read an entry');
            }
            return Reflect.get(target, key, receiver);
          },
        });
        const selection = { nodeIds: [], edgeIds: [] };
        Object.defineProperty(selection, fixture.field, { value: ids });
        const before = fixture.kernel.read(),
          historyBefore = fixture.history.getSnapshot(),
          sessionBefore = fixture.session.getSnapshot();
        await expect(
          fixture.commands.execute(deleteSelectionCommand, {
            selection,
            get evidence() {
              evidenceReads += 1;
              return fixture.evidence;
            },
          }),
        ).resolves.toBeNull();
        expect(lengthReads).toBe(1);
        expect(indexReads).toBe(0);
        expect(evidenceReads).toBe(1);
        expect(fixture.kernel.read()).toBe(before);
        expect(fixture.history.getSnapshot()).toBe(historyBefore);
        expect(fixture.session.getSnapshot()).toBe(sessionBefore);
      } finally {
        await fixture.host.dispose();
      }
    },
  );

  test.each([1n, Symbol('length')])(
    'Delete Selection preserves native length failure %p for ' + kind,
    async (length) => {
      const fixture = await activateSelectionValueRuntime(kind);
      try {
        let evidenceReads = 0;
        const ids = new Proxy([fixture.firstId], {
          get(target, key, receiver) {
            return key === 'length' ? length : Reflect.get(target, key, receiver);
          },
        });
        const selection = { ...fixture.first };
        Object.defineProperty(selection, fixture.field, { value: ids });
        const before = fixture.kernel.read(),
          historyBefore = fixture.history.getSnapshot();
        await expect(
          fixture.commands.execute(deleteSelectionCommand, {
            selection,
            get evidence() {
              evidenceReads += 1;
              return fixture.evidence;
            },
          }),
        ).rejects.toBeInstanceOf(TypeError);
        expect(evidenceReads).toBe(0);
        expect(fixture.kernel.read()).toBe(before);
        expect(fixture.history.getSnapshot()).toBe(historyBefore);
      } finally {
        await fixture.host.dispose();
      }
    },
  );
}

test.each(['selection', 'length', 'index'] as const)(
  'Delete Selection preserves original %s read failures',
  async (stage) => {
    for (const failure of [undefined, null, false, 0, '', Symbol('owned read'), new Error('owned read')]) {
      const fixture = await activateSelectionValueRuntime('node');
      try {
        const ids = new Proxy([fixture.a], {
          get(target, key, receiver) {
            if ((stage === 'length' && key === 'length') || (stage === 'index' && key === '0')) throw failure;
            return Reflect.get(target, key, receiver);
          },
        });
        const input: DeleteSelectionInput = {
          get selection() {
            if (stage === 'selection') throw failure;
            return { nodeIds: ids, edgeIds: [] };
          },
          get evidence(): DeleteSelectionInput['evidence'] {
            throw new Error('Evidence must follow owned-value admission');
          },
        };
        const before = fixture.kernel.read(),
          historyBefore = fixture.history.getSnapshot(),
          sessionBefore = fixture.session.getSnapshot();
        let caught = false,
          actual: unknown;
        try {
          await fixture.commands.execute(deleteSelectionCommand, input);
        } catch (error) {
          caught = true;
          actual = error;
        }
        expect(caught).toBe(true);
        expect(actual).toBe(failure);
        expect(fixture.kernel.read()).toBe(before);
        expect(fixture.history.getSnapshot()).toBe(historyBefore);
        expect(fixture.session.getSnapshot()).toBe(sessionBefore);
      } finally {
        await fixture.host.dispose();
      }
    }
  },
);

test('Delete Selection rejects sparse and invalid indexed IDs before evidence and preserves lazy first failure', async () => {
  for (const kind of ['node', 'edge'] as const) {
    for (const mode of ['sparse', 'invalid', 'infinite-length'] as const) {
      const fixture = await activateSelectionValueRuntime(kind);
      try {
        let reads = 0;
        const bad = mode === 'sparse' ? new Array(1) : [undefined];
        const ids =
          mode === 'infinite-length'
            ? new Proxy(bad, {
                get(target, key, receiver) {
                  return key === 'length' ? Infinity : Reflect.get(target, key, receiver);
                },
              })
            : bad;
        const selection = { nodeIds: [], edgeIds: [] };
        Object.defineProperty(selection, fixture.field, { value: ids });
        const before = fixture.kernel.read(),
          historyBefore = fixture.history.getSnapshot();
        await expect(
          fixture.commands.execute(deleteSelectionCommand, {
            selection,
            get evidence() {
              reads += 1;
              return fixture.evidence;
            },
          }),
        ).rejects.toMatchObject({ domain: 'interaction', code: 'INVALID_DELETE' });
        expect(reads).toBe(0);
        expect(fixture.kernel.read()).toBe(before);
        expect(fixture.history.getSnapshot()).toBe(historyBefore);
      } finally {
        await fixture.host.dispose();
      }
    }
  }
});

test('Delete Selection admits node IDs before edge IDs and evidence and retains the first coercion', async () => {
  const fixture = await activateSelectionValueRuntime('node');
  try {
    const calls: string[] = [];
    let coercions = 0;
    const length = {
      valueOf() {
        expect(this).toBe(length);
        coercions += 1;
        return coercions === 1 ? 1.5 : 2;
      },
    };
    const ids = new Proxy([fixture.a, fixture.b], {
      get(target, key, receiver) {
        if (key === 'length') {
          calls.push('length');
          return length;
        }
        if (key === '0') calls.push('index');
        return Reflect.get(target, key, receiver);
      },
    });
    await fixture.commands.execute(deleteSelectionCommand, {
      get selection() {
        calls.push('selection');
        return {
          get nodeIds() {
            calls.push('nodeIds');
            return ids;
          },
          get edgeIds() {
            calls.push('edgeIds');
            return [];
          },
        };
      },
      get evidence() {
        calls.push('evidence');
        return fixture.evidence;
      },
    });
    expectFirstSelectionDeleted(fixture);
    expect(coercions).toBe(1);
    expect(calls).toEqual(['selection', 'nodeIds', 'length', 'index', 'edgeIds', 'evidence']);
  } finally {
    await fixture.host.dispose();
  }
});

async function activateSelectionValueRuntime(kind: 'node' | 'edge') {
  const runtime = await activateDeleteCommandRuntime();
  const a = nodeId('capture-a'),
    b = nodeId('capture-b');
  const firstEdgeId = edgeId('capture-edge-a'),
    secondEdgeId = edgeId('capture-edge-b');
  const data = new Map([['opaque', 'selection capture']]);
  runtime.kernel.transact((transaction) => {
    transaction.nodes.add({ id: a, type: 'task', position: { x: 0, y: 0 }, data });
    transaction.nodes.add({ id: b, type: 'task', position: { x: 100, y: 0 }, data: null });
    transaction.edges.add({ id: firstEdgeId, type: 'loop', source: { nodeId: a }, target: { nodeId: a }, data });
    transaction.edges.add({ id: secondEdgeId, type: 'loop', source: { nodeId: b }, target: { nodeId: b }, data: null });
  });
  runtime.session.setSelection({ nodeIds: kind === 'node' ? [a] : [], edgeIds: kind === 'edge' ? [firstEdgeId] : [] });
  const first = runtime.session.getSnapshot().selection;
  runtime.session.setSelection({ nodeIds: kind === 'node' ? [b] : [], edgeIds: kind === 'edge' ? [secondEdgeId] : [] });
  const later = runtime.session.getSnapshot().selection;
  return {
    ...runtime,
    kind,
    a,
    b,
    firstEdgeId,
    secondEdgeId,
    data,
    first,
    later,
    evidence: runtime.kernel.read().snapshot,
    firstId: kind === 'node' ? a : firstEdgeId,
    secondId: kind === 'node' ? b : secondEdgeId,
    field: kind === 'node' ? ('nodeIds' as const) : ('edgeIds' as const),
  };
}

function expectFirstSelectionDeleted(fixture: Awaited<ReturnType<typeof activateSelectionValueRuntime>>): void {
  const view = fixture.kernel.read();
  if (fixture.kind === 'node') {
    expect(view.query.getNode(fixture.a)).toBeUndefined();
    expect(view.query.getNode(fixture.b)).toBe(fixture.evidence.nodes.find((node) => node.id === fixture.b));
  } else {
    expect(view.query.getNode(fixture.a)).toBe(fixture.evidence.nodes.find((node) => node.id === fixture.a));
    expect(view.snapshot.nodes).toHaveLength(2);
  }
  expect(view.query.getEdge(fixture.firstEdgeId)).toBeUndefined();
  expect(view.query.getEdge(fixture.secondEdgeId)).toBe(
    fixture.evidence.edges.find((edge) => edge.id === fixture.secondEdgeId),
  );
  expect(fixture.session.getSnapshot().selection).toBe(fixture.later);
}

async function activateDeleteCommandRuntime(): Promise<{
  readonly host: ReturnType<typeof createPluginHost>;
  readonly commands: CommandService;
  readonly history: HistoryService;
  readonly kernel: KernelService;
  readonly session: SessionService;
}> {
  let commands: CommandService | undefined;
  let history: HistoryService | undefined;
  let kernel: KernelService | undefined;
  let session: SessionService | undefined;
  const consumer = definePlugin({
    requires: {
      commands: commandService,
      history: historyService,
      kernel: kernelService,
      session: sessionService,
    },
    setup(context) {
      commands = context.services.commands;
      history = context.services.history;
      kernel = context.services.kernel;
      session = context.services.session;
    },
  });
  const host = createPluginHost();
  const installations = [
    host.install(kernelPlugin),
    host.install(portPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    host.install(createRendererPlugin(() => new CommandRenderer())),
    host.install(interactionPlugin),
    host.install(historyPlugin),
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!commands || !history || !kernel || !session) throw new Error('Expected Delete Selection Runtime Services.');
  return { host, commands, history, kernel, session };
}

class CommandRenderer implements CanvasRenderer {
  updateDocument(_update: RendererDocumentUpdate): void {}
  updateSession(_snapshot: SessionSnapshot): void {}
  updateInteraction(): void {}
  subscribeInput(_listener: RendererInputListener): () => void {
    return () => undefined;
  }
  hitTest(_point: ScreenPoint): HitResult {
    return { type: 'canvas', worldPoint: { x: 0, y: 0 } };
  }
  capturePointer(_pointerId: number): void {}
  releasePointer(_pointerId: number): void {}
  focus(): void {}
  dispose(): Promise<void> {
    return Promise.resolve();
  }
}

test('Delete Selection rejects stale first evidence Nodes when later collection reads return current roots', async () => {
  const fixture = await activateSelectionValueRuntime('node');
  try {
    const evidence = fixture.evidence;
    for (const x of [10, 0]) {
      fixture.kernel.transact((transaction) => {
        const node = transaction.query.getNode(fixture.a);
        if (!node) throw new Error('Expected evidence Node.');
        transaction.nodes.replace(fixture.a, { ...node, position: { x, y: 0 } });
      });
    }
    const before = fixture.kernel.read();
    const sessionBefore = fixture.session.getSnapshot();
    const historyBefore = fixture.history.getSnapshot();
    expect(evidence.nodes[0]).toEqual(before.snapshot.nodes[0]);
    expect(evidence.nodes[0]).not.toBe(before.snapshot.nodes[0]);
    let reads = 0;
    const supplied: DeleteSelectionInput['evidence'] = Object.freeze({
      revision: evidence.revision,
      get nodes() {
        reads += 1;
        return reads <= 2 ? evidence.nodes : before.snapshot.nodes;
      },
      edges: evidence.edges,
    });
    await expect(
      fixture.commands.execute(deleteSelectionCommand, {
        selection: fixture.first,
        evidence: supplied,
      }),
    ).rejects.toMatchObject({ domain: 'interaction', code: 'STALE_SELECTION' });
    expect(reads).toBe(1);
    expect(fixture.kernel.read()).toBe(before);
    expect(fixture.session.getSnapshot()).toBe(sessionBefore);
    expect(fixture.history.getSnapshot()).toBe(historyBefore);
  } finally {
    await fixture.host.dispose();
  }
});

for (const kind of ['node', 'edge'] as const) {
  test.each(['root', 'index', 'map', 'hooks', 'later-field-mutation'] as const)(
    'Delete Selection rejects first stale ' + kind + ' evidence through %s collection access',
    async (mode) => {
      const fixture = await activateEvidenceValueRuntime(kind);
      try {
        let rootReads = 0,
          indexReads = 0,
          hookCalls = 0;
        const oldValues = fixture.old[fixture.field],
          currentValues = fixture.current[fixture.field];
        const values = [...oldValues];
        if (mode === 'index')
          Object.defineProperty(values, 0, {
            get() {
              indexReads += 1;
              return indexReads === 1 ? oldValues[0] : currentValues[0];
            },
          });
        if (mode === 'map')
          Object.defineProperty(values, 'map', {
            value(callback: (value: unknown) => unknown) {
              hookCalls += 1;
              return Array.prototype.map.call(currentValues, callback);
            },
          });
        if (mode === 'hooks') {
          for (const key of [Symbol.iterator, 'every', 'map', 'filter', 'slice', 'keys', 'values', 'constructor']) {
            Object.defineProperty(values, key, {
              get() {
                hookCalls += 1;
                throw new Error('Caller traversal must not choose evidence');
              },
            });
          }
        }
        const read = () => {
          rootReads += 1;
          return mode === 'root' ? (rootReads <= 2 ? oldValues : currentValues) : values;
        };
        const evidence: DeleteSelectionInput['evidence'] = {
          revision: fixture.old.revision,
          get nodes() {
            return kind === 'node' ? (read() as DeleteSelectionInput['evidence']['nodes']) : fixture.old.nodes;
          },
          get edges() {
            if (kind === 'node' && mode === 'later-field-mutation') values[0] = currentValues[0]!;
            return kind === 'edge' ? (read() as DeleteSelectionInput['evidence']['edges']) : fixture.old.edges;
          },
        };
        // Edge evidence is admitted after Nodes; mutate it only after its own first indexed read.
        if (kind === 'edge' && mode === 'later-field-mutation') {
          Object.defineProperty(values, 1, {
            get() {
              indexReads += 1;
              values[0] = currentValues[0]!;
              return oldValues[1];
            },
          });
        }
        const before = fixture.kernel.read(),
          session = fixture.session.getSnapshot(),
          history = fixture.history.getSnapshot();
        await expect(
          fixture.commands.execute(deleteSelectionCommand, { selection: fixture.first, evidence }),
        ).rejects.toMatchObject({ domain: 'interaction', code: 'STALE_SELECTION' });
        expect(rootReads).toBe(1);
        expect(hookCalls).toBe(0);
        if (mode === 'index' || (kind === 'edge' && mode === 'later-field-mutation')) expect(indexReads).toBe(1);
        expect(fixture.kernel.read()).toBe(before);
        expect(fixture.session.getSnapshot()).toBe(session);
        expect(fixture.history.getSnapshot()).toBe(history);
      } finally {
        await fixture.host.dispose();
      }
    },
  );

  test.each(['own', 'inherited', 'non-enumerable'] as const)(
    'Delete Selection accepts first valid %s ' + kind + ' evidence and preserves Undo data',
    async (mode) => {
      const fixture = await activateSelectionValueRuntime(kind);
      try {
        const nodes = fixture.evidence.nodes,
          edges = fixture.evidence.edges;
        const receiver: Record<string, number> = {};
        const evidence: DeleteSelectionInput['evidence'] = {
          get revision() {
            expect(this).toBe(evidence);
            receiver.revision = (receiver.revision ?? 0) + 1;
            if (receiver.revision > 1) throw new Error('later revision');
            return fixture.evidence.revision;
          },
          get nodes() {
            expect(this).toBe(evidence);
            receiver.nodes = (receiver.nodes ?? 0) + 1;
            if (receiver.nodes > 1) throw new Error('later Nodes');
            return nodes;
          },
          get edges() {
            expect(this).toBe(evidence);
            receiver.edges = (receiver.edges ?? 0) + 1;
            if (receiver.edges > 1) throw new Error('later Edges');
            return edges;
          },
        };
        if (mode === 'inherited') {
          const descriptors = Object.getOwnPropertyDescriptors(evidence);
          const prototype = Object.defineProperties({}, descriptors);
          for (const key of ['revision', 'nodes', 'edges'] as const) Reflect.deleteProperty(evidence, key);
          Object.setPrototypeOf(evidence, prototype);
        }
        if (mode === 'non-enumerable')
          for (const key of ['revision', 'nodes', 'edges']) Object.defineProperty(evidence, key, { enumerable: false });
        const commit = await fixture.commands.execute(deleteSelectionCommand, { selection: fixture.first, evidence });
        expect(commit?.changeSet).toMatchObject({
          beforeRevision: 1,
          revision: 2,
          origin: 'interaction',
          commandId: deleteSelectionCommand.id,
        });
        expect(receiver).toEqual({ revision: 1, nodes: 1, edges: 1 });
        expectFirstSelectionDeleted(fixture);
        await fixture.commands.execute(undoCommand, undefined);
        expect(fixture.kernel.read().query.getNode(fixture.a)?.data).toBe(fixture.data);
        expect(fixture.kernel.read().query.getEdge(fixture.firstEdgeId)?.data).toBe(fixture.data);
        await fixture.commands.execute(redoCommand, undefined);
        expectFirstSelectionDeleted(fixture);
      } finally {
        await fixture.host.dispose();
      }
    },
  );

  test.each(['iterator', 'methods', 'index', 'length'] as const)(
    'Delete Selection uses valid first ' + kind + ' entities independently of caller %s',
    async (mode) => {
      const fixture = await activateSelectionValueRuntime(kind);
      try {
        let reads = 0,
          hooks = 0;
        const values = [...fixture.evidence[kind === 'node' ? 'nodes' : 'edges']];
        if (mode === 'iterator')
          Object.defineProperty(values, Symbol.iterator, {
            value: function* () {
              hooks += 1;
              yield undefined;
            },
          });
        if (mode === 'methods')
          for (const key of ['every', 'map', 'filter', 'constructor'])
            Object.defineProperty(values, key, {
              get() {
                hooks += 1;
                throw new Error('caller method');
              },
            });
        if (mode === 'index') {
          const first = values[0];
          Object.defineProperty(values, 0, {
            get() {
              reads += 1;
              if (reads > 1) throw new Error('later entity read');
              return first;
            },
          });
        }
        const supplied =
          mode === 'length'
            ? new Proxy(values, {
                get(target, key, receiver) {
                  if (key === 'length') {
                    reads += 1;
                    if (reads > 1) throw new Error('later length read');
                  }
                  return Reflect.get(target, key, receiver);
                },
              })
            : values;
        const evidence = {
          ...fixture.evidence,
          [kind === 'node' ? 'nodes' : 'edges']: supplied,
        } as DeleteSelectionInput['evidence'];
        await fixture.commands.execute(deleteSelectionCommand, { selection: fixture.first, evidence });
        expectFirstSelectionDeleted(fixture);
        expect(hooks).toBe(0);
        if (mode === 'index' || mode === 'length') expect(reads).toBe(1);
      } finally {
        await fixture.host.dispose();
      }
    },
  );
}

test.each(['revision', 'nodes', 'edges'] as const)(
  'Delete Selection validates the first malformed evidence %s before later valid values',
  async (field) => {
    const runtime = await activateDeleteCommandRuntime();
    try {
      const before = runtime.kernel.read(),
        history = runtime.history.getSnapshot(),
        session = runtime.session.getSnapshot();
      let reads = 0;
      const evidence = {
        ...before.snapshot,
        get [field]() {
          reads += 1;
          return reads === 1 ? (field === 'revision' ? -1 : null) : before.snapshot[field];
        },
      } as DeleteSelectionInput['evidence'];
      await expect(
        runtime.commands.execute(deleteSelectionCommand, { selection: { nodeIds: [], edgeIds: [] }, evidence }),
      ).rejects.toMatchObject({ domain: 'interaction', code: 'INVALID_DELETE' });
      expect(reads).toBe(1);
      expect(runtime.kernel.read()).toBe(before);
      expect(runtime.history.getSnapshot()).toBe(history);
      expect(runtime.session.getSnapshot()).toBe(session);
    } finally {
      await runtime.host.dispose();
    }
  },
);

for (const field of ['revision', 'nodes', 'edges', 'length', 'index'] as const) {
  test.each([undefined, null, false, 0, '', Symbol('evidence read'), new Error('evidence read')])(
    'Delete Selection preserves original ' + field + ' evidence failure %p',
    async (failure) => {
      const fixture = await activateSelectionValueRuntime('node');
      try {
        let calls = 0;
        const values = [...fixture.evidence.nodes];
        if (field === 'index')
          Object.defineProperty(values, 0, {
            get() {
              calls += 1;
              throw failure;
            },
          });
        const nodes =
          field === 'length'
            ? new Proxy(values, {
                get(target, key, receiver) {
                  if (key === 'length') {
                    calls += 1;
                    throw failure;
                  }
                  return Reflect.get(target, key, receiver);
                },
              })
            : values;
        const evidence: DeleteSelectionInput['evidence'] = { ...fixture.evidence, nodes };
        if (field === 'revision' || field === 'nodes' || field === 'edges')
          Object.defineProperty(evidence, field, {
            get() {
              calls += 1;
              throw failure;
            },
          });
        const before = fixture.kernel.read(),
          history = fixture.history.getSnapshot(),
          session = fixture.session.getSnapshot();
        let rejected = false,
          caught: unknown;
        try {
          await fixture.commands.execute(deleteSelectionCommand, { selection: fixture.first, evidence });
        } catch (error) {
          rejected = true;
          caught = error;
        }
        expect(rejected).toBe(true);
        expect(caught).toBe(failure);
        expect(calls).toBe(1);
        expect(fixture.kernel.read()).toBe(before);
        expect(fixture.history.getSnapshot()).toBe(history);
        expect(fixture.session.getSnapshot()).toBe(session);
      } finally {
        await fixture.host.dispose();
      }
    },
  );
}

test('Delete Selection rejects sparse, hidden-invalid and lazily invalid evidence entities', async () => {
  const fixture = await activateSelectionValueRuntime('node');
  try {
    const before = fixture.kernel.read(),
      history = fixture.history.getSnapshot();
    for (const field of ['nodes', 'edges'] as const)
      for (const mode of ['sparse', 'hidden-invalid', 'infinite-first-invalid'] as const) {
        const values: unknown[] = mode === 'sparse' ? Array(1) : [null];
        Object.defineProperty(values, 'every', { value: () => true });
        Object.defineProperty(values, 'map', { value: () => [] });
        Object.defineProperty(values, Symbol.iterator, { value: function* () {} });
        const supplied =
          mode === 'infinite-first-invalid'
            ? new Proxy(values, {
                get(target, key, receiver) {
                  if (key === 'length') return Infinity;
                  if (key === '1') throw new Error('must reject first invalid entity');
                  return Reflect.get(target, key, receiver);
                },
              })
            : values;
        const evidence = { ...fixture.evidence, [field]: supplied } as DeleteSelectionInput['evidence'];
        await expect(
          fixture.commands.execute(deleteSelectionCommand, { selection: fixture.first, evidence }),
        ).rejects.toMatchObject({ domain: 'interaction', code: 'INVALID_DELETE' });
        expect(fixture.kernel.read()).toBe(before);
        expect(fixture.history.getSnapshot()).toBe(history);
      }
  } finally {
    await fixture.host.dispose();
  }
});

test('Delete Selection captures evidence revision before Nodes before Edges and rejects malformed empty Selection evidence', async () => {
  const runtime = await activateDeleteCommandRuntime();
  try {
    const before = runtime.kernel.read();
    for (const malformed of ['revision', 'nodes', 'edges', null] as const) {
      const calls: string[] = [];
      const evidence = {
        get revision() {
          calls.push('revision');
          return malformed === 'revision' ? NaN : before.snapshot.revision;
        },
        get nodes() {
          calls.push('nodes');
          return malformed === 'nodes' ? null : before.snapshot.nodes;
        },
        get edges() {
          calls.push('edges');
          return malformed === 'edges' ? null : before.snapshot.edges;
        },
      } as DeleteSelectionInput['evidence'];
      const execution = runtime.commands.execute(deleteSelectionCommand, {
        selection: { nodeIds: [], edgeIds: [] },
        evidence,
      });
      if (malformed === null) await expect(execution).resolves.toBeNull();
      else await expect(execution).rejects.toMatchObject({ domain: 'interaction', code: 'INVALID_DELETE' });
      expect(calls).toEqual(
        malformed === 'revision'
          ? ['revision']
          : malformed === 'nodes'
            ? ['revision', 'nodes']
            : ['revision', 'nodes', 'edges'],
      );
      expect(runtime.kernel.read()).toBe(before);
    }
  } finally {
    await runtime.host.dispose();
  }
});

async function activateEvidenceValueRuntime(kind: 'node' | 'edge') {
  const fixture = await activateSelectionValueRuntime(kind);
  const old = fixture.evidence;
  for (const x of [10, 0])
    fixture.kernel.transact((transaction) => {
      if (kind === 'node') {
        const node = transaction.query.getNode(fixture.a);
        if (!node) throw new Error('Expected evidence Node.');
        transaction.nodes.replace(fixture.a, { ...node, position: { x, y: 0 } });
      } else {
        const edge = transaction.query.getEdge(fixture.firstEdgeId);
        if (!edge) throw new Error('Expected evidence Edge.');
        transaction.edges.replace(fixture.firstEdgeId, { ...edge, type: x === 10 ? 'changed' : 'loop' });
      }
    });
  return {
    ...fixture,
    old,
    current: fixture.kernel.read().snapshot,
    field: kind === 'node' ? ('nodes' as const) : ('edges' as const),
  };
}

for (const field of ['nodes', 'edges'] as const) {
  test('Delete Selection preserves native evidence ' + field + ' length normalization and failures', async () => {
    const runtime = await activateDeleteCommandRuntime();
    try {
      const before = runtime.kernel.read();
      for (const length of [undefined, null, NaN, -1, 0, 0.9, '0.9'] as const) {
        const values = new Proxy([], {
          get(target, key, receiver) {
            if (key === 'length') return length;
            return Reflect.get(target, key, receiver);
          },
        });
        await expect(
          runtime.commands.execute(deleteSelectionCommand, {
            selection: { nodeIds: [], edgeIds: [] },
            evidence: { ...before.snapshot, [field]: values },
          }),
        ).resolves.toBeNull();
        expect(runtime.kernel.read()).toBe(before);
      }
      for (const length of [1n, Symbol('evidence length')]) {
        const values = new Proxy([], {
          get(target, key, receiver) {
            if (key === 'length') return length;
            return Reflect.get(target, key, receiver);
          },
        });
        await expect(
          runtime.commands.execute(deleteSelectionCommand, {
            selection: { nodeIds: [], edgeIds: [] },
            evidence: { ...before.snapshot, [field]: values },
          }),
        ).rejects.toBeInstanceOf(TypeError);
        expect(runtime.kernel.read()).toBe(before);
      }
      let coerces = 0;
      const values = new Proxy([], {
        get(target, key, receiver) {
          if (key === 'length')
            return {
              valueOf() {
                coerces += 1;
                if (coerces > 1) throw new Error('later coercion');
                return 0;
              },
            };
          return Reflect.get(target, key, receiver);
        },
      });
      await expect(
        runtime.commands.execute(deleteSelectionCommand, {
          selection: { nodeIds: [], edgeIds: [] },
          evidence: { ...before.snapshot, [field]: values },
        }),
      ).resolves.toBeNull();
      expect(coerces).toBe(1);
      expect(runtime.kernel.read()).toBe(before);
    } finally {
      await runtime.host.dispose();
    }
  });
}
