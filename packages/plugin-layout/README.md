# @nodebraid/plugin-layout

> Documentation: [English](https://zwkang.github.io/nodebraid/en/modules/plugin-layout) · [简体中文](https://zwkang.github.io/nodebraid/modules/plugin-layout)

Runtime Command integration for NodeBraid Layout Engines.

`createLayoutPlugin()` statically binds one Layout Engine to one typed Command. The Command reads the current Canvas View, checks capabilities and cancellation, computes and validates a Layout Proposal, rejects stale revisions, and applies every changed Node position in one synchronous Transaction. A successful layout therefore produces at most one Canvas Commit and one History Entry.

Port-qualified graphs use the same Node-topology path without a Port Plugin. Commits preserve all other Node fields, Edges, Endpoints, and `portId`, and leave Selection and Viewport unchanged. History provides one-step Undo/Redo for net changes; unchanged positions return `null` without advancing revision or history. Endpoint edits advance Document revision and invalidate an in-flight Proposal; Port Contribution generation is not a Layout dependency.

The package provides no LayoutService, dynamic Provider Registry, or default Provider. Applications choose and install concrete Provider packages explicitly.

## Development

```bash
bun run --filter '@nodebraid/plugin-layout' typecheck
bun run --filter '@nodebraid/plugin-layout' test
bun run --filter '@nodebraid/plugin-layout' build
```

## License

[MIT](./LICENSE)
