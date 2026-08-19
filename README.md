# CFlow

CFlow is a plugin-based, renderer-agnostic flow canvas engine built as a Bun-powered TypeScript monorepo.

The repository is currently at an early implementation stage. The planned architecture and package boundaries are documented in [ARCHITECTURE.md](./ARCHITECTURE.md); the document describes the target design rather than the currently implemented feature set.

## Documentation

The public, Chinese-first Documentation Site explains the currently implemented capability families and workspace packages:

- [Documentation Site](https://zwkang.github.io/cflow/)
- [English Documentation](https://zwkang.github.io/cflow/en/)
- [Quick Start](https://zwkang.github.io/cflow/guide/quick-start)
- [Capability Map](https://zwkang.github.io/cflow/capabilities/)
- [Module Index](https://zwkang.github.io/cflow/modules/)

The packages declared under the `@cflow/*` names are not yet published by this project. Do not install the unrelated package currently using the `@cflow/core` name; follow the source-checkout Quick Start instead.

## Stack

- Bun for package management, development, builds, tests, and workspace scripts.
- tsgo for TypeScript checking.
- oxlint for linting.
- Prettier for formatting.
- agent-browser for real Chromium Renderer seam tests.
- Changesets for versioning and publishing.

## Structure

```text
.
├── packages/
│   ├── core/           # @cflow/core public facade
│   ├── diagnostics/    # @cflow/diagnostics errors and Diagnostic Events
│   ├── kernel/         # @cflow/kernel graph state and transactions
│   ├── layout-api/     # @cflow/layout-api provider-neutral contracts
│   ├── layout-dagre/   # @cflow/layout-dagre official Provider
│   ├── layout-elk/     # @cflow/layout-elk official Provider
│   ├── plugin-command/ # @cflow/plugin-command Runtime Service adapter
│   ├── plugin-history/ # @cflow/plugin-history History Runtime Plugin
│   ├── plugin-kernel/  # @cflow/plugin-kernel Runtime Service adapter
│   ├── plugin-layout/  # @cflow/plugin-layout Runtime Command integration
│   ├── plugin-renderer/ # @cflow/plugin-renderer Renderer Runtime adapter
│   ├── plugin-session/ # @cflow/plugin-session Runtime Service adapter
│   ├── renderer-api/   # @cflow/renderer-api backend-neutral contracts
│   ├── renderer-svg/   # @cflow/renderer-svg official SVG Provider
│   ├── session-api/    # @cflow/session-api immutable Session values
│   └── runtime-cordis/ # @cflow/runtime-cordis implementation package
├── src/               # Root TypeScript source
├── tests/             # Root automated tests
├── .changeset/        # Changesets configuration
├── bun.lock           # Bun lockfile
├── tsconfig.base.json # Shared TypeScript compiler options
└── tsconfig.json      # Root TypeScript project
```

## Plugin Host packages

Most consumers should import the CFlow-owned Plugin Host API from `@cflow/core`:

```ts
import { createPluginHost, definePlugin, defineService } from '@cflow/core';
```

`@cflow/core` is the public facade. It delegates the implementation to
`@cflow/runtime-cordis`; advanced consumers can import that narrow package
directly, but Cordis types remain internal to it.

The first version implements the empty Plugin Host substrate, Runtime Service
dependencies, lifecycle ownership, and Child Installation composition. It does
not install Kernel, Session, Renderer, or other Canvas capabilities implicitly.
“Everything is Plugin” applies to those Canvas capabilities; the minimal Host
substrate is the boundary that owns the first installation and final disposal.

## Diagnostics package

`@cflow/diagnostics` provides the shared `CFlowError`, stable `domain + code`
identity, immutable Diagnostic Event contracts, safe error description, and
package-owned event catalogs. It has no runtime or logging dependency.

Each Plugin Host can receive its own synchronous Diagnostic Sink and Fault
Reporter. Host, Installation, Activation, and Plugin scope plus a monotonic
sequence make events directly searchable without parsing messages. Console,
files, Sentry, OpenTelemetry, filtering, batching, and persistence remain
application-owned adapters.

## Kernel package

`@cflow/kernel` now implements the renderer-independent graph core: Node and
Edge state, synchronous atomic Transactions, revision-bound Canvas Views,
Canvas Query, and reversible before/after Change Sets.

Most consumers can import the same interface from `@cflow/core`. The pure
Kernel does not depend on Plugin Host, Cordis, RxJS, a Renderer, DOM objects, or
framework adapters.

## Kernel Runtime Plugin

`@cflow/plugin-kernel` now provides one fresh Kernel per Plugin Activation
through a narrow `KernelService`. Consumers can read revision-bound Views, run
synchronous Transactions, and observe successful net-changing Canvas Commits
in revision order. Observer failures are reported without rolling back Kernel
state or blocking later Observers, and reentrant Transactions queue later
Commits until the current revision reaches every Observer.

The adapter depends directly on the CFlow-owned seams in `@cflow/kernel` and
`@cflow/runtime-cordis`; it does not introduce a speculative plugin-api package.
Concrete Renderer Providers, Persistence, initial Document import, and
asynchronous Transactions remain future Runtime work.

## Session Runtime Plugin

`@cflow/plugin-session` provides one fresh `SessionService` per Plugin
Activation. It owns immutable Selection and Viewport Snapshots outside the
Document and requires the narrow Kernel Service so external Selection updates
can accept only entities from the current Canvas View.

Equivalent updates preserve Snapshot identity and do not notify. Kernel
Commits remove invalid Selection members through the Session channel rather
than another Kernel Change Set or History entry. Reentrant Session mutations
use breadth-first FIFO delivery so every subscriber observes one consistent
Snapshot per notification round.

## Renderer packages

`@cflow/renderer-api` defines the backend-neutral `CanvasRenderer` protocol:
reset-or-commit Document updates, independent Session Snapshots, normalized
Pointer/Wheel/Keyboard input, semantic Hit Results, input control, and
structured Renderer errors. It contains no DOM, Canvas Context, native Event,
Konva, Pixi, Cordis, or framework types.

`@cflow/plugin-renderer` binds one typed Renderer Factory to Kernel and Session
Services. Each Activation owns one target-bound Renderer Instance, delivers a
Document reset before Session state, preserves resolvable Selection ordering,
and exposes only input, hit testing, Pointer Capture, and Focus through the
narrow `RendererService`. Concrete Renderer Providers remain separate,
explicit packages; CFlow does not select a default Provider or registry.

`@cflow/renderer-svg` is the first reference-quality official Provider. It
binds one existing `SVGSVGElement`, projects generic rectangular Nodes and
straight Edges, and exposes stable SVG classes and data attributes without
interpreting product Node types or data. It remains an explicit peer Provider
and is not re-exported as a default through `@cflow/core`.

## Command Runtime Plugin

`@cflow/plugin-command` provides one empty `CommandService` per Plugin
Activation. Feature Plugins register strongly typed Command tokens and own the
returned registrations; callers execute the same tokens through a Promise
seam that supports synchronous or asynchronous handlers.

Registration or Service disposal first removes Commands from lookup, then
aborts and awaits in-flight handlers. The Command package depends only on the
CFlow-owned Plugin Host seam. Feature Plugins acquire Kernel, Session, or
external capabilities through their own static Service Bindings.

## History Runtime Plugin

`@cflow/plugin-history` records each post-Baseline non-replay Canvas Commit as
one History Entry and exposes strongly typed Undo/Redo Commands. Replay applies
the stored Change Set through Kernel Service Transactions, creates a new
increasing revision, and returns the resulting Canvas Commit.

`HistoryService` exposes only a stable `canUndo` / `canRedo` Snapshot and a
subscription seam. Replay is single-flight, observer-reentrant Commit delivery
remains revision ordered, and public Snapshot publication waits until History
has caught up with Kernel. Losing Kernel Service or Command Service ends the
current History Activation; reactivation starts from a fresh empty Baseline.

## Layout packages

`@cflow/layout-api` defines immutable Layout Inputs, asynchronous Layout
Engines, explicit capabilities, and strict Layout Proposal validation.
`@cflow/plugin-layout` binds one Engine to one typed Command and commits a valid
Proposal through one synchronous Kernel Transaction with cancellation and stale
revision protection.

`@cflow/layout-dagre` and `@cflow/layout-elk` are explicit optional Providers;
they are not re-exported by `@cflow/core`. Dagre provides deterministic full
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

Build the root entry and every `@cflow/*` workspace package:

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
bun run --filter '@cflow/diagnostics' build
```

Build only the declarations required by `@cflow/plugin-kernel`:

```bash
bun run --filter '@cflow/plugin-kernel' build:dependencies
```

Build only the declaration required by `@cflow/plugin-command`:

```bash
bun run --filter '@cflow/plugin-command' build:dependencies
```

Build the declarations required by the Layout packages:

```bash
bun run --filter '@cflow/layout-api' build:dependencies
bun run --filter '@cflow/plugin-layout' build:dependencies
bun run --filter '@cflow/layout-dagre' build:dependencies
bun run --filter '@cflow/layout-elk' build:dependencies
```

Build the declarations required by `@cflow/plugin-session`:

```bash
bun run --filter '@cflow/plugin-session' build:dependencies
```

Build the declarations required by `@cflow/plugin-history`:

```bash
bun run --filter '@cflow/plugin-history' build:dependencies
```

Build the declarations required by the SVG Renderer Provider and run its real
browser seam tests:

```bash
bun run --filter '@cflow/renderer-svg' build:dependencies
bun run --filter '@cflow/renderer-svg' build:test-dependencies
bun run --filter '@cflow/renderer-svg' test:browser
```

Format supported files:

```bash
bun run format
```

Create release metadata for a publishable package change:

```bash
bun run changeset
```

The release workflow runs on `main` and requires these GitHub Actions secrets:

- `NPM_TOKEN` for npm publishing.
- `TOKEN` for the Changesets release pull request.

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
bun run --filter '@cflow/core' build
bun run --filter '@cflow/core' test
```

## License

[MIT](./LICENSE)
