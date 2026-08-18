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
│   ├── core/          # @cflow/core public facade
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
