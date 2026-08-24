import { expect, test } from 'bun:test';

import { commandService, type CommandService } from '@nodebraid/plugin-command';
import { historyService, type HistoryService } from '@nodebraid/plugin-history';
import { kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { rendererService, type RendererService } from '@nodebraid/plugin-renderer';
import { sessionService, type SessionService } from '@nodebraid/plugin-session';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

import { createBasicCanvasPlugin } from '../src';
import { TestCanvasRenderer } from './test-renderer';

test('Composition readiness publishes every base Service through static bindings', async () => {
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
  } finally {
    await host.dispose();
  }

  expect(renderer.disposed).toBeTrue();
});
