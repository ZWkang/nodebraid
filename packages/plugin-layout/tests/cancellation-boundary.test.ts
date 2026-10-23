import { expect, test } from 'bun:test';

import { nodeId } from '@nodebraid/kernel';
import { defineLayoutEngine, type LayoutEngine } from '@nodebraid/layout-api';
import {
  commandPlugin,
  commandService,
  defineCommand,
  type Command,
  type CommandService,
} from '@nodebraid/plugin-command';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

import { createLayoutPlugin, type LayoutCommandInput, type LayoutCommandResult } from '../src';

type Config = Record<string, never>;
const taskId = nodeId('task');

test.each(['direct', 'helper'] as const)('%s Engine cancellation skips resolved Proposal reads', async (kind) => {
  const started = Promise.withResolvers<void>();
  const released = Promise.withResolvers<void>();
  const controller = new AbortController();
  const cancellation = new Error('original cancellation');
  const readFailure = new Error('cancelled Proposal must not be inspected');
  let proposalReads = 0;
  const definition: LayoutEngine<Config> = {
    id: 'cancellation-boundary',
    capabilities: { incremental: false, fixedNodes: false, selfLoops: false },
    async compute() {
      started.resolve();
      await released.promise;
      return {
        get sourceRevision(): never {
          proposalReads += 1;
          throw readFailure;
        },
        positions: [],
      };
    },
  };
  const engine = kind === 'helper' ? defineLayoutEngine(definition) : definition;
  await withLayout(engine, async (kernel, commands, command) => {
    const before = kernel.read();
    const execution = commands
      .execute(command, { mode: 'full', fixedNodeIds: [], config: {} }, { signal: controller.signal })
      .catch((error: unknown) => error);
    await started.promise;
    controller.abort(cancellation);
    released.resolve();

    expect(await execution).toBe(cancellation);
    expect(proposalReads).toBe(0);
    expect(kernel.read()).toBe(before);
  });
});

test('an uncancelled direct Engine commits normally and preserves net-zero results', async () => {
  const engine: LayoutEngine<Config> = {
    id: 'direct-success',
    capabilities: { incremental: false, fixedNodes: false, selfLoops: false },
    async compute(input) {
      return {
        sourceRevision: input.revision,
        positions: [{ id: taskId, position: { x: 100, y: 20 } }],
      };
    },
  };
  await withLayout(engine, async (kernel, commands, command) => {
    const observed: number[] = [];
    kernel.observeCommits((commit) => observed.push(commit.changeSet.revision));
    const commit = await commands.execute(command, { mode: 'full', fixedNodeIds: [], config: {} });
    expect(commit?.changeSet).toMatchObject({
      beforeRevision: 1,
      revision: 2,
      origin: 'layout',
      commandId: 'layout.cancellation',
    });
    expect(kernel.read().query.getNode(taskId)?.position).toEqual({ x: 100, y: 20 });
    const accepted = kernel.read();
    expect(await commands.execute(command, { mode: 'full', fixedNodeIds: [], config: {} })).toBeNull();
    expect(kernel.read()).toBe(accepted);
    expect(observed).toEqual([2]);
  });
});

test('an uncancelled direct Engine still rejects an incomplete Proposal', async () => {
  const engine: LayoutEngine<Config> = {
    id: 'direct-invalid',
    capabilities: { incremental: false, fixedNodes: false, selfLoops: false },
    async compute(input) {
      return { sourceRevision: input.revision, positions: [] };
    },
  };
  await withLayout(engine, async (kernel, commands, command) => {
    const before = kernel.read();
    expect(
      await commands.execute(command, { mode: 'full', fixedNodeIds: [], config: {} }).catch((error: unknown) => error),
    ).toMatchObject({ code: 'INVALID_PROPOSAL', details: { issue: 'MISSING_NODE', nodeId: taskId } });
    expect(kernel.read()).toBe(before);
  });
});

test('an uncancelled direct Engine preserves the original Proposal read error', async () => {
  const failure = new Error('original Proposal getter failure');
  const engine: LayoutEngine<Config> = {
    id: 'direct-read-failure',
    capabilities: { incremental: false, fixedNodes: false, selfLoops: false },
    async compute() {
      return {
        get sourceRevision(): never {
          throw failure;
        },
        positions: [],
      };
    },
  };
  await withLayout(engine, async (kernel, commands, command) => {
    const before = kernel.read();
    expect(
      await commands.execute(command, { mode: 'full', fixedNodeIds: [], config: {} }).catch((error: unknown) => error),
    ).toBe(failure);
    expect(kernel.read()).toBe(before);
  });
});

test.each([false, true])('a rejected Engine preserves its original failure when cancellation is %p', async (abort) => {
  const started = Promise.withResolvers<void>();
  const released = Promise.withResolvers<void>();
  const controller = new AbortController();
  const failure = new Error('original computation failure');
  const engine: LayoutEngine<Config> = {
    id: 'direct-compute-failure',
    capabilities: { incremental: false, fixedNodes: false, selfLoops: false },
    async compute() {
      started.resolve();
      await released.promise;
      throw failure;
    },
  };
  await withLayout(engine, async (kernel, commands, command) => {
    const before = kernel.read();
    const execution = commands
      .execute(command, { mode: 'full', fixedNodeIds: [], config: {} }, { signal: controller.signal })
      .catch((error: unknown) => error);
    await started.promise;
    if (abort) controller.abort(new Error('later cancellation'));
    released.resolve();
    expect(await execution).toBe(failure);
    expect(kernel.read()).toBe(before);
  });
});

test('cancellation during Proposal validation still prevents the commit', async () => {
  const controller = new AbortController();
  const cancellation = new Error('cancel during Proposal read');
  const engine: LayoutEngine<Config> = {
    id: 'validation-cancellation',
    capabilities: { incremental: false, fixedNodes: false, selfLoops: false },
    async compute(input) {
      return {
        get sourceRevision() {
          controller.abort(cancellation);
          return input.revision;
        },
        positions: [{ id: taskId, position: { x: 100, y: 0 } }],
      };
    },
  };
  await withLayout(engine, async (kernel, commands, command) => {
    const before = kernel.read();
    expect(
      await commands
        .execute(command, { mode: 'full', fixedNodeIds: [], config: {} }, { signal: controller.signal })
        .catch((error: unknown) => error),
    ).toBe(cancellation);
    expect(kernel.read()).toBe(before);
  });
});

async function withLayout(
  engine: LayoutEngine<Config>,
  run: (
    kernel: KernelService,
    commands: CommandService,
    command: Command<LayoutCommandInput<Config>, LayoutCommandResult>,
  ) => Promise<void>,
) {
  const command = defineCommand<LayoutCommandInput<Config>, LayoutCommandResult>('layout.cancellation');
  let kernel: KernelService | undefined;
  let commands: CommandService | undefined;
  const host = createPluginHost();
  try {
    await Promise.all(
      [
        host.install(kernelPlugin),
        host.install(commandPlugin),
        host.install(createLayoutPlugin({ engine, command })),
        host.install(
          definePlugin({
            requires: { kernel: kernelService, commands: commandService },
            setup(context) {
              kernel = context.services.kernel;
              commands = context.services.commands;
            },
          }),
        ),
      ].map((installation) => installation.whenActive()),
    );
    if (!kernel || !commands) throw new Error('Expected Layout Runtime Services to activate.');
    kernel.transact((transaction) => {
      transaction.nodes.add({
        id: taskId,
        type: 'task',
        position: { x: 0, y: 0 },
        size: { width: 80, height: 40 },
        data: null,
      });
    });
    await run(kernel, commands, command);
  } finally {
    await host.dispose();
  }
}
