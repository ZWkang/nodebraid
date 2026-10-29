import { expect, test } from 'bun:test';

import { nodeId } from '@nodebraid/kernel';
import { commandService, type CommandService } from '@nodebraid/plugin-command';
import { nodePlacementService, type NodePlacementService } from '@nodebraid/plugin-interaction';
import { kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { createNodeCommand, updateNodeDataCommand } from '@nodebraid/plugin-node-editing';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

import { createBasicCanvasPlugin } from '../src';
import { TestCanvasRenderer } from './test-renderer';

test('Basic readiness includes Node editing Commands and one-shot placement', async () => {
  const host = createPluginHost();
  const composition = host.install(
    createBasicCanvasPlugin(() => new TestCanvasRenderer()),
    undefined,
  );
  let services: { commands: CommandService; kernel: KernelService; placement: NodePlacementService } | undefined;
  const consumer = host.install(
    definePlugin({
      requires: { commands: commandService, kernel: kernelService, placement: nodePlacementService },
      setup(context) {
        services = context.services;
      },
    }),
  );
  try {
    await Promise.all([composition.whenActive(), consumer.whenActive()]);
    if (!services) throw new Error('Expected Basic Canvas services.');
    const { kernel, commands, placement } = services;
    await commands.execute(createNodeCommand, {
      node: {
        id: nodeId('created'),
        type: 'card',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 50 },
        data: null,
      },
    });
    const expectedNode = kernel.read().query.getNode(nodeId('created'))!;
    await commands.execute(updateNodeDataCommand, { expectedNode, data: 'edited' });
    expect(kernel.read().query.getNode(expectedNode.id)?.data).toBe('edited');
    const request = placement.begin(() => {
      throw new Error('Cancelled materializer must not run.');
    });
    request.cancel();
    expect(await request.result).toEqual({ type: 'cancelled' });
  } finally {
    await host.dispose();
  }
});
