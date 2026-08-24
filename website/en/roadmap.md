---
title: Roadmap
description: Future NodeBraid directions kept strictly separate from currently delivered capabilities.
---

# Roadmap

This Roadmap records directions that have not shipped. It promises no dates, package names, or final APIs. A direction appears in [Current Status](/en/status) and [All modules](/en/modules/) only after it enters the current implementation, public exports, and verification gates.

## Publication identity

Before packages can be released for external applications, the project must migrate to an npm scope it owns and update manifests, dependencies, documentation, and the release workflow together. This is a prerequisite for a public installation experience, but it is outside the scope of the current documentation-site implementation.

## Renderer ecosystem

The SVG Renderer Provider has now proven a real Target, Document/Session synchronization, input, Hit Testing, and lifecycle. Future Canvas2D, WebGL, Konva, Pixi, or other Providers should ship independently through the same contract rather than adding a default Renderer or dynamic Registry to core.

## Interaction extensions and framework integration

Interaction v1 now interprets selection, multi-Node dragging, Pan, Wheel Zoom, and node-level Edge Connection on top of standardized Renderer Input while using the existing Command/Session/Kernel write boundaries. Port-aware Connection, box selection, snapping, pinch/touch, text editing, and an extensible Tool Registry remain separate future designs. React, Vue, or other framework adapters should remain between the Runtime and UI framework without acquiring a second source of Document authority.

## Composition and examples

The backend-neutral Basic Canvas Composition and a real SVG canonical example are now delivered, with Chromium verification of Selection, Move, History, Wheel input, and disposal. Future framework adapters or product examples remain explicit application-layer capabilities. The Plugin Host will not install the preset implicitly, and the preset will not choose a default Renderer.

## Later exploration

Persistence, Collaboration, serialization schemas, remote synchronization, and additional Layout or Renderer Providers each require their own use cases, contracts, and verification. They are exploration directions today, not shipped or committed modules.
