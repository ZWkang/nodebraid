# @cflow/layout-elk

ELK Layout Provider for CFlow.

The Provider implements deterministic full layout with `elkjs` and exposes self-loop support. ELK Stress additionally provides incremental layout and Fixed Node constraints: the Adapter enables interactive positioning and restores ELK's component-local result translation to CFlow absolute world coordinates only when every Fixed Node proves the same translation.

Fixed Nodes require the Stress algorithm. Worker execution is deliberately outside the first version; the package uses ELK's bundled in-process worker implementation and includes an explicit Bun loader compatibility path.

## Development

```bash
bun run --filter '@cflow/layout-elk' typecheck
bun run --filter '@cflow/layout-elk' test
bun run --filter '@cflow/layout-elk' build
```

## License

[MIT](./LICENSE)
