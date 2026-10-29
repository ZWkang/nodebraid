# @nodebraid/renderer-svg

> Documentation: [English](https://zwkang.github.io/nodebraid/en/modules/renderer-svg) · [简体中文](https://zwkang.github.io/nodebraid/modules/renderer-svg)

Reference-quality SVG Renderer Provider for NodeBraid.

The package binds one existing `SVGSVGElement` to a synchronous
`createSvgRenderer` Factory. It projects generic Canvas semantics and does not
interpret product Node types or data. NodeBraid does not select it as a default
Renderer.

The Provider applies Node Drag, Viewport Pan, Box Selection, and Connection Preview projections over the same keyed
geometry used by Hit Test and Input coordinate conversion. It derives source/target
Port Geometry for Nodes with Port definitions, and Node-level Connection Anchors
for Nodes without them, using a CSS-pixel hit tolerance. Reset or incompatible
Document/Session updates clear stale projections; compatible commits reapply
Preview atomically. Native `lostpointercapture` is normalized to semantic Pointer
cancellation without exposing browser event objects.

The Provider writes geometry plus stable classes and data attributes, but no
runtime theme. A minimal application stylesheet can start with:

```css
.nodebraid-renderer-svg__node {
  fill: white;
  stroke: currentColor;
}

.nodebraid-renderer-svg__edge {
  stroke: currentColor;
}

.nodebraid-renderer-svg__connection-anchor,
.nodebraid-renderer-svg__port {
  r: 4px;
  fill: currentColor;
}

.nodebraid-renderer-svg__connection-preview {
  stroke: currentColor;
}

.nodebraid-renderer-svg__box-selection {
  fill: color-mix(in srgb, currentColor 12%, transparent);
  stroke: currentColor;
}

[data-nodebraid-selected='true'] {
  stroke-width: 2;
}
```

## Application-owned Node content

The optional static `createNodeContent` callback constructs SVG content from the
application's Node type and opaque data. It receives a frozen
`SvgNodeContentContext` containing `nodeId`, `type`, frozen `size`, the original
`data` reference and the Target's `document`. The application owns type dispatch
and data validation; the Provider does not define a Node schema or registry.
The callback is captured when the Renderer is created. Changing its configuration
object or closed-over application state does not itself trigger reconstruction.

```ts
const renderer = createSvgRenderer({
  target,
  createNodeContent({ document, data, size }) {
    if (typeof data !== 'string') throw new TypeError('This application expects string Node data.');
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', String(size.width / 2));
    text.setAttribute('y', String(size.height / 2));
    text.setAttribute('text-anchor', 'middle');
    text.textContent = data;
    return text;
  },
});
```

Each invocation returns a fresh, detached `SVGElement` root in Node-local
coordinates. After return, the Provider owns that subtree. Content construction
is synchronous and must not mutate other DOM or retain resources requiring
cleanup; this interface does not manage event subscriptions, asynchronous
components, HTML/React components or per-Node lifecycle hooks. Application data
continues to follow the Kernel's immutable-value contract.

Configured Nodes use a stable outer `<g>` with the existing Node class, identity
and Selection attributes, plus `transform="translate(x y)"`. The Provider owns
that outer element, positioning, Port/Anchor geometry and Viewport transformations.
An ordinary Commit reconstructs content only for added Nodes or changed type,
size values or data identity. Position, Selection, Viewport, incremental Port geometry
and drag previews retain content identity. Every `reset` reconstructs all content,
including Runtime resets at the same Document revision after independent Port
Contribution registration or disposal. Internal
content elements may be replaced when content changes. Without the callback,
the existing `<rect>` DOM and geometry attributes remain unchanged.

Visual content does not change the declared rectangular Node bounds used for
Hit Test, Box Selection and Port placement. A circle's rectangle corners remain
selectable. The Provider does not add clipping or correct overflowing content.

All candidate content is prepared before changing live DOM. Constructor errors
retain their original identity; invalid, attached or reused roots fail with
`SvgRendererError` code `INVALID_NODE_CONTENT`. Content replacement participates
in the existing DOM rollback journal, including restoration of the original
subtree objects. No construction failure silently switches to a plain rectangle.
This atomicity protects accepted Renderer state, not a Kernel Commit that has
already happened; Runtime synchronization failures retain their existing explicit
fault and recovery behavior.

## Development

Run package scripts from the monorepo root:

```bash
bun run --filter '@nodebraid/renderer-svg' typecheck
bun run --filter '@nodebraid/renderer-svg' test
bun run --filter '@nodebraid/renderer-svg' test:browser
bun run --filter '@nodebraid/renderer-svg' build
```

## License

[MIT](./LICENSE)
