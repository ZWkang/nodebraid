import { expect, test } from 'bun:test';

import { nodeId } from '@nodebraid/kernel';
import { commandPlugin, commandService, type CommandService } from '@nodebraid/plugin-command';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { sessionPlugin, sessionService, type SessionService } from '@nodebraid/plugin-session';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

import { createDuplicateSelectionPlugin, duplicateSelectionCommand } from '../src';

test('Duplicate Selection registration follows dependency loss, reactivation, and disposal', async () => {
  const sourceId = nodeId('lifecycle-source');
  const duplicateId = nodeId('lifecycle-duplicate');
  let commands: CommandService | undefined;
  let kernel: KernelService | undefined;
  const sessions: SessionService[] = [];
  const consumer = definePlugin({
    requires: { commands: commandService, kernel: kernelService, session: sessionService },
    setup(context) {
      commands = context.services.commands;
      kernel = context.services.kernel;
      sessions.push(context.services.session);
    },
  });
  const behaviorPlugin = createDuplicateSelectionPlugin({
    materializeIds: () => ({ nodes: [{ sourceId, duplicateId }], edges: [] }),
  });
  const host = createPluginHost();
  const sessionInstallation = host.install(sessionPlugin);
  const behavior = host.install(behaviorPlugin);
  const consumerInstallation = host.install(consumer);
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    sessionInstallation,
    behavior,
    consumerInstallation,
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!commands || !kernel || !sessions[0]) throw new Error('Expected Duplicate lifecycle Runtime Services.');
  kernel.transact((transaction) => {
    transaction.nodes.add({ id: sourceId, type: 'task', position: { x: 0, y: 0 }, data: null });
  });
  sessions[0].setSelection({ nodeIds: [sourceId], edgeIds: [] });

  await sessionInstallation.dispose();
  expect(behavior.getSnapshot().status).toBe('pending');
  await expect(commands.execute(duplicateSelectionCommand, undefined)).rejects.toMatchObject({
    domain: 'plugin.command',
    code: 'COMMAND_NOT_FOUND',
  });

  const replacementSession = host.install(sessionPlugin);
  await Promise.all([replacementSession.whenActive(), behavior.whenActive(), consumerInstallation.whenActive()]);
  const currentSession = sessions.at(-1);
  if (!currentSession) throw new Error('Expected replacement Session.');
  currentSession.setSelection({ nodeIds: [sourceId], edgeIds: [] });
  await expect(commands.execute(duplicateSelectionCommand, undefined)).resolves.toMatchObject({
    changeSet: { commandId: duplicateSelectionCommand.id },
  });
  expect(currentSession.getSnapshot().selection).toEqual({ nodeIds: [duplicateId], edgeIds: [] });

  await behavior.dispose();
  await expect(commands.execute(duplicateSelectionCommand, undefined)).rejects.toMatchObject({
    code: 'COMMAND_NOT_FOUND',
  });
  await host.dispose();
});
