# @nodebraid/core

> Documentation: [English](https://zwkang.github.io/nodebraid/en/modules/core) · [简体中文](https://zwkang.github.io/nodebraid/modules/core)

Public NodeBraid facade for Kernel, Interaction, provider-neutral Layout/Renderer contracts, Runtime Plugins, and Plugin Host APIs.

```ts
import {
  commandPlugin,
  diagnosticEvents,
  describeError,
  createCanvasKernel,
  createPluginHost,
  defineCommand,
  definePlugin,
  defineService,
  historyPlugin,
  historyService,
  interactionPlugin,
  kernelPlugin,
  kernelService,
  moveNodesCommand,
  sessionPlugin,
  sessionService,
  redoCommand,
  undoCommand,
} from '@nodebraid/core';
```

The facade re-exports structured errors and Diagnostic Event contracts from
`@nodebraid/diagnostics`, the pure graph interface from `@nodebraid/kernel`, immutable
Session values from `@nodebraid/session-api`, backend-neutral Interaction and Renderer
contracts from `@nodebraid/interaction-api` and `@nodebraid/renderer-api`, and the NodeBraid-owned Plugin Host interface from
`@nodebraid/runtime-cordis`. It also re-exports the official Kernel, Command,
Session, Renderer, Interaction, and History Runtime Plugins from their corresponding
`@nodebraid/plugin-*` packages, plus generic Layout contracts and Runtime
integration from `@nodebraid/layout-api` and `@nodebraid/plugin-layout`.
Cordis remains an implementation dependency and does not appear in the public
NodeBraid types. Advanced consumers can import the narrow packages directly.

Concrete Layout Providers remain explicit optional packages. Core does not
depend on or re-export `@nodebraid/layout-dagre` or `@nodebraid/layout-elk`.

`kernelPlugin` composes one fresh Kernel into a Plugin Host Activation through
the narrow `KernelService` interface. It adds synchronous ordered Canvas Commit
observation while keeping the underlying `CanvasKernel` private.

`commandPlugin` provides an Activation-scoped `CommandService` for strongly
typed registration, asynchronous execution, cancellation, and lifecycle-bound
cleanup. Feature Plugins obtain Kernel or Session dependencies through their
own declared Service Bindings rather than through a hidden Service locator.

`sessionPlugin` provides an Activation-scoped `SessionService` with immutable
Selection and Viewport Snapshots. It validates Selection against the current
Kernel View and reconciles removed entities without writing another Kernel
Change Set or History entry.

`createRendererPlugin(factory)` binds one concrete Renderer Factory to the
Kernel and Session Services while exposing only the narrow `RendererService`
to Interaction Plugins. Core does not select or re-export concrete Renderer
Providers.

`interactionPlugin` interprets normalized Renderer Input as Selection,
Node Drag, Pan, Wheel Zoom, and optional Node-level Edge Connection. It keeps transient Preview in an exclusive
Interaction Projection Binding, writes stable Session state through
`SessionService`, and commits final Node positions or materialized Edges through typed Commands.

`historyPlugin` requires Kernel Service and Command Service, records post-Baseline
Recordable Commits, and provides a stable `HistoryService` Snapshot. Callers
execute the strongly typed `undoCommand` and `redoCommand`; the Service does not
expose duplicate imperative behavior methods or internal History Entries.

## Development

Run package scripts from the monorepo root so the package uses the shared Bun toolchain and lockfile:

```bash
bun run --filter '@nodebraid/core' typecheck
bun run --filter '@nodebraid/core' test
bun run --filter '@nodebraid/core' build
```

Build output is written to `packages/core/dist/`. Core typecheck and build first
build every non-core workspace dependency so package-name resolution also works
from a clean checkout. The build then emits the facade declarations and verifies
the published declaration boundary.

## License

[MIT](./LICENSE)
