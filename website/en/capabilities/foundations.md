---
title: Foundations
description: NodeBraid's public entry point, Plugin lifecycle, and shared diagnostics contract.
---

# Foundations

Foundations is the common base for every other NodeBraid capability. It does not provide a Document, Command, Layout, or Renderer directly. Instead, it answers three more fundamental questions: where an application enters the system, how capabilities are composed and released, and how different packages express observable errors and events.

::: warning Packages are not publicly released
The current `@nodebraid/*` packages have not been publicly released under the NodeBraid project. Package names describe source module boundaries and do not mean they can be installed from npm.
:::

## Three modules, three boundaries

| Module                                                    | Responsible for                                                                         | Not responsible for                                                                          |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [`@nodebraid/core`](/en/modules/core)                     | Aggregating NodeBraid's current public API as the preferred facade for applications     | Creating new runtime semantics, installing capabilities automatically, or choosing Providers |
| [`@nodebraid/runtime-cordis`](/en/modules/runtime-cordis) | Providing the NodeBraid-owned Plugin Host, Plugin, Service Token, and lifecycle         | Document, Command, Session, persistence, or any default Canvas capability                    |
| [`@nodebraid/diagnostics`](/en/modules/diagnostics)       | Defining structured errors, immutable Diagnostic Events, and safe description functions | Console output, files, networking, retries, batching, or persistence                         |

## Dependency direction

```text
Application ───────────────▶ @nodebraid/core ─────▶ NodeBraid public packages
Advanced runtime consumer ─▶ @nodebraid/runtime-cordis ──▶ @nodebraid/diagnostics
Pure NodeBraid packages ──────▶ @nodebraid/diagnostics
```

- Ordinary applications use the unified entry point through `@nodebraid/core`.
- Advanced consumers that need precise dependency control can import narrow packages directly.
- Internal NodeBraid packages depend directly on their lower-level contracts and never depend back on `@nodebraid/core`.
- `@nodebraid/runtime-cordis` uses Cordis internally, but its public types expose only NodeBraid's own Plugin, Plugin Context, Runtime Service, and Installation semantics.

## Choosing an entry point

Start with [`@nodebraid/core`](/en/modules/core) when application code needs the Kernel, Runtime Plugins, Layout API, or Renderer contract.

Use [`@nodebraid/runtime-cordis`](/en/modules/runtime-cordis) directly only when building runtime infrastructure or minimizing the dependency surface. It creates an empty Plugin Host; the application must still install every Canvas capability explicitly.

Use [`@nodebraid/diagnostics`](/en/modules/diagnostics) directly only when building a NodeBraid package, a diagnostics Adapter, or a shared error boundary. It provides protocols and deterministic conversion, not a logging backend.

## Composition principles

1. **The facade does not hide composition.** `@nodebraid/core` aggregates entry points, but never installs a Plugin or Provider implicitly.
2. **The Plugin Host owns the lifecycle.** Runtime Service availability drives Activation; Owned Resources are released in reverse registration order with their Activation.
3. **Diagnostics do not change control flow.** Failed calls still throw or reject to their callers; Diagnostic Events are observational only.
4. **Implementation details stay inside their boundaries.** Cordis types do not cross the public interface of `@nodebraid/runtime-cordis`, and output or persistence policy does not enter `@nodebraid/diagnostics`.
