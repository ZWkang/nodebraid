# @cflow/plugin-session

> Documentation: [English](https://zwkang.github.io/cflow/en/modules/plugin-session) · [简体中文](https://zwkang.github.io/cflow/modules/plugin-session)

Session Runtime Plugin for CFlow Canvas Runtime instances.

```ts
import { kernelPlugin } from '@cflow/plugin-kernel';
import { sessionPlugin, sessionService } from '@cflow/plugin-session';
import { createPluginHost, definePlugin } from '@cflow/runtime-cordis';

const consumer = definePlugin({
  requires: { session: sessionService },
  setup(context) {
    const unsubscribe = context.services.session.subscribe(() => {
      console.log(context.services.session.getSnapshot());
    });
    context.own(unsubscribe);
  },
});

const host = createPluginHost();
const installations = [host.install(kernelPlugin), host.install(sessionPlugin), host.install(consumer)];
await Promise.all(installations.map((installation) => installation.whenActive()));
await host.dispose();
```

Each Plugin Activation owns a fresh Session with an empty Selection and a
`{ x: 0, y: 0, zoom: 1 }` Viewport. Selection contains only Node and Edge IDs
accepted from the current Kernel View; Kernel Commits reconcile removed
entities through the Session transition queue without creating another Kernel
Change Set or entering History.

`SessionService` exposes stable immutable Snapshots and synchronous Selection
and Viewport replacement. Equivalent inputs preserve Snapshot identity and do
not notify. Reentrant changes are delivered through a breadth-first FIFO queue
so every subscriber observes one consistent Snapshot per notification round.

Session subscriber failures are isolated and reported through the current
Host-scoped Fault Reporter with the stable
`cflow.plugin.session.subscriber.fault` event. Disposing the Activation closes
old Service handles; restoring the Kernel dependency creates a new default
Session.

The pure Selection, Viewport, and Session Snapshot contracts come from
`@cflow/session-api`. The Runtime Plugin additionally depends on
`@cflow/diagnostics`, `@cflow/kernel`, `@cflow/plugin-kernel`, and the
CFlow-owned Plugin Host seam from `@cflow/runtime-cordis`. It does not depend
on Command, History, Renderer, or `@cflow/core`.

## Development

Run package scripts from the monorepo root:

```bash
bun run --filter '@cflow/plugin-session' typecheck
bun run --filter '@cflow/plugin-session' test
bun run --filter '@cflow/plugin-session' build
bun run --filter '@cflow/plugin-session' build:dependencies
```

## License

[MIT](./LICENSE)
