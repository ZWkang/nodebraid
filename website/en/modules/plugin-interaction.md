---
title: '@cflow/plugin-interaction'
description: The Runtime Plugin that interprets Renderer Input as Selection, Drag, Pan, and Wheel Zoom.
---

# `@cflow/plugin-interaction`

::: warning Package is not publicly released
This name identifies the current source module boundary; it does not mean the package can be installed from npm. Follow the [Quick Start](/en/guide/quick-start) to verify it from source.
:::

## The problem it solves

A Renderer publishes input facts and Hit Results; it should not decide product behavior. This Plugin owns the Active Gesture state machine above Renderer, Session, Command, and Kernel. It interprets raw input as backend-neutral selection, dragging, and viewport behavior without creating a second Document write path.

## What it provides

- `interactionPlugin`: a Feature Plugin with no Runtime Service;
- `InteractionConfig`: `dragThreshold`, `wheelZoomSensitivity`, `minZoom`, and `maxZoom`;
- `moveNodesCommand`: ID `interaction.nodes.move`, updating all target Nodes in one synchronous Transaction;
- `InteractionError`: `INVALID_CONFIG`, `INVALID_MOVE`, and `STALE_GESTURE`;
- `interactionDiagnosticEvents`: Pointer/Input rejection, Gesture cancellation, and Command fault events.

The current version also includes optional mouse-only, Node-level Edge Connection. An application materializer owns Edge ID, type, and data; Interaction commits one typed Create Edge Command on pointerup.

## Dependencies and write direction

The Plugin statically requires Renderer, Session, Command, and Kernel Services and provides no state Service of its own.

```text
RendererService ─▶ Input / Hit / Capture / Projection
SessionService  ◀─ Selection / Viewport
CommandService  ◀─ Move Nodes Command ─▶ KernelService
```

Pointer move only replaces the Interaction Projection. Pointerup clears Preview and returns to idle before writing Viewport to Session or executing one Move Nodes Command. The Command reads the current complete Node, replaces only its position, and rejects competing writes using each Node's base position.

## Lifecycle and errors

One Activation owns one Gesture Pointer. Additional Pointers and Wheel during a Gesture have stable diagnostics. Pointer cancellation, lost capture, stale Node/Viewport evidence, Plugin unload, and dependency loss never commit Preview. Composite cleanup stops subscriptions, clears the Binding, releases Capture, clears state, and awaits Command Registration; peer failures remain visible through an `AggregateError`. Dependency recovery creates a fresh idle Activation.

## Non-goals and verification

The current version has no Port-aware Connection, self-loop, business validation, box selection, delete behavior, snapping, pinch/touch tool, HTML overlay, text editing, collaboration presence, product UI, or generic Tool Registry. Successful behavior is verified through the complete Runtime + SVG seam in real Chromium.
