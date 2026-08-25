---
title: '@nodebraid/plugin-interaction'
description: The Runtime Plugin that interprets Renderer Input as Selection, Box Selection, Delete, Drag, Pan, Wheel Zoom, and Edge Connection.
---

# `@nodebraid/plugin-interaction`

::: warning Package is not publicly released
This name identifies the current source module boundary; it does not mean the package can be installed from npm. Follow the [Quick Start](/en/guide/quick-start) to verify it from source.
:::

## The problem it solves

A Renderer publishes input facts and Hit Results; it should not decide product behavior. This Plugin owns the Active Gesture state machine above Renderer, Session, Command, and Kernel. It interprets raw input as backend-neutral selection, dragging, and viewport behavior without creating a second Document write path.

## What it provides

- `interactionPlugin`: a Feature Plugin with no Runtime Service;
- `InteractionConfig`: `dragThreshold`, `wheelZoomSensitivity`, `minZoom`, and `maxZoom`;
- `moveNodesCommand`: ID `interaction.nodes.move`, updating all target Nodes in one synchronous Transaction;
- `createEdgeCommand`: ID `interaction.edge.create`, creating one complete Edge in a synchronous Transaction;
- `deleteSelectionCommand`: ID `interaction.selection.delete`, deleting one canonical target closure in a synchronous Transaction;
- `InteractionError`: `INVALID_CONFIG`, `INVALID_MOVE`, `INVALID_CONNECTION`, `INVALID_DELETE`, `STALE_GESTURE`, and `STALE_SELECTION`;
- `interactionDiagnosticEvents`: Pointer/Input rejection, Gesture cancellation, and Command fault events.

The current version also includes optional mouse-only, Node-level Edge Connection. An application materializer owns Edge ID, type, and data; Interaction commits one typed Create Edge Command on pointerup.

A primary-pointer drag from empty Canvas space enters Box Selection after the threshold. Its Preview contains only a World Rect; pointerup intersects that rect with Node position/size from the current Kernel View and writes Session Selection. Shift, Control, or Meta merges with the existing Selection, while middle-button and Space Pan keep priority.

When the Renderer owns Focus and no Active Gesture exists, either logical `key` or physical `code` Delete removes the current Selection. Explicit Edges and every incident Edge of selected Nodes are removed before the Nodes. Target identity evidence from the exact source Snapshot rejects competing changes and same-value ABA replacement without blocking unrelated Commits. Empty Selection creates no revision or History Entry, Backspace is not an alias, and Delete during an Active Gesture uses Input Rejection without cancelling it.

## Dependencies and write direction

The Plugin statically requires Renderer, Session, Command, and Kernel Services and provides no state Service of its own.

```text
RendererService ─▶ Input / Hit / Capture / Projection
SessionService  ◀─ Selection / Viewport
CommandService  ◀─ Move/Create/Delete Commands ─▶ KernelService
```

Pointer move only replaces the Interaction Projection. Pointerup clears Preview and returns to idle before writing Box Selection/Viewport to Session or executing one Move Nodes Command. The Command reads the current complete Node, replaces only its position, and rejects competing writes using each Node's base position.

## Lifecycle and errors

One Activation owns one Gesture Pointer. Additional Pointers and Wheel during a Gesture have stable diagnostics. Pointer cancellation, lost capture, stale Node/Viewport evidence, Plugin unload, and dependency loss never commit Preview. Composite cleanup stops subscriptions, clears the Binding, releases Capture, clears state, and awaits Command Registration; peer failures remain visible through an `AggregateError`. Dependency recovery creates a fresh idle Activation.

## Non-goals and verification

The current version has no Port-aware Connection, self-loop, business validation, Edge/Port box selection, lasso, Backspace deletion, Clipboard, confirmation UI, soft delete, snapping, pinch/touch tool, HTML overlay, text editing, collaboration presence, product UI, or generic Tool Registry. Successful behavior is verified through the complete Runtime + SVG seam in real Chromium.
