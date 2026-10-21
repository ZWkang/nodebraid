---
name: principle-exhaust-the-design-space
description: Compare alternatives when a novel interaction or architectural decision has no established precedent, or when user experience depends on behavior that cannot be judged from a static design.
license: MIT
---

# Exhaust the Design Space

Make the uncertain decision explicit: what must the alternatives preserve, and
what observation would distinguish them?

- Look for an existing project solution before exploring a new design.
- Compare meaningfully different alternatives against the same constraints.
  For an interface decision, types, caller examples, invariants and failure modes
  may provide enough evidence; use [Codebase Design](../codebase-design/SKILL.md)
  to compare depth, locality and seam placement.
- Build a disposable interactive prototype when feel or actual interaction is
  the unresolved question. Keep it limited to that question and exercise the
  same scenario in each alternative.
- Record which observation supports the choice and which tradeoff remains.
  Stop exploring when the evidence resolves the decision.

**Project adaptation:** prototype count is not an acceptance criterion. Routine
fixes and established patterns do not need competing implementations. Exploration
does not reopen an approved contract or authorize a production rewrite.

**Check:** can the choice be traced to a caller example, observed interaction or
stated constraint, rather than whichever option was implemented first?

[Project principles](../../../docs/agents/principles.md) ·
Source: [pstack](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/principle-exhaust-the-design-space/SKILL.md) ·
[MIT license](../PSTACK-LICENSE)
