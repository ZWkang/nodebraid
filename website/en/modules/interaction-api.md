---
title: '@nodebraid/interaction-api'
description: Pure backend-neutral Interaction Projection value contracts.
---

# `@nodebraid/interaction-api`

::: warning Package is not publicly released
This name identifies the current source module boundary; it does not mean the package can be installed from npm. Follow the [Quick Start](/en/guide/quick-start) to verify it from source.
:::

## The problem it solves

Transient Drag and Pan Preview must reach a Renderer without placing Runtime state machines, DOM Events, or backend objects in the Renderer API. This package owns only immutable NodeBraid Projection values, giving Interaction behavior and Renderer Providers a stable value seam.

## What it provides

- `InteractionProjection`: the `node-drag | viewport-pan | box-selection | connection-preview` discriminated union;
- `NodeDragInteractionProjection`: canonical Node IDs, base positions, and absolute candidate positions;
- `ViewportPanInteractionProjection`: a base Viewport and absolute candidate Viewport;
- `NodeDragProjectionNode`: local evidence and a candidate position for one dragged Node.
- `WorldRect` and `BoxSelectionInteractionProjection`: a direction-independent world-space selection rectangle;
- `ConnectionAnchorIdentity` and `ConnectionPreviewInteractionProjection`: backend-neutral node-level connection preview values.

```ts
import type { InteractionProjection } from '@nodebraid/interaction-api';

const preview: InteractionProjection = {
  type: 'viewport-pan',
  baseViewport: { x: 0, y: 0, zoom: 1 },
  viewport: { x: 24, y: 12, zoom: 1 },
};
```

## Dependencies and boundaries

The package depends only on Node identity and Point from `@nodebraid/kernel` and Viewport from `@nodebraid/session-api`. It does not depend on Renderer, Runtime, the Plugin Host, DOM, a concrete Provider, or `@nodebraid/core`. It also does not own Active Gestures, Commands, Selection, or lifecycle.

`@nodebraid/renderer-api` consumes these values as a Provider update contract, `@nodebraid/plugin-interaction` creates them, and `@nodebraid/plugin-renderer` mediates the single writer.

## Limits and verification

The current contract includes Node Drag, Viewport Pan, Box Selection, and node-level Connection Preview values. It has no Port Registry, hover, lasso, snapping, Tool Registry, or backend handle. Type and declaration checks reject Runtime, Renderer, DOM, and concrete Provider leakage.
