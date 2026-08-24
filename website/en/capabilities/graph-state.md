---
title: Graph State
description: Compose a pure Kernel and local Session into one authoritative Document and observable view state.
---

# Graph State

NodeBraid separates “what is in the graph” from “how the current user is viewing it” into two state boundaries with clear ownership. The Kernel maintains the authoritative Document; the Session maintains Selection and Viewport. Runtime Services compose them explicitly, but they never collapse into one global Store.

::: info Current status
All four packages in the Graph State capability family are implemented and connected to the public facade. Use them from the repository source for now; they have not yet been published to npm under this project.
:::

## The problem it solves

A flow canvas usually contains both persistent graph data and interaction state that belongs only to the current view. If Node, Edge, Selection, Viewport, and Renderer state are packed into one object, transactional consistency, undo boundaries, collaboration semantics, and component lifecycles contaminate one another.

The Graph State capability family solves this with two ownership boundaries:

- **Document**: owned exclusively by the Kernel and modified atomically only through synchronous Transactions.
- **Session**: separate from the Document and limited to the current Canvas Runtime's Selection and Viewport.

## When to use it

- Build a headless flow canvas without binding the graph model to the DOM, Canvas, or a frontend framework.
- Share one authoritative Document across business Commands, History, Layout, and Renderer capabilities.
- Keep every Selection reference resolvable to a Node or Edge that still exists in the current Document.
- Isolate multiple Canvas Runtimes so that each owns its own graph state and local view state.
- Use only the pure graph Kernel, or add full lifecycle management through the Plugin Host.

## What it provides

| Module                                                    | Role                   | Key capabilities                                                                                   |
| --------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------- |
| [`@nodebraid/kernel`](/en/modules/kernel)                 | Pure graph Kernel      | Document, synchronous Transaction, revision-bound Canvas View, Canvas Query, reversible Change Set |
| [`@nodebraid/plugin-kernel`](/en/modules/plugin-kernel)   | Kernel Runtime adapter | A fresh Kernel per Activation, narrow `KernelService`, ordered Canvas Commit observation           |
| [`@nodebraid/session-api`](/en/modules/session-api)       | Session value contract | Renderer-independent `SelectionSnapshot`, `Viewport`, and `SessionSnapshot`                        |
| [`@nodebraid/plugin-session`](/en/modules/plugin-session) | Session Runtime Plugin | Selection/Viewport mutation, subscriptions, and coordination between Selection and the Kernel View |

The four modules let consumers choose a layer. Pure algorithmic code can use only the Kernel; a Renderer Provider can depend only on the Session value contract; a Canvas Runtime can install both Runtime Plugins for complete Document and Session lifecycles.

## Dependencies and composition

```text
@nodebraid/plugin-session ──requires──▶ Kernel Service
        │                               ▲
        ├──▶ @nodebraid/session-api         │ provides
        ├──▶ @nodebraid/kernel              │
        └──▶ @nodebraid/runtime-cordis   @nodebraid/plugin-kernel
                                            │
                                            ├──▶ @nodebraid/kernel
                                            └──▶ @nodebraid/runtime-cordis
```

`@nodebraid/kernel` stays pure. Plugin Host lifecycle semantics exist only in `plugin-kernel` and `plugin-session`. `@nodebraid/session-api` places side-effect-free Session value contracts outside the Runtime Plugin so that the Renderer contract does not gain a transitive dependency on the Session Service.

## Public entry points

Graph State capabilities can be imported from their narrow packages. Application code can also use the same named exports through the `@nodebraid/core` facade.

```ts
import { createCanvasKernel, edgeId, nodeId } from '@nodebraid/kernel';
import { kernelPlugin, kernelService } from '@nodebraid/plugin-kernel';
import type { SessionSnapshot, Viewport } from '@nodebraid/session-api';
import { sessionPlugin, sessionService } from '@nodebraid/plugin-session';
```

These imports show the repository's current public exports; they do not mean that the packages can be installed from npm. Follow the [Quick Start](/en/guide/quick-start) to verify them from source.

## State and lifecycle semantics

1. `createCanvasKernel()` creates an empty revision-zero Document. The pure Kernel has no Plugin lifecycle.
2. `kernelPlugin` creates a fresh revision-zero Kernel for every Activation and exposes reads, synchronous Transactions, and Commit observation through `kernelService`.
3. `sessionPlugin` statically requires `kernelService`; its Installation remains pending while the Kernel is unavailable.
4. Each Session Activation starts with an empty Selection and a `{ x: 0, y: 0, zoom: 1 }` Viewport.
5. A successful Kernel Commit carries `before`, `after`, and a Change Set for the same revision. The Session uses that Commit's `after` View to remove invalid selections.
6. When the Kernel Provider disappears, the dependent Session and Consumers end their current Activations first, and old Service handles close explicitly. A new Kernel Provider creates a completely new Kernel and default Session without inheriting old state.

## Limitations and non-goals

- Session state is not Document, History, Persistence, or Collaboration state.
- The Kernel does not own Selection, Viewport, Renderer, Command, or Plugin lifecycle.
- Graph State does not provide database serialization, remote synchronization, CRDTs, schema migration, or interpretation of business data.
- Selection does not express a primary item or selection order; Viewport does not include product-level zoom limits.
- Node and Edge `data` are opaque to the Kernel; domain layers must preserve immutable usage themselves.
- The Renderer contract, Runtime adapter, and SVG Provider are delivered. Graph State itself still neither owns nor draws a visible canvas.

## Verification evidence

- Public exports: [`kernel`](https://github.com/ZWkang/nodebraid/blob/main/packages/kernel/src/index.ts), [`plugin-kernel`](https://github.com/ZWkang/nodebraid/blob/main/packages/plugin-kernel/src/index.ts), [`session-api`](https://github.com/ZWkang/nodebraid/blob/main/packages/session-api/src/index.ts), and [`plugin-session`](https://github.com/ZWkang/nodebraid/blob/main/packages/plugin-session/src/index.ts).
- Behavioral tests: Kernel Transactions and Change Sets, Kernel Plugin Commit ordering, canonical Session values, and Session reconciliation are all verified through each package's public seam.
- Domain boundaries: the repository's `CONTEXT.md` defines Document, Canvas Runtime, Kernel Service, Session, Selection, and Viewport normatively.
- Architecture decisions: ADR-0009, 0010, 0013, 0017, 0018, 0022, and 0035 establish the pure Kernel, revision-bound View, narrow Runtime Service, Session coordination, and independent value contract.
