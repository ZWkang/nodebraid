---
title: Execution & History
description: Express behavior through strongly typed Commands and make committed Document changes undoable through History.
---

# Execution & History

The Execution & History capability family separates "initiating an action" from "recording a Document change that has already been committed." Command provides a strongly typed, cancellable execution entry point governed by the Activation lifecycle. History observes only Canvas Commits that the Kernel has already accepted, then exposes Undo and Redo through the same Command seam.

This separation avoids two common problems: the Command Service does not become a hidden service locator, and History does not bypass the Kernel to maintain a second writable Document.

## Problems it solves

- Provide one Promise-returning execution seam for synchronous and asynchronous actions;
- Let a Command token carry its input type, output type, and runtime identity together;
- Let Feature Plugins explicitly declare Kernel, Session, or external dependencies;
- Build reversible History Entries from real Canvas Commits rather than button clicks or Command names;
- Preserve explicit lifecycle outcomes during cancellation, reentrancy, dependency loss, and Host cleanup.

## When to use it

- You want to expose an application action as a reusable, cancellable, strongly typed Command;
- You want UI controls, keyboard shortcuts, or Interaction to execute an action through the same entry point;
- You want Undo/Redo for Document Commits and a stable availability Snapshot;
- You need History to cover both direct Transactions and Command-originated Transactions naturally.

If a change remains local to one piece of code and does not need its own action identity, use a Kernel Transaction directly. Session, Viewport, Renderer state, and external side effects are outside the current History scope.

## What it provides

| Role             | Package                                               | What it delivers                                                                                                  |
| ---------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Action execution | [`@cflow/plugin-command`](/en/modules/plugin-command) | Command definition, Activation-scoped registration and execution, cooperative cancellation, and in-flight cleanup |
| Document History | [`@cflow/plugin-history`](/en/modules/plugin-history) | Commit recording, Undo/Redo Commands, stable History Snapshots, and single-flight Replay                          |

A typical flow looks like this:

```text
Feature Plugin ──register──▶ Command Service
      │                         │ execute
      │ declared services       ▼
      └────────────────────▶ handler ──Transaction──▶ Kernel Commit
                                                       │ observe
                                                       ▼
                                                  History Entry
                                                       │ undo / redo
                                                       └──Transaction──▶ new Kernel Commit
```

History records Change Sets, not Commands. A Commit without Command metadata can still be recorded. A normal Commit that carries diagnostic metadata such as `origin: 'history'` is not therefore mistaken for a Replay.

## Dependencies and composition

The Runtime composition of `commandPlugin` depends only on the CFlow Plugin Host seam and uses Diagnostics for structured errors. It provides `CommandService` and does not depend on Kernel, Session, History, or `@cflow/core`.

`historyPlugin` statically requires `KernelService` and `CommandService`, and provides `HistoryService`. If either Required Service is missing, its Plugin Installation remains pending. `whenActive()` finishes waiting only after the dependencies are available and the Commands have been registered.

An application's Feature Plugin obtains the Runtime Services it needs through `requires` and uses them inside the Command handler closure. The Command Service does not look up dependencies dynamically.

## Public entry points

- [`@cflow/plugin-command`](/en/modules/plugin-command): define and host any strongly typed action;
- [`@cflow/plugin-history`](/en/modules/plugin-history): provide Document Undo/Redo for Kernel Commits;
- `@cflow/core`: re-exports the public seams of both packages, while internal packages still depend directly on the capability they own.

The CFlow packages are not publicly published under this project's identity. Follow the source-based [Quick Start](/en/guide/quick-start) to verify them, and do not install similarly named packages from npm that belong to another project.

## Lifecycle and error semantics

- Every Command Activation starts with an empty registry; every History Activation establishes an empty History Baseline at the current Kernel revision;
- Caller cancellation aborts only that handler's signal; the handler still determines its final outcome explicitly;
- Disposing a Command Registration removes it from lookup immediately, then cancels and waits for handlers that already started. Its token and diagnostic ID remain reserved while disposal is waiting;
- History Replay does not inherit the Command Service's concurrency capacity: overlapping Replay calls and calls made before History has caught up with the Kernel fail explicitly instead of being queued against future state;
- Losing a Required Service ends the relevant Activation. Old Service handles fail explicitly, and dependency recovery creates a new Activation;
- `host.dispose()` waits for these Owned Resources to finish cleanup. If a handler ignores cancellation and never settles, the cleanup Promise does not manufacture success or bypass it with a hidden timeout.

## Limitations and non-goals

- No middleware, permissions, Command queue, retries, deduplication, or global Command Registry;
- No History grouping, time-based merging, selective undo, branching tree, or rollback to an old revision;
- No History persistence or synchronization, CRDT support, or collaborative Undo;
- No undo for Session, Selection, Viewport, Renderer state, or external side effects;
- No complete editor, default Canvas Composition, or UI adapter.

## Verification evidence

Command tests use the real Plugin Host to verify token identity, input and output types, asynchronous results, original handler errors, caller cancellation, Registration disposal, Activation waiting, Provider reinstallation, and Host cleanup. History tests compose the real Kernel, Command, and History Plugins to verify Baselines, Undo/Redo, branch invalidation, Snapshot publication, subscriber faults, reentrant Commits, single-flight Replay, cancellation, Required Service loss, and reactivation.
