# @cflow/core

Public CFlow facade for the Kernel, provider-neutral Layout API, Runtime Plugins, and Plugin Host APIs.

```ts
import {
  commandPlugin,
  createCanvasKernel,
  createPluginHost,
  defineCommand,
  definePlugin,
  defineService,
  historyPlugin,
  historyService,
  kernelPlugin,
  kernelService,
  sessionPlugin,
  sessionService,
  redoCommand,
  undoCommand,
} from '@cflow/core';
```

The facade re-exports the pure graph interface from `@cflow/kernel` and the
CFlow-owned Plugin Host interface from `@cflow/runtime-cordis`. It also
re-exports the official Kernel, Command, Session, and History Runtime Plugins
from their corresponding `@cflow/plugin-*` packages. It also re-exports the
generic Layout contracts and Runtime integration from `@cflow/layout-api` and
`@cflow/plugin-layout`.
Cordis remains an implementation dependency and does not appear in the public
CFlow types. Advanced consumers can import the narrow packages directly.

Concrete Layout Providers remain explicit optional packages. Core does not
depend on or re-export `@cflow/layout-dagre` or `@cflow/layout-elk`.

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

`historyPlugin` requires Kernel Service and Command Service, records post-Baseline
Recordable Commits, and provides a stable `HistoryService` Snapshot. Callers
execute the strongly typed `undoCommand` and `redoCommand`; the Service does not
expose duplicate imperative behavior methods or internal History Entries.

## Development

Run package scripts from the monorepo root so the package uses the shared Bun toolchain and lockfile:

```bash
bun run --filter '@cflow/core' typecheck
bun run --filter '@cflow/core' test
bun run --filter '@cflow/core' build
```

Build output is written to `packages/core/dist/`. Core typecheck and build first
build every non-core workspace dependency so package-name resolution also works
from a clean checkout. The build then emits the facade declarations and verifies
the published declaration boundary.

## License

[MIT](./LICENSE)
