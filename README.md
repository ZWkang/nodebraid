# CFlow

CFlow is a plugin-based, renderer-agnostic flow canvas engine built as a Bun-powered TypeScript monorepo.

The repository is currently at an early implementation stage. The planned architecture and package boundaries are documented in [ARCHITECTURE.md](./ARCHITECTURE.md); the document describes the target design rather than the currently implemented feature set.

## Stack

- Bun for package management, development, builds, tests, and workspace scripts.
- tsgo for TypeScript checking.
- oxlint for linting.
- Prettier for formatting.
- Changesets for versioning and publishing.

## Structure

```text
.
├── packages/
│   ├── core/           # @cflow/core public facade
│   ├── kernel/         # @cflow/kernel graph state and transactions
│   ├── plugin-command/ # @cflow/plugin-command Runtime Service adapter
│   ├── plugin-history/ # @cflow/plugin-history History Runtime Plugin
│   ├── plugin-kernel/  # @cflow/plugin-kernel Runtime Service adapter
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
Session, Renderer, Persistence, initial Document import, and
asynchronous Transactions remain future Runtime work.

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

## Commands

Install dependencies:

```bash
bun install
```

Start a watch build for local development:

```bash
bun run dev
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
```

Workspace package typechecks first build the dependency declarations required
for package-name resolution, so the same commands work from a clean checkout
without pre-existing `dist` directories.

Build only the declarations required by `@cflow/plugin-kernel`:

```bash
bun run --filter '@cflow/plugin-kernel' build:dependencies
```

Build only the declaration required by `@cflow/plugin-command`:

```bash
bun run --filter '@cflow/plugin-command' build:dependencies
```

Build the declarations required by `@cflow/plugin-history`:

```bash
bun run --filter '@cflow/plugin-history' build:dependencies
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
