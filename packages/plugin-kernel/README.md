# @cflow/plugin-kernel

Kernel Runtime Plugin for CFlow Canvas Runtime instances.

```ts
import { kernelPlugin, kernelService } from '@cflow/plugin-kernel';
import { createPluginHost, definePlugin } from '@cflow/runtime-cordis';

const consumer = definePlugin({
  requires: { kernel: kernelService },
  setup(context) {
    const unsubscribe = context.services.kernel.observeCommits((commit) => {
      console.log(commit.changeSet.revision);
    });
    context.own(unsubscribe);
  },
});

const host = createPluginHost();
host.install(kernelPlugin);
host.install(consumer);
```

Each Plugin Activation owns a fresh revision-zero Kernel. The narrow
`KernelService` exposes revision-bound reads, synchronous Transactions, and
synchronous ordered Canvas Commit observation without exposing the underlying
`CanvasKernel` object.

Only successful Transactions with net changes are delivered. Reentrant
Transactions queue their Commits until every Observer has received the current
revision. Observer failures never roll back Kernel state or block other
Observers; they are reported through the platform error channel.

The package depends on the CFlow-owned seams from `@cflow/kernel` and
`@cflow/runtime-cordis`, not on `@cflow/core`. It does not expose Cordis types.

## Development

Run package scripts from the monorepo root:

```bash
bun run --filter '@cflow/plugin-kernel' typecheck
bun run --filter '@cflow/plugin-kernel' test
bun run --filter '@cflow/plugin-kernel' build
```

## License

[MIT](./LICENSE)
