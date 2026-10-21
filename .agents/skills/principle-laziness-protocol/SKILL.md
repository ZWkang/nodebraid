---
name: principle-laziness-protocol
description: >
  Apply when sizing a change, refactoring or considering new abstraction,
  configuration or layers. Prefer the smallest complete solution and one
  authority for each decision.
license: MIT
---

# Laziness Protocol

Apply [ponytail full](../ponytail/SKILL.md): understand the connected callers,
reuse the project's existing capability and finish the smallest sufficient change.

- Put each decision at one owner and pass its result instead of independently
  making the same choice throughout the call chain.
- Compare complete solutions, including affected callers, tests, examples and
  exports. A short patch that leaves callers broken is not a smaller solution.
- Prefer removal of proven redundant work over new abstractions, options or
  compatibility layers with no current consumer.
- Preserve required framework seams, validation, error handling and behavior
  specified by the approved requirement or ADR.

The review question is whether each added part solves a current need and whether
removing it would leave the complete contract intact. Line count alone cannot
answer either question.

[Project principles](../../../docs/agents/principles.md).
Adapted from [pstack](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/principle-laziness-protocol/SKILL.md)
under the [MIT license](../PSTACK-LICENSE).
