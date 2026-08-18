# @cflow/core

Public CFlow facade for the Kernel and Plugin Host APIs.

```ts
import { createCanvasKernel, createPluginHost, definePlugin, defineService } from '@cflow/core';
```

The facade re-exports the pure graph interface from `@cflow/kernel` and the
CFlow-owned Plugin Host interface from `@cflow/runtime-cordis`. Cordis remains
an implementation dependency and does not appear in the public CFlow types.
Advanced consumers can import either narrow package directly.

## Development

Run package scripts from the monorepo root so the package uses the shared Bun toolchain and lockfile:

```bash
bun run --filter '@cflow/core' typecheck
bun run --filter '@cflow/core' test
bun run --filter '@cflow/core' build
```

Build output is written to `packages/core/dist/`.
The core build first builds every non-core workspace dependency, then emits the
facade declarations and verifies the published declaration boundary.

## License

[MIT](./LICENSE)
