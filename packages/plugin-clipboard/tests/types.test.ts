import { test } from 'bun:test';

import type { CanvasFragment } from '@nodebraid/canvas-fragment';
import type { CanvasCommit } from '@nodebraid/kernel';
import type { Command } from '@nodebraid/plugin-command';
import type { Plugin } from '@nodebraid/runtime-cordis';

import {
  copySelectionToClipboardCommand,
  createClipboardPlugin,
  createClipboardShortcutPlugin,
  pasteClipboardCommand,
  type ClipboardTextTransport,
} from '../src';

test('publishes typed Clipboard behavior and Shortcut Plugins', () => {
  const transport: ClipboardTextTransport = {
    readText: async () => '',
    writeText: async () => undefined,
  };
  const behavior: Plugin = createClipboardPlugin({
    transport,
    codec: { encode: () => '', decode: () => undefined },
    materializeIds: () => ({ nodes: [], edges: [] }),
  });
  const shortcuts: Plugin = createClipboardShortcutPlugin();
  const copy: Command<void, CanvasFragment | null> = copySelectionToClipboardCommand;
  const paste: Command<void, CanvasCommit> = pasteClipboardCommand;
  void behavior;
  void shortcuts;
  void copy;
  void paste;
});
