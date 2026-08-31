# @nodebraid/canvas-fragment

Pure, backend-neutral in-memory Canvas Fragment values for NodeBraid.

The package captures a selected-Node induced subgraph, validates a decoded
Fragment shell, and materializes it with an application-owned complete fresh-ID
mapping. It preserves canonical ordering, explicit Selection membership,
nested parent remapping, port-qualified Endpoints, self-loops, parallel Edges,
and opaque `data` references.

A Canvas Fragment is not a Serialized Document. This package defines no text
format, persistence schema, generic JSON codec, browser API, Runtime Service, or
cross-version compatibility promise.

## Development

```bash
bun run --filter '@nodebraid/canvas-fragment' build:dependencies
bun run --filter '@nodebraid/canvas-fragment' typecheck
bun run --filter '@nodebraid/canvas-fragment' test
bun run --filter '@nodebraid/canvas-fragment' build
```

## License

[MIT](./LICENSE)
