---
name: principle-migrate-callers-then-delete-legacy-apis
description: >
  Apply during an approved internal API replacement when all consumers can
  migrate together. Update callers and remove the obsolete API without treating
  repository-local usage as proof that a public contract has no consumers.
license: MIT
---

# Migrate Callers Then Delete Legacy APIs

- Trace callers, exports, tests, examples, and documentation before replacing an
  API. A public package export or Provider contract can have consumers outside
  this repository; an empty local search is not evidence that deletion is safe.
- When the accepted scope permits coordinated migration, update all affected
  callers and their contract tests, then remove the obsolete internal entrypoint
  in the same change. Avoid compatibility wrappers that serve no actual consumer.
- Keep tests for behavior that remains promised. Remove a test only when it
  protects an obsolete implementation detail or a contract explicitly replaced
  by the approved migration, not merely because it fails after the refactor.
- Verify the migrated public seams and check that the old internal entrypoint has
  no remaining references. Retain necessary compatibility when it is part of the
  existing public contract.

Changing a public API, accepted spec, or ADR requires the corresponding design
decision. This principle does not authorize deletion or breaking changes beyond
the agreed scope.

[Project principles](../../../docs/agents/principles.md).
Adapted from [pstack](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md)
under the [MIT license](../PSTACK-LICENSE).
