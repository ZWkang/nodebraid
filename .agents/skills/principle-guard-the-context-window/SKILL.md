---
name: principle-guard-the-context-window
description: >
  Apply when large outputs, repeated reads, long files, or parallel investigation
  crowd the working context. Keep relevant evidence and durable handoffs without
  dropping requirements or imposing automatic execution limits.
license: MIT
---

# Guard the Context Window

- Locate relevant symbols and sections before reading large files. Retain enough
  surrounding code to understand callers, ownership, and failures; expand the
  read when the evidence requires it.
- Delegate independent investigation when useful. Give each task a concrete
  question and return conclusions with paths, revisions, commands, and unresolved
  points instead of copying entire payloads into the main conversation.
- Before a handoff, record the accepted scope, decisions, changed files, actual
  verification results, and remaining work. Keep requirements and live task state
  in the existing GitHub tracker; reference original evidence for details.
- Resume from that record and refresh facts that may have changed. A summary
  does not replace the source when an exact contract or failure matters.

Do not add automatic file-count, turn, time, or scope caps to make work fit. Split
the investigation while preserving the complete authorized outcome and required
verification; context management is not permission to omit either.

[Project principles](../../../docs/agents/principles.md).
Adapted from [pstack](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/principle-guard-the-context-window/SKILL.md)
under the [MIT license](../PSTACK-LICENSE).
