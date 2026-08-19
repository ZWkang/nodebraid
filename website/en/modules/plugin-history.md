---
title: '@cflow/plugin-history'
description: Build Activation-scoped Document History from Kernel Commits and execute Undo/Redo through Commands.
---

# `@cflow/plugin-history`

::: warning Package is not publicly released
This name describes the current source-module boundary; it does not mean the package can be installed from npm. Follow the source-based [Quick Start](/en/guide/quick-start) to verify it.
:::

## Problems it solves

The Kernel can already commit and reverse-apply Change Sets atomically, but it does not decide which changes enter History, when Redo becomes invalid, or how UI can read Undo/Redo availability. `@cflow/plugin-history` observes Canvas Commits at the Runtime layer, builds History Entries for the current Activation, and executes Replay through the existing Command Service.

History does not copy the Document or restore an old revision. Undo and Redo are both new Kernel Transactions, so revisions keep increasing monotonically and every Kernel validation and Commit observer remains active.

## When to use it

- You want standard Undo/Redo for Document Node and Edge changes;
- You want direct Transactions and Command-originated Transactions to follow the same recording rules;
- A UI adapter needs to subscribe to a stable `{ canUndo, canRedo }` value;
- You need explicit outcomes during reentrant Commits, concurrent Replay, or Required Service changes.

This module is not suitable for undoing Selection, Viewport, Renderer state, external network requests, or collaborative CRDT operations.

## What it provides

- `historyPlugin`: observes Kernel Commits and owns independent undo/redo entries for each Activation;
- `historyService`: provides a stable `HistorySnapshot` and future-change subscription;
- `undoCommand` / `redoCommand`: take `void` as input and return the actual Replay `CanvasCommit`;
- A new recordable Commit automatically clears redo;
- Replay Commits do not generate new History Entries;
- Single-flight Replay and Kernel catch-up protection;
- `HistoryError` and subscriber-fault diagnostics.

A History Entry stores only the source Commit's Change Set. `origin` and `commandId` are diagnostic metadata and do not decide whether a normal Commit is recordable.

## Dependencies and composition

`historyPlugin` statically requires [`KernelService`](/en/modules/plugin-kernel) and [`CommandService`](/en/modules/plugin-command), and provides one `HistoryService`. A typical Canvas Runtime explicitly installs all three Providers:

```ts
import { commandPlugin } from '@cflow/plugin-command';
import { historyPlugin } from '@cflow/plugin-history';
import { kernelPlugin } from '@cflow/plugin-kernel';
import { createPluginHost } from '@cflow/runtime-cordis';

const host = createPluginHost();
const installations = [host.install(kernelPlugin), host.install(commandPlugin), host.install(historyPlugin)];

await Promise.all(installations.map((installation) => installation.whenActive()));

try {
  // A Consumer Plugin reads the Snapshot through Required Services and executes undoCommand / redoCommand.
} finally {
  await host.dispose();
}
```

The History Installation remains pending when either Kernel or Command Service is absent. It does not create missing dependencies behind the application's back, and there is no default Canvas Composition.

## Public entry points

```ts
import {
  historyDiagnosticEvents,
  historyPlugin,
  historyService,
  redoCommand,
  undoCommand,
  HistoryError,
  type HistoryErrorCode,
  type HistoryService,
  type HistorySnapshot,
} from '@cflow/plugin-history';
```

These entry points are also re-exported by `@cflow/core`.

## Lifecycle and error semantics

When an Activation begins, History reads the current Kernel revision once as its Baseline. Commits before that Baseline are not guessed or backfilled. The public Snapshot is replaced and subscribers are notified only after History has observed the Kernel's current revision, so subscribers never see Undo/Redo availability that is known to be stale.

Replay starts only when History has caught up with the Kernel and no other Replay is active. Requests are not queued: delayed execution could act on a different top-of-stack entry, so the module fails explicitly instead. The caller signal is checked before the Transaction. Once Replay has actually committed, late cancellation neither manufactures a failure nor compensates for the Commit that already happened.

Losing Kernel or Command Service ends the current Activation immediately: the old Service becomes invalid, Commands are unregistered, Kernel observers and subscribers are released, and Entry references are cleared. When the dependencies return, a new Activation establishes a fresh, empty Baseline at the Kernel revision at that moment; it does not inherit the old stacks. `host.dispose()` waits for Command registrations and other Owned Resources to finish cleanup.

| Code                    | Trigger                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `UNDO_EMPTY`            | No History Entry is currently available to undo             |
| `REDO_EMPTY`            | No History Entry is currently available to redo             |
| `HISTORY_BUSY`          | Another Replay has not finished                             |
| `HISTORY_NOT_CAUGHT_UP` | History has not yet observed the Kernel's current revision  |
| `SERVICE_DISPOSED`      | The Activation that owned the old History Service has ended |

Kernel Replay errors preserve their original identity and are not wrapped as History success. Subscriber errors are reported to Host-scoped diagnostics through `cflow.plugin.history.subscriber.fault`; they do not block later subscribers or change the Snapshot.

## Limitations and non-goals

- Does not expose History Entries, stack depth, labels, timestamps, or a jump interface;
- No grouping, merge window, selective undo, or branching timeline;
- No History persistence, serialization, hydration, or migration across Activations;
- No collaborative Undo, CRDT support, or remote Commit authority;
- Does not record net-zero or failed Transactions because they produce no Canvas Commit;
- Does not undo Session, Selection, Viewport, Renderer state, or external side effects.

## Verification evidence

Package tests compose the real Plugin Host, Kernel Plugin, and Command Plugin to verify a nonzero Baseline, the first recordable Commit, Undo/Redo return values, revision metadata, Redo branch invalidation, empty-stack errors, Snapshot identity, subscriber faults, observer reentrancy, catch-up publication, single-flight Replay, cancellation, finalization of committed Replay, Kernel/Command Provider loss, and a fresh Activation. Type tests lock down readonly Snapshots, the narrow Service surface, and the `void -> CanvasCommit` Command types.
