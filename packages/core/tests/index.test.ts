import { describe, expect, test } from 'bun:test';

import {
  CFlowError,
  KernelError,
  commandPlugin,
  commandService,
  createCanvasKernel,
  createPluginHost,
  defineCommand,
  definePlugin,
  defineService,
  describeError,
  diagnosticEvents,
  edgeId,
  historyPlugin,
  historyService,
  kernelPlugin,
  kernelService,
  nodeId,
  sessionPlugin,
  sessionService,
  type CommandService,
  redoCommand,
  undoCommand,
  type KernelService,
  type PluginInstallation,
  type SessionService,
} from '../src';

describe('@cflow/core', () => {
  test('publishes the shared Diagnostics seam', () => {
    const error = new KernelError('INVALID_ID', 'Node ID is invalid.', {
      entity: 'node',
      value: '',
    });

    expect(error).toBeInstanceOf(CFlowError);
    expect(diagnosticEvents).toEqual({
      sinkFault: 'cflow.diagnostics.sink.fault',
      faultReportingFault: 'cflow.diagnostics.fault-reporting.fault',
    });
    expect(describeError(error)).toMatchObject({
      kind: 'cflow',
      domain: 'kernel',
      code: 'INVALID_ID',
      details: { entity: 'node', value: '' },
    });
  });

  test('publishes the typed Plugin Host seam', async () => {
    const input = defineService<{ read(): number }>('input');
    const output = defineService<{ value: number }>('output');
    const typedPlugin = definePlugin({
      requires: { input },
      provides: { output },
      setup(context, config: { multiplier: number }) {
        const value: number = context.services.input.read();
        // @ts-expect-error Undeclared Required Services stay unavailable through core.
        void context.services.undeclared;
        return { output: { value: value * config.multiplier } };
      },
    });
    const verifyTypes = () => {
      const host = createPluginHost();
      // @ts-expect-error Plugin configuration stays required through core.
      host.install(typedPlugin);
      const installation: PluginInstallation = host.install(typedPlugin, {
        multiplier: 2,
      });
      definePlugin({
        provides: { output },
        // @ts-expect-error Every Provided Service stays required through core.
        setup() {
          return {};
        },
      });
      void installation;
    };
    void verifyTypes;

    let disposed = false;
    const plugin = definePlugin({
      setup(context) {
        context.own(() => {
          disposed = true;
        });
      },
    });
    const host = createPluginHost();

    const installation = host.install(plugin);
    await installation.whenActive();

    expect(installation.getSnapshot()).toEqual({ status: 'active' });

    await host.dispose();
    expect(disposed).toBe(true);
    expect(installation.getSnapshot()).toEqual({ status: 'disposed' });
  });

  test('publishes the reversible Kernel seam', () => {
    const kernel = createCanvasKernel();
    const sourceId = nodeId('source');
    const targetId = nodeId('target');
    const connectionId = edgeId('connection');
    const source = { id: sourceId, type: 'task', position: { x: 0, y: 0 }, data: null };
    const target = { id: targetId, type: 'task', position: { x: 100, y: 0 }, data: null };

    kernel.transact((transaction) => {
      transaction.nodes.add(source);
      transaction.nodes.add(target);
      transaction.edges.add({
        id: connectionId,
        type: 'flow',
        source: { nodeId: sourceId },
        target: { nodeId: targetId },
        data: null,
      });
    });
    const moved = kernel.transact((transaction) => {
      transaction.nodes.replace(sourceId, { ...source, position: { x: 40, y: 20 } });
    });
    if (!moved) throw new Error('Expected the move Transaction to commit.');

    kernel.transact((transaction) => transaction.applyChangeSet(moved.changeSet, 'reverse'));
    expect(kernel.read().query.getNode(sourceId)?.position).toEqual({ x: 0, y: 0 });

    kernel.transact((transaction) => transaction.applyChangeSet(moved.changeSet, 'forward'));
    expect(kernel.read().query.getNode(sourceId)?.position).toEqual({ x: 40, y: 20 });
    expect(kernel.read().query.getEdge(connectionId)?.target.nodeId).toBe(targetId);
  });

  test('publishes the Kernel Runtime Plugin seam', async () => {
    let service: KernelService | undefined;
    const consumer = definePlugin({
      requires: { kernel: kernelService },
      setup(context) {
        service = context.services.kernel;
      },
    });
    const host = createPluginHost();
    host.install(kernelPlugin);
    const consumerInstallation = host.install(consumer);

    await consumerInstallation.whenActive();

    expect(service?.read().snapshot.revision).toBe(0);
    await host.dispose();
  });

  test('publishes the Session Runtime Plugin seam', async () => {
    let service: SessionService | undefined;
    const consumer = definePlugin({
      requires: { session: sessionService },
      setup(context) {
        service = context.services.session;
      },
    });
    const host = createPluginHost();
    host.install(kernelPlugin);
    host.install(sessionPlugin);
    const consumerInstallation = host.install(consumer);

    await consumerInstallation.whenActive();

    expect(service?.getSnapshot()).toEqual({
      selection: { nodeIds: [], edgeIds: [] },
      viewport: { x: 0, y: 0, zoom: 1 },
    });
    await host.dispose();
  });

  test('composes asynchronous Command preparation with a synchronous Kernel Transaction', async () => {
    const addNode = defineCommand<string, number>('node.add-prepared');
    let commands: CommandService | undefined;
    let kernel: KernelService | undefined;
    let committedCommandId: string | undefined;
    const feature = definePlugin({
      requires: { commands: commandService, kernel: kernelService },
      setup(context) {
        commands = context.services.commands;
        kernel = context.services.kernel;
        const registration = commands.register(addNode, async (value, execution) => {
          await Promise.resolve();
          const commit = context.services.kernel.transact(
            (transaction) => {
              transaction.nodes.add({
                id: nodeId(value),
                type: 'task',
                position: { x: 0, y: 0 },
                data: null,
              });
            },
            { origin: 'command', commandId: execution.commandId },
          );
          if (!commit) throw new Error('Expected Command Transaction to commit.');
          committedCommandId = commit.changeSet.commandId;
          return commit.changeSet.revision;
        });
        context.own(() => registration.dispose());
      },
    });
    const host = createPluginHost();
    host.install(commandPlugin);
    host.install(kernelPlugin);
    const installation = host.install(feature);
    await installation.whenActive();
    if (!commands || !kernel) throw new Error('Expected Command and Kernel Services to activate.');

    await expect(commands.execute(addNode, 'prepared')).resolves.toBe(1);
    expect(committedCommandId).toBe('node.add-prepared');
    expect(kernel.read().query.getNode(nodeId('prepared'))?.id).toBe(nodeId('prepared'));

    await host.dispose();
  });

  test('publishes the History Runtime Plugin seam', () => {
    expect(historyPlugin).toBeDefined();
    expect(historyService).toBeDefined();
    expect(undoCommand.id).toBe('history.undo');
    expect(redoCommand.id).toBe('history.redo');
  });
});
