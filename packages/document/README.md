# @nodebraid/document

Pure complete-Document text serialization for NodeBraid. The package preserves
Node and Edge IDs, types, positions, sizes, nested parents, port-qualified
Endpoints and application business data in canonical ID order. Empty Documents
are supported.

## Application data codec

```ts
import { deserializeCanvasDocument, serializeCanvasDocument, type CanvasDocumentDataCodec } from '@nodebraid/document';

// This application stores bigint as every entity's business data.
const codec: CanvasDocumentDataCodec = {
  format: 'my-application/bigint-v1',
  encode(data) {
    if (typeof data !== 'bigint') throw new Error('Expected bigint business data.');
    return data.toString();
  },
  decode(text) {
    return BigInt(text);
  },
};

const text = serializeCanvasDocument(kernel.read().snapshot, codec);
const document = deserializeCanvasDocument(text, codec);
```

The outer JSON envelope contains `type: 'nodebraid/document'`, `version: 1`,
`dataFormat: codec.format`, `nodes` and `edges`. Every entity's `data` field is a
string produced by the application codec. The application owns its data format
and version; there is no built-in generic JSON codec or migration registry.
Encoding and decoding are synchronous. The framework never traverses opaque
business data. Codec methods keep their receiver and thrown values propagate
unchanged.

The serializer captures known graph fields once, including readable inherited
getters and non-enumerable fields, before invoking the codec. Additional application
fields are not persisted. It validates the complete graph through Kernel. The decoder rejects malformed
owned fields, unknown format versions and mismatched data formats before
interpreting any business data; it also delegates complete-graph invariants to
an independent Kernel Transaction. It returns readonly `nodes` and `edges`, with
frozen owned shells and each original codec-returned data reference. It does not
change an active Canvas Runtime.

Files omit local revision, Selection, Viewport, History and derived Port
Snapshots. File input/download belong to the application. To replace an active
graph and start fresh History, the application uses
`establishHistoryBaselineCommand` from `@nodebraid/plugin-history` and writes the
decoded Nodes and Edges in its one synchronous Transaction.

## Errors

`CanvasDocumentError` has domain `document` and these codes:

- `INVALID_DOCUMENT`: malformed graph-owned fields, missing fields, unknown
  file fields, empty entity IDs or encoded data that is not text.
- `UNSUPPORTED_VERSION`: the envelope version is not `1`.
- `DATA_FORMAT_MISMATCH`: the envelope's data format differs from the codec.
- `INVALID_CODEC`: missing codec format/functions or an encoding result that is
  not text.

JSON parsing preserves `SyntaxError`; duplicate IDs and invalid complete graphs
preserve `KernelError`. Codec errors propagate with their original identity.
None of these failures mutate a live graph or provide a fallback result.

## Development

```bash
bun run --filter '@nodebraid/document' build:dependencies
bun run --filter '@nodebraid/document' typecheck
bun run --filter '@nodebraid/document' test
bun run --filter '@nodebraid/document' build
```

Build includes declaration isolation and a real package-name round trip.

## License

[MIT](./LICENSE)
