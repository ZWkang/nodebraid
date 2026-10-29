import { describe, expect, test } from 'bun:test';

import { nodeId, type CanvasNode } from '@nodebraid/kernel';
import { commandPlugin, commandService, type CommandService } from '@nodebraid/plugin-command';
import {
  historyPlugin,
  historyService,
  redoCommand,
  undoCommand,
  type HistoryService,
} from '@nodebraid/plugin-history';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

import { createNodeCommand, nodeEditingPlugin, NodeEditingError, updateNodeDataCommand } from '../src';

async function setup() {
  const host = createPluginHost();
  const dependencies = [host.install(kernelPlugin), host.install(commandPlugin), host.install(historyPlugin)];
  const editing = host.install(nodeEditingPlugin);
  let services: { kernel: KernelService; commands: CommandService; history: HistoryService } | undefined;
  const consumer = host.install(
    definePlugin({
      requires: { kernel: kernelService, commands: commandService, history: historyService },
      setup(context) {
        services = context.services;
      },
    }),
  );
  await Promise.all([...dependencies, editing, consumer].map((installation) => installation.whenActive()));
  if (!services) throw new Error('Expected real Node editing services.');
  return { host, editing, ...services };
}

function node(name = 'one'): CanvasNode {
  return {
    id: nodeId(name),
    type: 'card',
    position: { x: 10, y: 20 },
    size: { width: 140, height: 60 },
    data: { label: name },
  };
}

describe('@nodebraid/plugin-node-editing', () => {
  test('creates a complete Node and updates only its data with one Undo per commit', async () => {
    const { host, kernel, commands, history } = await setup();
    try {
      const input = node();
      const created = await commands.execute(createNodeCommand, { node: input });
      expect(created.after).toBe(kernel.read());
      expect(created.changeSet.changes).toHaveLength(1);
      expect(history.getSnapshot().canUndo).toBe(true);
      const source = kernel.read().query.getNode(input.id)!;
      const data = { label: 'Edited' };
      const edited = await commands.execute(updateNodeDataCommand, { expectedNode: source, data });
      expect(edited?.before).toBe(created.after);
      expect(kernel.read().query.getNode(input.id)).toEqual({ ...source, data });
      expect(kernel.read().query.getNode(input.id)?.data).toBe(data);
      await commands.execute(undoCommand, undefined);
      expect(kernel.read().query.getNode(input.id)?.data).toBe(source.data);
      await commands.execute(undoCommand, undefined);
      expect(kernel.read().query.getNode(input.id)).toBeUndefined();
      await commands.execute(redoCommand, undefined);
      await commands.execute(redoCommand, undefined);
      expect(kernel.read().query.getNode(input.id)?.data).toBe(data);
    } finally {
      await host.dispose();
    }
  });

  test('keeps a same-data update net zero and accepts evidence across unrelated commits', async () => {
    const { host, kernel, commands, history } = await setup();
    try {
      await commands.execute(createNodeCommand, { node: node() });
      const source = kernel.read().query.getNode(nodeId('one'))!;
      const view = kernel.read(),
        snapshot = history.getSnapshot();
      expect(await commands.execute(updateNodeDataCommand, { expectedNode: source, data: source.data })).toBeNull();
      expect(kernel.read()).toBe(view);
      expect(history.getSnapshot()).toBe(snapshot);
      await commands.execute(createNodeCommand, { node: node('other') });
      await commands.execute(updateNodeDataCommand, { expectedNode: source, data: Symbol('opaque') });
      expect(typeof kernel.read().query.getNode(source.id)?.data).toBe('symbol');
    } finally {
      await host.dispose();
    }
  });

  test.each(['move', 'data', 'recreate', 'undo-redo'] as const)(
    'rejects stale evidence after %s without changing graph or History',
    async (change) => {
      const { host, kernel, commands, history } = await setup();
      try {
        await commands.execute(createNodeCommand, { node: node() });
        const source = kernel.read().query.getNode(nodeId('one'))!;
        if (change === 'undo-redo') {
          await commands.execute(undoCommand, undefined);
          await commands.execute(redoCommand, undefined);
        } else if (change === 'recreate') {
          kernel.transact((tx) => tx.nodes.remove(source.id));
          kernel.transact((tx) => tx.nodes.add(source));
        } else {
          kernel.transact((tx) =>
            tx.nodes.replace(source.id, {
              ...source,
              ...(change === 'move' ? { position: { x: 30, y: 40 } } : { data: {} }),
            }),
          );
        }
        const view = kernel.read(),
          snapshot = history.getSnapshot();
        await expect(commands.execute(updateNodeDataCommand, { expectedNode: source, data: {} })).rejects.toMatchObject(
          { code: 'STALE_NODE' },
        );
        expect(kernel.read()).toBe(view);
        expect(history.getSnapshot()).toBe(snapshot);
      } finally {
        await host.dispose();
      }
    },
  );

  test('preserves original Kernel failures, cancellation and command lifecycle', async () => {
    const { host, editing, kernel, commands, history } = await setup();
    try {
      await commands.execute(createNodeCommand, { node: node() });
      const view = kernel.read(),
        snapshot = history.getSnapshot();
      await expect(commands.execute(createNodeCommand, { node: node() })).rejects.toThrow();
      await expect(
        commands.execute(createNodeCommand, { node: { ...node('bad'), position: { x: NaN, y: 0 } } }),
      ).rejects.toThrow();
      const reason = new Error('cancelled');
      await expect(
        commands.execute(createNodeCommand, { node: node('cancelled') }, { signal: AbortSignal.abort(reason) }),
      ).rejects.toBe(reason);
      expect(kernel.read()).toBe(view);
      expect(history.getSnapshot()).toBe(snapshot);
      await editing.dispose();
      await expect(commands.execute(createNodeCommand, { node: node('disposed') })).rejects.toMatchObject({
        code: 'COMMAND_NOT_FOUND',
      });
    } finally {
      await host.dispose();
    }
  });

  test('reads declared inputs once and keeps accessor failures and opaque data identity', async () => {
    const { host, kernel, commands } = await setup();
    try {
      const value = node();
      let nodeReads = 0;
      await commands.execute(createNodeCommand, {
        get node() {
          nodeReads++;
          return value;
        },
      });
      expect(nodeReads).toBe(1);
      const source = kernel.read().query.getNode(value.id)!;
      let sourceReads = 0,
        dataReads = 0;
      const data = Object.create({ label: 'inherited' });
      const input = Object.create({
        get expectedNode() {
          sourceReads++;
          return source;
        },
        get data() {
          dataReads++;
          return data;
        },
      });
      await commands.execute(updateNodeDataCommand, input);
      expect([sourceReads, dataReads]).toEqual([1, 1]);
      expect(kernel.read().query.getNode(value.id)?.data).toBe(data);
      const failure = new Error('read failed');
      await expect(
        commands.execute(createNodeCommand, {
          get node(): CanvasNode {
            throw failure;
          },
        }),
      ).rejects.toBe(failure);
      await expect(
        commands.execute(updateNodeDataCommand, { expectedNode: { ...source }, data: null }),
      ).rejects.toBeInstanceOf(NodeEditingError);
    } finally {
      await host.dispose();
    }
  });
});
