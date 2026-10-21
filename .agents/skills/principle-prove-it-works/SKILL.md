---
name: principle-prove-it-works
description: >
  Apply before claiming a task or capability is complete. Check the actual
  artifact and promised behavior at the relevant revision, then state the
  observed result and verification limits.
license: MIT
---

# Prove It Works

Match each completion claim to direct evidence of the promised result.

- Inspect the actual artifact, runtime value or externally visible behavior.
  A successful command, compiled module, ready page or subagent self-report proves
  only what was actually observed.
- Select the relevant existing check with [control-nodebraid](../control-nodebraid/SKILL.md).
  Browser interaction claims require real input and behavior assertions; a
  screenshot supplements those checks.
- Record the source revision or working-tree changes, command, result and relevant
  output. Use the existing task evidence record instead of creating a parallel log.
- Investigate failed checks, including whether the observation method was valid.
  Do not replace a failing check with a weaker proxy to declare success.
- Distinguish passed, failed and unrun checks. A local result is not evidence of
  remote publication or verification of a later head.

For a ready PR, follow the existing [PR evidence protocol](../../../docs/agents/pr-evidence.md):
actual publication and readback remain necessary. Targeted checks do not replace
the full checks required by the delivery workflow.

[Project principles](../../../docs/agents/principles.md).
Adapted from [pstack](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/principle-prove-it-works/SKILL.md)
under the [MIT license](../PSTACK-LICENSE).
