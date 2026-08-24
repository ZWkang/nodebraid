---
title: '@nodebraid/plugin-layout'
description: Statically bind a Layout Engine to a typed Runtime Command and safely commit its Proposal.
---

# `@nodebraid/plugin-layout`

::: warning Package is not publicly released
This name describes the current source module boundary; it does not mean the package can be installed from npm. Follow the [Quick Start](/en/guide/quick-start) to verify it from source.
:::

## Problem it solves

A Layout Engine can compute positions asynchronously, but it cannot directly modify the authoritative Document. `@nodebraid/plugin-layout` statically binds a concrete Engine to an application-owned typed Command, handling Input projection, capability validation, asynchronous computation, stale protection, and atomic commits inside a real Canvas Runtime.

## When to use it

- You need to execute Dagre, ELK, or a third-party Engine through the Command Service;
- you want layout commits to flow naturally into Kernel observers and History;
- you need cancellation and concurrent-revision protection;
- you want multiple Providers to coexist behind separate Command tokens instead of being selected through a global Registry.

If you only need to compute a Proposal offline without committing the Document, you can use `@nodebraid/layout-api` and an Engine directly.

## What it provides

- `createLayoutPlugin({ engine, command })`: creates a named Runtime Plugin;
- `LayoutCommandInput<Config>`: mode, Fixed Node IDs, and Provider-specific configuration;
- `LayoutCommandResult`: the resulting `CanvasCommit | null`;
- automatic creation and freezing of the Layout Input;
- capability and Proposal validation;
- cooperative cancellation;
- two-stage stale protection for the source revision and live Kernel revision;
- one synchronous Kernel Transaction per Proposal.

## Dependencies and composition

Every generated Plugin statically requires `KernelService` and `CommandService`. It depends on `@nodebraid/layout-api`, `@nodebraid/plugin-kernel`, `@nodebraid/plugin-command`, and the NodeBraid Plugin Host seam, but not on `@nodebraid/core`.

The application must:

1. choose a `LayoutEngine<Config>`;
2. use `defineCommand()` to create a Command token that matches that Config;
3. create the Layout Plugin;
4. install it together with the Kernel Plugin and Command Plugin;
5. wait for the required Installations to become active before executing the Command;
6. eventually dispose of the Plugin Host.

## Public entry point

```ts
import {
  createLayoutPlugin,
  type CreateLayoutPluginOptions,
  type LayoutCommandInput,
  type LayoutCommandResult,
} from '@nodebraid/plugin-layout';
```

These entry points are also re-exported by `@nodebraid/core`; concrete Providers are never brought in implicitly by core.

## Lifecycle and commit semantics

Plugin Activation registers the Command and treats the registration as an Owned Resource. When Activation ends, the Command registration is removed from lookup, cancelled, and waits for in-flight execution according to Command Service rules.

The Command checks the caller's `AbortSignal` before and after every asynchronous boundary. Immediately after Proposal validation, it compares the current Kernel revision; if it no longer matches the source revision, the operation fails with `STALE_PROPOSAL` and commits no partial results.

Valid positions are replaced within one synchronous Transaction. Transaction metadata uses `origin: 'layout'` and the actual Command ID so Diagnostics and History can identify the source of the behavior, but metadata does not govern correctness.

## Limitations and non-goals

- It does not provide a `LayoutService`;
- it does not provide a dynamic Provider Registry or default Provider;
- it does not queue, retry, or rebase stale Proposals;
- it does not create a separate Transaction for every Node;
- it does not handle previews, animation, Edge Routing, or persistence;
- it does not merge Provider-specific configuration into a generic schema.

## Verification evidence

Runtime tests use a real Plugin Host, Kernel Plugin, and Command Plugin to verify typed Commands, single-Commit behavior, net-zero updates, capability rejection, cancellation, stale revisions, invalid Proposals, and cleanup. Repository-level tests also verify concrete Provider composition with Dagre and ELK.
