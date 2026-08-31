# @nodebraid/plugin-duplicate-selection

Duplicate Selection Behavior and Shortcut Binding Plugins for NodeBraid.

`createDuplicateSelectionPlugin()` registers the public `selection.duplicate`
Command. The application supplies one synchronous, complete source-to-duplicate
ID mapping; NodeBraid owns the selected-Node induced subgraph, entity copying,
stale/ABA evidence, one Kernel Transaction, and the resulting Session Selection.

`createDuplicateSelectionShortcutPlugin()` independently contributes focused
Ctrl/Cmd+D through the single Interaction Shortcut authority. The Behavior can
therefore remain callable from a toolbar or menu without installing a Shortcut.

Opaque Node and Edge `data` keeps the original immutable reference. Node
positions use a `{ x: 24, y: 24 }` world-space offset by default. Internal
Edges, ports, self-loops, parallel Edges, and selected parent relationships are
remapped one-to-one; external Edges and unselected descendants are not copied.

## Development

```bash
bun run --filter '@nodebraid/plugin-duplicate-selection' build:dependencies
bun run --filter '@nodebraid/plugin-duplicate-selection' build:test-dependencies
bun run --filter '@nodebraid/plugin-duplicate-selection' typecheck
bun run --filter '@nodebraid/plugin-duplicate-selection' test
bun run --filter '@nodebraid/plugin-duplicate-selection' build
```

## License

[MIT](./LICENSE)
