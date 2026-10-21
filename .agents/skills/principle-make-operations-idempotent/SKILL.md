---
name: principle-make-operations-idempotent
description: >
  Apply to lifecycle operations and resumable commands whose contract requires
  safe repetition after retries or interruption. Verify repeated execution and
  partial progress without changing intentionally repeatable business effects.
license: MIT
---

# Make Operations Idempotent

- Establish the operation's contract first: which repeated calls denote the same
  operation, and which are new user actions? A second Duplicate Selection command
  can intentionally create another copy; it is not a retry to suppress.
- For resumable work, inspect current state and reconcile only the remaining
  difference. Identify stale temporary files, claims, or locks using evidence
  valid after interruption, rather than assuming the previous run finished.
- Exercise repetition and interruption at meaningful mutation boundaries through
  existing public seams. Show that successful retries converge without duplicate
  effects and that failures preserve the information needed to diagnose them.
- Preserve terminal lifecycle semantics. Repeated `dispose()` calls reuse the
  promised outcome; idempotence does not authorize retrying failed cleanup,
  clearing a reservation, or reporting success after an error.

For SVG Renderer cleanup, [ADR-0056](../../../docs/adr/0056-retain-svg-target-reservation-through-cleanup.md)
requires the same dispose Promise and retention of the Target Reservation until
cleanup succeeds. Follow that contract rather than adding generic recovery.

[Project principles](../../../docs/agents/principles.md).
Adapted from [pstack](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/principle-make-operations-idempotent/SKILL.md)
under the [MIT license](../PSTACK-LICENSE).
