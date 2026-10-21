---
name: principle-experience-first
description: Evaluate product, interaction, interface and feature-scope tradeoffs from the experience of end users, library callers and maintainers.
license: MIT
---

# Experience First

Identify who consumes the result and the workflow they need to complete. For
NodeBraid, this includes Canvas users, developers composing a Canvas Runtime and
maintainers tracing its behavior.

- Explain a proposed option through its effect on that workflow: required
  concepts, steps, feedback, recoverability and diagnosis of failures.
- Prefer a coherent core experience over speculative controls or options. Within
  the agreed scope, polish the details that affect use, including interaction
  feedback, alignment, transitions and error states.
- Let implementation convenience inform cost, but do not substitute it for the
  user's outcome. Make a scope tradeoff visible when the two conflict.
- Use [design exploration](../principle-exhaust-the-design-space/SKILL.md) when
  experience cannot be judged from the existing behavior or caller examples.

**Project adaptation:** experience does not authorize dropping agreed behavior,
concealing failures or turning an Interactive Example into a product editor.
A library's clear contract and actionable errors are part of its experience.

**Check:** use a representative caller example or the relevant real interaction
from [Control NodeBraid](../control-nodebraid/SKILL.md). Describe what the consumer
can now do or understand, and the evidence for that claim.

[Project principles](../../../docs/agents/principles.md) ·
Source: [pstack](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/principle-experience-first/SKILL.md) ·
[MIT license](../PSTACK-LICENSE)
