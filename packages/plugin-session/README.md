# @nodebraid/plugin-session

> Documentation: [English](https://zwkang.github.io/nodebraid/en/modules/plugin-session) · [简体中文](https://zwkang.github.io/nodebraid/modules/plugin-session)

Session Runtime Plugin for NodeBraid Canvas Runtime instances.

```ts
import { kernelPlugin } from '@nodebraid/plugin-kernel';
import { sessionPlugin, sessionService } from '@nodebraid/plugin-session';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

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
`nodebraid.plugin.session.subscriber.fault` event. Disposing the Activation closes
old Service handles; restoring the Kernel dependency creates a new default
Session.

The pure Selection, Viewport, and Session Snapshot contracts come from
`@nodebraid/session-api`. The Runtime Plugin additionally depends on
`@nodebraid/diagnostics`, `@nodebraid/kernel`, `@nodebraid/plugin-kernel`, and the
NodeBraid-owned Plugin Host seam from `@nodebraid/runtime-cordis`. It does not depend
on Command, History, Renderer, or `@nodebraid/core`.

## Development

Run package scripts from the monorepo root:

```bash
bun run --filter '@nodebraid/plugin-session' typecheck
bun run --filter '@nodebraid/plugin-session' test
bun run --filter '@nodebraid/plugin-session' build
bun run --filter '@nodebraid/plugin-session' build:dependencies
```

## License

[MIT](./LICENSE)
