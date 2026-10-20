---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save to the temporary directory of the user's OS - not the current workspace.

Include a "suggested skills" section in the document, naming which skills the next agent should call the Skill tool for.

Do not duplicate content already captured in other artifacts (specs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

When Issue or PR discussions are involved, follow `docs/agents/discussion-workflow.md` and include:

- Related Issue/PR links and the last comments, reviews, or threads read (IDs/timestamps and reviewed commit).
- Unresolved questions or threads, confirmed conclusions, and links to their implementation and verification evidence.
- Replies still to send, who is expected to respond or re-review, and the authorized scope for continuing.

Link existing discussion records and artifacts rather than copying their contents.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.
