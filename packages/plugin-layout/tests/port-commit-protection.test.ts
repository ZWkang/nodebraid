import { expect, test } from 'bun:test';

import { edgeId, nodeId } from '@nodebraid/kernel';
import { defineLayoutEngine, type LayoutError } from '@nodebraid/layout-api';
import { commandPlugin, commandService, defineCommand, type CommandService } from '@nodebraid/plugin-command';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

import { createLayoutPlugin, type LayoutCommandInput, type LayoutCommandResult } from '../src';

for (const interveningChange of ['Port Endpoint', 'Layout'] as const) {
  test(`a pending Port topology Layout preserves a newer ${interveningChange} commit`, async () => {
    const taskId = nodeId('task');
    const connectionId = edgeId('connection');
    const started = [Promise.withResolvers<void>(), Promise.withResolvers<void>()];
    const released = [Promise.withResolvers<void>(), Promise.withResolvers<void>()];
    let nextComputation = 0;
    const engine = defineLayoutEngine<{ x: number }>({
      id: 'controlled',
      capabilities: { incremental: false, fixedNodes: false, selfLoops: true },
      async compute(input, config) {
        const computation = nextComputation++;
        started[computation]!.resolve();
        await released[computation]!.promise;
        return {
          sourceRevision: input.revision,
          positions: [{ id: taskId, position: { x: config.x, y: 0 } }],
        };
      },
    });
    const command = defineCommand<LayoutCommandInput<{ x: number }>, LayoutCommandResult>('layout.controlled');
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
    try {
      await Promise.all(
        [
          host.install(kernelPlugin),
          host.install(commandPlugin),
          host.install(createLayoutPlugin({ engine, command })),
          host.install(consumer),
        ].map((installation) => installation.whenActive()),
      );
      if (!kernel || !commands) throw new Error('Expected Runtime Services to activate.');
      kernel.transact((transaction) => {
        transaction.nodes.add({
          id: taskId,
          type: 'task',
          position: { x: 0, y: 0 },
          size: { width: 80, height: 40 },
          data: null,
        });
        transaction.edges.add({
          id: connectionId,
          type: 'flow',
          source: { nodeId: taskId, portId: 'out' },
          target: { nodeId: taskId, portId: 'in' },
          data: null,
        });
      });
      const pending = commands
        .execute(command, { mode: 'full', fixedNodeIds: [], config: { x: 100 } })
        .catch((error: LayoutError) => error);
      await started[0]!.promise;
      if (interveningChange === 'Port Endpoint') {
        kernel.transact((transaction) => {
          const edge = transaction.query.getEdge(connectionId)!;
          transaction.edges.replace(connectionId, { ...edge, target: { nodeId: taskId, portId: 'new-input' } });
        });
      } else {
        const newer = commands.execute(command, { mode: 'full', fixedNodeIds: [], config: { x: 200 } });
        await started[1]!.promise;
        released[1]!.resolve();
        expect((await newer)?.after.query.getNode(taskId)?.position).toEqual({ x: 200, y: 0 });
      }
      const accepted = kernel.read();
      released[0]!.resolve();
      expect(await pending).toMatchObject({
        code: 'STALE_PROPOSAL',
        details: { sourceRevision: 1, currentRevision: 2 },
      });
      expect(kernel.read()).toBe(accepted);
      expect(accepted.query.getNode(taskId)?.position).toEqual({
        x: interveningChange === 'Port Endpoint' ? 0 : 200,
        y: 0,
      });
      expect(accepted.query.getEdge(connectionId)?.target.portId).toBe(
        interveningChange === 'Port Endpoint' ? 'new-input' : 'in',
      );
    } finally {
      for (const gate of released) gate.resolve();
      await host.dispose();
    }
  });
}
