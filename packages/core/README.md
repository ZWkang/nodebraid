# @cflow/core

Public CFlow facade for the Kernel, Kernel Runtime Plugin, and Plugin Host APIs.

```ts
import {
  createCanvasKernel,
  createPluginHost,
  definePlugin,
  defineService,
  kernelPlugin,
  kernelService,
} from '@cflow/core';
```

The facade re-exports the pure graph interface from `@cflow/kernel` and the
CFlow-owned Plugin Host interface from `@cflow/runtime-cordis`. It also
re-exports the official Kernel Runtime Plugin from `@cflow/plugin-kernel`.
Cordis remains an implementation dependency and does not appear in the public
CFlow types. Advanced consumers can import the narrow packages directly.

`kernelPlugin` composes one fresh Kernel into a Plugin Host Activation through
the narrow `KernelService` interface. It adds synchronous ordered Canvas Commit
observation while keeping the underlying `CanvasKernel` private.

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
