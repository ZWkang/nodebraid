---
title: '@cflow/plugin-renderer'
description: Connect a Renderer Factory to Kernel and Session while exposing only a narrow Runtime Service to Interaction.
---

# `@cflow/plugin-renderer`

::: warning Package is not publicly released
This name describes the current source-module boundary; it does not mean the package can be installed from npm. Follow the source-based [Quick Start](/en/guide/quick-start) to verify it.
:::

## Problems it solves

A Renderer Provider should not know about the Plugin Host, subscribe to Kernel itself, coordinate Session, or manage Runtime cleanup. `@cflow/plugin-renderer` is the deep adapter between those layers: it creates one Renderer Instance per Activation, establishes its initial state, coordinates updates serially, and narrows the capabilities Interaction actually needs into `RendererService`.

The Provider's projection methods and disposal authority remain private and are not leaked to Consumers through the Runtime Service.

## When to use it

- You already have a concrete Provider that satisfies `RendererFactory<Config>`;
- You want the Renderer to follow Kernel Commits and Session Snapshots;
- An Interaction Plugin needs Input subscriptions, Hit Testing, Pointer Capture, or Focus;
- You need the Renderer, subscriptions, and Target resources to be cleaned up with the Canvas Runtime Activation.

The current official concrete Provider is [`@cflow/renderer-svg`](/en/modules/renderer-svg). This module still handles Runtime integration only and does not draw a visible canvas by itself.

## What it provides

- `createRendererPlugin(factory)`: binds an explicitly selected Factory as a Runtime Plugin;
- `rendererService`: the strongly typed Required Service token for Interaction Plugins;
- `RendererService`: exposes only `subscribeInput`, `hitTest`, `capturePointer`, `releasePointer`, and `focus`;
- Delivery of the current Session Snapshot after the initial Document reset;
- Serial, resolvable coordination of Kernel Commits and Session updates;
- Renderer drift diagnostics and a reset from current authoritative state;
- Input-listener fault isolation and Host-scoped diagnostics;
- Activation-owned subscriptions and Renderer Instance cleanup.

## Dependencies and composition

The generated Renderer Runtime Plugin statically requires [`KernelService`](/en/modules/plugin-kernel) and [`SessionService`](/en/modules/plugin-session), and provides the sole `rendererService`. It depends directly on `@cflow/renderer-api`, Kernel Plugin, Session Plugin, Diagnostics, and the Plugin Host seam. It does not depend on `@cflow/core`.

```ts
import { kernelPlugin } from '@cflow/plugin-kernel';
import { createRendererPlugin } from '@cflow/plugin-renderer';
import { sessionPlugin } from '@cflow/plugin-session';
import { createPluginHost } from '@cflow/runtime-cordis';

// providerFactory and providerConfig come from the concrete Provider explicitly selected by the application.
const rendererPlugin = createRendererPlugin(providerFactory);
const host = createPluginHost();
const installations = [
  host.install(kernelPlugin),
  host.install(sessionPlugin),
  host.install(rendererPlugin, providerConfig),
];

await Promise.all(installations.map((installation) => installation.whenActive()));

try {
  // An Interaction Plugin uses input and hit capabilities through rendererService.
} finally {
  await host.dispose();
}
```

The current application can pass `createSvgRenderer` from `@cflow/renderer-svg` as `providerFactory`. Other backends remain explicit application choices.

## Public entry points

```ts
import {
  createRendererPlugin,
  rendererDiagnosticEvents,
  rendererService,
  RendererPluginError,
  type RendererPluginErrorCode,
  type RendererService,
} from '@cflow/plugin-renderer';
```

These entry points are also re-exported by `@cflow/core`.

## Lifecycle and error semantics

A Renderer Installation remains pending while Kernel or Session Service is missing. Activation waits for the async Factory to return, immediately registers the Renderer as an Owned Resource, then establishes the current Document reset and Session Snapshot. `whenActive()` does not report success before the Renderer is ready.

Subsequent updates pass through one coordinated drain:

- When a selected entity is deleted, the already coordinated Session is delivered before the deletion Commit;
- When a new entity is selected, the Commit that creates it is delivered before the Session;
- When a Commit is not continuous with the Baseline, or the Provider throws `DOCUMENT_OUT_OF_SYNC`, the Runtime reports `cflow.plugin.renderer.sync.fault` and resets to the current Kernel View;
- Other synchronous projection faults enter the same diagnostics boundary without manufacturing successful delivery.

`RendererService.subscribeInput()` isolates Consumer listener errors and reports them through `cflow.plugin.renderer.input-listener.fault`; one listener failure does not block later listeners. The Service does not expose `updateDocument`, `updateSession`, or `dispose`.

When Activation ends, the Runtime first marks the Service as disposed, clears pending updates, and stops Session, Kernel, and Input subscriptions, then awaits Renderer `dispose()` asynchronously. Calls through the old Service fail with `RendererPluginError` code `SERVICE_DISPOSED`. Original Factory and disposal errors preserve their identity and participate in the Plugin Host's explicit cleanup-failure aggregation.

## Limitations and non-goals

- This package does not implement a concrete Provider; the official SVG implementation lives in the separate `@cflow/renderer-svg` package;
- Does not choose a default Provider or provide a dynamic Factory Registry;
- Does not let Consumers update Renderer state directly or dispose the instance;
- Does not interpret input, modify Selection, or execute Commands; those responsibilities belong to Interaction;
- No framework component, mount lifecycle, animation, or business-specific visuals;
- No silent retry or backend switching for Provider faults other than drift recovery.

## Verification evidence

Package tests use a contract-compliant recording Renderer with the real Plugin Host, Kernel Plugin, and Session Plugin to verify one instance per Activation, initial reset/session ordering, Session resolvability during deletion and reentrancy, Input/Hit Test/Pointer/Focus delegation, listener-fault isolation, drift reset, queued Commit absorption, the narrow Service surface, Host disposal, and stale Service invalidation. Type tests prove that Runtime Consumers cannot obtain the `CanvasRenderer` update or disposal authority.
