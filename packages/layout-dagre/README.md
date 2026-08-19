# @cflow/layout-dagre

> Documentation: [English](https://zwkang.github.io/cflow/en/modules/layout-dagre) · [简体中文](https://zwkang.github.io/cflow/modules/layout-dagre)

Dagre Layout Provider for CFlow.

The Provider implements deterministic whole-canvas full layout through `@cflow/layout-api`. It converts Dagre's center coordinates into CFlow's top-left absolute world coordinates and supports empty graphs, zero-sized Nodes, disconnected components, parallel Edges, directed cycles, and self-loops.

Dagre does not advertise incremental or Fixed Node capabilities. Use an Engine-specific typed Command through `@cflow/plugin-layout` when applying a Proposal to a Canvas Runtime.

## Development

```bash
bun run --filter '@cflow/layout-dagre' typecheck
bun run --filter '@cflow/layout-dagre' test
bun run --filter '@cflow/layout-dagre' build
```

## License

[MIT](./LICENSE)
