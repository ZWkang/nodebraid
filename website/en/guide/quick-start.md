---
title: Quick Start
description: Run a minimal NodeBraid Canvas Runtime from source.
---

# Quick Start

Verify NodeBraid with a real Canvas Runtime: install the Kernel Plugin, commit a Node through the public `@nodebraid/core` facade, and then complete the entire Plugin Host lifecycle.

::: warning Packages not yet publicly released
The `@nodebraid/*` packages declared by this repository have not yet been published to npm. Run NodeBraid from source until the initial public release, and do not copy npm installation commands that are not yet active.
:::

## 1. Get the source

```bash
git clone https://github.com/ZWkang/nodebraid.git
cd nodebraid
bun install
```

NodeBraid requires Bun 1.2.19 or later.

## 2. Run the example

```bash
bun run docs:quick-start
```

The command first builds the public facade and its workspace dependencies, then runs the same example source used by this documentation:

<<< ../../examples/quick-start.ts{ts}

Successful output:

```text
revision=1 nodes=1
```

## 3. Understand the flow

1. `createPluginHost()` creates an isolated Plugin Host.
2. `kernelPlugin` creates a revision-zero Kernel for its Activation and provides `KernelService`.
3. The application Plugin declares its Kernel dependency through a Required Service instead of looking it up dynamically from a global container.
4. `KernelService.transact()` synchronously and atomically commits the Node, producing revision 1.
5. `whenActive()` proves that the application Plugin has acquired all Required Services.
6. `host.dispose()` ends the lifecycles of the Installation, Activation, and Owned Resources.

This example is deliberately headless: it verifies Document and Runtime composition without creating a visible canvas. The delivered [`@nodebraid/renderer-svg`](/en/modules/renderer-svg) can project the same Canvas semantics into SVG at the next layer, but it is not part of this minimal Kernel path.

## 4. Next layer: Basic Canvas Composition with real SVG

For the complete basic Kernel, Command, Session, Renderer, Interaction, and History composition, select the SVG Provider explicitly and install [`@nodebraid/preset-basic`](/en/modules/preset-basic). The canonical example below is the same source exercised by the real-Chromium acceptance path:

<<< ../../examples/basic-canvas-svg.ts{ts}

The application still creates the Host, passes an existing SVG Target, and consumes capabilities through static Required Service Bindings. The preset creates no default Renderer and does not turn SVG or DOM into generic dependencies.
