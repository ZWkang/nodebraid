---
name: principle-model-the-domain
description: Express domain invariants in data structures when stateful logic, synchronized flags or repeated shape assumptions spread across branches and files.
license: MIT
---

# Model the Domain

Start from the terms and ownership in [CONTEXT.md](../../../CONTEXT.md) and the
relevant ADRs. Identify the invalid state or repeated rule the model should remove.

- Choose a structure that fits the actual invariant and access pattern: a
  discriminated union or state machine for lifecycle states, a lookup for repeated
  dispatch, or a normalized collection for shared entities.
- Gather one body of domain knowledge in its owner. Execution phases such as
  loading, validating and saving do not by themselves define separate owners.
- Prefer a model that removes duplicated rules, impossible combinations or
  lifecycle ambiguity. Keep clear local code when an abstraction would only add
  indirection.
- Use [Domain Modeling](../domain-modeling/SKILL.md) when the change resolves new
  terminology or ownership; do not create a competing glossary.

**Project adaptation:** a static type does not establish that a runtime value
satisfies its contract. Preserve the validation assigned to each owner, including
the responsibilities in
[ADR-0026](../../../docs/adr/0026-validate-layout-contracts-at-their-ownership-boundaries.md)
when working on Layout.

**Check:** show which previously possible invalid combination or duplicated rule
the structure removes. Exercise the relevant transitions and runtime input through
the existing public seam; a renamed type alone is not evidence of a better model.

[Project principles](../../../docs/agents/principles.md) ·
Source: [pstack](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/principle-model-the-domain/SKILL.md) ·
[MIT license](../PSTACK-LICENSE)
