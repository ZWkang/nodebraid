# NodeBraid

English | [简体中文](./README.zh-CN.md)

**A plugin-based, renderer-agnostic flow canvas engine for TypeScript.**

Build node editors with independent document state, interaction, layout, and
rendering. Compose the capabilities you need, choose a Renderer Provider, and
keep your application's node types, data, and UI under your control.

[Documentation](https://zwkang.github.io/nodebraid/en/) ·
[Quick Start](#quick-start) ·
[Capabilities](https://zwkang.github.io/nodebraid/en/capabilities/) ·
[Architecture](./ARCHITECTURE.md)

> **Pre-release:** the `@nodebraid/*` packages are not yet published to npm.
> Use a source checkout. NodeBraid provides a canvas engine and a developer
> reference application; a product-level editor shell, automatic/cloud
> persistence, and collaboration are not available yet.

## What you can build with it

| Capability         | Available today                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Graph state        | Nodes and Edges, atomic Transactions, revision-bound queries, and reversible Change Sets.                                       |
| Canvas interaction | Selection, Box Selection, multi-Node Drag, Pan, Wheel Zoom, and Port-aware or node-level Edge Connection.                       |
| Editing            | Node creation and one-shot placement, data editing, Delete Selection, Duplicate Selection, Clipboard Copy/Paste, and Undo/Redo. |
| Rendering          | An SVG Renderer Provider with custom SVG node content and normalized input.                                                     |
| Layout             | Dagre full layout; ELK full and incremental layout with Fixed Node support.                                                     |
| Document files     | Versioned complete-graph serialization with application-owned data codecs; manual export/import in the example.                 |
| React integration  | Runtime mount/disposal and stable Kernel, Session, and History Snapshot Hooks for React 19 client rendering.                    |
| Extensibility      | Typed Commands and Runtime Services, Plugin lifecycle ownership, and structured diagnostics.                                    |

Layout arranges Nodes while preserving Port connections; Port geometry does not
participate in the layout algorithms. Custom SVG content retains rectangular
hit bounds. React Snapshot Hooks do not support SSR, and adapters for other
UI frameworks are not available yet. See [Current Status](https://zwkang.github.io/nodebraid/en/status)
for the full capability boundaries.

## Quick Start

Requires **Node.js ≥ 22.13.0** and **Bun ≥ 1.2.19**. Run commands from the repository root.

```bash
git clone https://github.com/ZWkang/nodebraid.git
cd nodebraid
bun install
bun run example:dev
```

Open the address printed by the dev server and navigate to `/basic-svg`. The
Examples Application builds its workspace dependencies automatically and lets you
try node creation and editing, selection, dragging, connections, copy/paste,
Undo/Redo, manual Dagre layout, and document export/import.

The example runs locally; the [Interactive Example guide](https://zwkang.github.io/nodebraid/en/guide/interactive-example)
explains its controls. Its UI is application code,
not a product editor bundled with the engine.

### Run the headless example

To exercise the Plugin Host and a Kernel Transaction without opening a browser:

```bash
bun run docs:quick-start
```

This builds `@nodebraid/core` and its dependencies, then runs the
[same example used by the documentation](./website/examples/quick-start.ts).
Expected output:

```text
revision=1 nodes=1
```

## How the pieces fit

- **Kernel owns the Document.** Nodes and Edges change through atomic Transactions.
  Session owns Selection and Viewport separately; History records document changes.
- **Plugins compose a Canvas Runtime.** `createPluginHost()` starts empty.
  `createBasicCanvasPlugin(rendererFactory, options?)` explicitly combines Kernel,
  Port, Command, Node Editing, Session, Renderer, Interaction, and History.
- **Applications choose Providers and own product behavior.** Select the Renderer
  Factory, add Layout, Duplicate Selection, or Clipboard Plugins as needed, and
  supply node data, codecs, clipboard transport, and UI.

Use `@nodebraid/core` as the public entry point for backend-neutral APIs:

```ts
import { createPluginHost, createBasicCanvasPlugin } from '@nodebraid/core';
```

Concrete Providers such as `@nodebraid/renderer-svg`, `@nodebraid/layout-dagre`, and
`@nodebraid/layout-elk`, plus `@nodebraid/adapter-react`, have their own imports.
Core does not select or re-export a default Renderer or Layout Provider.

| Start here                                                                                                                                                                                | Purpose                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [Core](./packages/core/README.md) · [Basic Composition](./packages/preset-basic/README.md)                                                                                                | Public APIs and a ready-to-compose set of canvas capabilities.    |
| [Kernel](./packages/kernel/README.md) · [Document](./packages/document/README.md)                                                                                                         | Graph invariants, Transactions, and complete document files.      |
| [Plugin Host](./packages/runtime-cordis/README.md) · [Diagnostics](./packages/diagnostics/README.md)                                                                                      | Service dependencies, lifecycle, and observable failures.         |
| [Command](./packages/plugin-command/README.md) · [Session](./packages/plugin-session/README.md) · [History](./packages/plugin-history/README.md)                                          | Actions, Selection/Viewport, and Undo/Redo.                       |
| [Interaction](./packages/plugin-interaction/README.md) · [Port](./packages/plugin-port/README.md)                                                                                         | Gestures, shortcuts, and node connection definitions.             |
| [Node Editing](./packages/plugin-node-editing/README.md) · [Duplicate Selection](./packages/plugin-duplicate-selection/README.md) · [Clipboard](./packages/plugin-clipboard/README.md)    | Editing behaviors and their application-owned inputs.             |
| [Renderer API](./packages/renderer-api/README.md) · [SVG Renderer](./packages/renderer-svg/README.md)                                                                                     | Backend-neutral rendering contracts and the SVG implementation.   |
| [Layout API](./packages/layout-api/README.md) · [Layout Plugin](./packages/plugin-layout/README.md) · [Dagre](./packages/layout-dagre/README.md) · [ELK](./packages/layout-elk/README.md) | Layout computation and atomic application of results.             |
| [React Adapter](./packages/adapter-react/README.md) · [Example source](./examples/app/src/)                                                                                               | React lifecycle integration and a complete reference application. |

The [Module Index](https://zwkang.github.io/nodebraid/en/modules/) covers all
packages, including the standalone value contracts and Runtime adapters.

## Development

The monorepo uses Bun, TypeScript/tsgo, oxlint, and Prettier. Real-browser tests
use the pinned `agent-browser` with Chromium. The Examples Application uses
React, TanStack Router, shadcn with Base UI, Tailwind CSS, and Vite.

Install Chromium before running browser checks or the full repository check:

```bash
bunx agent-browser install
```

On Linux CI, use `bunx agent-browser install --with-deps`.

| Command                              | Purpose                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| `bun run example:dev`                | Build dependencies and start the interactive example.                            |
| `bun run example:check`              | Build, type-check, and browser-test the example.                                 |
| `bun run dev`                        | Watch-build the root entry; this does not start the example.                     |
| `bun run build`                      | Build the root entry and public workspace packages.                              |
| `bun run check:affected --plan`      | Show checks selected for the current changes.                                    |
| `bun run check:affected`             | Run selected development checks, including working-tree changes.                 |
| `bun run check:affected --base main` | Select checks from the merge-base with `main` and working-tree changes.          |
| `bun run check`                      | Run the full lint, format, build, type, unit, browser, and documentation checks. |
| `bun run docs:dev`                   | Start the documentation site locally.                                            |
| `bun run docs:check`                 | Validate documentation, run the Quick Start, and build the site.                 |
| `bun run docs:preview`               | Preview the built documentation site.                                            |
| `bun run format`                     | Format supported files.                                                          |

Run an individual package's normal scripts from the root; they prepare required
workspace dependencies. The `:self` scripts are internal steps for already-built dependencies.

```bash
bun run --filter '@nodebraid/core' build
bun run --filter '@nodebraid/core' test
```

Affected checks support the development loop; they do not replace full delivery
verification. See [AGENTS.md](./AGENTS.md) for individual checks, package commands,
and contribution requirements.

### Repository map

```text
packages/       Public @nodebraid/* packages
examples/app/   Private React Examples Application
website/        Bilingual documentation and the shared Quick Start
src/            Root TypeScript entry
tests/          Cross-package and tooling tests
scripts/        Build, verification, and local workflow tools
docs/           Architecture decisions and contributor workflows
```

### Contributing and agent workflows

Start with [AGENTS.md](./AGENTS.md), the [domain glossary](./CONTEXT.md), and
relevant [architecture decisions](./docs/adr/). Each new requirement uses one
GitHub spec Issue and one PR to `main`; implementation tickets stay in the local
run. Follow the [Issue tracker conventions](./docs/agents/issue-tracker.md).

Local Codex workflows use ChatGPT sign-in for investigation, implementation,
independent Standards/Spec review, and PR feedback repairs. GitHub holds the
canonical Issues, PRs, and CI. Setup and commands live in
[Agentic workflows](./docs/agents/agentic-workflows.md); verification follows the
[capability map](./.agents/skills/control-nodebraid/references/capabilities.md),
[PR evidence workflow](./docs/agents/pr-evidence.md), and
[PR risk policy](./.agents/skills/pr-risk/SKILL.md).

The [Checks workflow](./.github/workflows/test.yml) deploys the documentation
artifact after a successful full check on pushes to `main` or manual runs on
`main`. GitHub Pages must use **GitHub Actions** as its source.

## License

[MIT](./LICENSE)
