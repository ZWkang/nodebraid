---
title: '@nodebraid/plugin-renderer'
description: Connect a Renderer Factory to Kernel and Session while exposing only a narrow Runtime Service to Interaction.
---

# `@nodebraid/plugin-renderer`

::: warning Package is not publicly released
This name describes the current source-module boundary; it does not mean the package can be installed from npm. Follow the source-based [Quick Start](/en/guide/quick-start) to verify it.
:::

## Problems it solves

A Renderer Provider should not know about the Plugin Host, subscribe to Kernel itself, coordinate Session, or manage Runtime cleanup. `@nodebraid/plugin-renderer` is the deep adapter between those layers: it creates one Renderer Instance per Activation, establishes its initial state, coordinates updates serially, and narrows the capabilities Interaction actually needs into `RendererService`.

Document/Session projection methods and disposal authority remain private. Interaction can update transient semantic Projection only through one exclusive `InteractionProjectionBinding`.

## When to use it

- You already have a concrete Provider that satisfies `RendererFactory<Config>`;
- You want the Renderer to follow Kernel Commits and Session Snapshots;
- An Interaction Plugin needs Input subscriptions, Hit Testing, Pointer Capture, Focus, or transient Projection delivery;
- You need the Renderer, subscriptions, and Target resources to be cleaned up with the Canvas Runtime Activation.

The current official concrete Provider is [`@nodebraid/renderer-svg`](/en/modules/renderer-svg). This module still handles Runtime integration only and does not draw a visible canvas by itself.

## What it provides

- `createRendererPlugin(factory)`: binds an explicitly selected Factory as a Runtime Plugin;
- `rendererService`: the strongly typed Required Service token for Interaction Plugins;
- `RendererService`: exposes one exclusive Interaction Projection Binding plus Input, Hit Testing, Pointer Capture, and Focus;
- Delivery of the current Session Snapshot after the initial Document reset;
- Serial, resolvable coordination of Kernel Commits and Session updates;
- One current-state reset-plus-Session recovery after any internal synchronization failure; terminal `SYNC_FAILED` if recovery also fails;
- Input-listener fault isolation and Host-scoped diagnostics;
- Activation-owned subscriptions and Renderer Instance cleanup.

## Dependencies and composition

The generated Renderer Runtime Plugin statically requires [`KernelService`](/en/modules/plugin-kernel) and [`SessionService`](/en/modules/plugin-session), and provides the sole `rendererService`. It depends directly on `@nodebraid/renderer-api`, Kernel Plugin, Session Plugin, Diagnostics, and the Plugin Host seam. It does not depend on `@nodebraid/core`.

```ts
import { kernelPlugin } from '@nodebraid/plugin-kernel';
import { createRendererPlugin } from '@nodebraid/plugin-renderer';
import { sessionPlugin } from '@nodebraid/plugin-session';
import { createPluginHost } from '@nodebraid/runtime-cordis';

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

The current application can pass `createSvgRenderer` from `@nodebraid/renderer-svg` as `providerFactory`. Other backends remain explicit application choices.

## Public entry points

```ts
import {
  createRendererPlugin,
  rendererDiagnosticEvents,
  rendererService,
  RendererPluginError,
  type InteractionProjectionBinding,
  type RendererPluginErrorCode,
  type RendererService,
} from '@nodebraid/plugin-renderer';
```

These entry points are also re-exported by `@nodebraid/core`.

## Lifecycle and error semantics

A Renderer Installation remains pending while Kernel or Session Service is missing. Activation waits for the async Factory to return, immediately registers the Renderer as an Owned Resource, then establishes the current Document reset and Session Snapshot. `whenActive()` does not report success before the Renderer is ready.

Subsequent updates pass through one coordinated drain:

- When a selected entity is deleted, the already coordinated Session is delivered before the deletion Commit;
- When a new entity is selected, the Commit that creates it is delivered before the Session;
- Any synchronization fault is reported through `nodebraid.plugin.renderer.sync.fault`, followed by exactly one current Kernel View reset plus Session recovery;
- If recovery also fails, both original errors are preserved in terminal `SYNC_FAILED`. Input forwarding stops and Hit/Focus/Capture/Projection updates reject explicitly without a retry loop.

`RendererService.subscribeInput()` isolates Consumer listener errors and reports them through `nodebraid.plugin.renderer.input-listener.fault`; one listener failure does not block later listeners. The Service does not expose `updateDocument`, `updateSession`, or `dispose`; only the Binding has transient `updateInteraction` authority.

When Activation ends, the Runtime first marks the Service as disposed, clears pending updates, and stops Session, Kernel, and Input subscriptions, then awaits Renderer `dispose()` asynchronously. Calls through the old Service fail with `RendererPluginError` code `SERVICE_DISPOSED`. Original Factory and disposal errors preserve their identity and participate in the Plugin Host's explicit cleanup-failure aggregation.

## Limitations and non-goals

- This package does not implement a concrete Provider; the official SVG implementation lives in the separate `@nodebraid/renderer-svg` package;
- Does not choose a default Provider or provide a dynamic Factory Registry;
- Does not let Consumers update Document/Session Renderer state or dispose the instance; only the single Interaction Binding can update transient Projection;
- Does not interpret input, modify Selection, or execute Commands; those responsibilities belong to Interaction;
- No framework component, mount lifecycle, animation, or business-specific visuals;
- No silent retry or backend switching for Provider faults other than drift recovery.

## Verification evidence

Package tests use a contract-compliant recording Renderer with the real Plugin Host, Kernel Plugin, and Session Plugin to verify one instance per Activation, initial reset/session ordering, Session resolvability during deletion and reentrancy, Input/Hit Test/Pointer/Focus delegation, listener-fault isolation, drift reset, queued Commit absorption, the narrow Service surface, Host disposal, and stale Service invalidation. Type tests prove that Runtime Consumers cannot obtain the `CanvasRenderer` update or disposal authority.
