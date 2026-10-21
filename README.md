# NodeBraid

English | [简体中文](./README.zh-CN.md)

NodeBraid is a plugin-based, renderer-agnostic flow canvas engine for building
TypeScript editors without coupling document state, interaction, layout, and
rendering to one UI framework or graphics backend.

The current source tree provides a runnable headless Canvas Runtime, an explicit
Basic Canvas Composition, and a reference-quality SVG Renderer. The implemented
surface includes atomic graph transactions, Selection and Viewport state, typed
Commands, Undo/Redo, Selection, Box Selection, Delete Selection, Duplicate Selection, Clipboard Copy/Paste, multi-Node Drag, Pan, Wheel Zoom, Port-aware and node-level Edge
Connection, Dagre and ELK Layout Providers, structured diagnostics, and Plugin
lifecycle ownership.

A public React Adapter now binds application Runtime Factories to React Targets
and projects stable Kernel, Session, and History Snapshots. The private React
Examples Application consumes it in a runnable Basic SVG developer reference
with unified navigation, live Runtime state, Edge Connection, viewport controls,
and History actions.

NodeBraid is still pre-release. It does not yet provide a product-level editor
shell, non-React framework adapters, persistence, collaboration, or a
serialization schema. The source packages use the `@nodebraid/*` namespace but
have not been published to npm.

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

The `Checks` workflow in `.github/workflows/test.yml` runs the full repository
check, then deploys its Documentation Site artifact on pushes to `main`.
Manual runs are available through `workflow_dispatch`; only runs on `main`
deploy. Deployment uses the artifact from the same successful check run without
rebuilding it. The repository's Pages source must be configured as **GitHub Actions**
in Settings → Pages; the deployed project URL is `https://zwkang.github.io/nodebraid/`.

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

## Agentic development

Local Codex uses the existing ChatGPT sign-in for issue investigation, implementation,
review, and PR feedback repairs. GitHub retains issues, PRs and engineering CI.
Requirements/specs and their tasks also have local reading copies and versioned
archives under `~/.codex/local-workflows/nodebraid/issues/`. GitHub stays authoritative;
the copies are refreshed after complete reads and never written back. See the
[archive contract](./docs/agents/issue-tracker.md#local-reading-and-archive-copies).
The local chat heartbeat checks for work every five minutes while the computer and
app are running; it is polling rather than a realtime webhook. It consumes the
account's Codex subscription allowance, with no API-key fallback.

The versioned execution protocol is [.agents/workflows/local-agent.md](./.agents/workflows/local-agent.md).
[Agentic workflows](./docs/agents/agentic-workflows.md) documents setup, durable
execution evidence, failure states and acceptance. Managed issue PRs use a
`[local-agent] ` title and `feat/issue-N` branch; legacy `[agent] ` issue PRs remain
eligible. Human review and merge are the final step.

Project-local Ponytail keeps implementation complete and minimal; `ponytail-review`
checks connected callers in the independent Standards axis. Spec review remains
separate. New confirmed defects require an executed reproduction and issue deduplication.

The [project engineering principles](./docs/agents/principles.md) index routes
design, implementation, debugging and review to 24 project-maintained pstack
principles. Read the applicable guidance for the current task; existing workflows,
approved contracts and authorization remain authoritative. `agents:check` also
checks that the index, license and all principle files are present.

```bash
bun run agents:check       # Validate local protocol and absence of hosted AI jobs
bun run agents:local-check # Also verify local ChatGPT CLI authentication
bun run agents:scan        # Prepare a main-snapshot investigation
bun run agents:scan <sha>  # Prepare changes since the last completed investigation
bun run agents:typecheck  # Type-check the executable local workflow
bun run agents:run        # Show prepare/inspect/verify/publication/evaluate usage
bun run agents:run archive-issue snapshot.json ~/.codex/local-workflows/nodebraid/issues # Keep an Issue reading copy and history
bun run agents:preview --base <sha> --out <empty-dir> [--all] # Capture real Examples evidence
bun run agents:report <run-dir> <output-dir> # Add complete reviews and declared logs; never overwrite
bun run agents:publish-evidence prepare <dir> <repository> <pr> <head> # Prepare connector publication
bun run agents:publish-evidence preflight # CI only: emit eligibility before downloading artifacts
bun run agents:discovery init queue.json # Explicitly initialize public seam coverage
bun run agents:discovery sync queue.json # Resume pending seams, even without new commits
bun run agents:discovery finish queue.json report.json # Record one successful investigation
bun test tests/agent-issue.test.ts tests/pr-feedback.test.ts tests/defect-scan.test.ts
```

The migration removes API-backed GitHub Agentic Workflows rather than running both
executors. A registered schedule is not end-to-end acceptance; review the actual
issue, red/green tests, independent reviews, published head, CI and repair evidence.
Local runs bind an independent prepared task to its exact checked head/tree/patch
and actual remote publication. New heads need fresh verification. The persistent
discovery queue retains unexamined areas instead of treating a main checkpoint as
complete repository coverage. Command input formats and recovery are documented
in [Agentic workflows](./docs/agents/agentic-workflows.md#执行命令和恢复).

The project [verify-nodebraid](./.agents/skills/verify-nodebraid/SKILL.md) skill drives
the production Examples Application with the pinned `agent-browser`. The
[PR evidence workflow](./docs/agents/pr-evidence.md) publishes full review reports,
declared verification logs, screenshots and recordings under the current PR head.
Run preview first, then generate the report into the same output directory. With
existing `GITHUB_TOKEN` and `GITHUB_REPOSITORY`, `bun run agents:publish-evidence
<dir> <pr> <head>` publishes directly; otherwise use the prepared plan with connected
GitHub tools. Preparing files does not publish them.

The PR preview job uses read-only permissions. The `workflow_run` publisher runs
trusted default-branch code and accepts preview data, not independent review reports
from PR code. It starts triggering only after the workflow reaches the default
branch. Before reporting ready, record the actual report URL, source head and
evidence commit; `agents:run evaluate` does not yet check that publication receipt.
This does not add a model API, another scheduler, or changes to branch protection.

## Stack

- Bun for package management, development, builds, tests, and workspace scripts.
- tsgo for TypeScript checking.
- oxlint for linting.
- Prettier for formatting.
- agent-browser for real Chromium React Adapter and Renderer seam tests.
- React, TanStack Router, shadcn with Base UI, Tailwind CSS, and Vite for the private Examples Application.

## Structure

```text
.
├── packages/
│   ├── adapter-react/  # @nodebraid/adapter-react React lifecycle adapter
│   ├── core/           # @nodebraid/core public facade
│   ├── canvas-fragment/ # Pure in-memory Canvas Fragment values
│   ├── diagnostics/    # @nodebraid/diagnostics errors and Diagnostic Events
│   ├── interaction-api/ # @nodebraid/interaction-api transient projection values
│   ├── kernel/         # @nodebraid/kernel graph state and transactions
│   ├── layout-api/     # @nodebraid/layout-api provider-neutral contracts
│   ├── layout-dagre/   # @nodebraid/layout-dagre official Provider
│   ├── layout-elk/     # @nodebraid/layout-elk official Provider
│   ├── plugin-command/ # @nodebraid/plugin-command Runtime Service adapter
│   ├── plugin-clipboard/ # Explicit Clipboard Copy/Paste Behavior
│   ├── plugin-history/ # @nodebraid/plugin-history History Runtime Plugin
│   ├── plugin-interaction/ # @nodebraid/plugin-interaction Interaction Runtime
│   ├── plugin-duplicate-selection/ # Independent Duplicate Selection Behavior
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
Box Selection, and Connection Preview values. `@nodebraid/port-api` and
`@nodebraid/plugin-port` provide immutable Port Snapshots plus activation-scoped
Node/domain contributions. `@nodebraid/plugin-interaction` consumes normalized
Renderer Input and Hit Results, implements selection, Box Selection, multi-Node Drag,
middle/Space Pan, anchored Wheel Zoom, and optional mouse-only Port-aware or
Node-level Edge Connection plus focused Delete Selection, and provides a narrow Shortcut
contribution Service without exposing Interaction state.

Stable Selection and Viewport changes go through Session; final Node movement,
Edge creation, and Selection deletion use typed Commands and one Kernel Transaction. Applications
provide complete Edge ID/type/data through a synchronous Connection materializer.
Pointer-move Preview remains in the exclusive Renderer Projection Binding.
Cancellation, stale evidence, lost capture, dependency recovery, and cleanup are
explicit and observable. Core re-exports both backend-neutral Interaction
packages but still does not re-export the concrete SVG Provider.

`@nodebraid/plugin-duplicate-selection` is an explicit sibling Plugin. It owns
the input-free `selection.duplicate` Command, selected-Node induced-subgraph
copying, exact stale/ABA evidence, one Transaction, and the resulting Selection.
Applications synchronously provide only complete Node/Edge ID mappings. Its
independent Shortcut Plugin contributes focused Ctrl/Cmd+D through the single
Interaction input authority.

`@nodebraid/canvas-fragment` now supplies the shared in-memory selected-Node
subgraph contract used by Duplicate and Clipboard. It preserves opaque `data`
references and is explicitly not a Serialized Document. The sibling
`@nodebraid/plugin-clipboard` owns `clipboard.copy` / `clipboard.paste`, injected
abort-aware text transport, application-owned text codec and fresh-ID mapping,
one Paste Transaction, resulting Selection, and focused Ctrl/Cmd+C / Ctrl/Cmd+V.
Generic packages do not access `navigator.clipboard`, provide a fallback store,
or claim arbitrary `unknown` is JSON-safe.

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
options?)`, a backend-neutral ordinary Plugin that owns Kernel, Port, Command,
Session, Renderer, Interaction, and History through Child Installations. The
Composition waits for every child to become active and releases them in reverse
dependency-safe order.

Applications still create the Plugin Host, configure Diagnostics, select a
concrete Renderer Factory, and install Layout or domain capabilities as sibling
Plugins. Core re-exports the Composition factory but does not re-export or
select `@nodebraid/renderer-svg` or another concrete Provider.

## React Adapter

`@nodebraid/adapter-react` exposes `useRuntimeMount()` for target-specific async
Runtime Factories. Its callback ref owns `pending` / `ready` / `failed`
transitions, Strict Mode replay, stale Factory results, ordered async disposal,
and explicit lifecycle Failure reporting. `useKernelView()`,
`useSessionSnapshot()`, and `useHistorySnapshot()` connect existing stable
Runtime Services to `useSyncExternalStore` without adding writes or selectors.

The package does not provide Context, Providers, Renderer JSX, React Node
components, controlled Documents, product UI, or a shared React/Vue abstraction.
The Basic SVG Example consumes this public package rather than keeping a private
mount coordinator or Snapshot wrappers.

The verified v0 boundary is React 19 client rendering with one live Target per
callback ref. Snapshot Hooks fail explicitly during SSR because the Runtime has
no hydration Snapshot contract to reproduce server state.

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

Install Chromium for the React Adapter and SVG Renderer browser tests:

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

Run checks for the current development changes:

```bash
bun run check:affected             # Compare with HEAD, including staged, unstaged and untracked files
bun run check:affected --base main # Compare with the merge-base of main and HEAD, plus working-tree changes
bun run check:affected --plan      # Print the selected scope without executing checks
```

The affected scope includes workspace consumers through production and development
dependencies, root integration tests that statically import affected packages
(including through local fixtures), and the selected browser suites. Website changes
or an affected `@nodebraid/core` also select documentation checks. Shared tooling,
workflow files and unmapped non-Markdown files select the full check; ordinary
Markdown outside workspaces and the website needs only formatting. Agent workflow
Markdown and `AGENTS.md` also select the full check.

Run all repository checks for delivery and CI:

```bash
bun run check
```

Affected checks do not replace delivery verification. For managed Agent tasks,
complete the affected checks and both review axes, then use `agents:run verify`
to execute the full check once for that attempt; do not manually run the same
full check beforehand. A new verification attempt still executes it again.

Run individual checks:

```bash
bun run lint
bun run typecheck
bun run format:check
bun run test
bun run test:browser
```

The build scheduler in `scripts/build-workspaces.ts` builds workspaces in dependency
order and builds each workspace once per invocation. It does not cache across runs.
The full check prepares all workspace artifacts once, then runs typechecks, Bun and
browser tests, and documentation checks against those artifacts.

Normal workspace `build`, `test`, `typecheck` and `test:browser` commands prepare
their required dependencies, so they work without pre-existing `dist` directories.
The `:self` scripts are internal steps for a scheduler that has already prepared
those dependencies; use the normal commands when running a package independently.

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

Build and verify the React Adapter, including its real Chromium public-seam
tests:

```bash
bun run --filter '@nodebraid/adapter-react' build:dependencies
bun run --filter '@nodebraid/adapter-react' test:browser
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
bun run --filter '@nodebraid/port-api' build:dependencies
bun run --filter '@nodebraid/plugin-port' build:dependencies
bun run --filter '@nodebraid/plugin-interaction' build:dependencies
bun run --filter '@nodebraid/plugin-interaction' build:test-dependencies
bun run --filter '@nodebraid/plugin-duplicate-selection' build:dependencies
bun run --filter '@nodebraid/plugin-duplicate-selection' build:test-dependencies
bun run --filter '@nodebraid/canvas-fragment' build:dependencies
bun run --filter '@nodebraid/plugin-clipboard' build:dependencies
bun run --filter '@nodebraid/plugin-clipboard' build:test-dependencies
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
