---
name: principle-outcome-oriented-execution
description: >
  Apply during approved rewrites or migrations with explicit phase boundaries.
  Reach the verified target architecture without unnecessary transitional code,
  while keeping temporary breakage scoped, reversible, and visible.
license: MIT
---

# Outcome-Oriented Execution

- Work from the accepted target, public contracts, and verification boundaries.
  Identify which intermediate states may temporarily fail and keep those states
  within the isolated migration work; preserve required integration checkpoints.
- Migrate the complete affected slice instead of accumulating temporary adapters
  solely to keep every edit green. Keep compatibility that real consumers or the
  accepted contract still require.
- Continue relevant static and runtime checks during migration. Explain failures
  against the planned intermediate state; do not dismiss an unrelated failure
  merely because the migration is unfinished.
- At the completion boundary, run the checks required for the whole changed
  scope and project delivery. Intermediate breakage is not a completed task,
  passing verification, or a ready PR.

Use this only for a planned migration, not to turn a narrow fix into a rewrite.
New requirements, public contracts, or architectural decisions return to design
discussion; implementation choices inside the approved scope can proceed.

[Project principles](../../../docs/agents/principles.md).
Adapted from [pstack](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/principle-outcome-oriented-execution/SKILL.md)
under the [MIT license](../PSTACK-LICENSE).
