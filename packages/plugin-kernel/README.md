# @nodebraid/plugin-kernel

> Documentation: [English](https://zwkang.github.io/nodebraid/en/modules/plugin-kernel) · [简体中文](https://zwkang.github.io/nodebraid/modules/plugin-kernel)

Kernel Runtime Plugin for NodeBraid Canvas Runtime instances.

```ts
import { kernelPlugin, kernelService } from '@nodebraid/plugin-kernel';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

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
const provider = host.install(kernelPlugin);
const app = host.install(consumer);
await Promise.all([provider.whenActive(), app.whenActive()]);
await host.dispose();
```

Each Plugin Activation owns a fresh revision-zero Kernel. The narrow
`KernelService` exposes revision-bound reads, synchronous Transactions, and
synchronous ordered Canvas Commit observation without exposing the underlying
`CanvasKernel` object.

Only successful Transactions with net changes are delivered. Reentrant
Transactions queue their Commits until every Observer has received the current
revision. Observer failures never roll back Kernel state or block other
Observers; they are reported through the current Host-scoped Fault Reporter
with the stable `nodebraid.plugin.kernel.observer.fault` event.

The package depends on the NodeBraid-owned seams from `@nodebraid/diagnostics`,
`@nodebraid/kernel`, and `@nodebraid/runtime-cordis`, not on `@nodebraid/core`. It does not
expose Cordis types.

## Development

Run package scripts from the monorepo root:

```bash
bun run --filter '@nodebraid/plugin-kernel' typecheck
bun run --filter '@nodebraid/plugin-kernel' test
bun run --filter '@nodebraid/plugin-kernel' build
bun run --filter '@nodebraid/plugin-kernel' build:dependencies
```

Typecheck and build first emit the Kernel and Runtime declarations needed for
package-name resolution, so neither command depends on stale local `dist`
artifacts.

## License

[MIT](./LICENSE)
