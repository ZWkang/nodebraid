# @nodebraid/plugin-history

> Documentation: [English](https://zwkang.github.io/nodebraid/en/modules/plugin-history) · [简体中文](https://zwkang.github.io/nodebraid/modules/plugin-history)

History Runtime Plugin for NodeBraid Canvas Runtime instances.

```ts
import { nodeId } from '@nodebraid/kernel';
import { commandPlugin, commandService, type CommandService } from '@nodebraid/plugin-command';
import { historyPlugin, historyService, undoCommand, type HistoryService } from '@nodebraid/plugin-history';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

let commands: CommandService | undefined;
let history: HistoryService | undefined;
let kernel: KernelService | undefined;
const consumer = definePlugin({
  requires: { commands: commandService, history: historyService, kernel: kernelService },
  setup(context) {
    commands = context.services.commands;
    history = context.services.history;
    kernel = context.services.kernel;
    const unsubscribe = history.subscribe(() => {
      console.log(history?.getSnapshot());
    });
    context.own(unsubscribe);
  },
});

const host = createPluginHost();
const installations = [
  host.install(kernelPlugin),
  host.install(commandPlugin),
  host.install(historyPlugin),
  host.install(consumer),
];
await Promise.all(installations.map((installation) => installation.whenActive()));
if (!commands || !history || !kernel) throw new Error('Expected History to activate.');

kernel.transact((transaction) => {
  transaction.nodes.add({
    id: nodeId('task'),
    type: 'task',
    position: { x: 0, y: 0 },
    data: null,
  });
});
const undoCommit = await commands.execute(undoCommand, undefined);
console.log(undoCommit.changeSet.revision);
await host.dispose();
```

Each Plugin Activation starts an empty History at the current Kernel revision.
Every later ordinary Canvas Commit becomes one History Entry. Undo and Redo
replay its Change Set through the same synchronous Kernel Transaction seam and
return the new Canvas Commit through strongly typed Commands.

`HistoryService` exposes only a stable `{ canUndo, canRedo }` Snapshot and a
subscription seam. It does not expose internal entries, stack depth, or duplicate
imperative undo and redo methods. New Recordable Commits clear redo, while
History's own Replay Commits do not create additional entries.

Replay and baseline Commands are single-flight. A concurrent invocation fails with `HISTORY_BUSY`,
and an invocation made before History observes the current Kernel revision fails
with `HISTORY_NOT_CAUGHT_UP`. Requests are never queued against a later stack
top. Subscriber publication waits until History has caught up with Kernel.
Subscriber failures are isolated through the Host-scoped Fault Reporter with
the stable `nodebraid.plugin.history.subscriber.fault` event and never change the
History Snapshot or block later subscribers.

The Plugin requires both Kernel Service and Command Service. Losing either
dependency ends the current Activation, closes old Service handles, removes the
Commands and discards all entries. A later Activation establishes a fresh empty
History Baseline.

## Establish a new baseline

`establishHistoryBaselineCommand` runs a synchronous Transaction callback and
establishes its result as a fresh History Baseline. It is suitable for replacing a
Document after the application has decoded a saved file:

```ts
import { establishHistoryBaselineCommand } from '@nodebraid/plugin-history';

await commands.execute(establishHistoryBaselineCommand, (transaction) => {
  for (const edge of kernel.read().snapshot.edges) transaction.edges.remove(edge.id);
  for (const node of kernel.read().snapshot.nodes) transaction.nodes.remove(node.id);
  for (const node of restoredDocument.nodes) transaction.nodes.add(node);
  for (const edge of restoredDocument.edges) transaction.edges.add(edge);
});
```

The Command returns the exact `CanvasCommit`, or `null` when the Document has no
net change. Both successful outcomes clear old Undo and Redo entries; the baseline
Commit itself is not recorded, while subsequent edits remain undoable. Callback
failure, invalid graphs and asynchronous callbacks preserve both the original
Document and History. An already aborted call is rejected before the callback runs.
The Command remains busy through Snapshot publication, including a net-zero update,
and ordinary reentrant Commits after its baseline are recorded normally.

Cancellation and dependency loss after a successful commit do not undo that commit
or turn it into a failed result. If the Activation ends before a queued baseline
Commit is observed, the Command still returns that exact commit without publishing
discarded History state. File formats, domain data codecs, Selection and Viewport
remain outside History's ownership.

## Development

Run package scripts from the monorepo root:

```bash
bun run --filter '@nodebraid/plugin-history' typecheck
bun run --filter '@nodebraid/plugin-history' test
bun run --filter '@nodebraid/plugin-history' build
bun run --filter '@nodebraid/plugin-history' build:dependencies
```

## License

[MIT](./LICENSE)
