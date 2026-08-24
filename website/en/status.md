---
title: Current Status
description: What CFlow has delivered, what is explicitly missing, and which capability boundaries are verifiable today.
---

# Current Status

CFlow is at an early implementation stage, but it already has a working headless Canvas Runtime backbone. This page describes only capabilities committed on the current branch; it does not infer completion from the target architecture.

## Delivered

- CFlow-owned Plugin Host, Runtime Services, Activations, and resource disposal;
- Structured errors, Diagnostic Events, Sinks, and the Fault Reporter contract;
- Renderer-independent Kernel, synchronous Transactions, Canvas Views, Queries, and Change Sets;
- Kernel, Command, Session, History, and Renderer Runtime Plugins;
- Selection, Viewport, and backend-neutral Renderer value contracts;
- Backend-neutral Interaction Projections plus Selection, multi-Node Drag, Pan, Wheel Zoom, and node-level Edge Connection Runtime behavior;
- The reference-quality `@cflow/renderer-svg` Provider, with real-Chromium verification of SVG projection, input, Hit Testing, and lifecycle;
- Layout Input/Engine/Proposal contracts and Runtime Command integration;
- Dagre full Layout Provider;
- ELK full, incremental, and Fixed Node Layout Providers;
- The backend-neutral `@cflow/preset-basic` Basic Canvas Composition and a real SVG canonical example;
- A public facade aggregated through `@cflow/core`.

See [All modules](/en/modules/) for the complete inventory.

## Current gaps

::: warning No product-level editor shell yet
The current branch delivers the Basic Canvas Composition, Interaction v1 node-level Edge Connection, and SVG Renderer loop, but it still has no framework adapter or product-level editor shell. The first version does not include Port-aware Connection, box selection, snapping, pinch/touch tools, text editing, product Node UI, or an extensible Tool Registry.
:::

There is also no Persistence, Collaboration, serialization schema, or remote synchronization capability. A name appearing in the target architecture does not mean it has become a public package.

## Package publication status

This repository's source declares `@cflow/*` names, but `@cflow/core` in the public npm registry belongs to another project. This project cannot currently provide a safe npm installation command. Use a source checkout through the [Quick Start](/en/guide/quick-start).

When the project migrates to a new npm scope, package identities, site notices, and examples will be updated together. This documentation-site work does not rename or publish packages.

## Verification level

Each capability is evidenced by current public exports, package tests, declaration isolation, and real Runtime composition. The repository's aggregate checks cover linting, type checking, formatting, Bun tests, real-browser tests, builds, the Quick Start, and the production documentation build.

The site does not treat README counts, link existence, or design documents as proof of runtime behavior. When evidence conflicts, the current implementation and tests take precedence, while design intent remains documented separately.
