# Issue and PR discussions

Use this workflow when a task references an Issue, PR, review comment, or linked discussion. The [tracker configuration](issue-tracker.md) defines GitHub as the source for new specs, live tasks and conversations; parent Issues hold specs, while local specs remain historical evidence. This supplements the [local subscription workflow](../../.agents/workflows/local-agent.md), which owns scheduling, eligibility, existing authorization, full checks, durable receipts, and managed PR thread resolution. Final approval and merge remain with the user.

## Read the conversation at work boundaries

Read the relevant discussion when starting or resuming work, before delivering a review, and before reporting completion. Refresh changes since the last read. Existing scheduled runs use the same read boundaries; this document does not introduce another polling job.

- **Issue:** read the current body, status, comments, and linked decisions affecting scope or acceptance criteria.
- **PR:** read the current description and head commit, linked Issue, general comments, submitted review summaries and states, and inline review threads with their replies and resolution state. Follow pagination for each surface; a general comment list alone does not establish that all review feedback was read.
- On the first read, establish the full relevant context. On later reads, include edited comments, changed bodies, new reviews, and changed thread states as well as new messages. An outdated inline location does not mean its concern is resolved.
- Keep source links or local anchors, the read time, and comment/review identifiers or update timestamps. For PRs, also record the head commit used for review and verification. Managed runs use the existing durable receipts; other tasks can use their notes or handoff.
- After fully reading a requirement/spec Issue and its linked parent/tasks, refresh their [local reading and archive copies](issue-tracker.md#local-reading-and-archive-copies). Do the same after an authorized change is read back. Keep full bodies and comments; local copies never replace the live read or become a second task tracker.
- If the PR head changes, inspect the new diff and reassess which findings and verification results still apply. Repeat affected checks before claiming the current revision is verified; retain the commit associated with earlier evidence.
- If a source cannot be read, report the failed operation and missing context. Continue independent work where possible, but do not report inaccessible feedback as absent or resolved.

## Turn discussion into decisions

For each actionable item, identify whether it clarifies requirements, reports a defect, requests an implementation change, suggests optional work, or asks a question. Record the disposition: accepted, needs clarification, declined with a reason, or deferred with a linked follow-up when one exists.

A suggestion is not automatically an accepted requirement. Use explicit agreements from the user or responsible maintainer, and preserve the source of each decision. Private chat authorization and its metadata stay in local workflow records; public Issues, PRs, comments and reports follow the [public writing rules](issue-tracker.md#public-issue-and-pr-writing) and record only the resulting functional scope, engineering decisions and verification evidence. For defects within approved scope, establish expected behavior from the approved contract and a reproduction without seeking repeated approval. If the body, spec, and comments disagree, expose the conflict and resolve the affected decision before implementing it; unrelated work can continue.

Within the requested scope, carry confirmed decisions into the owning spec or ticket's acceptance criteria and relevant tests. Record architectural decisions in the existing ADR workflow when applicable. Preserve conversation history and link the updated artifact. When the current task is review-only, or a skill forbids editing a parent Issue, report the needed update instead of changing that source.

## Handle feedback and reply with evidence

When asked to address feedback:

1. Read the full thread and check the claim against the current code and agreed requirements.
2. For accepted defects, reproduce the problem and add the appropriate regression test before fixing it. Apply other accepted changes with verification proportional to the change.
3. Record the result for each item: changed files or commit, verification command and actual result, or the reason for declining or deferring it. A local edit is not a published commit; a passing check is not reviewer acceptance.
4. Refresh the source thread and PR head before replying so an intervening reply, decision, or code change is not missed. Reply in the original thread where supported, or reference the exact source comment in an Issue reply. Explain what changed and how it was verified; for disagreement, give the rationale and evidence.
5. Keep implementation, verification, reply delivery, and review acceptance separate. After an authorized write, verify the resulting comment or thread state. If a write fails or its outcome is uncertain, inspect the source before retrying to avoid duplicate replies.

Use the authorization already present in the user's request or an authorized local workflow run. Reading or reviewing a discussion alone does not authorize posting comments, requesting another review, resolving threads, closing Issues, or merging PRs. When publication is outside the requested scope, prepare the concrete reply and mark it as unsent. Do not treat a code fix as permission to resolve a thread or dismiss a review.

Where re-review is needed, state who needs to review and what remains open. Perform an authorized re-review request after verification. Distinguish an author marking a thread resolved from the reviewer accepting the change; report the platform's actual review state.

## Parent specs and historical discussions

Record confirmed decisions in the parent spec Issue with links to their source discussions and approval comments. When a legacy local spec or ticket is referenced, read the entire file, including any `## Comments`, and preserve it as historical evidence. Do not update local specs or tickets as a parallel live requirements, task or conversation tracker. Keep unanswered questions visible in the source discussion and link them from the task's evidence.

## Review, handoff, and completion

Keep a concise per-item account of handled feedback, evidence, unsent replies, unresolved questions, and reviewers whose response is still needed. Link existing records instead of duplicating them. Carry the read checkpoint and reviewed head commit into handoff so the next session can refresh the conversation.

Before claiming the feedback is fully handled, account for every actionable item in scope and report remaining discussion or review work explicitly. Test success, a resolved thread, and an approved PR describe different facts. Only claim a reply, approval, close, or merge when its actual result has been observed.
