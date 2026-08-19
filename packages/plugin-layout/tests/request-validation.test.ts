import { expect, test } from 'bun:test';

import { edgeId, nodeId, type CanvasCommit } from '@cflow/kernel';
import { defineLayoutEngine, type LayoutError } from '@cflow/layout-api';
import { commandPlugin, commandService, defineCommand, type CommandService } from '@cflow/plugin-command';
import { kernelPlugin, kernelService, type KernelService } from '@cflow/plugin-kernel';
import { createPluginHost, definePlugin } from '@cflow/runtime-cordis';

import { createLayoutPlugin, type LayoutCommandInput } from '../src';

test('a Node without Size rejects the Layout Request before the Provider runs', async () => {
  const taskId = nodeId('task');
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
      data: null,
    });
  });

  let error: LayoutError | undefined;
  try {
    await commands.execute(layout, { mode: 'full', fixedNodeIds: [], config: {} });
  } catch (reason) {
    error = reason as LayoutError;
  }

  expect({
    error: error && { name: error.name, code: error.code, details: error.details },
    providerCalls,
    revision: kernel.read().snapshot.revision,
  }).toEqual({
    error: {
      name: 'LayoutError',
      code: 'INVALID_INPUT',
      details: { issue: 'MISSING_SIZE', nodeId: taskId },
    },
    providerCalls: 0,
    revision: 1,
  });

  await host.dispose();
});

test('unsupported incremental, Fixed Node, and self-loop capabilities fail before the Provider runs', async () => {
  const taskId = nodeId('task');
  const layout = defineCommand<LayoutCommandInput<Record<string, never>>, CanvasCommit | null>('layout.test');
  let providerCalls = 0;
  const engine = defineLayoutEngine<Record<string, never>>({
    id: 'test',
    capabilities: { incremental: false, fixedNodes: false, selfLoops: false },
    compute(input) {
      providerCalls += 1;
      return {
        sourceRevision: input.revision,
        positions: input.nodes.map((node) => ({ id: node.id, position: node.position })),
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
      id: taskId,
      type: 'task',
      position: { x: 0, y: 0 },
      size: { width: 80, height: 40 },
      data: null,
    });
    transaction.edges.add({
      id: edgeId('self'),
      type: 'flow',
      source: { nodeId: taskId },
      target: { nodeId: taskId },
      data: null,
    });
  });

  const requests: LayoutCommandInput<Record<string, never>>[] = [
    { mode: 'incremental', fixedNodeIds: [], config: {} },
    { mode: 'full', fixedNodeIds: [taskId], config: {} },
    { mode: 'full', fixedNodeIds: [], config: {} },
  ];
  const errors: Array<{ code: string; details: Readonly<Record<string, unknown>> | undefined } | undefined> = [];
  for (const request of requests) {
    try {
      await commands.execute(layout, request);
      errors.push(undefined);
    } catch (reason) {
      const error = reason as LayoutError;
      errors.push({ code: error.code, details: error.details });
    }
  }

  expect({ errors, providerCalls }).toEqual({
    errors: [
      { code: 'UNSUPPORTED_FEATURE', details: { feature: 'incremental', providerId: 'test' } },
      { code: 'UNSUPPORTED_FEATURE', details: { feature: 'fixedNodes', providerId: 'test' } },
      { code: 'UNSUPPORTED_FEATURE', details: { feature: 'selfLoops', providerId: 'test' } },
    ],
    providerCalls: 0,
  });

  await host.dispose();
});
