---
name: principle-foundational-thinking
description: Choose data structures, state ownership and prerequisite work when implementing a capability, especially when multiple actors can change shared state.
license: MIT
---

# Foundational Thinking

Shape the data around the actual reads, writes and invariants before spreading
coordination across callers.

- Trace the dominant access paths and reuse existing types and ownership. Prefer
  a shared model over repeated shape assumptions; similar statements alone do
  not justify an abstraction.
- Before sharing mutable state, identify its writers and what happens when they
  overlap. Use the owning module's existing isolation or coordination contract;
  make a missing ownership decision explicit.
- Sequence prerequisites that the confirmed work actually needs: a reproducing
  test before a fix, or shared declarations before dependent packages. Reuse
  existing CI and test infrastructure before creating more scaffold.
- Deliver a coherent increment that concentrates a rule in its owner instead
  of requiring special-case coordination in every caller.

**Project adaptation:** future flexibility does not justify unused infrastructure
or a new abstraction. Apply [Ponytail](../ponytail/SKILL.md) to find the smallest
complete increment. Remove obsolete structure in the affected scope when that
simplifies the work; unrelated cleanup is not a prerequisite.

**Check:** trace a representative read, write and relevant overlapping operation
through the proposed shape. Use the owning public seam to verify the invariant
and the observed failure or race that motivated the change.

[Project principles](../../../docs/agents/principles.md) ·
Source: [pstack](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/principle-foundational-thinking/SKILL.md) ·
[MIT license](../PSTACK-LICENSE)
