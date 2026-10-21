# Clipboard

## Sub-features

Copy the selected Node through `navigator.clipboard`, then paste a new Node.

## How to get to it (user POV)

Open Basic SVG Canvas, select Discover, press Control+C then Control+V.

## Driving it with agent-browser

Scene `clipboard` grants clipboard read/write only for the owned recording
browser context and loopback origin through the existing CDP harness. Native keyboard
input copies an Examples Canvas Fragment envelope; a read-only clipboard read
confirms it exists. Paste yields 4 Nodes, 1 Edge, revision 2 and Selection
`example-clipboard-node-1`.

## Gotchas

Permissions are setup, not product interaction. No mocked clipboard or internal
state setters are used. The CDP connection stays open until the scene ends, since
disconnect resets the permission override. This successful-permission scene does not cover denied
permissions or malformed input; existing Clipboard browser tests retain those cases.
