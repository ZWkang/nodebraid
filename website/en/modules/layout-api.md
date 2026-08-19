---
title: '@cflow/layout-api'
description: Provider-neutral Layout Input, Engine, Proposal, capability, and validation contracts.
---

# `@cflow/layout-api`

::: warning Package is not publicly released
This name describes the current source module boundary; it does not mean the package can be installed from npm. Follow the [Quick Start](/en/guide/quick-start) to verify it from source.
:::

## Problem it solves

Layout libraries usually have different configuration, coordinate, and output models. `@cflow/layout-api` defines CFlow's own minimal semantic seam, allowing Dagre, ELK, or third-party Engines to compute candidate Node positions from the same immutable Canvas projection without gaining write access to the Document.

## When to use it

- You want to implement a new Layout Provider;
- you want to compute an uncommitted Layout Proposal outside the Runtime;
- you want to validate Provider capabilities or an untrusted Proposal;
- you need shared semantics for full, incremental, and Fixed Node requests.

Applications that only need to execute layout inside a Canvas Runtime will typically use `@cflow/plugin-layout` together with a concrete Provider.

## What it provides

- `LayoutInput`: a revision, mode, complete Node/Edge projection, and Fixed Node markers;
- `LayoutEngine<Config>`: a stable ID, immutable capabilities, and cancellable asynchronous `compute()`;
- `LayoutProposal`: a source revision and complete Node positions;
- `defineLayoutEngine()`: capability normalization, cancellation checks, and Proposal validation;
- `createLayoutInput()`: creates a CFlow-owned immutable input from a committed Canvas View;
- `assertLayoutCapabilities()`: rejects requests that the Provider has not declared support for;
- `validateLayoutProposal()`: validates the revision, complete Node coverage, finite coordinates, and Fixed Nodes;
- `LayoutError`: stable `layout + code` error identity.

## Dependencies and composition

This package depends on the identity, geometry, and Canvas View contracts from `@cflow/kernel`, and the structured error contract from `@cflow/diagnostics`. It does not depend on the Plugin Host, Command Service, a concrete Provider, or `@cflow/core`.

Runtime commits are typically handled by [`@cflow/plugin-layout`](/en/modules/plugin-layout). Both [`@cflow/layout-dagre`](/en/modules/layout-dagre) and [`@cflow/layout-elk`](/en/modules/layout-elk) implement this Engine seam.

## Public entry point

```ts
import {
  assertLayoutCapabilities,
  createLayoutInput,
  defineLayoutEngine,
  LayoutError,
  validateLayoutProposal,
  type LayoutEngine,
  type LayoutInput,
  type LayoutProposal,
} from '@cflow/layout-api';
```

These entry points are also re-exported by `@cflow/core`.

## Validation and error semantics

Shared structural errors use only five codes:

| Code                  | Meaning                                                                                |
| --------------------- | -------------------------------------------------------------------------------------- |
| `INVALID_REQUEST`     | The mode or Fixed Node request is invalid                                              |
| `INVALID_INPUT`       | The Canvas projection lacks a Size or contains unsupported nesting or Ports            |
| `UNSUPPORTED_FEATURE` | The Provider's declared capabilities do not cover the request                          |
| `INVALID_PROPOSAL`    | The Proposal has an invalid revision, Node coverage, coordinates, or Fixed Node result |
| `STALE_PROPOSAL`      | The Runtime finds that the Kernel revision has changed before committing               |

`STALE_PROPOSAL` is used by Runtime integration, but its error identity belongs to the Layout contract. Provider-specific configuration errors and underlying failures retain their own values instead of being forcibly wrapped as shared errors.

## Limitations and non-goals

- An Engine does not write to the Kernel;
- a Proposal does not carry a Provider ID, mode, configuration, Edge Routing, or arbitrary entity patches;
- the initial release supports only whole-canvas input;
- nested Nodes, Port Endpoints, and Nodes without a Size are unsupported;
- it provides no Registry, default Provider, Worker, cache, or persistence.

## Verification evidence

Package tests cover request projection, capabilities, Proposal validation, error identity, cancellation, immutable ownership, and declaration boundaries. The Runtime and both official Providers further verify composability through the same seam.
