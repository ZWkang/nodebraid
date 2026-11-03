# Port connection

## Sub-features

Observe an orthogonal Edge with an application label and direction arrow; drag a source Port to a target Port, observe a Bezier Connection Preview, and commit an Edge. Repeat the connection and select each parallel path separately.

## How to get to it (user POV)

Open Basic SVG Canvas. Drag Compose's output handle to Ship's input handle.

## Driving it with agent-browser

Scene `port-connection` scrolls `.canvas-target` into view, reads the centers of
`data-nodebraid-port-node-id` / `data-nodebraid-port-id` / `data-nodebraid-port-role`
elements, then dispatches native CDP move/down/move/up with explicit coordinates
and held-button state, as the existing browser tests do.
The initial `example-initial-edge` group contains an orthogonal path, arrow and
`Discover → compose` text. The held drag exposes one
`[data-nodebraid-connection-preview]` with a Bezier path. Release removes it and
leaves two Edges, three Nodes and revision 2, including `example-edge-1`.

The same drag runs again, producing three Edges at revision 3. Read each new
path's `getPointAtLength(total / 2)` and transform through `getScreenCTM()` to
obtain current native click coordinates. Click `example-edge-1` and
`example-edge-2` separately and verify Selection changes to that exact Edge while
revision remains 3. The collector captures both selections and distinct path data.

## Gotchas

Coordinates are observed after native scrolling; never copy hardcoded screen
coordinates from another run. Node centers are not substitutes for Port handles.
The initial Edge is Discover→Compose; the tested connection is Compose→Ship.
`data-nodebraid-edge-id` belongs only to the stable group. Read its descendant
`[data-nodebraid-edge-path]` for SVG geometry; group bounding-box centers do not
prove that the click lies on a path. Arrow and label children are not extra Edges.
