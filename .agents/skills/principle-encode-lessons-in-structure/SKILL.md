---
name: principle-encode-lessons-in-structure
description: >
  Apply when a demonstrated mistake or correction recurs. Prefer an existing
  type, invariant, test or tool that can enforce the lesson over another copy
  of the same instruction.
license: MIT
---

# Encode Lessons in Structure

Use repeated failures to improve the mechanism that permits them.

- Identify the actual recurring failure and the invariant that would prevent it.
  Check whether a current type, test or workflow already enforces it, and why that
  enforcement failed or was bypassed.
- Put an enforceable rule at its owner: a domain representation, boundary check,
  existing lint rule, regression test or workflow check. Prefer extending the
  existing mechanism over adding another layer.
- Verify that the failing case is rejected and legitimate cases still work.
- If the lesson requires judgment, keep one authoritative instruction with a
  concrete failure example and link to it from relevant entry points. Remove
  duplicate reminders when the structural fix replaces their purpose.

A past mistake alone does not justify a universal blocker, arbitrary cap or
fallback. Preserve legitimate states, approved scope and error visibility. A
principle document explains choices that need judgment; it cannot replace an
executable invariant that the project actually needs.

[Project principles](../../../docs/agents/principles.md).
Adapted from [pstack](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/principle-encode-lessons-in-structure/SKILL.md)
under the [MIT license](../PSTACK-LICENSE).
