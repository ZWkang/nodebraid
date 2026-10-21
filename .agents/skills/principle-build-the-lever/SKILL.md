---
name: principle-build-the-lever
description: >
  Apply when non-trivial edits, migrations, analysis or verification need a
  reproducible method. Reuse or build the smallest tool that makes the work
  repeatable and inspectable.
license: MIT
---

# Build the Lever

Make the method reproducible when that materially improves execution or review.
An existing command, query, test or script can already be the right tool.

- Inspect existing tools before creating one. For NodeBraid behavior verification,
  start with [control-nodebraid](../control-nodebraid/SKILL.md).
- For a repeated transformation, work through a representative case, automate the
  established rule, and compare the tool's output with the independently understood
  result. Account for partial completion and reruns where relevant.
- Prefer one deterministic pass over delegates manually applying the same edit.
  Delegate independent investigation or judgment where automation cannot decide.
- Keep the executable command, its inputs and actual result available through the
  task's existing evidence record. Preserve a new tool when future verification
  needs it; do not commit generated output or scratch diagnostics by default.

Do not create a file solely to claim this principle was applied. A small direct
edit with a sufficient existing check needs no generator. The tool must reduce
work or improve verifiability; it must not become another framework to maintain.

[Project principles](../../../docs/agents/principles.md).
Adapted from [pstack](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/principle-build-the-lever/SKILL.md)
under the [MIT license](../PSTACK-LICENSE).
