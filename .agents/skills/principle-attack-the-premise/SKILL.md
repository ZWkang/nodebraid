---
name: principle-attack-the-premise
description: >
  Apply when two or more fixes relying on the same premise fail the same
  acceptance check. Test that premise before attempting another such fix.
license: MIT
---

# Attack the Premise

Repeated failure can challenge the assumption shared by the fixes, not just the
implementation of each fix.

- State the shared premise in one sentence and identify the failed check.
- Find an observation that distinguishes the premise from an alternative, then
  make that observation before another fix. Inspect the distribution of failures,
  not only their size.
- Record what the observation supports, contradicts or leaves unresolved. If it
  contradicts the premise, follow the evidence to the cause. If it supports the
  premise, continue tracing the [root cause](../principle-fix-root-causes/SKILL.md).
- Reuse a rerunnable test or diagnostic through [Build the Lever](../principle-build-the-lever/SKILL.md).
  A new retry, clamp or cleanup mechanism is not evidence for the premise.

For example, repeated coordinate adjustments that fail the same drag scenario
call for checking which coordinate spaces the input and target use before
changing the formula again. This debugging trigger does not reopen an approved
requirement without contradictory evidence.

[Project principles](../../../docs/agents/principles.md).
Adapted from [pstack](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/principle-attack-the-premise/SKILL.md)
under the [MIT license](../PSTACK-LICENSE).
