import { expect, test } from 'bun:test';

import {
  commandPlugin,
  commandService,
  createLayoutPlugin,
  createPluginHost,
  defineCommand,
  definePlugin,
  kernelPlugin,
  kernelService,
  nodeId,
  type CommandService,
  type KernelService,
  type LayoutCommandInput,
  type LayoutCommandResult,
  type LayoutEngine,
  type NodeId,
} from '@cflow/core';
import { dagreLayoutEngine, type DagreLayoutConfig } from '@cflow/layout-dagre';
import { elkLayoutEngine, type ElkLayoutConfig } from '@cflow/layout-elk';

test('Dagre and ELK compose with Provider-specific typed Runtime Commands', async () => {
  const dagre = await runProvider(dagreLayoutEngine, { direction: 'LR', rankSpacing: 50 } satisfies DagreLayoutConfig);
  const elk = await runProvider(
    elkLayoutEngine,
    { algorithm: 'stress', padding: 0, randomSeed: 1 } satisfies ElkLayoutConfig,
    true,
  );

  expect({ dagre, elk }).toEqual({
    dagre: {
      commandId: 'layout.dagre',
      revision: 2,
      fixedPositions: [],
    },
    elk: {
      commandId: 'layout.elk',
      revision: 2,
      fixedPositions: [
        { id: nodeId('left'), position: { x: 100, y: 100 } },
        { id: nodeId('right'), position: { x: 400, y: 100 } },
      ],
    },
  });
});

async function runProvider<Config>(engine: LayoutEngine<Config>, config: Config, useFixedNodes = false) {
  const leftId = nodeId('left');
  const middleId = nodeId('middle');
  const rightId = nodeId('right');
  const command = defineCommand<LayoutCommandInput<Config>, LayoutCommandResult>(`layout.${engine.id}`);
  const layoutPlugin = createLayoutPlugin({ engine, command });
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
    for (const [id, position] of [
      [leftId, { x: 100, y: 100 }],
      [middleId, { x: 250, y: 260 }],
      [rightId, { x: 400, y: 100 }],
    ] as const) {
      transaction.nodes.add({
        id,
        type: 'task',
        position,
        size: { width: 80, height: 40 },
        data: null,
      });
    }
  });
  const fixedNodeIds: readonly NodeId[] = useFixedNodes ? [leftId, rightId] : [];
  const request: LayoutCommandInput<Config> = { mode: 'full', fixedNodeIds, config };
  const commit = await commands.execute(command, request);
  const fixedPositions = fixedNodeIds.map((id) => ({ id, position: kernel!.read().query.getNode(id)?.position }));
  const result = {
    commandId: commit?.changeSet.commandId,
    revision: kernel.read().snapshot.revision,
    fixedPositions,
  };
  await host.dispose();
  return result;
}
