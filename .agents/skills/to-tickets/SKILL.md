---
name: to-tickets
description: Break an approved spec into local, verifiable execution steps in the existing run plan while keeping one GitHub Issue and one main PR for the spec.
disable-model-invocation: true
---

# To Tickets

Break a spec into local **tickets** — verifiable slices with explicit blockers.
The spec remains one GitHub Issue, titled `spec: `, and one delivery PR targeting
main. Tickets are execution steps, not additional GitHub Issues or PRs.

Read `docs/agents/issue-tracker.md` and the existing local run protocol before
decomposing work.

## Process

### 1. Gather context

Read the source Issue's complete body and discussion using
`docs/agents/discussion-workflow.md`, then refresh its local archive. Use confirmed
scope, test seams and acceptance criteria. Preserve unresolved questions,
local-only or paused execution, and another active owner's work.

Read the existing PR and local run before drafting steps so resumed work reuses
its plan and evidence. Historical child Issues and stacked PRs remain traceable;
check their actual main integration when relevant without creating replacement
Issues or bulk rewriting those relationships. Title case is not approval.

### 2. Explore the codebase

If needed, trace the affected public seams and existing implementations. Use
`CONTEXT.md` vocabulary and relevant ADRs. Apply `ponytail` full: reuse existing
behavior and remove obsolete structure before adding another mechanism.

### 3. Draft verifiable slices

- Prefer a narrow end-to-end behavior through the affected layers and tests.
- Give each step an `id`, its genuine `blockedBy` step IDs, and an `acceptance`
  statement describing the observable result and its verification.
- Keep each step small enough to implement and review in a fresh context.
- Sequence necessary prefactoring before the behavior it enables.
- For a wide mechanical refactor, use expand, migrate and contract steps inside
  the same delivery branch. When intermediate steps cannot be green alone,
  preserve their dependency order and verify the integrated result before delivery.

One PR may contain several commits and internally parallel work. Independent
steps can run in parallel with explicit file ownership; every result returns to
the same plan and final PR. Do not create GitHub sub-issues, native ticket
dependencies or stacked PRs for these steps.

### 4. Review the plan

Check that every acceptance criterion has an implementing or verifying step,
each blocker is necessary, and the dependency graph has no cycles or unknown IDs.
Show the concise breakdown when useful. Within existing authorization to decompose
the approved spec, self-review and proceed; do not request approval again for
routine ticket granularity. Return requirement, public contract or architecture
changes to discussion before implementing the affected work.

### 5. Save and execute the local plan

Refresh source discussion before preparing the run. Save the original request
and the plan in the existing
`$CODEX_HOME/local-workflows/nodebraid/runs/<run-id>/input.json`. Use the existing
`RunInput` contract and `plan: [{id, blockedBy, acceptance}]`. Keep ticket progress
in the existing completed-step record. Optional `plan.md` can explain the same
plan without maintaining another completion list.

```bash
bun run agents:run prepare /absolute/path/to/run/input.json /absolute/path/to/run
bun run agents:run frontier /absolute/path/to/run /absolute/path/to/run/completed-steps.json
```

`prepare` saves the independent, immutable `prepared-task.json.plan`. Record only
step IDs backed by actual execution evidence in `completed-steps.json`, preserving
the evidence in the existing run artifacts. Work the `frontier`: steps whose
blockers are complete. Before recovery, verify actual code, PR state and evidence
before reusing a completed step. A changed request or prepared plan needs a new
run; never edit the prepared task or copy old verification onto a new head.

The plan may include review, acceptance and publication steps. Complete each
after its actual operation succeeds; do not require every plan step to be done
before `verify`, because verification or publication may itself be pending.
Ready for merge review requires evidence for all pre-merge steps and acceptance,
plus current-head CI, reviews and report publication. Record any post-merge
prerequisite in the step's acceptance and handoff; those steps stay pending until
it holds. Ready does not require the PR already merged or those steps completed.
Closing the spec requires actual main integration, all remaining acceptance and
an empty local frontier. The frontier selects dependency candidates; the
coordinator also checks external prerequisites and permission before acting.
`verify` success alone does not establish these delivery facts.

Update the same PR with a direct reference to the spec Issue. Use `Refs #N`
while post-merge acceptance remains; `Fixes #N` is appropriate only when merge
is the last remaining condition and closure is authorized. Follow the tracker's
closing-link checks. Close only after actual main integration, completed spec
acceptance and existing authorization. Local ticket completion does not publish
a GitHub comment or close an Issue by itself.
