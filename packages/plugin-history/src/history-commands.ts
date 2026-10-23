import type { CanvasCommit, TransactionContext } from '@nodebraid/kernel';
import { defineCommand } from '@nodebraid/plugin-command';

export const undoCommand = defineCommand<void, CanvasCommit>('history.undo');
export const redoCommand = defineCommand<void, CanvasCommit>('history.redo');
export const establishHistoryBaselineCommand = defineCommand<
  (transaction: TransactionContext) => void,
  CanvasCommit | null
>('history.establish-baseline');
