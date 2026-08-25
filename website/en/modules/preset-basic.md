---
title: '@nodebraid/preset-basic'
description: Basic Canvas Composition with an explicit Renderer, complete readiness, and one owned lifecycle.
---

# `@nodebraid/preset-basic`

`@nodebraid/preset-basic` is NodeBraid's official backend-neutral Basic Canvas Composition. It concentrates the stable repeated assembly of Kernel, Command, Session, Renderer, Interaction, and History into one ordinary Plugin while leaving the Plugin Host, Diagnostics, Renderer Provider, and extension choices under application ownership.

::: warning Package is not publicly released
This name identifies the current source module boundary; it does not mean the package can be installed from npm. Follow the [Quick Start](/en/guide/quick-start) to verify it from source.
:::

## The problem it solves

Applications no longer repeat the installation, waiting, and disposal code for six standard Feature Plugins or maintain a dependency-safe cleanup order themselves. The Composition Installation becomes active only after every Child Installation is active, and a required child failure rolls back the complete tree.

## Public entry points

- `createBasicCanvasPlugin(rendererFactory, options?)` returns an ordinary Plugin while preserving the exact Renderer Factory config type.
- `BasicCanvasPluginOptions` currently contains only an optional readonly `interaction` policy.

The package has no default export, Runtime Service, Host factory, Renderer Registry, or internal Child Installation access point.

## Typical composition

```ts
import { createBasicCanvasPlugin, createPluginHost } from '@nodebraid/core';
import { createSvgRenderer } from '@nodebraid/renderer-svg';

const host = createPluginHost();
const basicCanvas = createBasicCanvasPlugin(createSvgRenderer);
const composition = host.install(basicCanvas, { target: svgElement });

try {
  await composition.whenActive();
} finally {
  await host.dispose();
}
```

SVG is only the Provider selected explicitly by this application example; it is not a default dependency of the preset or core. The Provider owns its config type and validation. The preset introduces no universal Target or configuration schema.

## Readiness, failure, and disposal

The Composition creates children in Kernel, Command, Session, Renderer, Interaction, and History order, then waits for all of them to become active. Parent active is an initial readiness point, not an atomic Child Service publication barrier or a permanent health signal.

Renderer Factory, Interaction config, and other child setup failures preserve their original identity. Existing standard Providers, a second preset, or a second Renderer in one Host continue to fail through the current Service reservation rules; the preset never skips or replaces them. Disposal runs in reverse order and awaits asynchronous Renderer cleanup. Multiple cleanup failures remain visible through AggregateError.

A failed Composition Installation never retries itself; recovery requires a new Installation. The caller still explicitly disposes the failed parent, but after child rollback it holds no extra preset reservation that blocks a replacement in the same Host.

## Extension model

Applications consume the basic capabilities through static Required Service Bindings in sibling Consumer Plugins. Layout, Validation, domain rules, and other Providers are sibling Plugins as well. Applications that need to replace a basic member or control it independently should keep composing the individual Plugins instead of requesting an internal preset handle.

## Limitations and non-goals

- Does not create or hide the Plugin Host and does not configure Diagnostics.
- Does not select a default Renderer and has no SVG, DOM, or native-event dependency.
- Does not install Layout, Persistence, Serialization, Collaboration, or product UI.
- Provides no Plugin array, optional Service, dynamic Registry, hooks, or Service Locator.
- One Host contains one standard Basic Canvas Service set; multiple canvases use multiple Hosts.

## Verification evidence

- Package public-seam tests use the real Host and real Feature Plugins.
- Type tests lock down Renderer config inference, readonly options, and the empty Service surface.
- Lifecycle tests cover readiness, failure identity, rollback, conflicts, isolation, and asynchronous cleanup.
- A real SVG and Chromium tracer covers projection, Selection, Box Selection, Move, Undo/Redo, Wheel input, and disposal.
- Declaration isolation, package-name import, pack preview, and repository gates verify the publication boundary.
