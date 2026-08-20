import { expect, test } from 'bun:test';

import { nodeId } from '@cflow/kernel';
import { commandPlugin, commandService, type CommandService } from '@cflow/plugin-command';
import { kernelPlugin, kernelService, type KernelService } from '@cflow/plugin-kernel';
import { createRendererPlugin } from '@cflow/plugin-renderer';
import { sessionPlugin } from '@cflow/plugin-session';
import type {
  CanvasRenderer,
  HitResult,
  RendererDocumentUpdate,
  RendererInputListener,
  ScreenPoint,
} from '@cflow/renderer-api';
import type { SessionSnapshot } from '@cflow/session-api';
import { createPluginHost, definePlugin } from '@cflow/runtime-cordis';

import { interactionPlugin, moveNodesCommand } from '../src';

test('Move Nodes rejects an empty input without changing Document', async () => {
  let commands: CommandService | undefined;
  let kernel: KernelService | undefined;
  const consumer = definePlugin({
    requires: { commands: commandService, kernel: kernelService },
    setup(context) {
      commands = context.services.commands;
      kernel = context.services.kernel;
    },
  });
  const host = createPluginHost();
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    host.install(createRendererPlugin(() => new CommandRenderer())),
    host.install(interactionPlugin),
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!commands || !kernel) throw new Error('Expected Move Nodes Runtime Services.');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: nodeId('move-node'),
      type: 'task',
      position: { x: 10, y: 20 },
      data: null,
    });
    transaction.nodes.add({
      id: nodeId('move-node-b'),
      type: 'task',
      position: { x: 100, y: 20 },
      data: null,
    });
  });
  const before = kernel.read();

  await expect(commands.execute(moveNodesCommand, { moves: [] })).rejects.toMatchObject({
    domain: 'interaction',
    code: 'INVALID_MOVE',
  });
  expect(kernel.read()).toBe(before);
  await expect(
    commands.execute(moveNodesCommand, {
      moves: [
        {
          nodeId: nodeId('move-node'),
          basePosition: { x: 10, y: 20 },
          position: { x: 30, y: 40 },
        },
        {
          nodeId: nodeId('move-node'),
          basePosition: { x: 10, y: 20 },
          position: { x: 50, y: 60 },
        },
      ],
    }),
  ).rejects.toMatchObject({ domain: 'interaction', code: 'INVALID_MOVE' });
  expect(kernel.read()).toBe(before);
  await expect(
    commands.execute(moveNodesCommand, {
      moves: [
        {
          nodeId: nodeId('move-node-b'),
          basePosition: { x: 100, y: 20 },
          position: { x: 120, y: 40 },
        },
        {
          nodeId: nodeId('move-node'),
          basePosition: { x: 10, y: 20 },
          position: { x: 30, y: 40 },
        },
      ],
    }),
  ).rejects.toMatchObject({ domain: 'interaction', code: 'INVALID_MOVE' });
  expect(kernel.read()).toBe(before);
  await expect(
    commands.execute(moveNodesCommand, {
      moves: [
        {
          nodeId: nodeId('move-node'),
          basePosition: { x: 10, y: 20 },
          position: { x: Number.POSITIVE_INFINITY, y: 40 },
        },
      ],
    }),
  ).rejects.toMatchObject({ domain: 'interaction', code: 'INVALID_MOVE' });
  expect(kernel.read()).toBe(before);
  const commit = await commands.execute(moveNodesCommand, {
    moves: [
      {
        nodeId: nodeId('move-node'),
        basePosition: { x: 10, y: 20 },
        position: { x: 30, y: 40 },
      },
    ],
  });
  expect(commit).toMatchObject({
    changeSet: { origin: 'interaction', commandId: 'interaction.nodes.move' },
  });
  expect(kernel.read().query.getNode(nodeId('move-node'))?.position).toEqual({ x: 30, y: 40 });
  await expect(
    commands.execute(moveNodesCommand, {
      moves: [
        {
          nodeId: nodeId('move-node'),
          basePosition: { x: 30, y: 40 },
          position: { x: 30, y: 40 },
        },
      ],
    }),
  ).resolves.toBeNull();
  await host.dispose();
});

class CommandRenderer implements CanvasRenderer {
  updateDocument(_update: RendererDocumentUpdate): void {}
  updateSession(_snapshot: SessionSnapshot): void {}
  updateInteraction(): void {}
  subscribeInput(_listener: RendererInputListener): () => void {
    return () => undefined;
  }
  hitTest(_point: ScreenPoint): HitResult {
    return { type: 'canvas', worldPoint: { x: 0, y: 0 } };
  }
  capturePointer(_pointerId: number): void {}
  releasePointer(_pointerId: number): void {}
  focus(): void {}
  dispose(): Promise<void> {
    return Promise.resolve();
  }
}
