---
name: principle-subtract-before-you-add
description: Look for obsolete or duplicated structure in the affected scope before adding a capability, refactoring a module or extending engineering instructions.
license: MIT
---

# Subtract Before You Add

Before constructing more, check whether removing an obsolete assumption or
duplicated mechanism would solve the same problem.

- Trace callers, exports and stated contracts before labeling code dead or
  validation redundant. Remove only what no longer owns a required responsibility.
- When a removal simplifies the same change, perform it before building on that
  area. Keep the resulting interface as small as the observed use and confirmed
  requirements allow.
- Avoid speculative options, parsers and guards. Retain the checks that enforce
  a documented invariant, trust boundary or real failure mode.
- Simplify instructions by removing repeated guidance and empty references;
  preserve unique decisions, evidence and useful navigation.

**Project adaptation:** subtraction is a design preference, not a mandatory cleanup
phase. [Ponytail](../ponytail/SKILL.md) still requires a complete change and retained
error handling. A validation performed by a different owner is not redundant just
because its inputs are typed. Unrelated cleanup stays outside the task.

**Check:** point to the callers or contract showing why the removed responsibility
is obsolete or still covered. Verify preserved behavior through its existing seam
and check that references to removed code or guidance have been updated.

[Project principles](../../../docs/agents/principles.md) ·
Source: [pstack](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/principle-subtract-before-you-add/SKILL.md) ·
[MIT license](../PSTACK-LICENSE)
