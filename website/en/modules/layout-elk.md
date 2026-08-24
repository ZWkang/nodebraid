---
title: '@nodebraid/layout-elk'
description: An ELK-based full Layout Provider with incremental and Fixed Node support through Stress.
---

# `@nodebraid/layout-elk`

::: warning Package is not publicly released
This name describes the current source module boundary; it does not mean the package can be installed from npm. Follow the [Quick Start](/en/guide/quick-start) to verify it from source.
:::

## Problem it solves

`@nodebraid/layout-elk` adapts ELK to the NodeBraid `LayoutEngine` seam. It can run Layered full layout, or use the Stress algorithm for incremental stability and Fixed Nodes, while restoring ELK's component-local results to NodeBraid's absolute World Positions.

## When to use it

- You need ELK Layered full layout;
- you need incremental layout;
- you need one or more Nodes to remain at absolute positions;
- you want a deterministic random seed to stabilize results for the same version, input, and configuration.

If you only need a lighter-weight deterministic full layout without incremental layout or Fixed Nodes, choose [`@nodebraid/layout-dagre`](/en/modules/layout-dagre).

## What it provides

`elkLayoutEngine` declares:

```ts
{ incremental: true, fixedNodes: true, selfLoops: true }
```

Supported configuration:

- `algorithm`: `layered` or `stress`;
- `direction`: `UP`, `DOWN`, `LEFT`, or `RIGHT`;
- `nodeSpacing`;
- `layerSpacing`;
- `padding`;
- `randomSeed`.

`incremental` mode and any Fixed Nodes require `stress`. With any other algorithm, the request fails explicitly with `UNSUPPORTED_FEATURE` instead of being ignored.

## Dependencies and composition

This package depends only on `@nodebraid/layout-api` and `elkjs`. It does not depend on the Plugin Host, Kernel Runtime, Command Service, or `@nodebraid/core`.

Using the Engine directly computes an uncommitted Proposal. In a Canvas Runtime, bind `elkLayoutEngine` to a typed Command through [`@nodebraid/plugin-layout`](/en/modules/plugin-layout).

## Public entry point

```ts
import {
  elkLayoutEngine,
  type ElkLayoutAlgorithm,
  type ElkLayoutConfig,
  type ElkLayoutDirection,
} from '@nodebraid/layout-elk';
```

`@nodebraid/core` does not re-export this Provider, so applications choosing ELK take an explicit dependency on it.

## Fixed Node and coordinate semantics

ELK may translate disconnected components independently. The adapter computes a translation from each connected component back into NodeBraid World Space:

- with Fixed Nodes, every Fixed Node must prove the same translation and its final position must remain exactly unchanged;
- in incremental mode without Fixed Nodes, the component's average translation keeps the result close to its original position;
- in full layout without Fixed Nodes, the result receives no additional translation.

If the Fixed Nodes in one component cannot all be preserved by a single translation, the Proposal fails with `INVALID_PROPOSAL`.

## Lifecycle and error semantics

The Engine checks cancellation at the asynchronous boundaries around loading ELK, invoking layout, and returning the Proposal. The Provider validates algorithm, direction, spacing, padding, and seed configuration; shared requests and Proposals are still validated by `@nodebraid/layout-api`.

The initial release uses ELK's bundled in-process worker implementation and includes a Bun loader compatibility path. It does not expose Worker ownership or separate Worker configuration.

## Limitations and non-goals

- `incremental` mode and Fixed Nodes do not work with `layered`;
- it does not provide a Runtime Plugin, predefined Command, or default-configuration Registry;
- it does not commit to the Kernel;
- it does not return Edge Routing;
- it does not provide caller-managed Worker execution;
- it does not include caching, previews, or persistence.

## Verification evidence

Provider tests cover Layered and Stress, direction and configuration, empty/zero-size/disconnected/cyclic/self-loop graphs, incremental translation, Fixed Nodes, consistency rejection, cancellation, and error values. Repository-level composition tests verify Fixed Node commit results through a real Runtime Command.
