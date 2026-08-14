# cflow

A Bun-powered TypeScript monorepo for cflow.

## Stack

- Bun for package management, development, builds, tests, and workspace scripts.
- tsgo for TypeScript checking.
- oxlint for linting.
- Prettier for formatting.
- Changesets for versioning and publishing.

## Structure

```text
.
├── packages/          # Workspace packages
├── src/               # Root TypeScript source
├── tests/             # Root automated tests
├── .changeset/        # Changesets configuration
├── bun.lock           # Bun lockfile
└── tsconfig.base.json # Shared TypeScript configuration
```

## Commands

Install dependencies:

```bash
bun install
```

Start a watch build for local development:

```bash
bun run dev
```

Build the root entry into `dist/`:

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

## License

[MIT](./LICENSE)
