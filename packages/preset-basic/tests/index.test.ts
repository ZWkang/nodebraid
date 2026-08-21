import { expect, test } from 'bun:test';

import { nodeId } from '@cflow/kernel';
import { commandService, type CommandService } from '@cflow/plugin-command';
import { historyService, undoCommand, type HistoryService } from '@cflow/plugin-history';
import { moveNodesCommand } from '@cflow/plugin-interaction';
import { kernelService, type KernelService } from '@cflow/plugin-kernel';
import { rendererService, type RendererService } from '@cflow/plugin-renderer';
import { sessionService, type SessionService } from '@cflow/plugin-session';
import { createPluginHost, definePlugin } from '@cflow/runtime-cordis';

import { createBasicCanvasPlugin } from '../src';
import { TestCanvasRenderer } from './test-renderer';

test('application activates the complete Basic Canvas Composition through one Plugin', async () => {
  interface TestRendererConfig {
    readonly targetId: string;
  }

  const renderer = new TestCanvasRenderer();
  const providerConfig: TestRendererConfig = Object.freeze({ targetId: 'canvas-a' });
  let receivedConfig: Readonly<TestRendererConfig> | undefined;
  const basicCanvasPlugin = createBasicCanvasPlugin((config: Readonly<TestRendererConfig>) => {
    receivedConfig = config;
    return renderer;
  });
  let kernel: KernelService | undefined;
  let commands: CommandService | undefined;
  let session: SessionService | undefined;
  let runtimeRenderer: RendererService | undefined;
  let history: HistoryService | undefined;
  const consumer = definePlugin({
    requires: {
      kernel: kernelService,
      commands: commandService,
      session: sessionService,
      renderer: rendererService,
      history: historyService,
    },
    setup(context) {
      kernel = context.services.kernel;
      commands = context.services.commands;
      session = context.services.session;
      runtimeRenderer = context.services.renderer;
      history = context.services.history;
    },
  });
  const host = createPluginHost();
  const composition = host.install(basicCanvasPlugin, providerConfig);
  const consumerInstallation = host.install(consumer);

  try {
    await Promise.all([composition.whenActive(), consumerInstallation.whenActive()]);
    expect(receivedConfig).toBe(providerConfig);
    expect(kernel).toBeDefined();
    expect(commands).toBeDefined();
    expect(session).toBeDefined();
    expect(runtimeRenderer).toBeDefined();
    expect(history).toBeDefined();

    const id = nodeId('basic-node');
    kernel!.transact((transaction) => {
      transaction.nodes.add({
        id,
        type: 'task',
        position: { x: 10, y: 20 },
        size: { width: 80, height: 40 },
        data: null,
      });
    });
    const moved = await commands!.execute(moveNodesCommand, {
      moves: [{ nodeId: id, basePosition: { x: 10, y: 20 }, position: { x: 40, y: 50 } }],
    });

    expect(moved?.after.query.getNode(id)?.position).toEqual({ x: 40, y: 50 });
    expect(history!.getSnapshot()).toEqual({ canUndo: true, canRedo: false });

    await commands!.execute(undoCommand, undefined);

    expect(kernel!.read().query.getNode(id)?.position).toEqual({ x: 10, y: 20 });
  } finally {
    await host.dispose();
  }

  expect(renderer.disposed).toBeTrue();
});
