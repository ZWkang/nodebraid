import type { CanvasCommit } from '@nodebraid/kernel';
import { defineCommand } from '@nodebraid/plugin-command';

export const undoCommand = defineCommand<void, CanvasCommit>('history.undo');
export const redoCommand = defineCommand<void, CanvasCommit>('history.redo');
