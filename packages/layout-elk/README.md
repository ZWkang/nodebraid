# @nodebraid/layout-elk

> Documentation: [English](https://zwkang.github.io/nodebraid/en/modules/layout-elk) · [简体中文](https://zwkang.github.io/nodebraid/modules/layout-elk)

ELK Layout Provider for NodeBraid.

The Provider implements deterministic full layout with `elkjs` and exposes self-loop support. ELK Stress additionally provides incremental layout and Fixed Node constraints: the Adapter enables interactive positioning and restores ELK's component-local result translation to NodeBraid absolute world coordinates only when every Fixed Node proves the same translation.

Fixed Nodes require the Stress algorithm. Worker execution is deliberately outside the first version; the package uses ELK's bundled in-process worker implementation and includes an explicit Bun loader compatibility path.

## Development

```bash
bun run --filter '@nodebraid/layout-elk' typecheck
bun run --filter '@nodebraid/layout-elk' test
bun run --filter '@nodebraid/layout-elk' build
```

## License

[MIT](./LICENSE)
