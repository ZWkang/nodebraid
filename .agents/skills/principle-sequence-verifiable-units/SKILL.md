---
name: principle-sequence-verifiable-units
description: >
  Apply when sequencing multi-step changes, migrations, commits or PRs.
  Choose coherent units with observable checks and validate prerequisites
  before building dependent work on them.
license: MIT
---

# Sequence Work into Verifiable Units

Organize work so a failure can be attributed to the unit that introduced it.

- Establish the actual baseline and dependency order. Preserve unrelated user
  changes; use the existing worktree and task preparation workflow when isolation
  is required.
- Choose each unit around a behavior or contract with an observable result, not
  an arbitrary file count. Reuse agreed public test seams.
- Check a completed unit before dependent work relies on it. Independent units
  may proceed in parallel with clear ownership.
- Keep the evidence in the order that explains the change: reproduction before
  fix, baseline before measurement, or caller migration before legacy removal.

A TDD regression is intentionally red before the fix; confirm its expected
failure rather than treating it as a completed green unit. An approved migration
may have explicit intermediate states under
[Outcome-Oriented Execution](../principle-outcome-oriented-execution/SKILL.md).
Neither exception makes an unverified or failing delivery ready. Final acceptance
still follows the existing workflow and the approved scope.

[Project principles](../../../docs/agents/principles.md).
Adapted from [pstack](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/principle-sequence-verifiable-units/SKILL.md)
under the [MIT license](../PSTACK-LICENSE).
