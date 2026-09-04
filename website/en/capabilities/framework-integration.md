---
title: Framework Integration
description: Connect NodeBraid Runtime lifecycles and stable Snapshots to UI frameworks while preserving Document and Renderer responsibilities.
---

# Framework Integration

A Framework Adapter sits between the application UI framework and a Canvas Runtime. It owns framework
lifecycle binding and readonly state projection without selecting a Renderer Provider, creating a
second source of Document authority, or absorbing product UI into the Runtime.

## Current capability

| Package                                                   | Current responsibility                                       |
| --------------------------------------------------------- | ------------------------------------------------------------ |
| [`@nodebraid/adapter-react`](/en/modules/adapter-react)   | Async Runtime mount, Strict Mode, race cancellation, dispose |
| [`@nodebraid/plugin-kernel`](/en/modules/plugin-kernel)   | Stable Canvas View reads and Commit subscription             |
| [`@nodebraid/plugin-session`](/en/modules/plugin-session) | Stable Selection/Viewport Snapshot and subscription          |
| [`@nodebraid/plugin-history`](/en/modules/plugin-history) | Stable Undo/Redo availability Snapshot and subscription      |

The React Adapter receives a concrete Target through a callback ref and binds the
application-provided Runtime Factory to `pending`, `ready`, and `failed` states. The Kernel, Session,
and History Hooks only project existing stable values with `useSyncExternalStore`; all writes continue
through the established Command, Session, and Kernel seams.

## Lifecycle principles

- A Target or Factory identity change creates a new Runtime Mount Generation;
- the old generation immediately loses publication eligibility, while a late Runtime must still be disposed;
- the next Factory waits for the old Factory and asynchronous disposal, respecting Renderer Target Reservation;
- create/dispose Failures retain their original identity and reach the required Reporter;
- resource acquisition stops after a dispose Failure rather than assuming a dirty Target was released;
- React component unmount does not return an awaitable Promise; exactly-once ownership and strict ordering provide determinism.
- the callback ref accepts one live Target at a time, and an abandoned concurrent render cannot replace the current Failure Reporter;
- v0 supports React 19 client rendering only and does not guess an SSR hydration Snapshot.

## Explicit boundaries

There is currently no Provider, Context, selector, React Node Component, Renderer JSX, toolbar, panel,
minimap, controlled Document, write proxy, Tool Registry, Serialization, Persistence, or Vue Adapter.
None of those capabilities follows from the existence of a React package; each requires a real consumer
and an independently designed seam.

The Basic SVG Example is the current real consumer. Package public-seam and Example Chromium tests
together verify pending races, Strict Mode, mount/unmount/remount, Snapshot updates, error exposure, and
cleanup.
