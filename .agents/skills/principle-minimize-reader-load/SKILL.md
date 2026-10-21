---
name: principle-minimize-reader-load
description: Reduce unnecessary indirection and hidden mutable context when code is difficult to trace or a change proposes another layer or state holder.
license: MIT
---

# Minimize Reader Load

Evaluate both the layers a reader must trace and the state they must remember.
A flat file with hidden state can be as hard to understand as a stack of wrappers.

- Trace where a value originates and who can change it. Name its invariant at
  the owning interface instead of repeating it in consumers.
- Examine pass-through layers using the
  [Codebase Design deletion test](../codebase-design/SKILL.md): would deletion
  remove complexity, or merely push it into callers?
- Collapse indirection that adds no meaningful ownership, contract or hidden
  decision. Prefer interfaces that let callers avoid learning the implementation.
- Shrink mutable scope and derive values when synchronization is unnecessary.
  Before adding state or a layer, identify which reader burden it removes.

**Project adaptation:** a single caller or implementation is evidence to inspect,
not a deletion rule. Preserve confirmed public seams, lifecycle ownership and
ADR responsibilities. Ease of tracing is a qualitative review, not a timed gate.

**Check:** compare the actual caller path and state writers before and after the
change. The explanation should become easier without moving required coordination
or validation into each consumer; verify behavior through the same public seam.

[Project principles](../../../docs/agents/principles.md) ·
Source: [pstack](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/principle-minimize-reader-load/SKILL.md) ·
[MIT license](../PSTACK-LICENSE)
