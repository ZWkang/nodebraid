import { expect, test } from 'bun:test';

import { commandPlugin, commandService, type CommandService } from '@nodebraid/plugin-command';
import { nodeId } from '@nodebraid/kernel';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { sessionPlugin, sessionService, type SessionService } from '@nodebraid/plugin-session';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

import {
  copySelectionToClipboardCommand,
  createClipboardPlugin,
  pasteClipboardCommand,
  type ClipboardIdMaterializer,
} from '../src';

test('Clipboard disposal aborts and awaits an in-flight external read without residual registrations', async () => {
  let commands: CommandService | undefined;
  let readStarted = false;
  let readAborted = false;
  const consumer = definePlugin({
    requires: { commands: commandService },
    setup(context) {
      commands = context.services.commands;
    },
  });
  const host = createPluginHost();
  const clipboard = host.install(
    createClipboardPlugin({
      transport: {
        readText(signal) {
          readStarted = true;
          return new Promise<string>((_resolve, reject) => {
            signal.addEventListener(
              'abort',
              () => {
                readAborted = true;
                reject(signal.reason);
              },
              { once: true },
            );
          });
        },
        async writeText() {},
      },
      codec: { encode: () => '', decode: () => undefined },
      materializeIds: () => ({ nodes: [], edges: [] }),
    }),
  );
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    clipboard,
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!commands) throw new Error('Expected Clipboard lifecycle Command Service.');
  const execution = commands.execute(pasteClipboardCommand, undefined);
  expect(readStarted).toBeTrue();

  let disposed = false;
  const disposal = clipboard.dispose().then(() => {
    disposed = true;
  });
  await Promise.resolve();
  expect(readAborted).toBeTrue();
  await expect(execution).rejects.toBeInstanceOf(DOMException);
  await disposal;
  expect(disposed).toBeTrue();
  await expect(commands.execute(pasteClipboardCommand, undefined)).rejects.toMatchObject({
    code: 'COMMAND_NOT_FOUND',
  });
  await host.dispose();
});

test('caller cancellation keeps its reason and dependency recovery creates fresh Clipboard registrations', async () => {
  const cancellationReason = new Error('caller cancelled Clipboard read');
  let commands: CommandService | undefined;
  let kernel: KernelService | undefined;
  const sessions: SessionService[] = [];
  let clipboardText = '';
  let fragment: unknown;
  const source = nodeId('reactivation-source');
  const pasted = nodeId('reactivation-pasted');
  const consumer = definePlugin({
    requires: { commands: commandService, kernel: kernelService, session: sessionService },
    setup(context) {
      commands = context.services.commands;
      kernel = context.services.kernel;
      sessions.push(context.services.session);
    },
  });
  let blockRead = true;
  let readCalls = 0;
  let settleRead: ((text: string) => void) | undefined;
  let materializerReads = 0;
  const clipboardPlugin = createClipboardPlugin({
    transport: {
      readText(signal) {
        readCalls += 1;
        if (!blockRead) return Promise.resolve(clipboardText);
        return new Promise<string>((resolve, reject) => {
          settleRead = resolve;
          signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        });
      },
      async writeText(text) {
        clipboardText = text;
      },
    },
    codec: {
      encode(value) {
        fragment = value;
        return 'reactivation-fragment';
      },
      decode() {
        return fragment;
      },
    },
    get materializeIds(): ClipboardIdMaterializer {
      materializerReads += 1;
      if (materializerReads !== 1) throw new Error('Clipboard configuration must be captured once.');
      return ({ nodeIds }) => ({
        nodes: nodeIds.map((sourceId) => ({ sourceId, materializedId: pasted })),
        edges: [],
      });
    },
  });
  const host = createPluginHost();
  const sessionInstallation = host.install(sessionPlugin);
  const clipboard = host.install(clipboardPlugin);
  const consumerInstallation = host.install(consumer);
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    sessionInstallation,
    clipboard,
    consumerInstallation,
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!commands || !kernel || !sessions[0]) throw new Error('Expected Clipboard cancellation Runtime Services.');
  kernel.transact((transaction) => {
    transaction.nodes.add({ id: source, type: 'task', position: { x: 0, y: 0 }, data: null });
  });
  sessions[0].setSelection({ nodeIds: [source], edgeIds: [] });

  const beforeIoReason = new Error('cancelled before Clipboard read');
  const beforeIoController = new AbortController();
  beforeIoController.abort(beforeIoReason);
  await expect(commands.execute(pasteClipboardCommand, undefined, { signal: beforeIoController.signal })).rejects.toBe(
    beforeIoReason,
  );
  expect(readCalls).toBe(0);

  const afterIoReason = new Error('cancelled after Clipboard read settled');
  const afterIoController = new AbortController();
  const afterIo = commands.execute(pasteClipboardCommand, undefined, { signal: afterIoController.signal });
  expect(readCalls).toBe(1);
  settleRead?.(clipboardText);
  afterIoController.abort(afterIoReason);
  await expect(afterIo).rejects.toBe(afterIoReason);

  const controller = new AbortController();
  const cancelled = commands.execute(pasteClipboardCommand, undefined, { signal: controller.signal });
  expect(readCalls).toBe(2);
  controller.abort(cancellationReason);
  await expect(cancelled).rejects.toBe(cancellationReason);

  await sessionInstallation.dispose();
  expect(clipboard.getSnapshot().status).toBe('pending');
  await expect(commands.execute(pasteClipboardCommand, undefined)).rejects.toMatchObject({ code: 'COMMAND_NOT_FOUND' });
  const replacementSession = host.install(sessionPlugin);
  await Promise.all([replacementSession.whenActive(), clipboard.whenActive(), consumerInstallation.whenActive()]);
  const currentSession = sessions.at(-1);
  if (!currentSession) throw new Error('Expected replacement Clipboard Session.');
  currentSession.setSelection({ nodeIds: [source], edgeIds: [] });
  await commands.execute(copySelectionToClipboardCommand, undefined);
  blockRead = false;
  await expect(commands.execute(pasteClipboardCommand, undefined)).resolves.toMatchObject({
    changeSet: { commandId: pasteClipboardCommand.id },
  });
  expect(currentSession.getSnapshot().selection).toEqual({ nodeIds: [pasted], edgeIds: [] });
  expect(materializerReads).toBe(1);
  await host.dispose();
});
