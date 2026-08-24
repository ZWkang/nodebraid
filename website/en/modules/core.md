---
title: '@nodebraid/core'
description: The unified facade for NodeBraid's currently delivered public capabilities.
---

# `@nodebraid/core`

`@nodebraid/core` is the preferred public entry point for ordinary NodeBraid applications. It brings the delivered value contracts, Plugin Host, Runtime Plugins, Basic Canvas Composition, and generic Layout contract together in one facade while preserving the original types and behavior of each narrow package.

::: warning Package is not publicly released
This name identifies the current source module boundary; it does not mean the package can be installed from npm. Follow the [Quick Start](/en/guide/quick-start) to verify it from source.
:::

## The problem it solves

An application should not need to memorize the entire package dependency graph before creating a Canvas Runtime. `@nodebraid/core` provides a stable entry point from which an application can access the Basic Canvas Composition, Kernel, Session, Command, History, Interaction, Layout, Renderer contract, Diagnostics, and Plugin Host API in one module.

It is a facade, not another Runtime. The re-exported values, types, errors, and lifecycle implementations remain owned by their respective narrow packages.

## When to use it

- Build a NodeBraid application or product integration that composes several official capabilities.
- Run the minimal path from a Plugin Host to a Kernel Transaction.
- Start from one unified entry point, then switch to narrow package imports once dependency boundaries are clear.

If you are building an internal NodeBraid package or need only one narrow low-level contract, depend on the corresponding package directly. This prevents lower-level modules from depending back on the public facade.

## What it provides

`@nodebraid/core` currently re-exports:

- structured errors and Diagnostic Event contracts from `@nodebraid/diagnostics`;
- the pure graph model, Transactions, Canvas View, Canvas Query, and Change Set from `@nodebraid/kernel`;
- immutable Session values from `@nodebraid/session-api`;
- backend-neutral Renderer contracts from `@nodebraid/renderer-api`;
- backend-neutral Interaction Projection values from `@nodebraid/interaction-api`;
- the NodeBraid-owned Plugin Host API from `@nodebraid/runtime-cordis`;
- the Kernel, Command, Session, Renderer, Interaction, and History Runtime Plugins;
- the backend-neutral Basic Canvas Composition from `@nodebraid/preset-basic`;
- the generic Layout API and Layout Runtime Plugin.

Concrete Layout Providers stay separate: `dagreLayoutEngine` and `elkLayoutEngine` are not part of the facade. `@nodebraid/renderer-svg` is now delivered as a concrete Renderer Provider, but core still neither chooses nor re-exports it.

## Dependencies and composition

```text
Application
    │
    ▼
@nodebraid/core (facade)
    ├── Diagnostics / Kernel / Session / Interaction / Renderer contracts
    ├── Plugin Host
    ├── official Runtime Plugins
    ├── Basic Canvas Composition
    └── generic Layout contracts and integration
```

Importing from core does not create global state or install any default Plugin. The application still creates its own Plugin Host and may explicitly install the Basic Canvas Composition or each required capability individually. Provider selection always remains application-owned.

Advanced consumers can bypass the facade and depend directly on `@nodebraid/kernel`, `@nodebraid/runtime-cordis`, or another narrow package. Both entry paths share the same implementations; they do not create two runtimes.

## Public entry points

The package has one public subpath: `@nodebraid/core`. Representative public entry points include:

| Capability  | Representative entry points                                                    |
| ----------- | ------------------------------------------------------------------------------ |
| Plugin Host | `createPluginHost`, `definePlugin`, `defineService`                            |
| Kernel      | `createCanvasKernel`, `kernelPlugin`, `kernelService`                          |
| Command     | `defineCommand`, `commandPlugin`, `commandService`                             |
| Session     | `sessionPlugin`, `sessionService`                                              |
| History     | `historyPlugin`, `historyService`, `undoCommand`, `redoCommand`                |
| Layout      | `createLayoutInput`, `defineLayoutEngine`, `createLayoutPlugin`, `LayoutError` |
| Renderer    | `createRendererPlugin`, `rendererService`, `RendererError`                     |
| Interaction | `interactionPlugin`, `moveNodesCommand`, `interactionDiagnosticEvents`         |
| Composition | `createBasicCanvasPlugin`, `BasicCanvasPluginOptions`                          |
| Diagnostics | `NodeBraidError`, `diagnosticEvents`, `describeError`                          |

The complete export surface is the facade source's explicit `export *` declarations for public packages. There are no additional hidden subpaths.

## Lifecycle and error semantics

`@nodebraid/core` adds no lifecycle semantics. A Plugin Host, Plugin Installation, Kernel, or other capability created through it follows the public semantics of the package that owns it:

- Plugin Installation states remain `pending`, `active`, `failed`, and `disposed`;
- Kernel Transactions remain synchronous and atomic;
- NodeBraid structural errors retain their stable `domain + code` identity;
- external failures from Plugin Setup, Command Handlers, Providers, and Abort reasons retain their original values;
- multiple peer cleanup failures remain exposed as an `AggregateError`.

Facade tests exercise the types and behavior of these objects through `@nodebraid/core` as well, preventing re-exports from drifting away from their contracts.

## Limitations and non-goals

- Does not install the Kernel, Command, Session, History, Interaction, Layout, or Renderer Plugin automatically.
- Does not install the Basic Canvas Composition implicitly and does not select a default Renderer.
- Does not re-export concrete Layout Providers such as Dagre or ELK.
- Does not select or re-export concrete Renderer Providers such as `@nodebraid/renderer-svg`.
- Does not provide framework Adapters, UI components, persistence, or collaboration.
- Does not expose Cordis types to applications.
- Cannot currently be installed from npm as a NodeBraid package.

## Verification evidence

- The facade source explicitly re-exports each current public package.
- `packages/core/tests/index.test.ts` verifies the Diagnostics, Plugin Host, Kernel, Session, Renderer, Interaction, Command, and History public seams through the facade.
- `packages/core/tests/layout.test.ts` verifies that the generic Layout API is visible while the Dagre and ELK Providers do not leak through.
- `packages/core/tests/preset-basic.test.ts` verifies that the Basic Canvas Composition is visible while the SVG Provider does not leak through.
- Declaration artifact checks verify the built public type boundary.
