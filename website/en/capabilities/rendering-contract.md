---
title: Rendering Contract
description: Connect Document, Session, and Interaction through a backend-neutral Renderer protocol without leaking backend objects into CFlow core.
---

# Rendering Contract

The Rendering Contract capability family defines how CFlow Canvas semantics are handed to a rendering backend and how backend input is converted back into CFlow values. It deliberately does not select SVG, Canvas2D, Konva, Pixi, or any default implementation: the application owns the concrete Renderer Factory, while the Runtime adapter handles only state synchronization and lifecycle.

::: info SVG Renderer Provider delivered
`@cflow/renderer-svg` is the first reference-quality official Provider. It projects generic rectangular Nodes, straight Edges, Selection, Viewport, and standardized input into an existing application-owned SVG Target. It is not the default Renderer and does not interpret product Node types or data.
:::

## Problems it solves

- Prevent Kernel, Session, and Interaction from depending on DOM APIs, native events, or a particular graphics library;
- Give a concrete Provider complete Canvas semantics rather than leaking generic drawing instructions;
- Keep Document reset/commit, Session Snapshot, and input events as clear, independent contracts;
- Make the Renderer Instance, subscriptions, and Target cleanup part of the Plugin Activation;
- Diagnose revision drift explicitly and recover the Baseline from authoritative Kernel state.

## When to use it

- You are implementing a CFlow Renderer Provider;
- You want to use the current official SVG Provider for generic Canvas projection;
- You want to connect an existing Renderer Factory to the Canvas Runtime;
- Your Interaction Plugin needs standardized input, Hit Testing, Pointer Capture, or Focus;
- You are evaluating the responsibility boundary between CFlow and a concrete rendering backend.

If generic SVG Geometry and the stable DOM seam meet your needs, select `@cflow/renderer-svg` directly. Product-specific Node visuals, Interaction, and framework adapters remain explicit application responsibilities.

## What it provides

| Role                | Package                                                 | What it delivers                                                                                               |
| ------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Provider contract   | [`@cflow/renderer-api`](/en/modules/renderer-api)       | `CanvasRenderer`, Factory, Document/Session updates, standardized input, Hit Result, and structured errors     |
| Runtime integration | [`@cflow/plugin-renderer`](/en/modules/plugin-renderer) | Binds a Factory as a Plugin, coordinates Kernel/Session, and exposes a narrow `RendererService` to Interaction |
| SVG Provider        | [`@cflow/renderer-svg`](/en/modules/renderer-svg)       | Projects generic Canvas Geometry, Session, and browser input into an existing `SVGSVGElement`                  |

```text
Kernel Commit ───────────────┐
                             │ ordered + resolvable delivery
Session Snapshot ────────────┼────────▶ CanvasRenderer ─────▶ concrete Target
                             │                 │
Interaction ◀── RendererService ◀── normalized Input / Hit Result
```

The Renderer has no write authority over the Document, Session, or Commands. It projects state and reports input facts only; interpreting behavior and changing state belong to Interaction or another Feature Plugin.

## Dependencies and composition

`@cflow/renderer-api` depends only on CFlow's Kernel and Session value contracts plus Diagnostics. It does not depend on the Plugin Host, a concrete backend, or a framework.

`@cflow/plugin-renderer` statically requires `KernelService` and `SessionService`. The application obtains a `RendererFactory<Config>` from a concrete Provider, calls `createRendererPlugin(factory)` to generate a normal Runtime Plugin, then installs it with Provider-specific config. CFlow provides neither a Factory Registry nor a default Provider.

`@cflow/renderer-svg` depends only on the Renderer API and its value contracts, not on the Plugin Host. Applications can use the Factory directly or connect it to the Runtime through the Renderer Plugin.

## Public entry points

- [`@cflow/renderer-api`](/en/modules/renderer-api): the backend-neutral contract shared by Provider authors and the Runtime adapter;
- [`@cflow/plugin-renderer`](/en/modules/plugin-renderer): connects an explicitly selected Factory to the Plugin Host;
- [`@cflow/renderer-svg`](/en/modules/renderer-svg): the current official SVG Factory, Config, and Provider-specific errors;
- `@cflow/core`: re-exports both packages without bringing in any concrete Provider.

The CFlow packages are not publicly published under this project's identity. Verify them from source, and do not install similarly named packages from npm that belong to another project.

## Lifecycle and error semantics

- A Renderer Factory creates one Renderer Instance for a fixed Target; the public interface has no mount, unmount, or remount operations;
- The Renderer Plugin remains pending until its Required Services exist, and Activation does not complete until the asynchronous Factory, initial Document reset, and Session delivery have finished;
- Subsequent Commits must be continuous with the Renderer Baseline. Drift is reported through Host diagnostics, and the Runtime adapter reads the current Kernel View to perform an explicit reset;
- Session and Document change through separate channels, but the Runtime adapter guarantees that every delivered Selection can be resolved against the Renderer Document at that point;
- When Activation ends, the Runtime first stops Kernel, Session, and Input subscriptions, then awaits Renderer `dispose()` asynchronously. The old `RendererService` fails explicitly;
- Original Factory, projection, and dispose failures are never rewritten as success. Host cleanup continues releasing other Owned Resources and aggregates cleanup failures explicitly.

## Limitations and non-goals

- The only current concrete Provider is the reference SVG implementation; there is no Canvas2D, WebGL, Konva, Pixi, or framework adapter;
- No default Provider, dynamic Registry, or universal `HTMLElement` mount;
- The Renderer does not modify the Document or Session and does not execute Commands directly;
- The initial input contract includes Pointer, Wheel, and Keyboard only, without native events or backend targets;
- Hit Result identifies only Canvas, Node, Edge, or Port and does not expose scene objects, z-order, or arbitrary details;
- No business-specific Node visuals, Interaction behavior, animation, text editing, or complete canvas product.

## Verification evidence

Renderer API tests lock down backend-neutral types, Factory config, Document/Session update authority, and structured errors. Renderer Plugin tests use a recording Provider to verify initial reset, resolvable Session ordering, input and control delegation, listener fault isolation, drift reset, the narrow Service surface, and disposal. The SVG Provider additionally uses real Chromium to verify SVG projection, coordinate mapping, native input, Hit Testing, Pointer Capture, Focus, rollback, and terminal disposal.
