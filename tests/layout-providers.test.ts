import { expect, test } from 'bun:test';

import {
  commandPlugin,
  commandService,
  createLayoutPlugin,
  createPluginHost,
  defineCommand,
  definePlugin,
  edgeId,
  historyPlugin,
  kernelPlugin,
  kernelService,
  nodeId,
  redoCommand,
  sessionPlugin,
  sessionService,
  undoCommand,
  type CanvasCommit,
  type CommandService,
  type KernelService,
  type LayoutCommandInput,
  type LayoutCommandResult,
  type LayoutEngine,
  type NodeId,
  type SessionService,
} from '@nodebraid/core';
import { dagreLayoutEngine, type DagreLayoutConfig } from '@nodebraid/layout-dagre';
import { elkLayoutEngine, type ElkLayoutConfig } from '@nodebraid/layout-elk';

test('Dagre lays out Port topology with one undoable commit and a no-op repeat', () =>
  assertPortLayoutHistory(dagreLayoutEngine, { direction: 'LR' }));

test('ELK lays out Port topology with one undoable commit and a no-op repeat', () =>
  assertPortLayoutHistory(elkLayoutEngine, { algorithm: 'layered', direction: 'RIGHT', randomSeed: 1 }));

async function assertPortLayoutHistory<Config>(engine: LayoutEngine<Config>, config: Config) {
  const command = defineCommand<LayoutCommandInput<Config>, LayoutCommandResult>(`layout.${engine.id}`);
  let kernel: KernelService | undefined;
  let commands: CommandService | undefined;
  let session: SessionService | undefined;
  const consumer = definePlugin({
    requires: { kernel: kernelService, commands: commandService, session: sessionService },
    setup(context) {
      kernel = context.services.kernel;
      commands = context.services.commands;
      session = context.services.session;
    },
  });
  const host = createPluginHost();
  try {
    await Promise.all(
      [
        host.install(kernelPlugin),
        host.install(commandPlugin),
        host.install(sessionPlugin),
        host.install(historyPlugin),
        host.install(createLayoutPlugin({ engine, command })),
        host.install(consumer),
      ].map((installation) => installation.whenActive()),
    );
    if (!kernel || !commands || !session) throw new Error('Expected Runtime Services to activate.');
    const left = nodeId('left');
    const middle = nodeId('middle');
    const right = nodeId('right');
    const data = new Map([['business', { value: 7 }]]);
    kernel.transact((transaction) => {
      for (const [id, position] of [
        [left, { x: 300, y: 400 }],
        [middle, { x: 10, y: 500 }],
        [right, { x: 100, y: 20 }],
      ] as const) {
        transaction.nodes.add({ id, type: 'task', position, size: { width: 80, height: 40 }, data });
      }
      for (const [id, source, target] of [
        ['both', { nodeId: left, portId: 'out' }, { nodeId: middle, portId: 'in' }],
        ['plain', { nodeId: left }, { nodeId: middle }],
        ['source', { nodeId: middle, portId: 'out' }, { nodeId: right }],
        ['target', { nodeId: middle }, { nodeId: right, portId: 'in' }],
      ] as const) {
        transaction.edges.add({ id: edgeId(id), type: 'flow', source, target, data });
      }
    });
    session.setSelection({ nodeIds: [middle], edgeIds: [edgeId('both')] });
    session.setViewport({ x: 36, y: -20, zoom: 1.5 });
    const before = kernel.read();
    const beforeSession = session.getSnapshot();
    const commits: CanvasCommit[] = [];
    const unsubscribe = kernel.observeCommits((commit) => commits.push(commit));
    const request: LayoutCommandInput<Config> = { mode: 'full', fixedNodeIds: [], config };
    const commit = await commands.execute(command, request);
    if (!commit) throw new Error('Expected Layout to move the initial Nodes.');
    const after = kernel.read();
    expect(commits).toEqual([commit]);
    expect(commit.changeSet).toMatchObject({ origin: 'layout', commandId: `layout.${engine.id}`, revision: 2 });
    expect(commit.changeSet.changes.every((change) => change.entity === 'node')).toBe(true);
    expect(after.snapshot.nodes).not.toEqual(before.snapshot.nodes);
    for (const node of before.snapshot.nodes) {
      const moved = after.query.getNode(node.id);
      expect({ ...moved, position: node.position }).toEqual(node);
      expect(moved?.data).toBe(data);
    }
    for (const edge of before.snapshot.edges) expect(after.query.getEdge(edge.id)).toBe(edge);
    expect(session.getSnapshot()).toBe(beforeSession);

    expect(await commands.execute(command, request)).toBeNull();
    expect(kernel.read()).toBe(after);
    expect(commits).toEqual([commit]);

    await commands.execute(undoCommand, undefined);
    expect(kernel.read().snapshot.nodes).toEqual(before.snapshot.nodes);
    for (const edge of before.snapshot.edges) expect(kernel.read().query.getEdge(edge.id)).toBe(edge);
    expect(session.getSnapshot()).toBe(beforeSession);
    await commands.execute(redoCommand, undefined);
    expect(kernel.read().snapshot.nodes).toEqual(after.snapshot.nodes);
    for (const edge of before.snapshot.edges) expect(kernel.read().query.getEdge(edge.id)).toBe(edge);
    expect(session.getSnapshot()).toBe(beforeSession);
    unsubscribe();
  } finally {
    await host.dispose();
  }
}

test('Dagre and ELK compose with Provider-specific typed Runtime Commands', async () => {
  const dagre = await runProvider(dagreLayoutEngine, { direction: 'LR', rankSpacing: 50 } satisfies DagreLayoutConfig);
  const elk = await runProvider(
    elkLayoutEngine,
    { algorithm: 'stress', padding: 0, randomSeed: 1 } satisfies ElkLayoutConfig,
    true,
  );

  expect({ dagre, elk }).toEqual({
    dagre: {
      commandId: 'layout.dagre',
      revision: 2,
      fixedPositions: [],
    },
    elk: {
      commandId: 'layout.elk',
      revision: 2,
      fixedPositions: [
        { id: nodeId('left'), position: { x: 100, y: 100 } },
        { id: nodeId('right'), position: { x: 400, y: 100 } },
      ],
    },
  });
});

async function runProvider<Config>(engine: LayoutEngine<Config>, config: Config, useFixedNodes = false) {
  const leftId = nodeId('left');
  const middleId = nodeId('middle');
  const rightId = nodeId('right');
  const command = defineCommand<LayoutCommandInput<Config>, LayoutCommandResult>(`layout.${engine.id}`);
  const layoutPlugin = createLayoutPlugin({ engine, command });
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
    for (const [id, position] of [
      [leftId, { x: 100, y: 100 }],
      [middleId, { x: 250, y: 260 }],
      [rightId, { x: 400, y: 100 }],
    ] as const) {
      transaction.nodes.add({
        id,
        type: 'task',
        position,
        size: { width: 80, height: 40 },
        data: null,
      });
    }
  });
  const fixedNodeIds: readonly NodeId[] = useFixedNodes ? [leftId, rightId] : [];
  const request: LayoutCommandInput<Config> = { mode: 'full', fixedNodeIds, config };
  const commit = await commands.execute(command, request);
  const fixedPositions = fixedNodeIds.map((id) => ({ id, position: kernel!.read().query.getNode(id)?.position }));
  const result = {
    commandId: commit?.changeSet.commandId,
    revision: kernel.read().snapshot.revision,
    fixedPositions,
  };
  await host.dispose();
  return result;
}
