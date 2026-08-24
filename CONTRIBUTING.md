# Contributing to NodeBraid

Thank you for contributing to NodeBraid. This repository is a Bun-powered
TypeScript monorepo. Changes should preserve the public package boundaries,
keep renderer-specific behavior outside the graph Kernel, and include evidence
for every new or changed behavior.

## Prerequisites

- Node.js 22.13.0 or newer.
- Bun 1.2.19 or newer.
- Chromium installed through `agent-browser` for the SVG Renderer browser tests.

## Setup

Install dependencies and the browser used by the real Renderer seam tests:

```bash
bun install
bunx agent-browser install
```

On Linux CI or a Linux development environment that also needs browser system
dependencies, use:

```bash
bunx agent-browser install --with-deps
```

## Development workflow

Start the root watch build:

```bash
bun run dev
```

Run the Documentation Site locally:

```bash
bun run docs:dev
```

Use the focused commands while developing:

```bash
bun run lint
bun run typecheck
bun run format:check
bun run test
bun run test:browser
bun run build
bun run docs:check
```

Before opening a pull request, run the complete repository gate:

```bash
bun run check
```

The complete gate covers linting, clean workspace type resolution, formatting,
Bun tests, real Chromium tests, production builds, the documented Quick Start,
and the Documentation Site production build.

## Workspace packages

Workspace packages live under `packages/` and use the `@nodebraid/*` namespace.
Run package scripts from the repository root:

```bash
bun run --filter '@nodebraid/core' build
bun run --filter '@nodebraid/core' test
```

Package-name imports resolve through generated declarations. When working from
a clean checkout, run the package's documented `build:dependencies` or
`build:test-dependencies` script before a standalone typecheck or test that
crosses workspace package boundaries.

Keep package metadata, source, tests, and required TypeScript configuration in
the package directory. Do not commit generated `dist/` directories, dependency
caches, or local editor configuration.

## Tests

- Add automated coverage for every new behavior.
- Add a regression test before fixing a defect.
- Use `tests/<name>.test.ts` for Bun tests.
- Use `browser-tests/<name>.browser.ts` for real browser scenarios so the root
  Bun test discovery does not execute them accidentally.
- Keep tests deterministic and free of implicit external services.
- Let failures expose their original cause; do not add mock success paths or
  silently swallow errors.

## Architecture and documentation

Read [ARCHITECTURE.md](./ARCHITECTURE.md), [CONTEXT.md](./CONTEXT.md), and the
relevant records under `docs/adr/` before changing a public seam or package
boundary.

Update public documentation when a change affects exported APIs, setup steps,
workspace commands, package responsibilities, or current capability status.
Clearly separate implemented behavior from target architecture and roadmap
work.

## Commits and pull requests

Write short English commit messages in the imperative mood. Conventional Commit
prefixes are encouraged, for example:

```text
feat: add flow parser
fix: reject invalid node
docs: clarify renderer lifecycle
```

Keep each commit focused on one logical change. A pull request should include:

- the purpose of the change;
- the main implementation decisions;
- the verification commands that were run;
- a linked issue when one exists;
- screenshots for visible interface changes;
- any new environment variables, without secrets or credentials.

Before committing, verify the final scope and whitespace:

```bash
git status --short
git diff --check
```
