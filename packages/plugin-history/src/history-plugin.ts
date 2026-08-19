import type { CanvasCommit, ChangeSet } from '@cflow/kernel';
import { commandService, type CommandRegistration } from '@cflow/plugin-command';
import { kernelService } from '@cflow/plugin-kernel';
import { definePlugin, defineService } from '@cflow/runtime-cordis';

import type { HistoryService, HistorySnapshot } from './contracts';
import { historyDiagnosticEvents } from './diagnostic-events';
import { redoCommand, undoCommand } from './history-commands';
import { HistoryError } from './history-error';

interface PendingReplay {
  readonly direction: 'undo' | 'redo';
  readonly entry: ChangeSet;
  readonly commandId: string;
  readonly completion: Promise<CanvasCommit>;
  readonly complete: (commit: CanvasCommit) => void;
  readonly fail: (error: unknown) => void;
  state: PendingReplayState;
}

type PendingReplayState =
  | { readonly phase: 'transacting' }
  | { readonly phase: 'observed-before-return'; readonly observedCommit: CanvasCommit }
  | { readonly phase: 'committed'; readonly expectedCommit: CanvasCommit }
  | { readonly phase: 'observed'; readonly expectedCommit: CanvasCommit; readonly observedCommit: CanvasCommit };

export const historyService = defineService<HistoryService>('history');

export const historyPlugin = definePlugin({
  name: '@cflow/plugin-history',
  requires: { commands: commandService, kernel: kernelService },
  provides: { history: historyService },
  setup(context) {
    const commands = context.services.commands;
    const kernel = context.services.kernel;
    const undoEntries: ChangeSet[] = [];
    const redoEntries: ChangeSet[] = [];
    const listeners = new Set<() => void>();
    let snapshot = createSnapshot(false, false);
    let pendingReplay: PendingReplay | undefined;
    let observedRevision = kernel.read().snapshot.revision;
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    let undoRegistration: CommandRegistration | undefined;
    let redoRegistration: CommandRegistration | undefined;

    const completeCommittedReplayAfterClose = (): void => {
      const replay = pendingReplay;
      if (!disposed || replay?.state.phase !== 'committed') return;
      pendingReplay = undefined;
      replay.complete(replay.state.expectedCommit);
    };
    const close = (): void => {
      if (disposed) return;
      disposed = true;
      listeners.clear();
      completeCommittedReplayAfterClose();
    };
    const releaseState = (): void => {
      undoEntries.length = 0;
      redoEntries.length = 0;
      pendingReplay = undefined;
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
      for (const registration of [redoRegistration, undoRegistration]) {
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
      const replay = pendingReplay;
      const replayState = replay?.state;
      const matchesReplay =
        replay !== undefined &&
        replayState !== undefined &&
        (replayState.phase === 'transacting' ||
          (replayState.phase === 'committed' && replayState.expectedCommit === commit));
      if (matchesReplay) {
        replay.state =
          replayState.phase === 'committed'
            ? { phase: 'observed', expectedCommit: replayState.expectedCommit, observedCommit: commit }
            : { phase: 'observed-before-return', observedCommit: commit };
        if (replay.direction === 'undo') {
          undoEntries.pop();
          redoEntries.push(replay.entry);
        } else {
          redoEntries.pop();
          undoEntries.push(replay.entry);
        }
        queueMicrotask(() => {
          if (replay.state.phase !== 'observed' || replay.state.expectedCommit !== replay.state.observedCommit) {
            if (pendingReplay === replay) pendingReplay = undefined;
            replay.fail(new Error('History observed a different Commit while replaying a Change Set.'));
            return;
          }
          if (pendingReplay === replay) pendingReplay = undefined;
          replay.complete(commit);
        });
      } else {
        undoEntries.push(commit.changeSet);
        redoEntries.length = 0;
      }
      if (observedRevision === kernel.read().snapshot.revision) publishSnapshot();
    });

    const replay = (direction: 'undo' | 'redo', commandId: string, signal: AbortSignal): Promise<CanvasCommit> => {
      assertActive();
      signal.throwIfAborted();
      if (pendingReplay) {
        throw new HistoryError(
          'HISTORY_BUSY',
          'Another History replay is still in progress.',
          Object.freeze({ activeCommandId: pendingReplay.commandId, requestedCommandId: commandId }),
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
      const entries = direction === 'undo' ? undoEntries : redoEntries;
      const entry = entries.at(-1);
      if (!entry) {
        if (direction === 'redo') {
          throw new HistoryError('REDO_EMPTY', 'No History Entry is available to redo.');
        }
        throw new HistoryError('UNDO_EMPTY', 'No History Entry is available to undo.');
      }
      const pending = createPendingReplay(direction, entry, commandId);
      pendingReplay = pending;
      try {
        const commit = kernel.transact(
          (transaction) => transaction.applyChangeSet(entry, direction === 'undo' ? 'reverse' : 'forward'),
          { origin: 'history', commandId },
        );
        if (!commit) throw new Error(`${direction} replay did not produce a Canvas Commit.`);
        if (pending.state.phase === 'transacting') {
          pending.state = { phase: 'committed', expectedCommit: commit };
        } else if (pending.state.phase === 'observed-before-return') {
          pending.state = {
            phase: 'observed',
            expectedCommit: commit,
            observedCommit: pending.state.observedCommit,
          };
        } else {
          throw new Error(
            `History Replay entered unexpected phase "${pending.state.phase}" before Transaction return.`,
          );
        }
        completeCommittedReplayAfterClose();
        return pending.completion;
      } catch (error) {
        if (pendingReplay === pending) pendingReplay = undefined;
        throw error;
      }
    };

    undoRegistration = commands.register(undoCommand, (_input, execution): Promise<CanvasCommit> => {
      return replay('undo', execution.commandId, execution.signal);
    });
    redoRegistration = commands.register(redoCommand, (_input, execution): Promise<CanvasCommit> => {
      return replay('redo', execution.commandId, execution.signal);
    });

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

function createPendingReplay(
  direction: PendingReplay['direction'],
  entry: ChangeSet,
  commandId: string,
): PendingReplay {
  let complete!: (commit: CanvasCommit) => void;
  let fail!: (error: unknown) => void;
  const completion = new Promise<CanvasCommit>((resolve, reject) => {
    complete = resolve;
    fail = reject;
  });
  return { direction, entry, commandId, completion, complete, fail, state: { phase: 'transacting' } };
}
