# Port connection

## Sub-features

Drag a source Port to a target Port, observe Connection Preview, and commit an Edge.

## How to get to it (user POV)

Open Basic SVG Canvas. Drag Compose's output handle to Ship's input handle.

## Driving it with agent-browser

Scene `port-connection` scrolls `.canvas-target` into view, reads the centers of
`data-nodebraid-port-node-id` / `data-nodebraid-port-id` / `data-nodebraid-port-role`
elements, then dispatches native CDP move/down/move/up with explicit coordinates
and held-button state, as the existing browser tests do.
The held drag exposes one `[data-nodebraid-connection-preview]`. Release removes
it and leaves two Edges, three Nodes and revision 2, including `example-edge-1`.

## Gotchas

Coordinates are observed after native scrolling; never copy hardcoded screen
coordinates from another run. Node centers are not substitutes for Port handles.
The initial Edge is Discover→Compose; the tested connection is Compose→Ship.
