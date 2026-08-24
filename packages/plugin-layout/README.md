# @nodebraid/plugin-layout

> Documentation: [English](https://zwkang.github.io/nodebraid/en/modules/plugin-layout) · [简体中文](https://zwkang.github.io/nodebraid/modules/plugin-layout)

Runtime Command integration for NodeBraid Layout Engines.

`createLayoutPlugin()` statically binds one Layout Engine to one typed Command. The Command reads the current Canvas View, checks capabilities and cancellation, computes and validates a Layout Proposal, rejects stale revisions, and applies every changed Node position in one synchronous Transaction. A successful layout therefore produces at most one Canvas Commit and one History Entry.

The package provides no LayoutService, dynamic Provider Registry, or default Provider. Applications choose and install concrete Provider packages explicitly.

## Development

```bash
bun run --filter '@nodebraid/plugin-layout' typecheck
bun run --filter '@nodebraid/plugin-layout' test
bun run --filter '@nodebraid/plugin-layout' build
```

## License

[MIT](./LICENSE)
