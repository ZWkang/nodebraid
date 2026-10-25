# Document files

## Sub-features

Download a complete Document, reopen the Example, import the saved file and continue editing with fresh History.

## How to get to it (user POV)

Open Basic SVG Canvas, edit the graph, click Export document. Reopen the page and use Import document to choose the saved file.

## Driving it with agent-browser

Scene `document-files` selects Discover and duplicates it, clicks `[aria-label="Export document"]` and waits for Chromium Browser download
events through the shared harness to save the actual file, then reloads.
It verifies the initial graph, uses `upload` on `[aria-label="Document file"]`,
and observes the restored four Nodes and empty Undo/Redo. Another real download
must match the saved graph and encoded data. A subsequent Duplicate allocates an
unoccupied ID; Undo removes only that new edit while preserving the imported graph.

## Gotchas

The downloaded files, action log, screenshots and recordings remain in the evidence bundle.
No Runtime global or internal state setter is used. This successful-file scene does not
cover every malformed input or codec; the Document package and Example browser suite
cover those failures. Session and old History are not present in the file; import keeps
the current Viewport and uses existing Selection reconciliation.

The pinned agent-browser 0.20 `download` command only sets a download directory.
The collector therefore uses real `click` plus Browser download-completion events
and checks the resulting file, rather than treating the command exit as download proof.
