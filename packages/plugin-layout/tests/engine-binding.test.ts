import { expect, test } from 'bun:test';

import { nodeId } from '@nodebraid/kernel';
import type { LayoutEngine } from '@nodebraid/layout-api';
import { commandPlugin, commandService, defineCommand, type CommandService } from '@nodebraid/plugin-command';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

import { createLayoutPlugin, type LayoutCommandInput, type LayoutCommandResult } from '../src';

type Configuration = Record<string, never>;

for (const substitution of ['during capability validation', 'after Plugin creation'] as const) {
  test(`Layout keeps its concrete Engine when options change ${substitution}`, async () => {
    let capabilitiesRead = false;
    let engineReads = 0;
    let firstCalls = 0;
    let secondCalls = 0;
    const first: LayoutEngine<Configuration> = {
      id: 'first-capable',
      get capabilities() {
        capabilitiesRead = true;
        return { incremental: true, fixedNodes: true, selfLoops: true };
      },
      async compute(input) {
        expect(this).toBe(first);
        firstCalls++;
        return {
          sourceRevision: input.revision,
          positions: input.nodes.map((node) => ({ id: node.id, position: { x: 10, y: 20 } })),
        };
      },
    };
    const second: LayoutEngine<Configuration> = {
      id: 'second-unsupported',
      capabilities: { incremental: false, fixedNodes: false, selfLoops: false },
      async compute(input) {
        secondCalls++;
        return {
          sourceRevision: input.revision,
          positions: input.nodes.map((node) => ({ id: node.id, position: { x: 100, y: 200 } })),
        };
      },
    };
    let current = first;
    const command = defineCommand<LayoutCommandInput<Configuration>, LayoutCommandResult>('layout.engine-binding');
    const plugin = createLayoutPlugin({
      command,
      get engine() {
        engineReads++;
        return substitution === 'during capability validation' && capabilitiesRead ? second : current;
      },
    });
    if (substitution === 'after Plugin creation') current = second;
    let kernel: KernelService | undefined;
    let commands: CommandService | undefined;
    const consumer = definePlugin({
      requires: { kernel: kernelService, commands: commandService },
      setup(context) {
        kernel = context.services.kernel;
        commands = context.services.commands;
      },
    });
    const host = createPluginHost();
    const provider = host.install(kernelPlugin);
    const commandInstallation = host.install(commandPlugin);
    const layoutInstallation = host.install(plugin);
    const consumerInstallation = host.install(consumer);
    try {
      await Promise.all(
        [provider, commandInstallation, layoutInstallation, consumerInstallation].map((installation) =>
          installation.whenActive(),
        ),
      );
      if (!kernel || !commands) throw new Error('Expected public Layout binding services.');
      const id = nodeId('task');
      kernel.transact((transaction) => {
        transaction.nodes.add({
          id,
          type: 'task',
          position: { x: 0, y: 0 },
          size: { width: 80, height: 40 },
          data: null,
        });
      });
      await commands.execute(command, { mode: 'incremental', fixedNodeIds: [], config: {} });

      expect(secondCalls).toBe(0);
      expect(firstCalls).toBe(1);
      expect(kernel.read().query.getNode(id)?.position).toEqual({ x: 10, y: 20 });
      expect(engineReads).toBe(1);

      await provider.dispose();
      expect(layoutInstallation.getSnapshot().status).toBe('pending');
      const nextConsumerActivation = consumerInstallation.whenActive();
      const replacement = host.install(kernelPlugin);
      await Promise.all([replacement.whenActive(), layoutInstallation.whenActive(), nextConsumerActivation]);
      kernel.transact((transaction) => {
        transaction.nodes.add({
          id,
          type: 'task',
          position: { x: 0, y: 0 },
          size: { width: 80, height: 40 },
          data: null,
        });
      });
      await commands.execute(command, { mode: 'incremental', fixedNodeIds: [], config: {} });

      expect(firstCalls).toBe(2);
      expect(secondCalls).toBe(0);
      expect(kernel.read().query.getNode(id)?.position).toEqual({ x: 10, y: 20 });
      expect(engineReads).toBe(1);
    } finally {
      await host.dispose();
    }
  });
}

test('Layout preserves the original Engine option read failure at creation', () => {
  const command = defineCommand<LayoutCommandInput<Configuration>, LayoutCommandResult>('layout.read-failure');
  const failure = { source: 'caller-owned Engine getter' };
  let reads = 0;
  const options = {
    command,
    get engine(): LayoutEngine<Configuration> {
      reads++;
      expect(this).toBe(options);
      throw failure;
    },
  };
  let received: unknown;
  try {
    createLayoutPlugin(options);
  } catch (error) {
    received = error;
  }

  expect(received).toBe(failure);
  expect(reads).toBe(1);
});
