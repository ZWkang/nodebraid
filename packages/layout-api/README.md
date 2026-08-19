# @cflow/layout-api

> Documentation: [English](https://zwkang.github.io/cflow/en/modules/layout-api) · [简体中文](https://zwkang.github.io/cflow/modules/layout-api)

Provider-neutral Layout contracts and validation for CFlow.

The package projects a committed Canvas View into an immutable Layout Input, defines asynchronous Layout Engines, and validates Layout Proposals before they reach a Runtime Transaction. Node positions use the top-left corner of Node bounds in absolute world coordinates.

The first version supports whole-canvas full and incremental requests, Fixed Node constraints, explicit capabilities, cooperative cancellation, and strict Proposal validation. It rejects missing Node Sizes, nested Nodes, and Port Endpoints. Edge Routing, subset layout, preview, Worker execution, caching, and persistence are outside this version.

## Development

```bash
bun run --filter '@cflow/layout-api' typecheck
bun run --filter '@cflow/layout-api' test
bun run --filter '@cflow/layout-api' build
```

## License

[MIT](./LICENSE)
