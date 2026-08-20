---
title: '@cflow/renderer-svg'
description: A reference Renderer Provider that projects CFlow Canvas semantics into an existing SVG Target.
---

# `@cflow/renderer-svg`

::: warning Package is not publicly released
This name describes the current source-module boundary; it does not mean the package can be installed from npm. Follow the source-based [Quick Start](/en/guide/quick-start) to verify it.
:::

## Problems it solves

`@cflow/renderer-svg` is the first official concrete Provider for `@cflow/renderer-api`. It projects Document, Session, Hit Testing, and standardized browser input into an application-owned `SVGSVGElement`, validating the Renderer contract against a real DOM without leaking SVG types into Kernel, Session, or the public Renderer API.

It provides generic rectangular Nodes, straight Edges, and a stable DOM seam. It does not interpret product Node types, business data, or component frameworks.

## When to use it

- You need an official Renderer Provider that integrates with an existing SVG element;
- You want to verify the complete Renderer path across Document Commits, Selection, Viewport, Hit Testing, and browser input;
- Your application will define product visuals and editing behavior through CSS and higher-level Interaction;
- You want to use a named Factory directly or connect it to the Runtime through [`@cflow/plugin-renderer`](/en/modules/plugin-renderer).

If the product needs custom Node DOM, Ports, complex Edges, component mounting, or complete editor interaction, this package is not a substitute for those capabilities.

## What it provides

- A synchronous `createSvgRenderer(config)` Factory bound to one existing `SVGSVGElement`;
- Generic rectangular Nodes, straight Edges, Selection markers, and Viewport projection;
- A real-DOM bridge for Pointer, Wheel, Keyboard, Focus, and Pointer Capture;
- Node Drag and Viewport Pan Interaction Projection overrides, baseline invalidation, and compatible-Commit reprojection;
- CSS-screen-pixel to SVG-user-space conversion and semantic Hit Testing;
- Stable classes, `data-cflow-*` attributes, canonical layer order, and keyed DOM identity;
- Atomic Document/Session updates, continuous revision validation, rollback on failure, and reset recovery;
- Provider-specific `SvgRendererError` values plus the complete structured Renderer contract errors.

The Provider manages only the projection subtree it creates under the Target. The caller retains ownership of existing SVG content; disposal removes only Provider-owned content.

## Dependencies and composition

This package depends on the backend-neutral contract from [`@cflow/renderer-api`](/en/modules/renderer-api) and the Kernel, Session, Interaction Projection, and Diagnostics value contracts used by it. It does not depend on the Plugin Host, a framework adapter, the Interaction state machine, or `@cflow/core`.

Applications can create the Renderer directly. To get Runtime lifecycle and Kernel/Session synchronization, pass `createSvgRenderer` to [`@cflow/plugin-renderer`](/en/modules/plugin-renderer). CFlow does not select this Provider by default, and `@cflow/core` does not re-export it.

## Public entry points

```ts
import {
  createSvgRenderer,
  SvgRendererError,
  type SvgDomEventPolicy,
  type SvgInputPolicies,
  type SvgRendererConfig,
  type SvgRendererErrorCode,
} from '@cflow/renderer-svg';

const target = document.querySelector<SVGSVGElement>('#canvas');
if (!target) throw new Error('Missing SVG target.');

const renderer = createSvgRenderer({
  target,
  edgeHitTolerance: 4,
  input: {
    wheel: { preventDefault: true },
  },
});

try {
  // Deliver Document and Session projections through the Renderer contract.
} finally {
  await renderer.dispose();
}
```

Factory config is an immutable Provider-specific value. `target` is required; `edgeHitTolerance` is a non-negative CSS-pixel value; and `input` controls `preventDefault` / `stopPropagation` policies separately for Pointer, Wheel, Keyboard, and Context Menu events.

## DOM and styling seam

The Provider writes geometry, stable classes, and `data-cflow-*` attributes, but it does not inject a runtime theme. Applications can start with minimal styles:

```css
.cflow-renderer-svg__node {
  fill: white;
  stroke: currentColor;
}

.cflow-renderer-svg__edge {
  stroke: currentColor;
}

[data-cflow-selected='true'] {
  stroke-width: 2;
}
```

These attributes are stable seams for CSS, tests, and light DOM integration, not a business-component API. Semantic Node and Edge Hit Testing follows the Provider's Geometry model rather than the browser paint target.

## Lifecycle and error semantics

An available Target can host only one SVG Renderer Instance at a time. The Factory synchronously validates config, Target type, connection state, dimensions, coordinate transforms, and occupancy. The Target remains reserved from creation until asynchronous cleanup finishes so two instances cannot interleave ownership of one projection.

| Code                 | Applicable failure                                                       |
| -------------------- | ------------------------------------------------------------------------ |
| `INVALID_CONFIG`     | Unknown config keys, an invalid tolerance, or invalid input policies     |
| `INVALID_TARGET`     | `target` is not a valid `SVGSVGElement`                                  |
| `TARGET_OCCUPIED`    | Another active or still-cleaning-up Instance owns the Target             |
| `TARGET_UNAVAILABLE` | The Target is disconnected, has no usable size, or has no invertible CTM |

Document revision, Session, Input subscriber, Pointer, and disposed-state failures continue to use `RendererError` from `@cflow/renderer-api`. The Provider does not swallow failures. Structural validation occurs before projection changes, and a failure that cannot be rolled back safely explicitly requires the next `reset` to rebuild the Baseline.

## Limitations and non-goals

- Renders only explicitly sized rectangular Nodes and straight Edges between valid endpoints;
- No Ports, self-loops, curves, markers, labels, rich text, animation, or product-specific Node appearance;
- No default theme, theme Registry, component slots, or framework adapter;
- Does not interpret Interaction behavior and provides no Commands, drag state machine, Selection writes, or persistence; it only displays an accepted semantic Projection;
- Does not create the SVG Target or take ownership of the caller's existing Target children;
- Not a default Renderer and provides no Registry, default export, or Plugin wrapper.

## Verification evidence

Type tests lock down the named synchronous Factory, Config, and error entry points. Bun tests cover config and value semantics. Real-Chromium tests cover SVG and Interaction projection, DOM identity, continuous Commits, Session, Hit Testing, screen-to-SVG coordinate conversion, ResizeObserver, native input policies, Pointer Capture, lost capture, Focus, Runtime Plugin composition, Target reservation, rollback, and disposal. Declaration-artifact checks also ensure that public entry points do not leak implementation details.
