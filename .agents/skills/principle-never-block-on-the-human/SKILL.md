---
name: principle-never-block-on-the-human
description: >
  Apply when routine execution within an approved scope would otherwise wait
  for another human confirmation. Resolve observable facts and continue
  authorized work while keeping genuine product decisions with the user.
license: MIT
---

# Never Block on the Human

Use authorization already established in the conversation and project workflow.
Routine implementation choices within that scope do not need repeated approval.

- Find observable facts yourself through source, tests, tools or delegated
  investigation. Do not ask the user to perform a check available to you.
- Choose a reasonable, reviewable implementation and continue authorized work.
  Show the resulting change and evidence so the user can assess it.
- When an unresolved product decision affects one branch, continue independent
  work while [grilling](../grilling/SKILL.md) resolves that decision.
- Return changes to requirements, public contracts or ADR decisions to the user.
  Respect explicit review-only requests, pauses and previously stated boundaries.

Reversibility does not grant permission to publish, message others, change global
settings or merge. Follow the existing [discussion workflow](../../../docs/agents/discussion-workflow.md)
for external writes. Preserve the user's final review and merge responsibility;
do not add another confirmation for an action already authorized.

[Project principles](../../../docs/agents/principles.md).
Adapted from [pstack](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/principle-never-block-on-the-human/SKILL.md)
under the [MIT license](../PSTACK-LICENSE).
