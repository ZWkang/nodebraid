import { expect, test } from 'bun:test';

import { nodeId, type CanvasCommit } from '@cflow/kernel';
import { defineLayoutEngine } from '@cflow/layout-api';
import { commandPlugin, commandService, defineCommand, type CommandService } from '@cflow/plugin-command';
import { kernelPlugin, kernelService, type KernelService } from '@cflow/plugin-kernel';
import { createPluginHost, definePlugin } from '@cflow/runtime-cordis';

import { createLayoutPlugin, type LayoutCommandInput } from '../src';

test('a typed Layout Command commits all Node positions in one Canvas Commit', async () => {
  const alphaId = nodeId('alpha');
  const betaId = nodeId('beta');
  const layout = defineCommand<LayoutCommandInput<{ gap: number }>, CanvasCommit | null>('layout.test');
  const engine = defineLayoutEngine<{ gap: number }>({
    id: 'test',
    capabilities: { incremental: false, fixedNodes: false, selfLoops: false },
    compute(input, config) {
      return {
        sourceRevision: input.revision,
        positions: input.nodes.map((node, index) => ({
          id: node.id,
          position: { x: index * config.gap, y: 100 },
        })),
      };
    },
  });
  const layoutPlugin = createLayoutPlugin({ engine, command: layout });
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
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(layoutPlugin),
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!kernel || !commands) throw new Error('Expected Runtime Services to activate.');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: betaId,
      type: 'task',
      position: { x: 50, y: 0 },
      size: { width: 80, height: 40 },
      data: null,
    });
    transaction.nodes.add({
      id: alphaId,
      type: 'task',
      position: { x: 25, y: 0 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });

  const commit = await commands.execute(layout, { mode: 'full', fixedNodeIds: [], config: { gap: 200 } });

  expect({
    metadata: commit && {
      beforeRevision: commit.changeSet.beforeRevision,
      revision: commit.changeSet.revision,
      origin: commit.changeSet.origin,
      commandId: commit.changeSet.commandId,
      changeCount: commit.changeSet.changes.length,
    },
    positions: kernel.read().snapshot.nodes.map((node) => ({ id: node.id, position: node.position })),
  }).toEqual({
    metadata: {
      beforeRevision: 1,
      revision: 2,
      origin: 'layout',
      commandId: 'layout.test',
      changeCount: 2,
    },
    positions: [
      { id: alphaId, position: { x: 0, y: 100 } },
      { id: betaId, position: { x: 200, y: 100 } },
    ],
  });

  await host.dispose();
});
