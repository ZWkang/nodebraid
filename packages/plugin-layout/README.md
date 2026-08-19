# @cflow/plugin-layout

Runtime Command integration for CFlow Layout Engines.

`createLayoutPlugin()` statically binds one Layout Engine to one typed Command. The Command reads the current Canvas View, checks capabilities and cancellation, computes and validates a Layout Proposal, rejects stale revisions, and applies every changed Node position in one synchronous Transaction. A successful layout therefore produces at most one Canvas Commit and one History Entry.

The package provides no LayoutService, dynamic Provider Registry, or default Provider. Applications choose and install concrete Provider packages explicitly.

## Development

```bash
bun run --filter '@cflow/plugin-layout' typecheck
bun run --filter '@cflow/plugin-layout' test
bun run --filter '@cflow/plugin-layout' build
```

## License

[MIT](./LICENSE)
