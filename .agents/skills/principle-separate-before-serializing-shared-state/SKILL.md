---
name: principle-separate-before-serializing-shared-state
description: >
  Apply when concurrent actors can mutate the same file, branch, key, or state
  object. Separate independent writes; enforce ordering structurally when one
  authoritative shared object is part of the contract.
license: MIT
---

# Separate Before Serializing Shared State

- Identify the actual writers, mutable object, and possible interleaving. Two
  workers updating different fields in one file still share a write target.
- If writers publish independent facts, give each an owned output and combine
  them when reading or reporting. Separate paths or worktrees only when they
  remove a real shared mutation; do not add storage or coordination speculatively.
- If the contract requires one shared object, reuse its ownership and ordering
  mechanism. Where none exists, choose the smallest appropriate transaction,
  queue, exclusive owner, or atomic update; prose conventions are not a lock.
- Verify the relevant competing or reentrant writes and their observable order.
  Check the invariant, not just that both actors eventually finish.

Each Kernel owns one authoritative Document under [CONTEXT.md](../../../CONTEXT.md);
do not split that authority to avoid synchronization. Session already linearizes
reentrant transitions through its queue under
[ADR-0022](../../../docs/adr/0022-linearize-session-transitions-breadth-first.md).
Preserve those semantics before proposing another lock or scheduler.

[Project principles](../../../docs/agents/principles.md).
Adapted from [pstack](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/principle-separate-before-serializing-shared-state/SKILL.md)
under the [MIT license](../PSTACK-LICENSE).
