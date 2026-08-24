# @nodebraid/layout-dagre

> Documentation: [English](https://zwkang.github.io/nodebraid/en/modules/layout-dagre) · [简体中文](https://zwkang.github.io/nodebraid/modules/layout-dagre)

Dagre Layout Provider for NodeBraid.

The Provider implements deterministic whole-canvas full layout through `@nodebraid/layout-api`. It converts Dagre's center coordinates into NodeBraid's top-left absolute world coordinates and supports empty graphs, zero-sized Nodes, disconnected components, parallel Edges, directed cycles, and self-loops.

Dagre does not advertise incremental or Fixed Node capabilities. Use an Engine-specific typed Command through `@nodebraid/plugin-layout` when applying a Proposal to a Canvas Runtime.

## Development

```bash
bun run --filter '@nodebraid/layout-dagre' typecheck
bun run --filter '@nodebraid/layout-dagre' test
bun run --filter '@nodebraid/layout-dagre' build
```

## License

[MIT](./LICENSE)
