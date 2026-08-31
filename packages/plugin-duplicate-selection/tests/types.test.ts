import { test } from 'bun:test';

import type { CanvasCommit, EdgeId, NodeId } from '@nodebraid/kernel';
import type { Command } from '@nodebraid/plugin-command';
import type { Plugin } from '@nodebraid/runtime-cordis';

import {
  createDuplicateSelectionPlugin,
  createDuplicateSelectionShortcutPlugin,
  duplicateSelectionCommand,
  type DuplicateIdMaterializer,
} from '../src';

test('publishes typed Duplicate Selection behavior and Shortcut Plugins', () => {
  const materializeIds: DuplicateIdMaterializer = ({ nodeIds, edgeIds }) => ({
    nodes: nodeIds.map((sourceId): Readonly<{ sourceId: NodeId; duplicateId: NodeId }> => ({
      sourceId,
      duplicateId: `${sourceId}-copy` as NodeId,
    })),
    edges: edgeIds.map((sourceId): Readonly<{ sourceId: EdgeId; duplicateId: EdgeId }> => ({
      sourceId,
      duplicateId: `${sourceId}-copy` as EdgeId,
    })),
  });
  const behavior: Plugin = createDuplicateSelectionPlugin({ materializeIds });
  const shortcut: Plugin = createDuplicateSelectionShortcutPlugin();
  const command: Command<void, CanvasCommit | null> = duplicateSelectionCommand;
  void behavior;
  void shortcut;
  void command;
});
