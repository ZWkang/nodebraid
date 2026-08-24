---
title: '@nodebraid/layout-dagre'
description: A deterministic, whole-canvas full Layout Provider based on Dagre.
---

# `@nodebraid/layout-dagre`

::: warning Package is not publicly released
This name describes the current source module boundary; it does not mean the package can be installed from npm. Follow the [Quick Start](/en/guide/quick-start) to verify it from source.
:::

## Problem it solves

`@nodebraid/layout-dagre` adapts Dagre's layered directed-graph layout to the NodeBraid `LayoutEngine` seam. It handles Dagre's center-based coordinates and normalizes the result into absolute World Positions at the top-left corner of each NodeBraid Node's bounds.

## When to use it

- You need whole-canvas full layout;
- you need straightforward, deterministic layered direction and spacing configuration;
- your request does not require incremental stability or Fixed Nodes;
- you want to support empty graphs, disconnected components, parallel Edges, directed cycles, and self-loop input.

If existing Nodes must remain fixed at absolute positions, or you need incremental mode, choose the Stress algorithm from [`@nodebraid/layout-elk`](/en/modules/layout-elk).

## What it provides

`dagreLayoutEngine` declares:

```ts
{ incremental: false, fixedNodes: false, selfLoops: true }
```

Supported configuration:

- `direction`: `TB`, `BT`, `LR`, or `RL`;
- `nodeSpacing`;
- `edgeSpacing`;
- `rankSpacing`;
- `marginX` and `marginY`.

All spacing and margin values must be finite and non-negative. The default direction is `TB`; default spacing values are fixed and validated by the Provider adapter.

## Dependencies and composition

This package depends only on `@nodebraid/layout-api` and Dagre. It does not depend on the Plugin Host, Kernel Runtime, Command Service, or `@nodebraid/core`.

Calling the Engine directly returns an uncommitted Proposal. To use it in a Canvas Runtime, bind `dagreLayoutEngine` to an application-defined Command token through [`@nodebraid/plugin-layout`](/en/modules/plugin-layout).

## Public entry point

```ts
import { dagreLayoutEngine, type DagreDirection, type DagreLayoutConfig } from '@nodebraid/layout-dagre';
```

`@nodebraid/core` does not re-export this Provider; applications must depend on it explicitly.

## Computation and coordinate semantics

The Provider supplies each Node's width and height and preserves a distinct ID for every Edge to support multigraphs. Dagre returns each Node's center; the adapter subtracts half of its width and height to produce NodeBraid's top-left World Position. The Proposal's source revision always comes from the Layout Input.

The `AbortSignal` is checked before and after computation. Configuration errors surface as their original `TypeError` or `RangeError`; shared input, capability, and Proposal failures use `LayoutError`.

## Limitations and non-goals

- It does not support `incremental` mode;
- it does not support Fixed Nodes;
- it does not provide a Runtime Plugin or predefined Command;
- it does not commit to the Kernel;
- it does not return Edge Routing;
- it does not become the default Provider or enter a Registry.

## Verification evidence

Provider tests cover direction, spacing, determinism, empty graphs, zero-size Nodes, disconnected components, parallel Edges, cycles, self-loops, cancellation, and invalid configuration. Repository-level composition tests also commit a Dagre Proposal through a real Runtime Command.
