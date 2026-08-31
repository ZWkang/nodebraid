import { expect, test } from 'bun:test';

import { nodeId } from '@nodebraid/kernel';
import { commandPlugin, commandService, type CommandService } from '@nodebraid/plugin-command';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { sessionPlugin, sessionService, type SessionService } from '@nodebraid/plugin-session';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

import {
  copySelectionToClipboardCommand,
  createClipboardPlugin,
  pasteClipboardCommand,
  type CreateClipboardPluginOptions,
} from '../src';

test('Clipboard external transport and codec failures keep stable identities and original causes', async () => {
  const encodeFailure = new Error('encode failed');
  const encodeHarness = await createHarness({
    transport: { readText: async () => '', writeText: async () => undefined },
    codec: {
      encode() {
        throw encodeFailure;
      },
      decode: () => undefined,
    },
    materializeIds: () => ({ nodes: [], edges: [] }),
  });
  await expect(encodeHarness.commands.execute(copySelectionToClipboardCommand, undefined)).rejects.toMatchObject({
    domain: 'plugin.clipboard',
    code: 'CODEC_ENCODE_FAILED',
    cause: encodeFailure,
  });
  await encodeHarness.host.dispose();

  const readFailure = new DOMException('denied', 'NotAllowedError');
  const readHarness = await createHarness({
    transport: {
      readText: async () => {
        throw readFailure;
      },
      writeText: async () => undefined,
    },
    codec: { encode: () => '', decode: () => undefined },
    materializeIds: () => ({ nodes: [], edges: [] }),
  });
  await expect(readHarness.commands.execute(pasteClipboardCommand, undefined)).rejects.toMatchObject({
    domain: 'plugin.clipboard',
    code: 'TRANSPORT_READ_FAILED',
    cause: readFailure,
  });
  await readHarness.host.dispose();

  const writeFailure = new DOMException('write denied', 'NotAllowedError');
  const writeHarness = await createHarness({
    transport: {
      readText: async () => '',
      writeText: async () => {
        throw writeFailure;
      },
    },
    codec: { encode: () => 'fragment', decode: () => undefined },
    materializeIds: () => ({ nodes: [], edges: [] }),
  });
  await expect(writeHarness.commands.execute(copySelectionToClipboardCommand, undefined)).rejects.toMatchObject({
    domain: 'plugin.clipboard',
    code: 'TRANSPORT_WRITE_FAILED',
    cause: writeFailure,
  });
  await writeHarness.host.dispose();

  const decodeFailure = new Error('decode failed');
  const decodeHarness = await createHarness({
    transport: { readText: async () => 'fragment', writeText: async () => undefined },
    codec: {
      encode: () => '',
      decode() {
        throw decodeFailure;
      },
    },
    materializeIds: () => ({ nodes: [], edges: [] }),
  });
  await expect(decodeHarness.commands.execute(pasteClipboardCommand, undefined)).rejects.toMatchObject({
    domain: 'plugin.clipboard',
    code: 'CODEC_DECODE_FAILED',
    cause: decodeFailure,
  });
  await decodeHarness.host.dispose();
});

test('Paste rejects foreign decoded values and incomplete mapping without a Commit', async () => {
  const emptyClipboardHarness = await createHarness({
    transport: { readText: async () => '', writeText: async () => undefined },
    codec: { encode: () => '', decode: (text) => JSON.parse(text) },
    materializeIds: () => ({ nodes: [], edges: [] }),
  });
  await expect(emptyClipboardHarness.commands.execute(pasteClipboardCommand, undefined)).rejects.toMatchObject({
    domain: 'plugin.clipboard',
    code: 'CODEC_DECODE_FAILED',
    cause: expect.objectContaining({ name: 'SyntaxError' }),
  });
  await emptyClipboardHarness.host.dispose();

  const emptyFragmentHarness = await createHarness({
    transport: { readText: async () => 'empty-fragment', writeText: async () => undefined },
    codec: {
      encode: () => '',
      decode: () => ({
        type: 'nodebraid.canvas-fragment',
        nodes: [],
        edges: [],
        selection: { nodeIds: [], edgeIds: [] },
      }),
    },
    materializeIds: () => ({ nodes: [], edges: [] }),
  });
  await expect(emptyFragmentHarness.commands.execute(pasteClipboardCommand, undefined)).rejects.toMatchObject({
    domain: 'plugin.clipboard',
    code: 'INVALID_FRAGMENT',
  });
  await emptyFragmentHarness.host.dispose();

  const invalidHarness = await createHarness({
    transport: { readText: async () => 'foreign', writeText: async () => undefined },
    codec: { encode: () => '', decode: () => ({ type: 'foreign' }) },
    materializeIds: () => ({ nodes: [], edges: [] }),
  });
  const revision = invalidHarness.kernel.read().snapshot.revision;
  await expect(invalidHarness.commands.execute(pasteClipboardCommand, undefined)).rejects.toMatchObject({
    domain: 'plugin.clipboard',
    code: 'INVALID_FRAGMENT',
  });
  expect(invalidHarness.kernel.read().snapshot.revision).toBe(revision);
  await invalidHarness.host.dispose();

  const source = nodeId('mapping-source');
  const fragment = {
    type: 'nodebraid.canvas-fragment' as const,
    nodes: [{ id: source, type: 'task', position: { x: 0, y: 0 }, data: null }],
    edges: [],
    selection: { nodeIds: [source], edgeIds: [] },
  };
  const mappingHarness = await createHarness({
    transport: { readText: async () => 'fragment', writeText: async () => undefined },
    codec: { encode: () => '', decode: () => fragment },
    materializeIds: () => ({ nodes: [], edges: [] }),
  });
  const mappingRevision = mappingHarness.kernel.read().snapshot.revision;
  await expect(mappingHarness.commands.execute(pasteClipboardCommand, undefined)).rejects.toMatchObject({
    domain: 'plugin.clipboard',
    code: 'INVALID_MATERIALIZATION',
  });
  expect(mappingHarness.kernel.read().snapshot.revision).toBe(mappingRevision);
  await mappingHarness.host.dispose();
});

test('Paste wraps a Kernel validation rejection as COMMIT_FAILED without partial state', async () => {
  const source = nodeId('overflow-source');
  const pasted = nodeId('overflow-pasted');
  const fragment = {
    type: 'nodebraid.canvas-fragment' as const,
    nodes: [{ id: source, type: 'task', position: { x: Number.MAX_VALUE, y: 0 }, data: null }],
    edges: [],
    selection: { nodeIds: [source], edgeIds: [] },
  };
  const harness = await createHarness({
    transport: { readText: async () => 'fragment', writeText: async () => undefined },
    codec: { encode: () => '', decode: () => fragment },
    materializeIds: () => ({ nodes: [{ sourceId: source, materializedId: pasted }], edges: [] }),
    offset: { x: Number.MAX_VALUE, y: 0 },
  });
  const revision = harness.kernel.read().snapshot.revision;

  await expect(harness.commands.execute(pasteClipboardCommand, undefined)).rejects.toMatchObject({
    domain: 'plugin.clipboard',
    code: 'COMMIT_FAILED',
    cause: expect.objectContaining({ domain: 'kernel', code: 'INVALID_GRAPH' }),
  });
  expect(harness.kernel.read().snapshot.revision).toBe(revision);
  expect(harness.kernel.read().query.getNode(pasted)).toBeUndefined();
  await harness.host.dispose();
});

async function createHarness(options: CreateClipboardPluginOptions): Promise<{
  readonly host: ReturnType<typeof createPluginHost>;
  readonly commands: CommandService;
  readonly kernel: KernelService;
}> {
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
    host.install(createClipboardPlugin(options)),
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!commands || !kernel || !session) throw new Error('Expected Clipboard failure Runtime Services.');
  const selected = nodeId('selected');
  kernel.transact((transaction) => {
    transaction.nodes.add({ id: selected, type: 'task', position: { x: 0, y: 0 }, data: null });
  });
  session.setSelection({ nodeIds: [selected], edgeIds: [] });
  return { host, commands, kernel };
}
