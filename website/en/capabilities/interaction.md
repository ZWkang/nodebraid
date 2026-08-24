---
title: Interaction
description: Interpret Renderer Input and Hit Results as Selection, Drag, Pan, Zoom, and Edge Connection while preserving stable write boundaries.
---

# Interaction

The Interaction capability answers how user input becomes semantic canvas behavior. It sits above the Renderer Runtime and consumes backend-neutral Input and Hit Results. Stable Document changes still go through Command/Kernel, while stable Selection and Viewport changes still go through Session.

## Current delivery

| Layer              | Package                                                       | Responsibility                                                        |
| ------------------ | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| Value contract     | [`@cflow/interaction-api`](/en/modules/interaction-api)       | Immutable Node Drag, Viewport Pan, and Connection Preview Projections |
| Runtime behavior   | [`@cflow/plugin-interaction`](/en/modules/plugin-interaction) | Selection, Drag, Pan, Zoom, node-level Connection, and lifecycle      |
| Projection adapter | [`@cflow/plugin-renderer`](/en/modules/plugin-renderer)       | Exclusive Interaction Projection Binding and Renderer synchronization |
| Reference backend  | [`@cflow/renderer-svg`](/en/modules/renderer-svg)             | Preview on real SVG geometry with aligned Hit/Input coordinates       |

```text
Renderer Input + Hit Result
            │
            ▼
Interaction Runtime
    ├── Preview ─────────▶ Interaction Projection Binding
    ├── Selection/Viewport ▶ Session Service
    └── final Node moves ─▶ Move Nodes Command ─▶ Kernel
```

## Behavioral boundaries

- Pointer move updates only the Projection; it does not continuously write Kernel or Session.
- Node Drag executes `interaction.nodes.move` once on pointerup. One Transaction naturally creates at most one History Entry.
- Mouse Connection uses Renderer-owned Node-level Anchors, an application Edge materializer, and one `interaction.edge.create` Transaction.
- Primary Canvas, middle button, or Space+primary can establish Pan. Wheel Zoom is anchored to a Screen Point and bounded by explicit configuration.
- One Activation owns one Gesture Pointer. Additional Pointers, Wheel during a Gesture, pointer cancellation, lost capture, and stale evidence all have explicit semantics and diagnostics.
- Dependency loss or Plugin unload stops input, clears Preview, releases Capture, clears local state, and unregisters the Command. Recovery creates a fresh idle Activation.

## Non-goals

The first Connection version excludes Ports, self-loops, business validation, and Edge Routing. It also has no box selection, delete shortcut, snapping, pinch/touch tools, HTML overlays, text editing, collaboration presence, product UI, or generic Tool Registry.

## Verification

The successful path composes the real Plugin Host, Kernel, Command, Session, Renderer, History, and SVG Provider in Chromium. Structural, recovery, and cleanup faults are injected only through public seams; a fake Renderer does not certify successful Selection, Drag, Pan, Zoom, or Capture behavior.
