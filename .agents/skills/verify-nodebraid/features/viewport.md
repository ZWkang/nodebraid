# Viewport

## Sub-features

Zoom in and Reset view. They change Session Viewport without committing Document changes.

## How to get to it (user POV)

Open the Basic SVG Canvas example; use the toolbar above the Canvas.

## Driving it with agent-browser

Scene `viewport` clicks `[aria-label="Zoom in"]` and `[aria-label="Reset view"]`.
Read `[data-example-metric="zoom"]`: 1.00× → 1.20× → 1.00×. Revision stays 1,
with three Nodes and one Edge. Capture the zoomed intermediate state as well.

## Gotchas

Use the English route for these ARIA labels. The returned before/after pair shows
the reset operation; `zoomed.png` is the changed intermediate state. This scene
does not claim wheel zoom, pan or Fit view coverage.
