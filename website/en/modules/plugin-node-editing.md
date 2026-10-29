---
title: '@nodebraid/plugin-node-editing'
description: Generic Node creation and source-guarded data editing.
---

# `@nodebraid/plugin-node-editing`

::: warning Package is not publicly released
This is a source module boundary, not an npm installation instruction. Use the source [Quick Start](/en/guide/quick-start).
:::

`nodeEditingPlugin` registers two public Commands on the existing Kernel and Command services. Basic Canvas Composition includes it. Applications own Node types, IDs, initial geometry and opaque data; this module defines no field schema or editor UI.

```ts
await commands.execute(createNodeCommand, { node });
const expectedNode = kernel.read().query.getNode(node.id);
if (!expectedNode) throw new Error('Node disappeared.');
await commands.execute(updateNodeDataCommand, { expectedNode, data: nextData });
```

Create Node atomically adds the complete value and returns a `CanvasCommit`; it does not change Selection. Update Node Data replaces only data and returns `CanvasCommit | null`. Actual changes use ordinary History entries. Reusing the same data reference produces no commit.

Editing requires the exact Node object read from Kernel when the draft began. Moving, replacing, undoing/redoing or removing and recreating that Node across commits makes the draft stale. Unrelated Node changes do not. `NodeEditingError / STALE_NODE` leaves current graph and history intact. Applications retain the draft, explain the conflict and provide explicit reload; there is no implicit merge or overwrite.

Applications own field validation and Apply/Cancel. Kernel retains graph validation. Accessor exceptions and cancellation reasons keep their identity. A Renderer or observer failure after commit cannot roll back the Document.

[Interaction](/en/modules/plugin-interaction) owns Node Placement; [SVG Renderer](/en/modules/renderer-svg) owns custom content. These Commands also run in a headless Host without Renderer, Session or React.

Public Host/Kernel/Command/History tests cover creation, data-only updates, strict conflicts, unrelated commits, net-zero changes, cancellation and cleanup:

```sh
bun run --filter '@nodebraid/plugin-node-editing' test
```
