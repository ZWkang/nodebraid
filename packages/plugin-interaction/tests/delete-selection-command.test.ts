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

import { deleteSelectionCommand, interactionPlugin } from '../src';

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
