---
title: '@nodebraid/document'
description: Complete Document files with application-owned business Data Codecs.
---

# `@nodebraid/document`

::: warning Package is not publicly released
This name describes the source module. Use a source checkout through [Quick Start](/en/guide/quick-start).
:::

## Complete graph files

`serializeCanvasDocument(snapshot, codec)` encodes a committed Canvas Snapshot as text.
`deserializeCanvasDocument(text, codec)` returns a complete, valid `DecodedCanvasDocument`.
Both are pure functions: they do not access files or a Runtime or mutate the current Canvas.

The version-1 envelope is `{ type: 'nodebraid/document', version: 1, dataFormat, nodes, edges }`.
It preserves Node/Edge IDs, types, positions, sizes, parent relationships and Endpoint port IDs, including empty graphs.
It excludes local revision, Selection, Viewport, History and derived Port Snapshots.
It is distinct from the in-memory subgraph contract of [Canvas Fragment](/en/modules/canvas-fragment).

## Application Data Codec

Business data remains opaque. The application explicitly supplies:

```ts
import type { CanvasDocumentDataCodec } from '@nodebraid/document';

const codec: CanvasDocumentDataCodec = {
  format: 'my-app/note-v1',
  encode(data) {
    if (typeof data !== 'string') throw new TypeError('Expected note text.');
    return data;
  },
  decode(text) {
    return text;
  },
};
```

Each entity's file `data` is the string returned by the codec. The application may encode dates,
special values or domain objects; the framework does not apply generic JSON conversion to `unknown`.
The application's format identifier and codec own business-format evolution. An incompatible
`dataFormat` or file version fails before calling the decoder. Codec exceptions preserve their identity.

## Atomic restore and fresh History

After file reading and decoding complete, the application uses the synchronous Baseline Command from
[History](/en/modules/plugin-history) to replace the graph. This code belongs to an application that
has already obtained its Required Services:

```ts
import { deserializeCanvasDocument, establishHistoryBaselineCommand } from '@nodebraid/core';

const document = deserializeCanvasDocument(fileText, codec);
await commands.execute(establishHistoryBaselineCommand, (transaction) => {
  const previous = kernel.read().snapshot;
  for (const edge of previous.edges) transaction.edges.remove(edge.id);
  for (const node of previous.nodes) transaction.nodes.remove(node.id);
  for (const node of document.nodes) transaction.nodes.add(node);
  for (const edge of document.edges) transaction.edges.add(edge);
});
```

Transaction failure preserves the original graph and History. Success clears old Undo/Redo, excludes
the import from History, and records subsequent editing normally. A net-zero or empty restore also
establishes a new Baseline. The current Viewport remains; existing Session reconciliation removes
missing selected IDs and retains IDs that still exist.

## Failures and verification

The file layer validates the envelope, fields and data types, then uses an independent Kernel's public
Transaction to validate the complete graph, including duplicate IDs, geometry, Endpoint/parent references
and parent cycles. These failures occur before changing the active Canvas.
`CanvasDocumentError` represents file or codec-contract errors; JSON syntax errors, Kernel errors and
application codec exceptions retain their original types. There is no silent repair, unknown-version
fallback or cross-version migration.

Package tests and artifact checks cover pure functions and package-name imports; public History
composition tests cover atomic Transactions and the new recording baseline.
The [Interactive Example](/en/guide/interactive-example) verifies real file download, reopening, upload,
continued editing and Undo in Chromium. This format does not provide automatic saving, a database,
cloud storage or collaboration.
