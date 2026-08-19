import { test } from 'bun:test';

import type { CanvasCommit } from '@cflow/kernel';
import type { Command } from '@cflow/plugin-command';
import { createPluginHost } from '@cflow/runtime-cordis';

import { historyPlugin, redoCommand, undoCommand, type HistoryService, type HistorySnapshot } from '../src';

test('keeps the public History seam narrow and type-safe', () => {
  const verifyServiceTypes = (service: HistoryService) => {
    const snapshot: HistorySnapshot = service.getSnapshot();
    service.subscribe(() => {});
    // @ts-expect-error History Snapshot is immutable.
    snapshot.canUndo = false;
    // @ts-expect-error Undo remains a Command rather than a Service method.
    service.undo();
    const undo: Command<void, CanvasCommit> = undoCommand;
    const redo: Command<void, CanvasCommit> = redoCommand;
    // @ts-expect-error Command input remains void.
    const wrongInput: Command<string, CanvasCommit> = undoCommand;
    void undo;
    void redo;
    void wrongInput;
  };
  const verifyPluginTypes = () => {
    const host = createPluginHost();
    host.install(historyPlugin);
    // @ts-expect-error The official History Plugin has no configuration.
    host.install(historyPlugin, {});
  };
  void verifyServiceTypes;
  void verifyPluginTypes;
});
