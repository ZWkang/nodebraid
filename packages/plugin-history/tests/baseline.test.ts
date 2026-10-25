import { expect, test } from 'bun:test';

import { nodeId, type CanvasCommit, type TransactionContext } from '@nodebraid/kernel';
import { commandPlugin, commandService, type CommandService } from '@nodebraid/plugin-command';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

import {
  establishHistoryBaselineCommand,
  historyPlugin,
  historyService,
  redoCommand,
  undoCommand,
  type HistoryService,
} from '../src';

test('replaces the Document as a new baseline and only undoes subsequent edits', async () => {
  const { commands, history, host, kernel } = await activateHistory();
  try {
    kernel.transact((transaction) => addNode(transaction, 'old'));
    kernel.transact((transaction) => addNode(transaction, 'undone'));
    await commands.execute(undoCommand, undefined);
    expect(history.getSnapshot()).toEqual({ canUndo: true, canRedo: true });

    const baseline = await commands.execute(establishHistoryBaselineCommand, (transaction) => {
      transaction.nodes.remove(nodeId('old'));
      addNode(transaction, 'imported');
    });

    expect(baseline?.after).toBe(kernel.read());
    expect(kernel.read().snapshot.nodes.map((node) => node.id)).toEqual([nodeId('imported')]);
    expect(history.getSnapshot()).toEqual({ canUndo: false, canRedo: false });
    await expect(commands.execute(undoCommand, undefined)).rejects.toMatchObject({ code: 'UNDO_EMPTY' });
    await expect(commands.execute(redoCommand, undefined)).rejects.toMatchObject({ code: 'REDO_EMPTY' });

    kernel.transact((transaction) => addNode(transaction, 'after-import'));
    await commands.execute(undoCommand, undefined);
    expect(kernel.read().snapshot.nodes.map((node) => node.id)).toEqual([nodeId('imported')]);
  } finally {
    await host.dispose();
  }
});

test('establishes a baseline without a net Document change and publishes the cleared history', async () => {
  const { commands, history, host, kernel } = await activateHistory();
  try {
    kernel.transact((transaction) => addNode(transaction, 'retained'));
    kernel.transact((transaction) => addNode(transaction, 'undone'));
    await commands.execute(undoCommand, undefined);
    const before = kernel.read();
    const snapshots: unknown[] = [];
    history.subscribe(() => snapshots.push(history.getSnapshot()));

    const result = await commands.execute(establishHistoryBaselineCommand, (transaction) => {
      transaction.nodes.remove(nodeId('retained'));
      transaction.nodes.add(before.snapshot.nodes[0]!);
    });

    expect(result).toBeNull();
    expect(kernel.read()).toBe(before);
    expect(snapshots).toEqual([{ canUndo: false, canRedo: false }]);
    expect(history.getSnapshot()).toEqual({ canUndo: false, canRedo: false });
  } finally {
    await host.dispose();
  }
});

test('keeps a net-zero baseline busy through publication while recording a subsequent Commit', async () => {
  const { commands, history, host, kernel } = await activateHistory();
  try {
    kernel.transact((transaction) => addNode(transaction, 'retained'));
    let attempt: Promise<CanvasCommit | null> | undefined;
    history.subscribe(() => {
      if (attempt) return;
      attempt = commands.execute(establishHistoryBaselineCommand, () => {});
      void attempt.catch(() => {});
      kernel.transact((transaction) => addNode(transaction, 'after-baseline'));
    });
    expect(await commands.execute(establishHistoryBaselineCommand, () => {})).toBeNull();
    await expect(attempt).rejects.toMatchObject({ code: 'HISTORY_BUSY' });
    expect(history.getSnapshot()).toEqual({ canUndo: true, canRedo: false });
    await commands.execute(undoCommand, undefined);
    expect(kernel.read().snapshot.nodes.map((node) => node.id)).toEqual([nodeId('retained')]);
    expect(history.getSnapshot()).toEqual({ canUndo: false, canRedo: true });
  } finally {
    await host.dispose();
  }
});

for (const failure of ['callback', 'invalid-graph', 'async-callback'] as const) {
  test(`preserves the original Document and History after ${failure} rejection`, async () => {
    const { commands, history, host, kernel } = await activateHistory();
    try {
      kernel.transact((transaction) => addNode(transaction, 'retained'));
      kernel.transact((transaction) => addNode(transaction, 'undone'));
      await commands.execute(undoCommand, undefined);
      const before = kernel.read();
      const beforeHistory = history.getSnapshot();
      const callbackFailure = new Error('Cannot decode application data.');
      const update = (transaction: TransactionContext) => {
        transaction.nodes.remove(nodeId('retained'));
        addNode(transaction, 'replacement');
        if (failure === 'callback') throw callbackFailure;
        if (failure === 'invalid-graph') {
          transaction.nodes.add({
            id: nodeId('orphan'),
            type: 'task',
            position: { x: 0, y: 0 },
            parentId: nodeId('missing-parent'),
            data: null,
          });
        }
      };
      const result = commands.execute(
        establishHistoryBaselineCommand,
        failure === 'async-callback' ? async (transaction) => update(transaction) : update,
      );
      if (failure === 'callback') await expect(result).rejects.toBe(callbackFailure);
      else
        await expect(result).rejects.toMatchObject({
          code: failure === 'invalid-graph' ? 'INVALID_GRAPH' : 'ASYNC_TRANSACTION',
        });
      expect(kernel.read()).toBe(before);
      expect(history.getSnapshot()).toBe(beforeHistory);
      await commands.execute(redoCommand, undefined);
      expect(kernel.read().query.getNode(nodeId('undone'))).toBeDefined();
    } finally {
      await host.dispose();
    }
  });
}

test('rejects an already aborted baseline before invoking its update', async () => {
  const { commands, history, host, kernel } = await activateHistory();
  try {
    kernel.transact((transaction) => addNode(transaction, 'retained'));
    const before = kernel.read();
    const beforeHistory = history.getSnapshot();
    const controller = new AbortController();
    const reason = new Error('Cancelled file import.');
    controller.abort(reason);
    let invoked = false;
    await expect(
      commands.execute(
        establishHistoryBaselineCommand,
        () => {
          invoked = true;
        },
        { signal: controller.signal },
      ),
    ).rejects.toBe(reason);
    expect(invoked).toBe(false);
    expect(kernel.read()).toBe(before);
    expect(history.getSnapshot()).toBe(beforeHistory);
  } finally {
    await host.dispose();
  }
});

test('rejects overlapping baseline and replay Commands before writing', async () => {
  const { commands, history, host, kernel } = await activateHistory();
  try {
    kernel.transact((transaction) => addNode(transaction, 'retained'));
    const attempts: Promise<unknown>[] = [];
    const baseline = commands.execute(establishHistoryBaselineCommand, (transaction) => {
      attempts.push(commands.execute(establishHistoryBaselineCommand, (draft) => addNode(draft, 'unexpected')));
      attempts.push(commands.execute(undoCommand, undefined));
      attempts.push(commands.execute(redoCommand, undefined));
      addNode(transaction, 'baseline');
    });
    const results = await Promise.allSettled(attempts);
    expect(results).toHaveLength(3);
    for (const result of results)
      expect(result).toMatchObject({ status: 'rejected', reason: { code: 'HISTORY_BUSY' } });
    await baseline;
    expect(kernel.read().query.getNode(nodeId('unexpected'))).toBeUndefined();
    expect(history.getSnapshot()).toEqual({ canUndo: false, canRedo: false });

    kernel.transact((transaction) => addNode(transaction, 'new-edit'));
    const undo = commands.execute(undoCommand, undefined);
    await expect(commands.execute(establishHistoryBaselineCommand, () => {})).rejects.toMatchObject({
      code: 'HISTORY_BUSY',
    });
    await undo;
  } finally {
    await host.dispose();
  }
});

test('returns the committed baseline when a later observer aborts the caller', async () => {
  const { commands, history, host, kernel } = await activateHistory();
  try {
    kernel.transact((transaction) => addNode(transaction, 'old-history'));
    const controller = new AbortController();
    let observed: CanvasCommit | undefined;
    kernel.observeCommits((commit) => {
      observed = commit;
      controller.abort(new Error('Cancelled after commit.'));
    });
    const result = await commands.execute(
      establishHistoryBaselineCommand,
      (transaction) => addNode(transaction, 'imported'),
      { signal: controller.signal },
    );
    if (!observed) throw new Error('Expected the baseline Commit to reach its observer.');
    expect(result).toBe(observed);
    expect(result?.after).toBe(kernel.read());
    expect(history.getSnapshot()).toEqual({ canUndo: false, canRedo: false });
  } finally {
    await host.dispose();
  }
});

test('rejects a baseline when an earlier observer runs before History catches up', async () => {
  let attempt: Promise<CanvasCommit | null> | undefined;
  let invoked = false;
  const { history, host, kernel } = await activateHistory((kernel, commands) =>
    kernel.observeCommits(() => {
      if (attempt) return;
      attempt = commands.execute(establishHistoryBaselineCommand, () => {
        invoked = true;
      });
    }),
  );
  try {
    kernel.transact((transaction) => addNode(transaction, 'recorded'));
    await expect(attempt).rejects.toMatchObject({ code: 'HISTORY_NOT_CAUGHT_UP' });
    expect(invoked).toBe(false);
    expect(kernel.read().snapshot.revision).toBe(1);
    expect(history.getSnapshot()).toEqual({ canUndo: true, canRedo: false });
  } finally {
    await host.dispose();
  }
});

test('records an ordinary reentrant Commit after the exact baseline Commit', async () => {
  const { commands, history, host, kernel } = await activateHistory((kernel) =>
    kernel.observeCommits((commit) => {
      if (commit.changeSet.commandId === establishHistoryBaselineCommand.id) {
        kernel.transact((transaction) => addNode(transaction, 'reentrant-edit'));
      }
    }),
  );
  try {
    kernel.transact((transaction) => addNode(transaction, 'old-history'));
    const baseline = await commands.execute(establishHistoryBaselineCommand, (transaction) =>
      addNode(transaction, 'baseline'),
    );
    expect(baseline?.changeSet.revision).toBe(2);
    expect(kernel.read().snapshot.revision).toBe(3);
    expect(history.getSnapshot()).toEqual({ canUndo: true, canRedo: false });
    await commands.execute(undoCommand, undefined);
    expect(kernel.read().query.getNode(nodeId('reentrant-edit'))).toBeUndefined();
    expect(kernel.read().query.getNode(nodeId('baseline'))).toBeDefined();
    expect(history.getSnapshot()).toEqual({ canUndo: false, canRedo: true });
  } finally {
    await host.dispose();
  }
});

for (const disappearingProvider of ['kernel', 'command'] as const) {
  test(`settles a committed queued baseline when its ${disappearingProvider} Provider disappears`, async () => {
    const { commands, history, host, kernel, kernelProvider, commandProvider, historyInstallation } =
      await activateHistory();
    try {
      kernel.transact((transaction) => addNode(transaction, 'old-history'));
      let baseline: Promise<CanvasCommit | null> | undefined;
      let disposal: Promise<void> | undefined;
      kernel.observeCommits((commit) => {
        if (commit.changeSet.revision !== 2) return;
        baseline = commands.execute(establishHistoryBaselineCommand, (transaction) => addNode(transaction, 'imported'));
        disposal = (disappearingProvider === 'kernel' ? kernelProvider : commandProvider).dispose();
      });
      kernel.transact((transaction) => addNode(transaction, 'before-baseline'));
      if (!baseline || !disposal) throw new Error('Expected queued baseline and Provider disposal.');
      const [commit] = await Promise.all([baseline, disposal]);
      expect(commit?.changeSet.revision).toBe(3);
      expect(commit?.after.query.getNode(nodeId('imported'))).toBeDefined();
      expect(historyInstallation.getSnapshot().status).toBe('pending');
      expect(() => history.getSnapshot()).toThrow();
    } finally {
      await host.dispose();
    }
  });
}

function addNode(transaction: TransactionContext, id: string): void {
  transaction.nodes.add({ id: nodeId(id), type: 'task', position: { x: 0, y: 0 }, data: null });
}

async function activateHistory(beforeHistory?: (kernel: KernelService, commands: CommandService) => () => void) {
  let commands!: CommandService;
  let history!: HistoryService;
  let kernel!: KernelService;
  const host = createPluginHost();
  const consumer = definePlugin({
    requires: { commands: commandService, history: historyService, kernel: kernelService },
    setup(context) {
      commands = context.services.commands;
      history = context.services.history;
      kernel = context.services.kernel;
    },
  });
  const kernelProvider = host.install(kernelPlugin);
  const commandProvider = host.install(commandPlugin);
  if (beforeHistory) {
    const earlierObserver = host.install(
      definePlugin({
        requires: { commands: commandService, kernel: kernelService },
        setup(context) {
          context.own(beforeHistory(context.services.kernel, context.services.commands));
        },
      }),
    );
    await earlierObserver.whenActive();
  }
  const historyInstallation = host.install(historyPlugin);
  const consumerInstallation = host.install(consumer);
  await Promise.all([
    kernelProvider.whenActive(),
    commandProvider.whenActive(),
    historyInstallation.whenActive(),
    consumerInstallation.whenActive(),
  ]);
  return { commands, history, host, kernel, kernelProvider, commandProvider, historyInstallation };
}
