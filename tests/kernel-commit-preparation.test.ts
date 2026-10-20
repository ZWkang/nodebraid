import { expect, test } from 'bun:test';

import type { CanvasCommit } from '@nodebraid/kernel';
import { nodeId } from '@nodebraid/kernel';
import { commandPlugin, commandService, type CommandService } from '@nodebraid/plugin-command';
import { historyPlugin, historyService, undoCommand, type HistoryService } from '@nodebraid/plugin-history';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

test('failed Kernel commit preparation leaves no Observer or History revision gap', async () => {
  const faults: unknown[] = [];
  const host = createPluginHost({ diagnostics: { faultReporter: (fault) => faults.push(fault.error) } });
  let kernel!: KernelService;
  let history!: HistoryService;
  let commands!: CommandService;
  const consumer = definePlugin({
    requires: { kernel: kernelService, history: historyService, commands: commandService },
    setup(context) {
      kernel = context.services.kernel;
      history = context.services.history;
      commands = context.services.commands;
    },
  });
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(historyPlugin),
    host.install(consumer),
  ];

  try {
    await Promise.all(installations.map((installation) => installation.whenActive()));
    const before = kernel.read();
    const historyBefore = history.getSnapshot();
    const observed: CanvasCommit[] = [];
    const stop = kernel.observeCommits((commit) => observed.push(commit));
    const failure = new Error('metadata preparation failed');
    let caught: unknown;
    try {
      kernel.transact(
        (transaction) => {
          transaction.nodes.add({
            id: nodeId('failed'),
            type: 'task',
            position: { x: 0, y: 0 },
            data: null,
          });
        },
        {
          get origin(): string {
            throw failure;
          },
        },
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBe(failure);
    expect(kernel.read()).toBe(before);
    expect(history.getSnapshot()).toBe(historyBefore);
    expect(observed).toEqual([]);

    const commit = kernel.transact((transaction) => {
      transaction.nodes.add({
        id: nodeId('successful'),
        type: 'task',
        position: { x: 1, y: 1 },
        data: null,
      });
    });
    if (!commit) throw new Error('Expected the successful Transaction to produce a Commit.');
    expect(commit.changeSet.revision).toBe(1);
    expect(observed).toEqual([commit]);
    expect(history.getSnapshot()).toEqual({ canUndo: true, canRedo: false });
    const undo = await commands.execute(undoCommand, undefined);
    expect(undo.changeSet.revision).toBe(2);
    expect(kernel.read().snapshot.nodes).toEqual([]);
    expect(faults).toEqual([]);
    stop();
  } finally {
    await host.dispose();
  }
});
