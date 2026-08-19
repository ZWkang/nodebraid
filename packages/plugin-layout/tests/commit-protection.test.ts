import { expect, test } from 'bun:test';

import { nodeId, type CanvasCommit } from '@cflow/kernel';
import { defineLayoutEngine, type LayoutError, type LayoutProposal } from '@cflow/layout-api';
import { commandPlugin, commandService, defineCommand, type CommandService } from '@cflow/plugin-command';
import { kernelPlugin, kernelService, type KernelService } from '@cflow/plugin-kernel';
import { createPluginHost, definePlugin } from '@cflow/runtime-cordis';

import { createLayoutPlugin, type LayoutCommandInput } from '../src';

test('a stale Layout Proposal cannot overwrite a newer Kernel revision', async () => {
  const taskId = nodeId('task');
  const layout = defineCommand<LayoutCommandInput<Record<string, never>>, CanvasCommit | null>('layout.test');
  let releaseProvider!: () => void;
  let markProviderStarted!: () => void;
  const providerStarted = new Promise<void>((resolve) => {
    markProviderStarted = resolve;
  });
  const engine = defineLayoutEngine<Record<string, never>>({
    id: 'test',
    capabilities: { incremental: false, fixedNodes: false, selfLoops: false },
    compute(input) {
      markProviderStarted();
      return new Promise<LayoutProposal>((resolve) => {
        releaseProvider = () =>
          resolve({
            sourceRevision: input.revision,
            positions: [{ id: taskId, position: { x: 100, y: 0 } }],
          });
      });
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
      id: taskId,
      type: 'task',
      position: { x: 0, y: 0 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });

  const execution = commands.execute(layout, { mode: 'full', fixedNodeIds: [], config: {} });
  await providerStarted;
  kernel.transact((transaction) => {
    const node = transaction.query.getNode(taskId);
    if (!node) throw new Error('Expected task Node.');
    transaction.nodes.replace(taskId, { ...node, position: { x: 50, y: 0 } });
  });
  releaseProvider();
  let error: LayoutError | undefined;
  try {
    await execution;
  } catch (reason) {
    error = reason as LayoutError;
  }

  expect({
    error: error && { code: error.code, details: error.details },
    revision: kernel.read().snapshot.revision,
    position: kernel.read().query.getNode(taskId)?.position,
  }).toEqual({
    error: { code: 'STALE_PROPOSAL', details: { sourceRevision: 1, currentRevision: 2 } },
    revision: 2,
    position: { x: 50, y: 0 },
  });

  await host.dispose();
});

test('cancellation after Provider execution starts preserves the reason and prevents commit', async () => {
  const taskId = nodeId('task');
  const layout = defineCommand<LayoutCommandInput<Record<string, never>>, CanvasCommit | null>('layout.test');
  let releaseProvider!: () => void;
  let markProviderStarted!: () => void;
  const providerStarted = new Promise<void>((resolve) => {
    markProviderStarted = resolve;
  });
  const engine = defineLayoutEngine<Record<string, never>>({
    id: 'test',
    capabilities: { incremental: false, fixedNodes: false, selfLoops: false },
    compute(input) {
      markProviderStarted();
      return new Promise<LayoutProposal>((resolve) => {
        releaseProvider = () =>
          resolve({
            sourceRevision: input.revision,
            positions: [{ id: taskId, position: { x: 100, y: 0 } }],
          });
      });
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
      id: taskId,
      type: 'task',
      position: { x: 0, y: 0 },
      size: { width: 80, height: 40 },
      data: null,
    });
  });
  const controller = new AbortController();
  const cancellation = new Error('stop layout');

  const execution = commands.execute(
    layout,
    { mode: 'full', fixedNodeIds: [], config: {} },
    { signal: controller.signal },
  );
  await providerStarted;
  controller.abort(cancellation);
  releaseProvider();
  let error: unknown;
  try {
    await execution;
  } catch (reason) {
    error = reason;
  }

  expect({
    preservedReason: error === cancellation,
    revision: kernel.read().snapshot.revision,
    position: kernel.read().query.getNode(taskId)?.position,
  }).toEqual({
    preservedReason: true,
    revision: 1,
    position: { x: 0, y: 0 },
  });

  await host.dispose();
});

test('a pre-aborted Layout Command does not invoke the Provider', async () => {
  const layout = defineCommand<LayoutCommandInput<Record<string, never>>, CanvasCommit | null>('layout.test');
  let providerCalls = 0;
  const engine = defineLayoutEngine<Record<string, never>>({
    id: 'test',
    capabilities: { incremental: false, fixedNodes: false, selfLoops: false },
    compute(input) {
      providerCalls += 1;
      return { sourceRevision: input.revision, positions: [] };
    },
  });
  const layoutPlugin = createLayoutPlugin({ engine, command: layout });
  let commands: CommandService | undefined;
  const consumer = definePlugin({
    requires: { commands: commandService },
    setup(context) {
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
  if (!commands) throw new Error('Expected Command Service to activate.');
  const controller = new AbortController();
  const cancellation = new Error('already stopped');
  controller.abort(cancellation);

  let error: unknown;
  try {
    await commands.execute(layout, { mode: 'full', fixedNodeIds: [], config: {} }, { signal: controller.signal });
  } catch (reason) {
    error = reason;
  }

  expect({ preservedReason: error === cancellation, providerCalls }).toEqual({
    preservedReason: true,
    providerCalls: 0,
  });

  await host.dispose();
});
