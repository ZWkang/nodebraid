import { expect, test } from 'bun:test';

import type { CanvasFragment } from '@nodebraid/canvas-fragment';
import { edgeId, nodeId } from '@nodebraid/kernel';
import { commandPlugin, commandService, type CommandService } from '@nodebraid/plugin-command';
import { createDuplicateSelectionPlugin, duplicateSelectionCommand } from '@nodebraid/plugin-duplicate-selection';
import { historyPlugin, historyService, undoCommand, type HistoryService } from '@nodebraid/plugin-history';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { sessionPlugin, sessionService, type SessionService } from '@nodebraid/plugin-session';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

import { copySelectionToClipboardCommand, createClipboardPlugin, pasteClipboardCommand } from '../src';

test('Duplicate and Clipboard compose through one Host and shared Canvas Fragment seam', async () => {
  const sourceA = nodeId('composition-source-a');
  const sourceB = nodeId('composition-source-b');
  const sourceEdge = edgeId('composition-source-edge');
  const duplicateA = nodeId('composition-duplicate-a');
  const duplicateB = nodeId('composition-duplicate-b');
  const duplicateEdge = edgeId('composition-duplicate-edge');
  const pastedA = nodeId('composition-pasted-a');
  const pastedB = nodeId('composition-pasted-b');
  const pastedEdge = edgeId('composition-pasted-edge');
  let clipboardText = '';
  let clipboardFragment: CanvasFragment | undefined;
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
  const duplicate = host.install(
    createDuplicateSelectionPlugin({
      materializeIds: ({ nodeIds, edgeIds }) => ({
        nodes: nodeIds.map((sourceId) => ({
          sourceId,
          duplicateId: sourceId === sourceA ? duplicateA : duplicateB,
        })),
        edges: edgeIds.map((sourceId) => ({ sourceId, duplicateId: duplicateEdge })),
      }),
    }),
  );
  const clipboard = host.install(
    createClipboardPlugin({
      transport: {
        async readText() {
          return clipboardText;
        },
        async writeText(text) {
          clipboardText = text;
        },
      },
      codec: {
        encode(fragment) {
          clipboardFragment = fragment;
          return 'nodebraid:duplicate-composition';
        },
        decode(text) {
          if (text !== clipboardText) throw new Error('Unexpected Clipboard composition text.');
          return clipboardFragment;
        },
      },
      materializeIds: ({ nodeIds, edgeIds }) => ({
        nodes: nodeIds.map((sourceId) => ({
          sourceId,
          materializedId: sourceId === duplicateA ? pastedA : pastedB,
        })),
        edges: edgeIds.map((sourceId) => ({ sourceId, materializedId: pastedEdge })),
      }),
    }),
  );
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    host.install(historyPlugin),
    duplicate,
    clipboard,
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!commands || !history || !kernel || !session) {
    throw new Error('Expected joint Duplicate and Clipboard Runtime Services.');
  }
  kernel.transact((transaction) => {
    transaction.nodes.add({ id: sourceA, type: 'task', position: { x: 0, y: 0 }, data: null });
    transaction.nodes.add({ id: sourceB, type: 'task', position: { x: 40, y: 20 }, data: null });
    transaction.edges.add({
      id: sourceEdge,
      type: 'flow',
      source: { nodeId: sourceA, portId: 'out' },
      target: { nodeId: sourceB, portId: 'in' },
      data: null,
    });
  });
  session.setSelection({ nodeIds: [sourceA, sourceB], edgeIds: [sourceEdge] });

  await expect(commands.execute(duplicateSelectionCommand, undefined)).resolves.toMatchObject({
    changeSet: { revision: 2 },
  });
  expect(session.getSnapshot().selection).toEqual({
    nodeIds: [duplicateA, duplicateB],
    edgeIds: [duplicateEdge],
  });
  const copied = await commands.execute(copySelectionToClipboardCommand, undefined);
  expect(copied?.nodes.map((node) => node.id)).toEqual([duplicateA, duplicateB]);
  await expect(commands.execute(pasteClipboardCommand, undefined)).resolves.toMatchObject({
    changeSet: { revision: 3 },
  });

  expect(kernel.read().snapshot).toMatchObject({ revision: 3 });
  expect(kernel.read().snapshot.nodes).toHaveLength(6);
  expect(kernel.read().snapshot.edges).toHaveLength(3);
  expect(kernel.read().query.getNode(pastedA)?.position).toEqual({ x: 48, y: 48 });
  expect(kernel.read().query.getEdge(pastedEdge)).toMatchObject({
    source: { nodeId: pastedA, portId: 'out' },
    target: { nodeId: pastedB, portId: 'in' },
  });
  expect(session.getSnapshot().selection).toEqual({ nodeIds: [pastedA, pastedB], edgeIds: [pastedEdge] });
  expect(history.getSnapshot().canUndo).toBeTrue();

  await commands.execute(undoCommand, undefined);
  expect(kernel.read().query.getNode(pastedA)).toBeUndefined();
  expect(session.getSnapshot().selection).toEqual({ nodeIds: [], edgeIds: [] });
  await commands.execute(undoCommand, undefined);
  expect(kernel.read().query.getNode(duplicateA)).toBeUndefined();
  expect(kernel.read().query.getNode(sourceA)).toBeDefined();

  await host.dispose();
  expect(duplicate.getSnapshot().status).toBe('disposed');
  expect(clipboard.getSnapshot().status).toBe('disposed');
});
