---
title: '@cflow/interaction-api'
description: Pure backend-neutral Interaction Projection value contracts.
---

# `@cflow/interaction-api`

::: warning Package is not publicly released
This name identifies the current source module boundary; it does not mean the package can be installed from npm. Follow the [Quick Start](/en/guide/quick-start) to verify it from source.
:::

## The problem it solves

Transient Drag and Pan Preview must reach a Renderer without placing Runtime state machines, DOM Events, or backend objects in the Renderer API. This package owns only immutable CFlow Projection values, giving Interaction behavior and Renderer Providers a stable value seam.

## What it provides

- `InteractionProjection`: the `node-drag | viewport-pan` discriminated union;
- `NodeDragInteractionProjection`: canonical Node IDs, base positions, and absolute candidate positions;
- `ViewportPanInteractionProjection`: a base Viewport and absolute candidate Viewport;
- `NodeDragProjectionNode`: local evidence and a candidate position for one dragged Node.

```ts
import type { InteractionProjection } from '@cflow/interaction-api';

const preview: InteractionProjection = {
  type: 'viewport-pan',
  baseViewport: { x: 0, y: 0, zoom: 1 },
  viewport: { x: 24, y: 12, zoom: 1 },
};
```

## Dependencies and boundaries

The package depends only on Node identity and Point from `@cflow/kernel` and Viewport from `@cflow/session-api`. It does not depend on Renderer, Runtime, the Plugin Host, DOM, a concrete Provider, or `@cflow/core`. It also does not own Active Gestures, Commands, Selection, or lifecycle.

`@cflow/renderer-api` consumes these values as a Provider update contract, `@cflow/plugin-interaction` creates them, and `@cflow/plugin-renderer` mediates the single writer.

## Limits and verification

The current contract includes Node Drag, Viewport Pan, and node-level Connection Preview values. It has no Port Registry, hover, box selection, snapping, Tool Registry, or backend handle. Type and declaration checks reject Runtime, Renderer, DOM, and concrete Provider leakage.
