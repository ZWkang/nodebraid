import { describe, expect, test } from 'bun:test';

import { NodeBraidError, type DiagnosticEvent, type DiagnosticFault } from '@nodebraid/diagnostics';
import { nodeId, type CanvasCommit } from '@nodebraid/kernel';
import { commandPlugin, commandService, defineCommand, type CommandService } from '@nodebraid/plugin-command';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

import {
  HistoryError,
  historyDiagnosticEvents,
  historyPlugin,
  historyService,
  redoCommand,
  undoCommand,
  type HistoryService,
} from '../src';

describe('@nodebraid/plugin-history', () => {
  test('publishes the stable History diagnostic event catalog', () => {
    expect(historyDiagnosticEvents).toEqual({
      subscriberFault: 'nodebraid.plugin.history.subscriber.fault',
    });
  });

  test('records the first post-Baseline Commit and undoes it through Command Service', async () => {
    let kernel: KernelService | undefined;
    const kernelConsumer = definePlugin({
      requires: { kernel: kernelService },
      setup(context) {
        kernel = context.services.kernel;
      },
    });
    const host = createPluginHost();
    const kernelInstallation = host.install(kernelPlugin);
    const kernelConsumerInstallation = host.install(kernelConsumer);
    await Promise.all([kernelInstallation.whenActive(), kernelConsumerInstallation.whenActive()]);
    if (!kernel) throw new Error('Expected Kernel Service to activate.');
    kernel.transact((transaction) => {
      transaction.nodes.add({
        id: nodeId('baseline'),
        type: 'task',
        position: { x: -10, y: -10 },
        data: null,
      });
    });

    let commands: CommandService | undefined;
    let history: HistoryService | undefined;
    const historyConsumer = definePlugin({
      requires: { commands: commandService, history: historyService },
      setup(context) {
        commands = context.services.commands;
        history = context.services.history;
      },
    });
    const commandInstallation = host.install(commandPlugin);
    const historyInstallation = host.install(historyPlugin);
    const historyConsumerInstallation = host.install(historyConsumer);
    await Promise.all([
      commandInstallation.whenActive(),
      historyInstallation.whenActive(),
      historyConsumerInstallation.whenActive(),
    ]);
    if (!commands || !history) throw new Error('Expected History dependencies to activate.');

    expect(history.getSnapshot()).toEqual({ canUndo: false, canRedo: false });
    const task = {
      id: nodeId('task'),
      type: 'task',
      position: { x: 0, y: 0 },
      data: null,
    };
    kernel.transact((transaction) => transaction.nodes.add(task));
    expect(history.getSnapshot()).toEqual({ canUndo: true, canRedo: false });
    const beforeUndo = kernel.read();

    const undoCommit = await commands.execute(undoCommand, undefined);

    expect(undoCommit.changeSet).toEqual({
      beforeRevision: 2,
      revision: 3,
      origin: 'history',
      commandId: 'history.undo',
      changes: [{ entity: 'node', id: task.id, before: task, after: null }],
    });
    expect(undoCommit.before).toBe(beforeUndo);
    expect(undoCommit.after).toBe(kernel.read());
    expect(kernel.read().query.getNode(nodeId('baseline'))).toBeDefined();
    expect(kernel.read().query.getNode(nodeId('task'))).toBeUndefined();
    expect(history.getSnapshot()).toEqual({ canUndo: false, canRedo: true });

    await host.dispose();
  });

  test('redoes the most recently undone History Entry with diagnostic metadata', async () => {
    const { commands, history, host, kernel } = await activateHistory();
    const task = {
      id: nodeId('redo-task'),
      type: 'task',
      position: { x: 10, y: 20 },
      data: null,
    };
    kernel.transact((transaction) => transaction.nodes.add(task));
    await commands.execute(undoCommand, undefined);
    const beforeRedo = kernel.read();

    const redoCommit = await commands.execute(redoCommand, undefined);

    expect(redoCommit.changeSet).toEqual({
      beforeRevision: 2,
      revision: 3,
      origin: 'history',
      commandId: 'history.redo',
      changes: [{ entity: 'node', id: task.id, before: null, after: task }],
    });
    expect(redoCommit.before).toBe(beforeRedo);
    expect(redoCommit.after).toBe(kernel.read());
    expect(kernel.read().query.getNode(task.id)).toEqual(task);
    expect(history.getSnapshot()).toEqual({ canUndo: true, canRedo: false });
    await commands.execute(undoCommand, undefined);
    await expect(commands.execute(undoCommand, undefined)).rejects.toMatchObject({ code: 'UNDO_EMPTY' });

    await host.dispose();
  });

  test('records a Recordable Commit that uses History-like diagnostic metadata', async () => {
    const { commands, history, host, kernel } = await activateHistory();
    kernel.transact(
      (transaction) => {
        transaction.nodes.add({
          id: nodeId('history-metadata-is-diagnostic'),
          type: 'task',
          position: { x: 0, y: 0 },
          data: null,
        });
      },
      { origin: 'history', commandId: 'history.undo' },
    );

    expect(history.getSnapshot()).toEqual({ canUndo: true, canRedo: false });
    await commands.execute(undoCommand, undefined);
    expect(kernel.read().query.getNode(nodeId('history-metadata-is-diagnostic'))).toBeUndefined();

    await host.dispose();
  });

  test('records Command-originated work but not net-zero or failed Transactions', async () => {
    const { commands, history, host, kernel } = await activateHistory();
    const addFromCommand = defineCommand<void, CanvasCommit>('test.history.command-origin');
    const registration = commands.register(addFromCommand, (_input, execution) => {
      const commit = kernel.transact(
        (transaction) => {
          transaction.nodes.add({
            id: nodeId('command-originated'),
            type: 'task',
            position: { x: 0, y: 0 },
            data: null,
          });
        },
        { origin: 'command', commandId: execution.commandId },
      );
      if (!commit) throw new Error('Expected Command Transaction to commit.');
      return commit;
    });
    await commands.execute(addFromCommand, undefined);
    const recordedSnapshot = history.getSnapshot();

    expect(kernel.transact(() => {})).toBeNull();
    const transactionError = new Error('Transaction failed');
    expect(() =>
      kernel.transact(() => {
        throw transactionError;
      }),
    ).toThrow(transactionError);
    expect(history.getSnapshot()).toBe(recordedSnapshot);
    await commands.execute(undoCommand, undefined);
    await expect(commands.execute(undoCommand, undefined)).rejects.toMatchObject({ code: 'UNDO_EMPTY' });

    await registration.dispose();
    await host.dispose();
  });

  test('clears Redo when a new Recordable Commit creates a branch', async () => {
    const { commands, history, host, kernel } = await activateHistory();
    kernel.transact((transaction) => {
      transaction.nodes.add({
        id: nodeId('old-branch'),
        type: 'task',
        position: { x: 0, y: 0 },
        data: null,
      });
    });
    await commands.execute(undoCommand, undefined);
    kernel.transact((transaction) => {
      transaction.nodes.add({
        id: nodeId('new-branch'),
        type: 'task',
        position: { x: 1, y: 1 },
        data: null,
      });
    });

    expect(history.getSnapshot()).toEqual({ canUndo: true, canRedo: false });
    await expect(commands.execute(redoCommand, undefined)).rejects.toBeInstanceOf(HistoryError);
    await expect(commands.execute(redoCommand, undefined)).rejects.toMatchObject({ code: 'REDO_EMPTY' });

    await host.dispose();
  });

  test('rejects an empty Undo without changing Kernel or History', async () => {
    const { commands, history, host, kernel } = await activateHistory();
    const initialSnapshot = history.getSnapshot();

    await expect(commands.execute(undoCommand, undefined)).rejects.toBeInstanceOf(HistoryError);
    await expect(commands.execute(undoCommand, undefined)).rejects.toBeInstanceOf(NodeBraidError);
    await expect(commands.execute(undoCommand, undefined)).rejects.toMatchObject({
      domain: 'plugin.history',
      code: 'UNDO_EMPTY',
      details: {},
    });
    expect(kernel.read().snapshot.revision).toBe(0);
    expect(history.getSnapshot()).toBe(initialSnapshot);

    await host.dispose();
  });

  test('publishes only meaningful History Snapshot changes', async () => {
    const { history, host, kernel } = await activateHistory();
    const observedSnapshots: Array<ReturnType<HistoryService['getSnapshot']>> = [];
    const unsubscribe = history.subscribe(() => observedSnapshots.push(history.getSnapshot()));

    kernel.transact((transaction) => {
      transaction.nodes.add({ id: nodeId('first'), type: 'task', position: { x: 0, y: 0 }, data: null });
    });
    const firstUndoableSnapshot = history.getSnapshot();
    kernel.transact((transaction) => {
      transaction.nodes.add({ id: nodeId('second'), type: 'task', position: { x: 1, y: 1 }, data: null });
    });

    expect(observedSnapshots).toEqual([{ canUndo: true, canRedo: false }]);
    expect(history.getSnapshot()).toBe(firstUndoableSnapshot);
    unsubscribe();
    unsubscribe();

    await host.dispose();
  });

  test('snapshots subscriber recipients and isolates their errors', async () => {
    const listenerError = new Error('History subscriber failed');
    const events: DiagnosticEvent[] = [];
    const faults: DiagnosticFault[] = [];
    const platformErrors: unknown[] = [];
    const originalReportError = Object.getOwnPropertyDescriptor(globalThis, 'reportError');
    Object.defineProperty(globalThis, 'reportError', {
      configurable: true,
      value: (error: unknown) => platformErrors.push(error),
    });
    const diagnosticsHost = createPluginHost({
      diagnostics: {
        hostId: 'history-host',
        sink: (event) => events.push(event),
        faultReporter: (fault) => faults.push(fault),
      },
    });
    const { commands, history, host, kernel } = await activateHistory(diagnosticsHost);

    try {
      const deliveries: string[] = [];
      let addedLateSubscriber = false;
      let unsubscribeRemoved!: () => void;
      history.subscribe(() => {
        deliveries.push('first');
        if (!addedLateSubscriber) {
          addedLateSubscriber = true;
          history.subscribe(() => deliveries.push('late'));
        }
        unsubscribeRemoved();
      });
      history.subscribe(() => {
        deliveries.push('failing');
        throw listenerError;
      });
      unsubscribeRemoved = history.subscribe(() => deliveries.push('removed'));
      history.subscribe(() => deliveries.push('last'));

      kernel.transact((transaction) => {
        transaction.nodes.add({ id: nodeId('subscribed'), type: 'task', position: { x: 0, y: 0 }, data: null });
      });
      expect(deliveries).toEqual(['first', 'failing', 'removed', 'last']);

      deliveries.length = 0;
      await commands.execute(undoCommand, undefined);
      expect(deliveries).toEqual(['first', 'failing', 'last', 'late']);
      expect(platformErrors).toEqual([]);
      expect(faults.map((fault) => fault.error)).toEqual([listenerError, listenerError]);
      expect(
        events
          .filter((event) => event.name === 'nodebraid.plugin.history.subscriber.fault')
          .map((event) => ({ scope: event.scope, attributes: event.attributes })),
      ).toEqual([
        {
          scope: {
            hostId: 'history-host',
            installationId: 'history-host.installation.3',
            activationId: expect.any(String),
            pluginName: '@nodebraid/plugin-history',
          },
          attributes: { canUndo: true, canRedo: false },
        },
        {
          scope: {
            hostId: 'history-host',
            installationId: 'history-host.installation.3',
            activationId: expect.any(String),
            pluginName: '@nodebraid/plugin-history',
          },
          attributes: { canUndo: false, canRedo: true },
        },
      ]);
    } finally {
      await host.dispose();
      if (originalReportError) {
        Object.defineProperty(globalThis, 'reportError', originalReportError);
      } else {
        Reflect.deleteProperty(globalThis, 'reportError');
      }
    }
  });

  test('allows an aligned Recordable Commit subscriber to Undo immediately', async () => {
    const { commands, history, host, kernel } = await activateHistory();
    let undoAttempt: Promise<CanvasCommit> | undefined;
    history.subscribe(() => {
      if (!history.getSnapshot().canUndo || undoAttempt) return;
      undoAttempt = commands.execute(undoCommand, undefined);
    });

    kernel.transact((transaction) => {
      transaction.nodes.add({
        id: nodeId('subscriber-recordable-commit'),
        type: 'task',
        position: { x: 0, y: 0 },
        data: null,
      });
    });
    if (!undoAttempt) throw new Error('Expected aligned subscriber to execute Undo.');

    await expect(undoAttempt).resolves.toMatchObject({ changeSet: { revision: 2, commandId: 'history.undo' } });
    expect(kernel.read().query.getNode(nodeId('subscriber-recordable-commit'))).toBeUndefined();
    expect(history.getSnapshot()).toEqual({ canUndo: false, canRedo: true });

    await host.dispose();
  });

  test('rejects Undo before History catches up to the current Kernel revision', async () => {
    let commands: CommandService | undefined;
    let kernel: KernelService | undefined;
    let undoAttempt: Promise<unknown> | undefined;
    let attemptUndo = false;
    const earlierObserver = definePlugin({
      requires: { commands: commandService, kernel: kernelService },
      setup(context) {
        commands = context.services.commands;
        kernel = context.services.kernel;
        const unsubscribe = kernel.observeCommits(() => {
          if (!attemptUndo) return;
          attemptUndo = false;
          undoAttempt = commands?.execute(undoCommand, undefined);
        });
        context.own(unsubscribe);
      },
    });
    const host = createPluginHost();
    const prerequisiteInstallations = [
      host.install(kernelPlugin),
      host.install(commandPlugin),
      host.install(earlierObserver),
    ];
    await Promise.all(prerequisiteInstallations.map((installation) => installation.whenActive()));
    if (!commands || !kernel) throw new Error('Expected earlier Observer dependencies to activate.');
    const historyInstallation = host.install(historyPlugin);
    await historyInstallation.whenActive();
    kernel.transact((transaction) => {
      transaction.nodes.add({ id: nodeId('already-recorded'), type: 'task', position: { x: 0, y: 0 }, data: null });
    });

    attemptUndo = true;
    kernel.transact((transaction) => {
      transaction.nodes.add({ id: nodeId('not-yet-observed'), type: 'task', position: { x: 1, y: 1 }, data: null });
    });
    if (!undoAttempt) throw new Error('Expected earlier Observer to attempt Undo.');

    await expect(undoAttempt).rejects.toMatchObject({
      code: 'HISTORY_NOT_CAUGHT_UP',
      details: { observedRevision: 1, kernelRevision: 2 },
    });
    expect(kernel.read().snapshot.revision).toBe(2);
    expect(kernel.read().query.getNode(nodeId('already-recorded'))).toBeDefined();
    expect(kernel.read().query.getNode(nodeId('not-yet-observed'))).toBeDefined();

    await host.dispose();
  });

  test('keeps one queued Replay in flight and rejects a reentrant second Undo', async () => {
    const { commands, history, host, kernel } = await activateHistory();
    kernel.transact((transaction) => {
      transaction.nodes.add({ id: nodeId('first-entry'), type: 'task', position: { x: 0, y: 0 }, data: null });
    });
    let firstUndo: Promise<unknown> | undefined;
    let secondUndo: Promise<unknown> | undefined;
    const lateCancellation = new AbortController();
    const unsubscribe = kernel.observeCommits((commit) => {
      if (commit.changeSet.revision !== 2) return;
      firstUndo = commands.execute(undoCommand, undefined, { signal: lateCancellation.signal });
      lateCancellation.abort(new Error('Replay already committed'));
      secondUndo = commands.execute(undoCommand, undefined);
      void secondUndo.catch(() => {});
    });
    kernel.transact((transaction) => {
      transaction.nodes.add({ id: nodeId('queued-replay'), type: 'task', position: { x: 1, y: 1 }, data: null });
    });
    if (!firstUndo || !secondUndo) throw new Error('Expected Observer to execute Undo twice.');

    await expect(firstUndo).resolves.toMatchObject({ changeSet: { revision: 3, commandId: 'history.undo' } });
    await expect(secondUndo).rejects.toMatchObject({
      code: 'HISTORY_BUSY',
      details: { activeCommandId: 'history.undo', requestedCommandId: 'history.undo' },
    });
    expect(kernel.read().query.getNode(nodeId('first-entry'))).toBeDefined();
    expect(kernel.read().query.getNode(nodeId('queued-replay'))).toBeUndefined();
    expect(history.getSnapshot()).toEqual({ canUndo: true, canRedo: true });

    unsubscribe();
    await host.dispose();
  });

  test('records a reentrant Recordable Commit and publishes only after catching up', async () => {
    let kernel: KernelService | undefined;
    let addReentrantCommit = false;
    const earlierObserver = definePlugin({
      requires: { kernel: kernelService },
      setup(context) {
        kernel = context.services.kernel;
        const unsubscribe = kernel.observeCommits((commit) => {
          if (!addReentrantCommit || commit.changeSet.commandId !== 'history.undo') return;
          addReentrantCommit = false;
          kernel?.transact((transaction) => {
            transaction.nodes.add({
              id: nodeId('reentrant-recordable'),
              type: 'task',
              position: { x: 2, y: 2 },
              data: null,
            });
          });
        });
        context.own(unsubscribe);
      },
    });
    const host = createPluginHost();
    const prerequisiteInstallations = [
      host.install(kernelPlugin),
      host.install(commandPlugin),
      host.install(earlierObserver),
    ];
    await Promise.all(prerequisiteInstallations.map((installation) => installation.whenActive()));
    if (!kernel) throw new Error('Expected Kernel Service to activate.');

    let commands: CommandService | undefined;
    let history: HistoryService | undefined;
    const consumer = definePlugin({
      requires: { commands: commandService, history: historyService },
      setup(context) {
        commands = context.services.commands;
        history = context.services.history;
      },
    });
    const historyInstallation = host.install(historyPlugin);
    const consumerInstallation = host.install(consumer);
    await Promise.all([historyInstallation.whenActive(), consumerInstallation.whenActive()]);
    if (!commands || !history) throw new Error('Expected History to activate.');
    kernel.transact((transaction) => {
      transaction.nodes.add({ id: nodeId('original-entry'), type: 'task', position: { x: 0, y: 0 }, data: null });
    });
    const originalSnapshot = history.getSnapshot();
    const observedSnapshots: Array<ReturnType<HistoryService['getSnapshot']>> = [];
    history.subscribe(() => observedSnapshots.push(history!.getSnapshot()));

    addReentrantCommit = true;
    const undoCommit = await commands.execute(undoCommand, undefined);

    expect(undoCommit.changeSet.revision).toBe(2);
    expect(kernel.read().snapshot.revision).toBe(3);
    expect(kernel.read().query.getNode(nodeId('original-entry'))).toBeUndefined();
    expect(kernel.read().query.getNode(nodeId('reentrant-recordable'))).toBeDefined();
    expect(history.getSnapshot()).toBe(originalSnapshot);
    expect(observedSnapshots).toEqual([]);
    await expect(commands.execute(redoCommand, undefined)).rejects.toMatchObject({ code: 'REDO_EMPTY' });

    await host.dispose();
  });

  test('keeps Replay busy while publishing its History Snapshot', async () => {
    const { commands, history, host, kernel } = await activateHistory();
    kernel.transact((transaction) => {
      transaction.nodes.add({ id: nodeId('subscriber-replay'), type: 'task', position: { x: 0, y: 0 }, data: null });
    });
    let nestedRedo: Promise<unknown> | undefined;
    history.subscribe(() => {
      if (!history.getSnapshot().canRedo || nestedRedo) return;
      nestedRedo = commands.execute(redoCommand, undefined);
      void nestedRedo.catch(() => {});
    });

    await commands.execute(undoCommand, undefined);
    if (!nestedRedo) throw new Error('Expected subscriber to attempt a nested Redo.');

    await expect(nestedRedo).rejects.toMatchObject({ code: 'HISTORY_BUSY' });
    expect(kernel.read().query.getNode(nodeId('subscriber-replay'))).toBeUndefined();
    expect(history.getSnapshot()).toEqual({ canUndo: false, canRedo: true });

    await host.dispose();
  });

  test('keeps Replay busy through later Kernel Observers', async () => {
    const { commands, history, host, kernel } = await activateHistory();
    kernel.transact((transaction) => {
      transaction.nodes.add({ id: nodeId('first-later-observer'), type: 'task', position: { x: 0, y: 0 }, data: null });
    });
    kernel.transact((transaction) => {
      transaction.nodes.add({
        id: nodeId('second-later-observer'),
        type: 'task',
        position: { x: 1, y: 1 },
        data: null,
      });
    });
    let nestedUndo: Promise<unknown> | undefined;
    const unsubscribe = kernel.observeCommits((commit) => {
      if (commit.changeSet.commandId !== 'history.undo' || nestedUndo) return;
      nestedUndo = commands.execute(undoCommand, undefined);
      void nestedUndo.catch(() => {});
    });

    await commands.execute(undoCommand, undefined);
    if (!nestedUndo) throw new Error('Expected later Observer to attempt a nested Undo.');

    await expect(nestedUndo).rejects.toMatchObject({ code: 'HISTORY_BUSY' });
    expect(kernel.read().snapshot.revision).toBe(3);
    expect(kernel.read().query.getNode(nodeId('first-later-observer'))).toBeDefined();
    expect(kernel.read().query.getNode(nodeId('second-later-observer'))).toBeUndefined();
    expect(history.getSnapshot()).toEqual({ canUndo: true, canRedo: true });

    unsubscribe();
    await host.dispose();
  });

  test('returns the exact Replay Commit delivered to Kernel Observers', async () => {
    const { commands, host, kernel } = await activateHistory();
    kernel.transact((transaction) => {
      transaction.nodes.add({ id: nodeId('exact-replay-commit'), type: 'task', position: { x: 0, y: 0 }, data: null });
    });
    let observedReplay: CanvasCommit | undefined;
    const unsubscribe = kernel.observeCommits((commit) => {
      if (commit.changeSet.commandId === 'history.undo') observedReplay = commit;
    });

    const returnedReplay = await commands.execute(undoCommand, undefined);

    if (!observedReplay) throw new Error('Expected Kernel Observer to receive Replay Commit.');
    expect(returnedReplay).toBe(observedReplay);
    unsubscribe();
    await host.dispose();
  });

  test('keeps Replay busy through the final caught-up Snapshot publication', async () => {
    let kernel: KernelService | undefined;
    let addReentrantCommit = false;
    const earlierObserver = definePlugin({
      requires: { kernel: kernelService },
      setup(context) {
        kernel = context.services.kernel;
        const unsubscribe = kernel.observeCommits((commit) => {
          if (!addReentrantCommit || commit.changeSet.commandId !== 'history.redo') return;
          addReentrantCommit = false;
          kernel?.transact((transaction) => {
            transaction.nodes.add({
              id: nodeId('redo-reentrant-recordable'),
              type: 'task',
              position: { x: 2, y: 2 },
              data: null,
            });
          });
        });
        context.own(unsubscribe);
      },
    });
    const host = createPluginHost();
    const prerequisiteInstallations = [
      host.install(kernelPlugin),
      host.install(commandPlugin),
      host.install(earlierObserver),
    ];
    await Promise.all(prerequisiteInstallations.map((installation) => installation.whenActive()));
    if (!kernel) throw new Error('Expected Kernel Service to activate.');

    let commands: CommandService | undefined;
    let history: HistoryService | undefined;
    const consumer = definePlugin({
      requires: { commands: commandService, history: historyService },
      setup(context) {
        commands = context.services.commands;
        history = context.services.history;
      },
    });
    const historyInstallation = host.install(historyPlugin);
    const consumerInstallation = host.install(consumer);
    await Promise.all([historyInstallation.whenActive(), consumerInstallation.whenActive()]);
    if (!commands || !history) throw new Error('Expected History to activate.');
    kernel.transact((transaction) => {
      transaction.nodes.add({ id: nodeId('redo-first-entry'), type: 'task', position: { x: 0, y: 0 }, data: null });
    });
    kernel.transact((transaction) => {
      transaction.nodes.add({ id: nodeId('redo-second-entry'), type: 'task', position: { x: 1, y: 1 }, data: null });
    });
    await commands.execute(undoCommand, undefined);
    let nestedUndo: Promise<unknown> | undefined;
    history.subscribe(() => {
      if (history?.getSnapshot().canRedo !== false || nestedUndo) return;
      nestedUndo = commands?.execute(undoCommand, undefined);
      void nestedUndo?.catch(() => {});
    });

    addReentrantCommit = true;
    await commands.execute(redoCommand, undefined);
    if (!nestedUndo) throw new Error('Expected caught-up subscriber to attempt Undo.');

    await expect(nestedUndo).rejects.toMatchObject({ code: 'HISTORY_BUSY' });
    expect(kernel.read().snapshot.revision).toBe(5);
    expect(kernel.read().query.getNode(nodeId('redo-first-entry'))).toBeDefined();
    expect(kernel.read().query.getNode(nodeId('redo-second-entry'))).toBeDefined();
    expect(kernel.read().query.getNode(nodeId('redo-reentrant-recordable'))).toBeDefined();
    expect(history.getSnapshot()).toEqual({ canUndo: true, canRedo: false });

    await host.dispose();
  });

  test('settles a committed queued Replay when Kernel Provider disappears before delivery', async () => {
    await expectCommittedQueuedReplayToSettleWhenProviderDisappears('kernel');
  });

  test('settles a committed queued Replay when Command Provider disappears before delivery', async () => {
    await expectCommittedQueuedReplayToSettleWhenProviderDisappears('command');
  });

  test('preserves caller cancellation before starting a Replay', async () => {
    const { commands, history, host, kernel } = await activateHistory();
    kernel.transact((transaction) => {
      transaction.nodes.add({ id: nodeId('cancelled-replay'), type: 'task', position: { x: 0, y: 0 }, data: null });
    });
    const snapshot = history.getSnapshot();
    const cancellation = new Error('Caller cancelled Undo');
    const controller = new AbortController();
    controller.abort(cancellation);

    await expect(commands.execute(undoCommand, undefined, { signal: controller.signal })).rejects.toBe(cancellation);
    expect(kernel.read().snapshot.revision).toBe(1);
    expect(kernel.read().query.getNode(nodeId('cancelled-replay'))).toBeDefined();
    expect(history.getSnapshot()).toBe(snapshot);

    await host.dispose();
  });

  test('prioritizes caller cancellation over an empty Undo stack', async () => {
    const { commands, history, host, kernel } = await activateHistory();
    const snapshot = history.getSnapshot();
    const cancellation = new Error('Cancelled before empty-stack validation');
    const controller = new AbortController();
    controller.abort(cancellation);

    await expect(commands.execute(undoCommand, undefined, { signal: controller.signal })).rejects.toBe(cancellation);
    expect(kernel.read().snapshot.revision).toBe(0);
    expect(history.getSnapshot()).toBe(snapshot);

    await host.dispose();
  });

  test('closes old History state and reactivates from a fresh Kernel Baseline', async () => {
    const commands: CommandService[] = [];
    const histories: HistoryService[] = [];
    const kernels: KernelService[] = [];
    const consumer = definePlugin({
      requires: { commands: commandService, history: historyService, kernel: kernelService },
      setup(context) {
        commands.push(context.services.commands);
        histories.push(context.services.history);
        kernels.push(context.services.kernel);
      },
    });
    const host = createPluginHost();
    const firstKernelProvider = host.install(kernelPlugin);
    const commandProvider = host.install(commandPlugin);
    const historyInstallation = host.install(historyPlugin);
    const consumerInstallation = host.install(consumer);
    await Promise.all([
      firstKernelProvider.whenActive(),
      commandProvider.whenActive(),
      historyInstallation.whenActive(),
      consumerInstallation.whenActive(),
    ]);
    const oldHistory = histories[0]!;
    kernels[0]!.transact((transaction) => {
      transaction.nodes.add({ id: nodeId('old-activation'), type: 'task', position: { x: 0, y: 0 }, data: null });
    });

    let markHistoryPending!: () => void;
    const historyPending = new Promise<void>((resolve) => {
      markHistoryPending = resolve;
    });
    const unsubscribeStatus = historyInstallation.subscribe(() => {
      if (historyInstallation.getSnapshot().status === 'pending') markHistoryPending();
    });
    const providerDisposal = firstKernelProvider.dispose();
    await historyPending;
    unsubscribeStatus();
    const cleanupWindowAttempt = commands[0]!.execute(undoCommand, undefined);
    void cleanupWindowAttempt.catch(() => {});
    await expect(cleanupWindowAttempt).rejects.toMatchObject({ code: 'SERVICE_DISPOSED' });
    await providerDisposal;

    expect(historyInstallation.getSnapshot().status).toBe('pending');
    expect(() => oldHistory.getSnapshot()).toThrow(HistoryError);
    expect(() => oldHistory.subscribe(() => {})).toThrow(HistoryError);
    await expect(commands[0]!.execute(undoCommand, undefined)).rejects.toMatchObject({ code: 'COMMAND_NOT_FOUND' });

    const nextHistoryActivation = historyInstallation.whenActive();
    const nextConsumerActivation = consumerInstallation.whenActive();
    const secondKernelProvider = host.install(kernelPlugin);
    await Promise.all([secondKernelProvider.whenActive(), nextHistoryActivation, nextConsumerActivation]);

    expect(histories[1]).not.toBe(oldHistory);
    expect(histories[1]!.getSnapshot()).toEqual({ canUndo: false, canRedo: false });
    expect(kernels[1]!.read().snapshot.revision).toBe(0);

    await host.dispose();
  });

  test('starts a new Baseline when Command Service returns to a retained Kernel', async () => {
    const commands: CommandService[] = [];
    const histories: HistoryService[] = [];
    const kernels: KernelService[] = [];
    const consumer = definePlugin({
      requires: { commands: commandService, history: historyService, kernel: kernelService },
      setup(context) {
        commands.push(context.services.commands);
        histories.push(context.services.history);
        kernels.push(context.services.kernel);
      },
    });
    const host = createPluginHost();
    const kernelProvider = host.install(kernelPlugin);
    const firstCommandProvider = host.install(commandPlugin);
    const historyInstallation = host.install(historyPlugin);
    const consumerInstallation = host.install(consumer);
    await Promise.all([
      kernelProvider.whenActive(),
      firstCommandProvider.whenActive(),
      historyInstallation.whenActive(),
      consumerInstallation.whenActive(),
    ]);
    const retainedKernel = kernels[0]!;
    retainedKernel.transact((transaction) => {
      transaction.nodes.add({ id: nodeId('before-command-loss'), type: 'task', position: { x: 0, y: 0 }, data: null });
    });

    await firstCommandProvider.dispose();
    expect(() => histories[0]!.getSnapshot()).toThrow(HistoryError);
    await expect(commands[0]!.execute(undoCommand, undefined)).rejects.toMatchObject({ code: 'SERVICE_DISPOSED' });
    retainedKernel.transact((transaction) => {
      transaction.nodes.add({
        id: nodeId('while-history-pending'),
        type: 'task',
        position: { x: 1, y: 1 },
        data: null,
      });
    });

    const nextHistoryActivation = historyInstallation.whenActive();
    const nextConsumerActivation = consumerInstallation.whenActive();
    const secondCommandProvider = host.install(commandPlugin);
    await Promise.all([secondCommandProvider.whenActive(), nextHistoryActivation, nextConsumerActivation]);

    expect(kernels[1]).toBe(retainedKernel);
    expect(retainedKernel.read().snapshot.revision).toBe(2);
    expect(histories[1]!.getSnapshot()).toEqual({ canUndo: false, canRedo: false });
    retainedKernel.transact((transaction) => {
      transaction.nodes.add({ id: nodeId('after-reactivation'), type: 'task', position: { x: 2, y: 2 }, data: null });
    });
    expect(histories[1]!.getSnapshot()).toEqual({ canUndo: true, canRedo: false });

    await host.dispose();
  });
});

async function expectCommittedQueuedReplayToSettleWhenProviderDisappears(
  disappearingProvider: 'kernel' | 'command',
): Promise<void> {
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
  const kernelProvider = host.install(kernelPlugin);
  const commandProvider = host.install(commandPlugin);
  const historyInstallation = host.install(historyPlugin);
  const consumerInstallation = host.install(consumer);
  await Promise.all([
    kernelProvider.whenActive(),
    commandProvider.whenActive(),
    historyInstallation.whenActive(),
    consumerInstallation.whenActive(),
  ]);
  if (!commands || !kernel) throw new Error('Expected Replay dependencies to activate.');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: nodeId('provider-loss-retained-entry'),
      type: 'task',
      position: { x: 0, y: 0 },
      data: null,
    });
  });
  let replay: Promise<CanvasCommit> | undefined;
  let providerDisposal: Promise<void> | undefined;
  const unsubscribe = kernel.observeCommits((commit) => {
    if (commit.changeSet.revision !== 2 || replay) return;
    replay = commands?.execute(undoCommand, undefined);
    providerDisposal = (disappearingProvider === 'kernel' ? kernelProvider : commandProvider).dispose();
  });

  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: nodeId('queued-before-provider-loss'),
      type: 'task',
      position: { x: 1, y: 1 },
      data: null,
    });
  });
  if (!replay || !providerDisposal) throw new Error('Expected queued Replay and Provider disposal.');
  const [replayCommit] = await Promise.all([replay, providerDisposal]);

  expect(replayCommit.changeSet.revision).toBe(3);
  expect(historyInstallation.getSnapshot().status).toBe('pending');

  unsubscribe();
  await host.dispose();
}

async function activateHistory(host: ReturnType<typeof createPluginHost> = createPluginHost()): Promise<{
  readonly commands: CommandService;
  readonly history: HistoryService;
  readonly host: ReturnType<typeof createPluginHost>;
  readonly kernel: KernelService;
}> {
  let commands: CommandService | undefined;
  let history: HistoryService | undefined;
  let kernel: KernelService | undefined;
  const consumer = definePlugin({
    requires: { commands: commandService, history: historyService, kernel: kernelService },
    setup(context) {
      commands = context.services.commands;
      history = context.services.history;
      kernel = context.services.kernel;
    },
  });
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(historyPlugin),
    host.install(consumer),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!commands || !history || !kernel) throw new Error('Expected History dependencies to activate.');
  return { commands, history, host, kernel };
}
