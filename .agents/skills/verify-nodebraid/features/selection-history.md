# Selection, duplication and History

## Sub-features

Select one Node, Duplicate Selection, Undo and Redo.

## How to get to it (user POV)

Open Basic SVG Canvas, select Discover, use Control+D, then the Undo/Redo toolbar buttons.

## Driving it with agent-browser

Scene `selection-history` clicks `[data-nodebraid-node-id="example-discover"]`,
dispatches native CDP `KeyD` with the Meta modifier, and reads page metrics. Node count becomes 4, revision 2 and
Selection `example-duplicate-node-1`. Undo returns to 3 Nodes at revision 3;
Redo returns to 4 Nodes at revision 4. Both leave Selection `None`.

## Gotchas

The Example installs both Control and Meta shortcut variants; the collector uses
the existing tests' explicit Meta/key-code CDP path. Focus comes from the native Node click. Duplication is not
Clipboard Copy/Paste. The isolated page must start with its initial three Nodes.
