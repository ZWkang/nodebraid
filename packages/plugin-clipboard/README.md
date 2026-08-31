# @nodebraid/plugin-clipboard

Explicit Clipboard Copy/Paste Behavior and Shortcut Plugins for NodeBraid.

`createClipboardPlugin()` registers public Copy and Paste Commands. The
application injects an abort-aware text transport, a Canvas Fragment text codec,
and complete fresh-ID materialization. NodeBraid owns selected-node subgraph
capture, decoded Fragment validation, one Paste Transaction, current-target
checks, History integration, and the resulting Session Selection.

`createClipboardShortcutPlugin()` contributes exact focused Ctrl/Cmd+C and
Ctrl/Cmd+V through the single Interaction Shortcut authority. Generic packages
never access `navigator.clipboard`, provide an in-memory fallback, or claim
opaque `data` is JSON-safe.

## Development

```bash
bun run --filter '@nodebraid/plugin-clipboard' build:dependencies
bun run --filter '@nodebraid/plugin-clipboard' build:test-dependencies
bun run --filter '@nodebraid/plugin-clipboard' typecheck
bun run --filter '@nodebraid/plugin-clipboard' test
bun run --filter '@nodebraid/plugin-clipboard' build
```

## License

[MIT](./LICENSE)
