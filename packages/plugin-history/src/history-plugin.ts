import type { CanvasCommit, ChangeSet, TransactionContext } from '@nodebraid/kernel';
import { commandService, type CommandRegistration } from '@nodebraid/plugin-command';
import { kernelService } from '@nodebraid/plugin-kernel';
import { definePlugin, defineService } from '@nodebraid/runtime-cordis';

import type { HistoryService, HistorySnapshot } from './contracts';
import { historyDiagnosticEvents } from './diagnostic-events';
import { establishHistoryBaselineCommand, redoCommand, undoCommand } from './history-commands';
import { HistoryError } from './history-error';

interface PendingReplay extends PendingCommit<CanvasCommit> {
  readonly kind: 'replay';
  readonly direction: 'undo' | 'redo';
  readonly entry: ChangeSet;
}

interface PendingBaseline extends PendingCommit<CanvasCommit | null> {
  readonly kind: 'baseline';
}

interface PendingCommit<Result> {
  readonly commandId: string;
  readonly completion: Promise<Result>;
  readonly complete: (commit: Result) => void;
  readonly fail: (error: unknown) => void;
  state: PendingCommitState;
}

type PendingCommitState =
  | { readonly phase: 'transacting' }
  | { readonly phase: 'unchanged' }
  | { readonly phase: 'observed-before-return'; readonly observedCommit: CanvasCommit }
  | { readonly phase: 'committed'; readonly expectedCommit: CanvasCommit }
  | { readonly phase: 'observed'; readonly expectedCommit: CanvasCommit; readonly observedCommit: CanvasCommit };

export const historyService = defineService<HistoryService>('history');

export const historyPlugin = definePlugin({
  name: '@nodebraid/plugin-history',
  requires: { commands: commandService, kernel: kernelService },
  provides: { history: historyService },
  setup(context) {
    const commands = context.services.commands;
    const kernel = context.services.kernel;
    const undoEntries: ChangeSet[] = [];
    const redoEntries: ChangeSet[] = [];
    const listeners = new Set<() => void>();
    let snapshot = createSnapshot(false, false);
    let pendingOperation: PendingReplay | PendingBaseline | undefined;
    let observedRevision = kernel.read().snapshot.revision;
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    let undoRegistration: CommandRegistration | undefined;
    let redoRegistration: CommandRegistration | undefined;
    let baselineRegistration: CommandRegistration | undefined;

    const completeCommittedOperationAfterClose = (): void => {
      const operation = pendingOperation;
      if (!disposed || operation?.state.phase !== 'committed') return;
      pendingOperation = undefined;
      operation.complete(operation.state.expectedCommit);
    };
    const close = (): void => {
      if (disposed) return;
      disposed = true;
      listeners.clear();
      completeCommittedOperationAfterClose();
    };
    const releaseState = (): void => {
      undoEntries.length = 0;
      redoEntries.length = 0;
      pendingOperation = undefined;
    };
    context.signal.addEventListener('abort', close, { once: true });
    context.own(async () => {
      context.signal.removeEventListener('abort', close);
      close();
      const errors: unknown[] = [];
      try {
        unsubscribe?.();
      } catch (error) {
        errors.push(error);
      }
      for (const registration of [baselineRegistration, redoRegistration, undoRegistration]) {
        try {
          await registration?.dispose();
        } catch (error) {
          errors.push(error);
        }
      }
      releaseState();
      if (errors.length > 0) {
        throw new AggregateError(errors, 'History resource cleanup failed.');
      }
    });

    const assertActive = (): void => {
      if (disposed) {
        throw new HistoryError('SERVICE_DISPOSED', 'History Service Activation has been disposed.');
      }
    };

    const publishSnapshot = (): void => {
      const canUndo = undoEntries.length > 0;
      const canRedo = redoEntries.length > 0;
      if (snapshot.canUndo === canUndo && snapshot.canRedo === canRedo) return;
      snapshot = createSnapshot(canUndo, canRedo);
      for (const listener of Array.from(listeners)) {
        try {
          listener();
        } catch (error) {
          context.diagnostics.reportFault(error, {
            name: historyDiagnosticEvents.subscriberFault,
            attributes: { canUndo: snapshot.canUndo, canRedo: snapshot.canRedo },
          });
        }
      }
    };

    unsubscribe = kernel.observeCommits((commit) => {
      if (disposed) return;
      if (commit.changeSet.beforeRevision !== observedRevision) {
        throw new Error(
          `History expected Commit after revision ${observedRevision}, received ${commit.changeSet.beforeRevision}.`,
        );
      }
      observedRevision = commit.changeSet.revision;
      const operation = pendingOperation;
      const operationState = operation?.state;
      const matchesOperation =
        operation !== undefined &&
        operationState !== undefined &&
        (operationState.phase === 'transacting' ||
          (operationState.phase === 'committed' && operationState.expectedCommit === commit));
      if (matchesOperation) {
        operation.state =
          operationState.phase === 'committed'
            ? { phase: 'observed', expectedCommit: operationState.expectedCommit, observedCommit: commit }
            : { phase: 'observed-before-return', observedCommit: commit };
        if (operation.kind === 'baseline') {
          undoEntries.length = 0;
          redoEntries.length = 0;
        } else if (operation.direction === 'undo') {
          undoEntries.pop();
          redoEntries.push(operation.entry);
        } else {
          redoEntries.pop();
          undoEntries.push(operation.entry);
        }
        queueMicrotask(() => {
          if (
            operation.state.phase !== 'observed' ||
            operation.state.expectedCommit !== operation.state.observedCommit
          ) {
            if (pendingOperation === operation) pendingOperation = undefined;
            operation.fail(new Error('History observed a different Commit while executing its Command.'));
            return;
          }
          if (pendingOperation === operation) pendingOperation = undefined;
          operation.complete(commit);
        });
      } else {
        undoEntries.push(commit.changeSet);
        redoEntries.length = 0;
      }
      if (observedRevision === kernel.read().snapshot.revision) publishSnapshot();
    });

    const assertCanExecute = (commandId: string, signal: AbortSignal): void => {
      assertActive();
      signal.throwIfAborted();
      if (pendingOperation) {
        throw new HistoryError(
          'HISTORY_BUSY',
          'Another History Command is still in progress.',
          Object.freeze({ activeCommandId: pendingOperation.commandId, requestedCommandId: commandId }),
        );
      }
      const kernelRevision = kernel.read().snapshot.revision;
      if (observedRevision !== kernelRevision) {
        throw new HistoryError(
          'HISTORY_NOT_CAUGHT_UP',
          'History has not observed the current Kernel revision.',
          Object.freeze({ observedRevision, kernelRevision }),
        );
      }
    };

    const acceptCommittedOperation = (pending: PendingReplay | PendingBaseline, commit: CanvasCommit): void => {
      if (pending.state.phase === 'transacting') {
        pending.state = { phase: 'committed', expectedCommit: commit };
      } else if (pending.state.phase === 'observed-before-return') {
        pending.state = {
          phase: 'observed',
          expectedCommit: commit,
          observedCommit: pending.state.observedCommit,
        };
      } else {
        throw new Error(`History Command entered unexpected phase "${pending.state.phase}" before Transaction return.`);
      }
      completeCommittedOperationAfterClose();
    };

    const replay = (direction: 'undo' | 'redo', commandId: string, signal: AbortSignal): Promise<CanvasCommit> => {
      assertCanExecute(commandId, signal);
      const entries = direction === 'undo' ? undoEntries : redoEntries;
      const entry = entries.at(-1);
      if (!entry) {
        if (direction === 'redo') {
          throw new HistoryError('REDO_EMPTY', 'No History Entry is available to redo.');
        }
        throw new HistoryError('UNDO_EMPTY', 'No History Entry is available to undo.');
      }
      const pending: PendingReplay = {
        ...createPendingCommit<CanvasCommit>(commandId),
        kind: 'replay',
        direction,
        entry,
      };
      pendingOperation = pending;
      try {
        const commit = kernel.transact(
          (transaction) => transaction.applyChangeSet(entry, direction === 'undo' ? 'reverse' : 'forward'),
          { origin: 'history', commandId },
        );
        if (!commit) throw new Error(`${direction} replay did not produce a Canvas Commit.`);
        acceptCommittedOperation(pending, commit);
        return pending.completion;
      } catch (error) {
        if (pendingOperation === pending) pendingOperation = undefined;
        throw error;
      }
    };

    undoRegistration = commands.register(undoCommand, (_input, execution): Promise<CanvasCommit> => {
      return replay('undo', execution.commandId, execution.signal);
    });
    redoRegistration = commands.register(redoCommand, (_input, execution): Promise<CanvasCommit> => {
      return replay('redo', execution.commandId, execution.signal);
    });
    baselineRegistration = commands.register(
      establishHistoryBaselineCommand,
      (update: (transaction: TransactionContext) => void, execution): Promise<CanvasCommit | null> => {
        assertCanExecute(execution.commandId, execution.signal);
        const pending: PendingBaseline = {
          ...createPendingCommit<CanvasCommit | null>(execution.commandId),
          kind: 'baseline',
        };
        pendingOperation = pending;
        try {
          const commit = kernel.transact(update, { origin: 'history', commandId: execution.commandId });
          if (commit) {
            acceptCommittedOperation(pending, commit);
          } else {
            undoEntries.length = 0;
            redoEntries.length = 0;
            pending.state = { phase: 'unchanged' };
            if (!disposed) publishSnapshot();
            queueMicrotask(() => {
              if (pendingOperation === pending) pendingOperation = undefined;
              pending.complete(null);
            });
          }
          return pending.completion;
        } catch (error) {
          if (pendingOperation === pending) pendingOperation = undefined;
          throw error;
        }
      },
    );

    const service: HistoryService = Object.freeze({
      getSnapshot() {
        assertActive();
        return snapshot;
      },
      subscribe(listener: () => void): () => void {
        assertActive();
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    });
    return { history: service };
  },
});

function createSnapshot(canUndo: boolean, canRedo: boolean): HistorySnapshot {
  return Object.freeze({ canUndo, canRedo });
}

function createPendingCommit<Result>(commandId: string): PendingCommit<Result> {
  let complete!: (commit: Result) => void;
  let fail!: (error: unknown) => void;
  const completion = new Promise<Result>((resolve, reject) => {
    complete = resolve;
    fail = reject;
  });
  return { commandId, completion, complete, fail, state: { phase: 'transacting' } };
}
