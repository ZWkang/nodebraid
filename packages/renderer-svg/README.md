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

[data-nodebraid-edge-path] {
  fill: none;
}

[data-nodebraid-edge-arrow],
[data-nodebraid-edge-label] {
  fill: currentColor;
  stroke: none;
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

## Readable Edge paths

Opt in with `edges` to render orthogonal or cubic Bezier paths with source-to-target
arrows. Applications synchronously map a complete Edge to a `SvgEdgePresentation`;
the framework does not interpret the Edge's opaque business data.

```ts
const renderer = createSvgRenderer({
  target,
  edges: {
    previewPath: 'bezier',
    resolve: (edge) => ({
      path: edge.type === 'sequence' ? 'orthogonal' : 'bezier',
      label: edge.type,
    }),
  },
});
```

`SvgEdgePath`, `SvgEdgePresentation` and `SvgEdgeConfig` are exported types.
`previewPath` is required because a Connection Preview has no Edge yet. It does
not call `resolve` or materialize an Edge; applications align the preview choice
with the eventual Edge. Committed lane ordering is determined once its ID exists.

The Provider captures and validates resolver results at Document updates, retaining
plain text exactly, including empty labels. Session, Viewport, drag previews and
Hit Test reuse accepted values. Invalid results fail with `INVALID_EDGE_PRESENTATION`;
callback failures retain their original identity. Failed projection updates keep
the prior accepted DOM and geometry, subject to the existing explicit rollback
failure contract. No callback failure substitutes a straight line.

New paths connect ordinary Endpoints at source/right and target/left Node boundaries;
qualified Endpoints retain actual Port Geometry. Parallel Edges sharing an unordered
Endpoint pair (including Port IDs) are placed in deterministic lanes by Edge ID.
Adding or removing a sibling may rearrange that group's derived paths. Short,
reverse and overlapping connections remain valid; self-loops remain rejected.
This is not global obstacle routing.

Each Edge owns one stable `<g data-nodebraid-edge-id>` with descendant
`path[data-nodebraid-edge-path="orthogonal|bezier"]`,
`path[data-nodebraid-edge-arrow]` and optional `text[data-nodebraid-edge-label]`.
The outer identity survives commits and path-kind changes. New Connection Previews
use one `g[data-nodebraid-connection-preview]` containing a path and arrow, without
a label. Selection stays on the entity group. Applications provide the stylesheet.

Hit Test uses the closest path or arrow within the CSS-pixel tolerance; exact ties
follow the existing reverse-ID order. Node and Port priority is unchanged. Labels
are decorative plain text and have no independent hit area. Drawing, dragging,
arrow direction, label placement and hits use the same accepted geometry.

Without `edges`, the existing straight `<line>` DOM, center-based ordinary Endpoints
and hit order remain unchanged. Presentation is Provider state, not a new Kernel
schema, editing Command or editor panel. Applications retain data editing and codec
ownership; Provider configuration is not automatically serialized.

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
