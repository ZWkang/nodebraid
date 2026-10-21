---
name: principle-redesign-from-first-principles
description: Assess how a new requirement fits an existing design when a local patch would spread exceptions, duplicate ownership or contradict the original assumptions.
license: MIT
---

# Redesign From First Principles

Read the affected design and callers, then ask what the design would look like
if the new requirement had been known from the start. Use that comparison to find
the right place for the change.

- Identify which assumption changed and which existing contracts remain valid.
- Compare the proposed patch with a coherent design under the new requirement.
  Look for duplicated rules or caller coordination that the owner could absorb.
- Implement the smallest complete change that achieves that coherence. Trace its
  consequences through types, consumers, tests, examples and current explanatory
  documents; deliver substantial changes in coherent increments.
- When the requirement contradicts an approved contract or ADR, identify that
  conflict through the existing [domain documentation workflow](../../../docs/agents/domain.md)
  before changing the decision.

**Project adaptation:** redesign is an analysis method, not permission to rewrite
the system. A local change that already fits the confirmed design is sufficient.
Do not manufacture a refactor to make the implementation resemble a fresh build.

**Check:** explain the changed assumption, the owning module and the affected
references. Verify the new behavior and preserved contracts at their public seams;
search callers and documentation for obsolete assumptions left by the change.

[Project principles](../../../docs/agents/principles.md) ·
Source: [pstack](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/principle-redesign-from-first-principles/SKILL.md) ·
[MIT license](../PSTACK-LICENSE)
