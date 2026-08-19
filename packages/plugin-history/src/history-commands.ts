import type { CanvasCommit } from '@cflow/kernel';
import { defineCommand } from '@cflow/plugin-command';

export const undoCommand = defineCommand<void, CanvasCommit>('history.undo');
export const redoCommand = defineCommand<void, CanvasCommit>('history.redo');
