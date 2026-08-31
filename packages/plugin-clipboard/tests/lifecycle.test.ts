import { expect, test } from 'bun:test';

import { commandPlugin, commandService, type CommandService } from '@nodebraid/plugin-command';
import { kernelPlugin } from '@nodebraid/plugin-kernel';
import { sessionPlugin } from '@nodebraid/plugin-session';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

import { createClipboardPlugin, pasteClipboardCommand } from '../src';

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
