---
title: '@cflow/kernel'
description: CFlow's Renderer-independent graph Kernel, synchronous Transactions, and reversible Change Sets.
---

# `@cflow/kernel`

::: warning Package is not publicly released
This name identifies the current source module boundary; it does not mean the package can be installed from npm. Follow the [Quick Start](/en/guide/quick-start) to verify it from source.
:::

`@cflow/kernel` is the owner of CFlow's authoritative Document. It handles only Nodes, Edges, Endpoints, relationship indexes, and revisions; it knows nothing about the Plugin Host, Session, Renderer, or frontend frameworks.

::: info Current status
Implemented. The pure Kernel and Runtime adapter are already separate, and `@cflow/plugin-kernel` is implemented as well. “Separate” does not mean the Kernel Plugin is still a future plan.
:::

## The problem it solves

Canvas writes must satisfy three requirements at once: the graph structure must remain valid, an operation must either commit completely or roll back completely, and readers must never mix an old Snapshot with a new Query. `@cflow/kernel` concentrates these rules in one small, strict, synchronous transaction boundary.

## When to use it

- Manipulate a graph directly in tests, server-side tasks, or domain logic without starting a Plugin Host.
- Distinguish NodeId strictly from EdgeId and query incoming, outgoing, incident, and direct-child relationships.
- Obtain complete `before` and `after` Canvas Views and a Change Set from one commit.
- Replay a Change Set forward or backward through the same Transaction write path.
- Provide a stable Document seam to Runtime Plugins, History, Layout, or Renderer adapters.

## What it provides

- `createCanvasKernel()`: creates an empty revision-zero Kernel.
- `CanvasKernel`: the two top-level operations, `read()` and synchronous `transact()`.
- `CanvasNode`, `CanvasEdge`, `EdgeEndpoint`, `Point`, and `Size`: Renderer-independent graph values.
- `CanvasView`: an immutable `CanvasSnapshot` and `CanvasQuery` bound to the same committed revision.
- `TransactionContext`: strict Node and Edge `add`, `replace`, `remove`, and Change Set replay operations.
- `CanvasCommit` / `ChangeSet`: complete evidence for one net-change commit, including adjacent revisions and entity-level before/after values.
- `nodeId()` / `edgeId()`: constructors for non-empty strings at runtime that keep the two ID types distinct at compile time.
- `KernelError`: a failure type with stable `domain: 'kernel'` and structured code/details.

## Dependencies and composition

The only workspace dependency of `@cflow/kernel` is the leaf package `@cflow/diagnostics`, which supplies the shared structural error contract. It does not depend on `@cflow/core` or on any Runtime or Renderer package.

Inside a Canvas Runtime, do not pass a bare `CanvasKernel` around as a global object. [`@cflow/plugin-kernel`](/en/modules/plugin-kernel) wraps it in a narrow `KernelService` and owns Commit Observers and Activation lifecycle.

## Public entry points

```ts
import {
  createCanvasKernel,
  edgeId,
  KernelError,
  nodeId,
  type CanvasCommit,
  type CanvasKernel,
  type CanvasView,
  type ChangeSet,
  type TransactionContext,
} from '@cflow/kernel';
```

Minimal Transaction:

```ts
const kernel = createCanvasKernel();

const commit = kernel.transact((transaction) => {
  transaction.nodes.add({
    id: nodeId('task'),
    type: 'task',
    position: { x: 0, y: 0 },
    data: null,
  });
});

console.log(commit?.after.snapshot.revision); // 1
```

## State and lifecycle semantics

- A new Kernel's `read()` returns a stable revision-zero Canvas View. The root reference remains stable while no net-change commit occurs.
- `transact()` must complete synchronously. Async callbacks, nested Transactions, and use of a Transaction Context after its callback returns all fail explicitly.
- If the callback throws or the final graph is invalid, the Document and current Canvas View remain unchanged. An external callback error retains its original object and is not wrapped.
- A Transaction may pass through temporarily incomplete intermediate states; only the final graph is validated when the callback completes.
- No net change returns `null`. A net change increments the revision monotonically by exactly one and returns `before`, `after`, and a Change Set from that same commit.
- `applyChangeSet()` still executes inside a new Transaction. Replay preflights whether current entities match the source side; a conflict never partially overwrites current state.
- Snapshots, Query results, and CFlow-owned values are immutable and ordered by canonical ID. This ordering guarantees determinism only; it does not represent z-index.

The final graph must satisfy these rules: Node positions are finite numbers; optional sizes are finite and non-negative; every parent exists and parent relationships are acyclic; every Edge Endpoint references an existing Node.

## Limitations and non-goals

- Does not provide Plugin Installations, Runtime Services, Commit Observers, or resource disposal; those belong to `@cflow/plugin-kernel`.
- Does not provide asynchronous Transactions, concurrent merging, persistent revisions, or cross-process consistency.
- Does not cascade deletion to child Nodes or incident Edges automatically. The caller must preserve a valid final graph explicitly within the same Transaction.
- Does not interpret Port semantics or forbid self-loops. Upper domain capabilities decide those rules.
- Node and Edge `data` are not deep-copied, deep-frozen, or deep-compared; net changes use reference semantics.
- A Canvas Snapshot is not a Serialized Document, and a local revision is not a persistent schema version.

## Verification evidence

- [Public exports](https://github.com/ZWkang/cflow/blob/main/packages/kernel/src/index.ts) contain only the Kernel contract, ID helpers, and structural errors.
- [Kernel behavior tests](https://github.com/ZWkang/cflow/blob/main/packages/kernel/tests/index.test.ts) cover atomic commits, rollback, relationship queries, final-graph validation, net-zero Transactions, and Change Set replay.
- [Error and type tests](https://github.com/ZWkang/cflow/tree/main/packages/kernel/tests) verify stable error identity, readonly Views and Commits, and synchronous Transaction boundaries.
- ADR-0009 through ADR-0012 establish the pure Kernel, revision-bound Canvas View, Transaction replay, and opaque domain-data semantics.
