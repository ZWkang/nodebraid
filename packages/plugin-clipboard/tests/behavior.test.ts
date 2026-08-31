import { expect, test } from 'bun:test';

import type { CanvasFragment } from '@nodebraid/canvas-fragment';
import { edgeId, nodeId } from '@nodebraid/kernel';
import { commandPlugin, commandService, type CommandService } from '@nodebraid/plugin-command';
import { historyPlugin, redoCommand, undoCommand } from '@nodebraid/plugin-history';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { sessionPlugin, sessionService, type SessionService } from '@nodebraid/plugin-session';
import { createPluginHost, definePlugin, type PluginHost } from '@nodebraid/runtime-cordis';

import {
  copySelectionToClipboardCommand,
  createClipboardPlugin,
  pasteClipboardCommand,
  type CanvasFragmentTextCodec,
  type ClipboardIdMaterializer,
  type ClipboardTextTransport,
} from '../src';

test('Copy keeps empty and edge-only Selection as no-ops without codec or transport calls', async () => {
  let encoded = 0;
  let writes = 0;
  const harness = await createHarness({
    transport: {
      async readText() {
        return '';
      },
      async writeText() {
        writes += 1;
      },
    },
    codec: {
      encode() {
        encoded += 1;
        return 'never';
      },
      decode() {
        return undefined;
      },
    },
  });
  const first = nodeId('edge-only-a');
  const second = nodeId('edge-only-b');
  const edge = edgeId('edge-only-edge');
  harness.kernel.transact((transaction) => {
    transaction.nodes.add({ id: first, type: 'task', position: { x: 0, y: 0 }, data: null });
    transaction.nodes.add({ id: second, type: 'task', position: { x: 10, y: 10 }, data: null });
    transaction.edges.add({
      id: edge,
      type: 'flow',
      source: { nodeId: first },
      target: { nodeId: second },
      data: null,
    });
  });
  harness.session.setSelection({ nodeIds: [], edgeIds: [edge] });

  await expect(harness.commands.execute(copySelectionToClipboardCommand, undefined)).resolves.toBeNull();
  expect(encoded).toBe(0);
  expect(writes).toBe(0);
  await harness.host.dispose();
});

test('History Undo removes a Paste and Redo restores only the Document', async () => {
  const clipboard = createTokenClipboard();
  const source = nodeId('history-source');
  const pasted = nodeId('history-pasted');
  const harness = await createHarness({
    transport: clipboard.transport,
    codec: clipboard.codec,
    materializeIds: ({ nodeIds }) => ({
      nodes: nodeIds.map((sourceId) => ({ sourceId, materializedId: pasted })),
      edges: [],
    }),
  });
  harness.kernel.transact((transaction) => {
    transaction.nodes.add({ id: source, type: 'task', position: { x: 0, y: 0 }, data: null });
  });
  harness.session.setSelection({ nodeIds: [source], edgeIds: [] });
  await harness.commands.execute(copySelectionToClipboardCommand, undefined);
  await harness.commands.execute(pasteClipboardCommand, undefined);

  await harness.commands.execute(undoCommand, undefined);
  expect(harness.kernel.read().query.getNode(pasted)).toBeUndefined();
  expect(harness.session.getSnapshot().selection).toEqual({ nodeIds: [], edgeIds: [] });
  await harness.commands.execute(redoCommand, undefined);
  expect(harness.kernel.read().query.getNode(pasted)).toBeDefined();
  expect(harness.session.getSnapshot().selection).toEqual({ nodeIds: [], edgeIds: [] });
  await harness.host.dispose();
});

test('Paste rejects a missing external parent immediately before commit', async () => {
  const clipboard = createTokenClipboard();
  const parent = nodeId('external-parent');
  const child = nodeId('external-child');
  const pasted = nodeId('external-child-copy');
  const harness = await createHarness({
    transport: clipboard.transport,
    codec: clipboard.codec,
    materializeIds: ({ nodeIds }) => ({
      nodes: nodeIds.map((sourceId) => ({ sourceId, materializedId: pasted })),
      edges: [],
    }),
  });
  harness.kernel.transact((transaction) => {
    transaction.nodes.add({ id: parent, type: 'group', position: { x: 0, y: 0 }, data: null });
    transaction.nodes.add({ id: child, type: 'task', position: { x: 10, y: 10 }, parentId: parent, data: null });
  });
  harness.session.setSelection({ nodeIds: [child], edgeIds: [] });
  await harness.commands.execute(copySelectionToClipboardCommand, undefined);
  harness.kernel.transact((transaction) => {
    transaction.nodes.remove(child);
    transaction.nodes.remove(parent);
  });
  const revision = harness.kernel.read().snapshot.revision;

  await expect(harness.commands.execute(pasteClipboardCommand, undefined)).rejects.toMatchObject({
    domain: 'plugin.clipboard',
    code: 'TARGET_CONFLICT',
  });
  expect(harness.kernel.read().snapshot.revision).toBe(revision);
  expect(harness.kernel.read().query.getNode(pasted)).toBeUndefined();
  await harness.host.dispose();
});

test('Paste preserves its Commit but rejects when a newer Selection wins', async () => {
  const clipboard = createTokenClipboard();
  const source = nodeId('selection-race-source');
  const other = nodeId('selection-race-other');
  const pasted = nodeId('selection-race-pasted');
  const harness = await createHarness({
    transport: clipboard.transport,
    codec: clipboard.codec,
    materializeIds: ({ nodeIds }) => ({
      nodes: nodeIds.map((sourceId) => ({ sourceId, materializedId: pasted })),
      edges: [],
    }),
  });
  harness.kernel.transact((transaction) => {
    transaction.nodes.add({ id: source, type: 'task', position: { x: 0, y: 0 }, data: null });
    transaction.nodes.add({ id: other, type: 'task', position: { x: 100, y: 100 }, data: null });
  });
  harness.session.setSelection({ nodeIds: [source], edgeIds: [] });
  await harness.commands.execute(copySelectionToClipboardCommand, undefined);
  const stop = harness.kernel.observeCommits((commit) => {
    if (commit.changeSet.commandId === pasteClipboardCommand.id) {
      harness.session.setSelection({ nodeIds: [other], edgeIds: [] });
    }
  });

  await expect(harness.commands.execute(pasteClipboardCommand, undefined)).rejects.toMatchObject({
    domain: 'plugin.clipboard',
    code: 'SELECTION_UPDATE_FAILED',
    details: { committedRevision: 2 },
  });
  expect(harness.kernel.read().query.getNode(pasted)).toBeDefined();
  expect(harness.session.getSnapshot().selection).toEqual({ nodeIds: [other], edgeIds: [] });
  stop();
  await harness.host.dispose();
});

test('concurrent Paste Commands are independent and repeated Paste keeps one deterministic offset', async () => {
  let clipboardText = '';
  let fragment: CanvasFragment | undefined;
  const pendingReads: Array<(text: string) => void> = [];
  let nextId = 1;
  const source = nodeId('concurrent-source');
  const harness = await createHarness({
    transport: {
      readText() {
        return new Promise<string>((resolve) => pendingReads.push(resolve));
      },
      async writeText(text) {
        clipboardText = text;
      },
    },
    codec: {
      encode(value) {
        fragment = value;
        return 'concurrent-fragment';
      },
      decode(text) {
        if (text !== clipboardText) throw new Error('Unexpected concurrent Clipboard text.');
        return fragment;
      },
    },
    materializeIds: ({ nodeIds }) => {
      const materializedId = nodeId(`concurrent-paste-${nextId}`);
      nextId += 1;
      return {
        nodes: nodeIds.map((sourceId) => ({ sourceId, materializedId })),
        edges: [],
      };
    },
  });
  harness.kernel.transact((transaction) => {
    transaction.nodes.add({ id: source, type: 'task', position: { x: 5, y: 7 }, data: null });
  });
  harness.session.setSelection({ nodeIds: [source], edgeIds: [] });
  await harness.commands.execute(copySelectionToClipboardCommand, undefined);

  const firstPaste = harness.commands.execute(pasteClipboardCommand, undefined);
  const secondPaste = harness.commands.execute(pasteClipboardCommand, undefined);
  expect(pendingReads).toHaveLength(2);
  pendingReads[1]?.(clipboardText);
  await expect(secondPaste).resolves.toMatchObject({ changeSet: { revision: 2 } });
  pendingReads[0]?.(clipboardText);
  await expect(firstPaste).resolves.toMatchObject({ changeSet: { revision: 3 } });
  expect(harness.kernel.read().query.getNode(nodeId('concurrent-paste-1'))?.position).toEqual({ x: 29, y: 31 });
  expect(harness.kernel.read().query.getNode(nodeId('concurrent-paste-2'))?.position).toEqual({ x: 29, y: 31 });
  await harness.host.dispose();
});

interface Harness {
  readonly host: PluginHost;
  readonly commands: CommandService;
  readonly kernel: KernelService;
  readonly session: SessionService;
}

async function createHarness(options: {
  readonly transport: ClipboardTextTransport;
  readonly codec: CanvasFragmentTextCodec;
  readonly materializeIds?: ClipboardIdMaterializer;
}): Promise<Harness> {
  let commands: CommandService | undefined;
  let kernel: KernelService | undefined;
  let session: SessionService | undefined;
  const consumer = definePlugin({
    requires: { commands: commandService, kernel: kernelService, session: sessionService },
    setup(context) {
      commands = context.services.commands;
      kernel = context.services.kernel;
      session = context.services.session;
    },
  });
  const host = createPluginHost();
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    host.install(historyPlugin),
    host.install(
      createClipboardPlugin({
        transport: options.transport,
        codec: options.codec,
        materializeIds: options.materializeIds ?? (() => ({ nodes: [], edges: [] })),
      }),
    ),
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!commands || !kernel || !session) throw new Error('Expected Clipboard behavior Runtime Services.');
  return { host, commands, kernel, session };
}

function createTokenClipboard(): {
  readonly transport: ClipboardTextTransport;
  readonly codec: CanvasFragmentTextCodec;
} {
  let text = '';
  let sequence = 0;
  const fragments = new Map<string, CanvasFragment>();
  return {
    transport: {
      async readText() {
        return text;
      },
      async writeText(value) {
        text = value;
      },
    },
    codec: {
      encode(fragment) {
        const token = `nodebraid:test:${sequence}`;
        sequence += 1;
        fragments.set(token, fragment);
        return token;
      },
      decode(value) {
        return fragments.get(value);
      },
    },
  };
}
