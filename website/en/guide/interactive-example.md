---
title: Interactive Example
description: Run the complete NodeBraid Basic SVG developer reference application locally.
---

# Interactive Example

NodeBraid's private Examples Application uses React, TanStack Router, shadcn, and Base UI to demonstrate the real public interfaces of the Basic Canvas Composition. It is not a product editor and is never published as an npm package.

## Run locally

```bash
bun install
bun run example:dev
```

Open the `/basic-svg` URL printed by the development server to exercise Selection, Box Selection, real Clipboard Ctrl/Cmd+C / Ctrl/Cmd+V, Ctrl/Cmd+D Duplicate, Node Drag, Pan, Zoom, Port-aware Edge Connection, Undo, Redo, Fit View, and a complete Runtime Reset.

The example depends only on the public entry points of `@nodebraid/adapter-react`, `@nodebraid/core`, and the explicitly selected `@nodebraid/renderer-svg`. The React Adapter owns Runtime mount/remount and stable Snapshot projection; the application continues to own the Runtime Factory, toolbar, and Clipboard state. The application is not deployed separately yet; this page remains the stable description and local entry point.
