# @nodebraid/layout-api

> Documentation: [English](https://zwkang.github.io/nodebraid/en/modules/layout-api) · [简体中文](https://zwkang.github.io/nodebraid/modules/layout-api)

Provider-neutral Layout contracts and validation for NodeBraid.

The package projects a committed Canvas View into an immutable Layout Input, defines asynchronous Layout Engines, and validates Layout Proposals before they reach a Runtime Transaction. Node positions use the top-left corner of Node bounds in absolute world coordinates.

The package supports whole-canvas full and incremental requests, Fixed Node constraints, explicit capabilities, cooperative cancellation, and strict Proposal validation. Ordinary and Port-qualified Edges project to distinct Edge IDs and endpoint Node IDs; Port definitions and geometry do not participate in layout, and no Port Plugin is required. Missing Node Sizes and nested Nodes are rejected. Port-aware geometry constraints, Edge Routing, subset layout, preview, Worker execution, caching, and persistence are outside this version.

## Development

```bash
bun run --filter '@nodebraid/layout-api' typecheck
bun run --filter '@nodebraid/layout-api' test
bun run --filter '@nodebraid/layout-api' build
```

## License

[MIT](./LICENSE)
