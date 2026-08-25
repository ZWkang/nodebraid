# NodeBraid

English | [简体中文](./README.zh-CN.md)

NodeBraid is a plugin-based, renderer-agnostic flow canvas engine for building
TypeScript editors without coupling document state, interaction, layout, and
rendering to one UI framework or graphics backend.

The current source tree provides a runnable headless Canvas Runtime, an explicit
Basic Canvas Composition, and a reference-quality SVG Renderer. The implemented
surface includes atomic graph transactions, Selection and Viewport state, typed
Commands, Undo/Redo, Selection, Box Selection, multi-Node Drag, Pan, Wheel Zoom, node-level Edge
Connection, Dagre and ELK Layout Providers, structured diagnostics, and Plugin
lifecycle ownership.

A private React Examples Application now turns those public interfaces into a
runnable Basic SVG developer reference with unified navigation, live Runtime
state, Edge Connection, viewport controls, and History actions.

NodeBraid is still pre-release. It does not yet provide a product-level editor
shell, framework adapters, persistence, collaboration, or a serialization
schema. The source packages use the `@nodebraid/*` namespace but have not been
published to npm.

## Documentation

The Chinese-first Documentation Site separates implemented behavior from target
architecture and roadmap work:

- [Documentation Site](https://zwkang.github.io/nodebraid/)
- [Current Status](https://zwkang.github.io/nodebraid/status)
- [English Documentation](https://zwkang.github.io/nodebraid/en/)
- [Quick Start](https://zwkang.github.io/nodebraid/guide/quick-start)
- [Interactive Example](https://zwkang.github.io/nodebraid/guide/interactive-example)
- [Capability Map](https://zwkang.github.io/nodebraid/capabilities/)
- [Module Index](https://zwkang.github.io/nodebraid/modules/)
- [Architecture](./ARCHITECTURE.md)

Pushes to `main` build and deploy the Documentation Site through
`.github/workflows/docs.yml`. The repository's Pages source must be configured
as **GitHub Actions** in Settings → Pages; the deployed project URL is
`https://zwkang.github.io/nodebraid/`.

## Quick Start from source

NodeBraid requires Node.js 22.13.0 or newer and Bun 1.2.19 or newer.

```bash
git clone https://github.com/ZWkang/nodebraid.git
cd nodebraid
bun install
bun run docs:quick-start
```

The command builds the public `@nodebraid/core` facade and its workspace
dependencies, then runs a real Plugin Host and Kernel transaction. Successful
output is:

```text
revision=1 nodes=1
```

The complete example is shared with the Documentation Site at
[`website/examples/quick-start.ts`](./website/examples/quick-start.ts). Follow
the source-checkout workflow until the initial npm release is available.

## Stack

- Bun for package management, development, builds, tests, and workspace scripts.
- tsgo for TypeScript checking.
- oxlint for linting.
- Prettier for formatting.
- agent-browser for real Chromium Renderer seam tests.
- React, TanStack Router, shadcn with Base UI, Tailwind CSS, and Vite for the private Examples Application.

## Structure

```text
.
├── packages/
│   ├── core/           # @nodebraid/core public facade
│   ├── diagnostics/    # @nodebraid/diagnostics errors and Diagnostic Events
│   ├── interaction-api/ # @nodebraid/interaction-api transient projection values
│   ├── kernel/         # @nodebraid/kernel graph state and transactions
│   ├── layout-api/     # @nodebraid/layout-api provider-neutral contracts
│   ├── layout-dagre/   # @nodebraid/layout-dagre official Provider
│   ├── layout-elk/     # @nodebraid/layout-elk official Provider
│   ├── plugin-command/ # @nodebraid/plugin-command Runtime Service adapter
│   ├── plugin-history/ # @nodebraid/plugin-history History Runtime Plugin
│   ├── plugin-interaction/ # @nodebraid/plugin-interaction Interaction Runtime
│   ├── plugin-kernel/  # @nodebraid/plugin-kernel Runtime Service adapter
│   ├── plugin-layout/  # @nodebraid/plugin-layout Runtime Command integration
│   ├── plugin-renderer/ # @nodebraid/plugin-renderer Renderer Runtime adapter
│   ├── plugin-session/ # @nodebraid/plugin-session Runtime Service adapter
│   ├── preset-basic/   # @nodebraid/preset-basic Basic Canvas Composition
│   ├── renderer-api/   # @nodebraid/renderer-api backend-neutral contracts
│   ├── renderer-svg/   # @nodebraid/renderer-svg official SVG Provider
│   ├── session-api/    # @nodebraid/session-api immutable Session values
│   └── runtime-cordis/ # @nodebraid/runtime-cordis implementation package
├── examples/
│   └── app/            # private @nodebraid/examples React application
├── src/               # Root TypeScript source
├── tests/             # Root automated tests
├── bun.lock           # Bun lockfile
├── tsconfig.base.json # Shared TypeScript compiler options
└── tsconfig.json      # Root TypeScript project
```

## Plugin Host packages

Most consumers should import the NodeBraid-owned Plugin Host API from `@nodebraid/core`:

```ts
import { createPluginHost, definePlugin, defineService } from '@nodebraid/core';
```

`@nodebraid/core` is the public facade. It delegates the implementation to
`@nodebraid/runtime-cordis`; advanced consumers can import that narrow package
directly, but Cordis types remain internal to it.

The first version implements the empty Plugin Host substrate, Runtime Service
dependencies, lifecycle ownership, and Child Installation composition. It does
not install Kernel, Session, Renderer, or other Canvas capabilities implicitly.
“Everything is Plugin” applies to those Canvas capabilities; the minimal Host
substrate is the boundary that owns the first installation and final disposal.

## Diagnostics package

`@nodebraid/diagnostics` provides the shared `NodeBraidError`, stable `domain + code`
identity, immutable Diagnostic Event contracts, safe error description, and
package-owned event catalogs. It has no runtime or logging dependency.

Each Plugin Host can receive its own synchronous Diagnostic Sink and Fault
Reporter. Host, Installation, Activation, and Plugin scope plus a monotonic
sequence make events directly searchable without parsing messages. Console,
files, Sentry, OpenTelemetry, filtering, batching, and persistence remain
application-owned adapters.

## Kernel package

`@nodebraid/kernel` now implements the renderer-independent graph core: Node and
Edge state, synchronous atomic Transactions, revision-bound Canvas Views,
Canvas Query, and reversible before/after Change Sets.

Most consumers can import the same interface from `@nodebraid/core`. The pure
Kernel does not depend on Plugin Host, Cordis, RxJS, a Renderer, DOM objects, or
framework adapters.

## Kernel Runtime Plugin

`@nodebraid/plugin-kernel` now provides one fresh Kernel per Plugin Activation
through a narrow `KernelService`. Consumers can read revision-bound Views, run
synchronous Transactions, and observe successful net-changing Canvas Commits
in revision order. Observer failures are reported without rolling back Kernel
state or blocking later Observers, and reentrant Transactions queue later
Commits until the current revision reaches every Observer.

The adapter depends directly on the NodeBraid-owned seams in `@nodebraid/kernel` and
`@nodebraid/runtime-cordis`; it does not introduce a speculative plugin-api package.
Concrete Renderer Providers, Persistence, initial Document import, and
asynchronous Transactions remain future Runtime work.

## Session Runtime Plugin

`@nodebraid/plugin-session` provides one fresh `SessionService` per Plugin
Activation. It owns immutable Selection and Viewport Snapshots outside the
Document and requires the narrow Kernel Service so external Selection updates
can accept only entities from the current Canvas View.

Equivalent updates preserve Snapshot identity and do not notify. Kernel
Commits remove invalid Selection members through the Session channel rather
than another Kernel Change Set or History entry. Reentrant Session mutations
use breadth-first FIFO delivery so every subscriber observes one consistent
Snapshot per notification round.

## Renderer packages

`@nodebraid/renderer-api` defines the backend-neutral `CanvasRenderer` protocol:
reset-or-commit Document updates, independent Session Snapshots, transient
Interaction Projections, normalized Pointer/Wheel/Keyboard/Focus input,
semantic Hit Results, input control, and structured Renderer errors. It
contains no DOM, Canvas Context, native Event, Konva, Pixi, Cordis, or framework
types.

`@nodebraid/plugin-renderer` binds one typed Renderer Factory to Kernel and Session
Services. Each Activation owns one target-bound Renderer Instance, delivers a
Document reset before Session state, preserves resolvable Selection ordering,
and exposes input, hit testing, Pointer Capture, Focus, and one exclusive
Interaction Projection Binding through the narrow `RendererService`. Concrete
Renderer Providers remain separate, explicit packages; NodeBraid does not select a
default Provider or registry.

`@nodebraid/renderer-svg` is the first reference-quality official Provider. It
binds one existing `SVGSVGElement`, projects generic rectangular Nodes and
straight Edges, and exposes stable SVG classes and data attributes without
interpreting product Node types or data. It remains an explicit peer Provider
and is not re-exported as a default through `@nodebraid/core`.

## Interaction packages

`@nodebraid/interaction-api` owns immutable, backend-neutral Node Drag, Viewport Pan,
Box Selection, and Connection Preview values. `@nodebraid/plugin-interaction` consumes normalized
Renderer Input and Hit Results, implements selection, Box Selection, multi-Node Drag,
middle/Space Pan, anchored Wheel Zoom, and optional mouse-only Node-level
Edge Connection, and exposes no state Service.

Stable Selection and Viewport changes go through Session; final Node movement
and Edge creation use typed Commands and one Kernel Transaction. Applications
provide complete Edge ID/type/data through a synchronous Connection materializer.
Pointer-move Preview remains in the exclusive Renderer Projection Binding.
Cancellation, stale evidence, lost capture, dependency recovery, and cleanup are
explicit and observable. Core re-exports both backend-neutral Interaction
packages but still does not re-export the concrete SVG Provider.

## Command Runtime Plugin

`@nodebraid/plugin-command` provides one empty `CommandService` per Plugin
Activation. Feature Plugins register strongly typed Command tokens and own the
returned registrations; callers execute the same tokens through a Promise
seam that supports synchronous or asynchronous handlers.

Registration or Service disposal first removes Commands from lookup, then
aborts and awaits in-flight handlers. The Command package depends only on the
NodeBraid-owned Plugin Host seam. Feature Plugins acquire Kernel, Session, or
external capabilities through their own static Service Bindings.

## History Runtime Plugin

`@nodebraid/plugin-history` records each post-Baseline non-replay Canvas Commit as
one History Entry and exposes strongly typed Undo/Redo Commands. Replay applies
the stored Change Set through Kernel Service Transactions, creates a new
increasing revision, and returns the resulting Canvas Commit.

`HistoryService` exposes only a stable `canUndo` / `canRedo` Snapshot and a
subscription seam. Replay is single-flight, observer-reentrant Commit delivery
remains revision ordered, and public Snapshot publication waits until History
has caught up with Kernel. Losing Kernel Service or Command Service ends the
current History Activation; reactivation starts from a fresh empty Baseline.

## Basic Canvas Composition

`@nodebraid/preset-basic` exposes `createBasicCanvasPlugin(rendererFactory,
options?)`, a backend-neutral ordinary Plugin that owns Kernel, Command,
Session, Renderer, Interaction, and History through Child Installations. The
Composition waits for every child to become active and releases them in reverse
dependency-safe order.

Applications still create the Plugin Host, configure Diagnostics, select a
concrete Renderer Factory, and install Layout or domain capabilities as sibling
Plugins. Core re-exports the Composition factory but does not re-export or
select `@nodebraid/renderer-svg` or another concrete Provider.

## Layout packages

`@nodebraid/layout-api` defines immutable Layout Inputs, asynchronous Layout
Engines, explicit capabilities, and strict Layout Proposal validation.
`@nodebraid/plugin-layout` binds one Engine to one typed Command and commits a valid
Proposal through one synchronous Kernel Transaction with cancellation and stale
revision protection.

`@nodebraid/layout-dagre` and `@nodebraid/layout-elk` are explicit optional Providers;
they are not re-exported by `@nodebraid/core`. Dagre provides deterministic full
layout. ELK provides full layout and uses its Stress algorithm for incremental
and Fixed Node requests.

## Commands

Install dependencies:

```bash
bun install
```

Install Chromium for the SVG Renderer browser tests:

```bash
bunx agent-browser install
```

Start a watch build for local development:

```bash
bun run dev
```

Start the private Examples Application:

```bash
bun run example:dev
```

Build or verify the Examples Application independently:

```bash
bun run example:build
bun run example:test
bun run example:check
```

Start the documentation site locally:

```bash
bun run docs:dev
```

Execute the documented Quick Start and build the production site:

```bash
bun run docs:check
```

Preview the built documentation site:

```bash
bun run docs:preview
```

Build the root entry and every `@nodebraid/*` workspace package:

```bash
bun run build
```

Run all repository checks:

```bash
bun run check
```

Run individual checks:

```bash
bun run lint
bun run typecheck
bun run format:check
bun run test
bun run test:browser
```

Workspace package typechecks first build the dependency declarations required
for package-name resolution, so the same commands work from a clean checkout
without pre-existing `dist` directories.

Build and verify only the standalone Diagnostics package:

```bash
bun run --filter '@nodebraid/diagnostics' build
```

Build only the declarations required by `@nodebraid/plugin-kernel`:

```bash
bun run --filter '@nodebraid/plugin-kernel' build:dependencies
```

Build only the declaration required by `@nodebraid/plugin-command`:

```bash
bun run --filter '@nodebraid/plugin-command' build:dependencies
```

Build the declarations required by the Layout packages:

```bash
bun run --filter '@nodebraid/layout-api' build:dependencies
bun run --filter '@nodebraid/plugin-layout' build:dependencies
bun run --filter '@nodebraid/layout-dagre' build:dependencies
bun run --filter '@nodebraid/layout-elk' build:dependencies
```

Build the declarations required by `@nodebraid/plugin-session`:

```bash
bun run --filter '@nodebraid/plugin-session' build:dependencies
```

Build the declarations required by `@nodebraid/plugin-history`:

```bash
bun run --filter '@nodebraid/plugin-history' build:dependencies
```

Build the declarations required by the SVG Renderer Provider and run its real
browser seam tests:

```bash
bun run --filter '@nodebraid/renderer-svg' build:dependencies
bun run --filter '@nodebraid/renderer-svg' build:test-dependencies
bun run --filter '@nodebraid/renderer-svg' test:browser
```

Build the Interaction value and Runtime packages independently:

```bash
bun run --filter '@nodebraid/interaction-api' build:dependencies
bun run --filter '@nodebraid/plugin-interaction' build:dependencies
```

Build the dependencies required by the Basic Canvas Composition:

```bash
bun run --filter '@nodebraid/preset-basic' build:dependencies
```

Format supported files:

```bash
bun run format
```

## Creating a Package

Create package folders under `packages/`:

```text
packages/
└── my-package/
    ├── package.json
    └── src/
        └── index.ts
```

Each workspace package can define its own build and publish behavior while sharing the root toolchain.

Run a script for one workspace package from the repository root:

```bash
bun run --filter '@nodebraid/core' build
bun run --filter '@nodebraid/core' test
```

## License

[MIT](./LICENSE)
