---
name: principle-explain-the-number
description: >
  Apply before reporting or acting on measured performance or evaluation results.
  Check what actually ran, explain the limiting factor, and preserve comparable
  runs and their variation with the claim.
license: MIT
---

# Explain the Number

Before claiming a speedup, regression, throughput improvement, or evaluation gain:

- Define the workload and observable result. Verify that each run performed the
  intended work; rule out errors, skipped work, caching differences, and unequal
  configuration before interpreting the difference.
- Use a profile or counters captured during execution to identify the limiting
  resource or code path, then connect it to source. A plausible explanation from
  reading code is a hypothesis, not a measured bottleneck.
- Preserve the command, revision, relevant environment, run count, variation, and
  limiting evidence with the result. Compare the same workload and settings; a
  local improvement cannot save more time than that part consumed end to end.
- For evaluations, inspect actual task completion and whether the difference
  persists across repeated trials. Scope the conclusion to the models and
  scenarios actually tested. State uncertainty when evidence cannot explain it.

Reuse existing measurements and checks before adding a benchmark. Ordinary test
pass counts do not require performance analysis; this principle applies when a
number supports a performance or evaluation conclusion.

[Project principles](../../../docs/agents/principles.md).
Adapted from [pstack](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/principle-explain-the-number/SKILL.md)
under the [MIT license](../PSTACK-LICENSE).
