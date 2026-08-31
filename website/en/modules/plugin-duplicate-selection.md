---
title: '@nodebraid/plugin-duplicate-selection'
description: Independent, undoable Duplicate Selection Behavior and Shortcut Binding Plugins.
---

# `@nodebraid/plugin-duplicate-selection`

::: warning Package is not publicly released
This name identifies the current source module boundary; it is not an npm availability claim.
:::

## The problem it solves

Applications should not copy Kernel entities, infer Edge closure, or maintain a second Selection model. This package keeps the complete stable behavior behind one deep Module while the application continues to own new NodeId and EdgeId values.

## Public Interface

- `duplicateSelectionCommand`: the input-free `selection.duplicate` Command returning `CanvasCommit | null`;
- `createDuplicateSelectionPlugin()`: installs the independent Behavior Plugin;
- `createDuplicateSelectionShortcutPlugin()`: independently contributes focused Ctrl/Cmd+D;
- `DuplicateIdMaterializer`: synchronously returns one complete Node/Edge ID mapping;
- `DuplicateSelectionError`: `INVALID_CONFIG | INVALID_MATERIALIZATION | STALE_DUPLICATE | SELECTION_UPDATE_FAILED`.

The Behavior copies the exactly selected Nodes and their internal Edges. Nodes retain type, size, and opaque data references and receive a `{ x: 24, y: 24 }` world offset by default. Selected parents, port-qualified Endpoints, self-loops, and parallel Edges are remapped one-to-one. Boundary-crossing Edges, edge-only Selection, and unselected descendants do not expand the copy scope.

The application supplies IDs only. NodeBraid validates the complete mapping, exact-root/ABA evidence, and internal Edge closure, creates every duplicate in one synchronous Transaction, then maps the original Selection members to duplicates. Undo removes duplicates and reconciles Selection; Redo restores Document state without reselecting.

The Shortcut Plugin does not subscribe to Renderer Input. It registers through the single authority in [`@nodebraid/plugin-interaction`](/en/modules/plugin-interaction). If the Behavior is unavailable, Mod+D becomes an explicit capability-unavailable Input Rejection.

## Non-goals

Clipboard transport/codec, Serialization, Persistence, deep cloning, business entity factories, async Transactions, collaborative duplication, and Tool Registry remain out of scope. Shared subgraph capture/materialization now comes from the pure `@nodebraid/canvas-fragment` package.
