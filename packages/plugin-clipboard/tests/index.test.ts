import { expect, test } from 'bun:test';

import type { CanvasFragment } from '@nodebraid/canvas-fragment';
import { edgeId, nodeId } from '@nodebraid/kernel';
import { commandPlugin, commandService, type CommandService } from '@nodebraid/plugin-command';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { sessionPlugin, sessionService, type SessionService } from '@nodebraid/plugin-session';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

import {
  copySelectionToClipboardCommand,
  createClipboardPlugin,
  pasteClipboardCommand,
  type CanvasFragmentTextCodec,
  type ClipboardTextTransport,
} from '../src';

test('Copy captures one committed selected-node Fragment before writing text', async () => {
  let clipboardText = '';
  let encoded: CanvasFragment | undefined;
  const transport: ClipboardTextTransport = {
    async readText() {
      return clipboardText;
    },
    async writeText(text) {
      clipboardText = text;
    },
  };
  const codec: CanvasFragmentTextCodec = {
    encode(fragment) {
      encoded = fragment;
      return 'nodebraid:test-fragment';
    },
    decode() {
      if (!encoded) throw new Error('No encoded Fragment.');
      return encoded;
    },
  };
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
    host.install(
      createClipboardPlugin({
        transport,
        codec,
        materializeIds: () => ({ nodes: [], edges: [] }),
      }),
    ),
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!commands || !kernel || !session) throw new Error('Expected Clipboard test Runtime Services.');
  const first = nodeId('copy-a');
  const second = nodeId('copy-b');
  const connection = edgeId('copy-edge');
  kernel.transact((transaction) => {
    transaction.nodes.add({ id: second, type: 'task', position: { x: 20, y: 20 }, data: null });
    transaction.nodes.add({ id: first, type: 'task', position: { x: 0, y: 0 }, data: null });
    transaction.edges.add({
      id: connection,
      type: 'flow',
      source: { nodeId: first },
      target: { nodeId: second },
      data: null,
    });
  });
  session.setSelection({ nodeIds: [second, first], edgeIds: [] });

  const fragment = await commands.execute(copySelectionToClipboardCommand, undefined);
  if (!fragment) throw new Error('Expected Copy to return a Canvas Fragment.');

  expect(clipboardText).toBe('nodebraid:test-fragment');
  expect(fragment.nodes.map((node) => node.id)).toEqual([first, second]);
  expect(fragment.edges.map((edge) => edge.id)).toEqual([connection]);
  expect(fragment.selection).toEqual({ nodeIds: [first, second], edgeIds: [] });
  expect(encoded).toBe(fragment);
  await host.dispose();
});

test('Paste reads, validates, materializes, commits once, and selects the pasted Fragment', async () => {
  let clipboardText = '';
  const encodedFragments = new Map<string, CanvasFragment>();
  let sequence = 0;
  const transport: ClipboardTextTransport = {
    async readText() {
      return clipboardText;
    },
    async writeText(text) {
      clipboardText = text;
    },
  };
  const codec: CanvasFragmentTextCodec = {
    encode(fragment) {
      const text = `nodebraid:test-fragment:${sequence}`;
      sequence += 1;
      encodedFragments.set(text, fragment);
      return text;
    },
    decode(text) {
      return encodedFragments.get(text);
    },
  };
  const first = nodeId('paste-a');
  const second = nodeId('paste-b');
  const connection = edgeId('paste-edge');
  const firstCopy = nodeId('paste-a-copy');
  const secondCopy = nodeId('paste-b-copy');
  const connectionCopy = edgeId('paste-edge-copy');
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
    host.install(
      createClipboardPlugin({
        transport,
        codec,
        materializeIds: ({ nodeIds, edgeIds }) => ({
          nodes: nodeIds.map((sourceId) => ({
            sourceId,
            materializedId: sourceId === first ? firstCopy : secondCopy,
          })),
          edges: edgeIds.map((sourceId) => ({ sourceId, materializedId: connectionCopy })),
        }),
      }),
    ),
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!commands || !kernel || !session) throw new Error('Expected Clipboard Paste Runtime Services.');
  kernel.transact((transaction) => {
    transaction.nodes.add({ id: first, type: 'task', position: { x: 0, y: 0 }, data: null });
    transaction.nodes.add({ id: second, type: 'task', position: { x: 20, y: 20 }, data: null });
    transaction.edges.add({
      id: connection,
      type: 'flow',
      source: { nodeId: first, portId: 'out' },
      target: { nodeId: second, portId: 'in' },
      data: null,
    });
  });
  session.setSelection({ nodeIds: [first, second], edgeIds: [connection] });
  await commands.execute(copySelectionToClipboardCommand, undefined);

  const commit = await commands.execute(pasteClipboardCommand, undefined);

  expect(commit.changeSet).toMatchObject({ beforeRevision: 1, revision: 2, commandId: 'clipboard.paste' });
  expect(kernel.read().query.getNode(firstCopy)?.position).toEqual({ x: 24, y: 24 });
  expect(kernel.read().query.getEdge(connectionCopy)).toMatchObject({
    source: { nodeId: firstCopy, portId: 'out' },
    target: { nodeId: secondCopy, portId: 'in' },
  });
  expect(session.getSnapshot().selection).toEqual({
    nodeIds: [firstCopy, secondCopy],
    edgeIds: [connectionCopy],
  });
  await host.dispose();
});
