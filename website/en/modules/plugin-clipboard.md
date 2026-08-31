---
title: '@nodebraid/plugin-clipboard'
description: Explicit Clipboard Copy/Paste Behavior and Shortcut Plugins.
---

# `@nodebraid/plugin-clipboard`

::: warning Package is not publicly released
This name describes the current source module boundary; it is not an npm installation claim.
:::

## Public interface

- `copySelectionToClipboardCommand` and `pasteClipboardCommand`;
- `createClipboardPlugin()` and `createClipboardShortcutPlugin()`;
- an abort-aware `ClipboardTextTransport`;
- an application-owned `CanvasFragmentTextCodec` and fresh-ID materializer;
- `ClipboardError` identities for transport, codec, Fragment, mapping, target, commit, and post-Commit Selection failures.

Copy captures one committed Canvas Fragment when the Command starts. Empty and edge-only Selection do not touch the Clipboard. Paste reads and decodes asynchronously, validates the Fragment, fresh IDs, external parents, and current Selection immediately before one synchronous Transaction, then selects mapped original members. Undo removes the Paste; Redo restores only the Document.

The Plugin never accesses `navigator.clipboard`, has no silent in-memory fallback, and provides no generic JSON codec for arbitrary `unknown`. The Examples Application's real browser Adapter and NodeBraid-specific envelope that accepts only `data: null` are application code, not a framework serialization format.
