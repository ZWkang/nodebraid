# @cflow/renderer-svg

> Documentation: [English](https://zwkang.github.io/cflow/en/modules/renderer-svg) · [简体中文](https://zwkang.github.io/cflow/modules/renderer-svg)

Reference-quality SVG Renderer Provider for CFlow.

The package binds one existing `SVGSVGElement` to a synchronous
`createSvgRenderer` Factory. It projects generic Canvas semantics and does not
interpret product Node types or data. CFlow does not select it as a default
Renderer.

The Provider applies Node Drag and Viewport Pan projections over the same keyed
geometry used by Hit Test and Input coordinate conversion. Reset or incompatible
Document/Session updates clear stale projections; compatible commits reapply
Preview atomically. Native `lostpointercapture` is normalized to semantic Pointer
cancellation without exposing browser event objects.

The Provider writes geometry plus stable classes and data attributes, but no
runtime theme. A minimal application stylesheet can start with:

```css
.cflow-renderer-svg__node {
  fill: white;
  stroke: currentColor;
}

.cflow-renderer-svg__edge {
  stroke: currentColor;
}

[data-cflow-selected='true'] {
  stroke-width: 2;
}
```

## Development

Run package scripts from the monorepo root:

```bash
bun run --filter '@cflow/renderer-svg' typecheck
bun run --filter '@cflow/renderer-svg' test
bun run --filter '@cflow/renderer-svg' test:browser
bun run --filter '@cflow/renderer-svg' build
```

## License

[MIT](./LICENSE)
