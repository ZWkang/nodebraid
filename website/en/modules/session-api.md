---
title: '@cflow/session-api'
description: Renderer-independent Selection, Viewport, and Session Snapshot value contracts.
---

# `@cflow/session-api`

::: warning Package is not publicly released
This name identifies the current source module boundary; it does not mean the package can be installed from npm. Follow the [Quick Start](/en/guide/quick-start) to verify it from source.
:::

`@cflow/session-api` defines only the immutable value shapes of a Session. It lets Runtime Plugins and Renderer contracts share the same semantics without pulling the Plugin Host or mutation capabilities into a lower-level API.

::: info Current status
Implemented. This package provides TypeScript value contracts; it does not create a Session, validate input, or own any Runtime lifecycle.
:::

## The problem it solves

A Renderer needs to read Selection and Viewport, but should not therefore depend on the Session Service, Plugin Host, or Kernel adapter. If the Renderer API duplicates these types, Selection and Viewport semantics will drift over time. `@cflow/session-api` provides the smallest value contract that both sides can share.

## When to use it

- Build a Renderer Provider, serialization adapter, or pure function that only needs to describe the current Session Snapshot.
- Pass Selection and Viewport across API boundaries without exposing mutation or subscription capabilities.
- Give Runtime and Renderer packages one shared source of types.
- Define a readonly external Store snapshot type for a framework adapter.

## What it provides

`@cflow/session-api` exports only three types:

| Type                | Semantics                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `SelectionSnapshot` | Sets of currently selected NodeIds and EdgeIds; array order is deterministic only and expresses neither a primary item nor selection order |
| `Viewport`          | A logical `{ x, y, zoom }` view transform; browser Providers interpret x/y as CSS pixels                                                   |
| `SessionSnapshot`   | Immutable local view state composed of one Selection Snapshot and one Viewport                                                             |

## Dependencies and composition

This package depends only on the `NodeId` and `EdgeId` types from `@cflow/kernel`. It does not depend on `@cflow/plugin-kernel`, `@cflow/runtime-cordis`, or `@cflow/core`.

- [`@cflow/plugin-session`](/en/modules/plugin-session) uses these types to provide mutation, validation, subscriptions, and Activation lifecycle.
- `@cflow/renderer-api` uses the same Session Snapshot as part of its Renderer input contract without depending on a Runtime Plugin.

## Public entry points

```ts
import type { SelectionSnapshot, SessionSnapshot, Viewport } from '@cflow/session-api';

const snapshot: SessionSnapshot = {
  selection: { nodeIds: [], edgeIds: [] },
  viewport: { x: 0, y: 0, zoom: 1 },
};
```

These are readonly TypeScript interfaces. Constructing an object with the same shape does not freeze or validate it at runtime.

## State and lifecycle semantics

- `SessionSnapshot` carries no Document revision and exposes no mutation method.
- The Node and Edge arrays in Selection represent set membership. The Session implementation owns deterministic sorting, deduplication, existence validation, and immutable freezing.
- Viewport follows `screen = world × zoom + offset`. The Session implementation owns value validation and normalization of negative zero.
- The value contract itself has no Activation, Service handle, subscription, cleanup, or reactivation semantics.
- Snapshots produced by the official `plugin-session` preserve the root reference while the logical value is unchanged, enabling reference comparison in external Store adapters. That behavior belongs to the Runtime Plugin, not to these type definitions.

## Limitations and non-goals

- Does not export `sessionPlugin`, `sessionService`, setters, subscribers, or structural errors.
- Does not validate that Selection references the current Canvas View or that Viewport values are finite with `zoom > 0`.
- Does not define a primary item, selection order, hover, focus, preselection, drag state, or tool state.
- Does not provide world/screen coordinate conversion and does not interact with `devicePixelRatio` or a Renderer backing store.
- A Session Snapshot is not a Document Snapshot, Renderer Snapshot, or persistent user session.

## Verification evidence

- [Public exports](https://github.com/ZWkang/cflow/blob/main/packages/session-api/src/index.ts) re-export only the three Session value types.
- [Value-contract source](https://github.com/ZWkang/cflow/blob/main/packages/session-api/src/contracts.ts) establishes Selection ordering, logical screen units, and the absence of mutation capabilities.
- [Package behavior tests](https://github.com/ZWkang/cflow/blob/main/packages/session-api/tests/index.test.ts) construct a complete Session Snapshot with Kernel ID types without starting a Runtime.
- ADR-0035 places Session value contracts outside the Runtime Plugin, while ADR-0017 and ADR-0018 establish Selection and Viewport semantics respectively.
