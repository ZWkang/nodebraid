---
name: pr-risk
description: Classify a NodeBraid PR as low, medium or high risk within the existing independent Standards and Spec reviews, and select its human-review or immediate-merge route. Use when reviewing, preparing, or maintaining a managed PR.
---

# PR risk and merge routing

This is the repository's canonical risk policy. Use it inside the existing
[two-axis review](../code-review/SKILL.md), not as a third review or another
scheduler. The [local workflow](../../workflows/local-agent.md) owns execution;
the [tracker](../../../docs/agents/issue-tracker.md) owns separate Issue closure.

## Classify the complete change

Each independent reviewer reads the same complete patch, connected callers,
approved spec and actual verification evidence, bound to the review's
`head`, `tree` and binary `patch` digest. Assess impact, regression likelihood,
verification coverage and rollback together. Small patches, Markdown extensions,
green CI or one passing review do not establish low risk.

| Level    | Decision                                                                                                                                                                                                                                                                                                 | Route                                                                                                    |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `low`    | Local, understood impact; no public contract or sensitive boundary change; sufficient concrete verification; straightforward rollback with no destructive effect. Both reviewers must explicitly agree. Ordinary prose corrections or test-only changes may qualify when they meet all these conditions. | Candidate for immediate merge without human review, after the existing delivery requirements below pass. |
| `medium` | Behavior, compatible public API, Runtime lifecycle, concurrency or resource ownership changes; or remaining uncertainty that prevents a low classification.                                                                                                                                              | Focused human review of the affected behavior and boundaries, then human merge.                          |
| `high`   | Permissions, credentials, destructive state changes, breaking contracts, difficult rollback, or changes to Agent instructions, review, validation, build, dependency or publication policy.                                                                                                              | Full human review and human merge.                                                                       |

Path floors can only raise risk. Agent instructions, skills/workflows,
`docs/agents/`, `.github/`, `scripts/`, and dependency/build/validation/publication
configuration have a minimum of `high`, including declaration validation tools
in `packages/*/artifacts/`. Public framework implementation in
`src/` and `packages/*/src/` has a minimum of `medium`. The CLI derives
`changedFiles` from the same real Git comparison as the complete reviewed patch;
renames must account for the old and new paths. A path outside these groups does
not establish low risk: the reviewers still assess its meaning and effects.
Test-only changes (`tests/`, `packages/*/tests/`, `browser-tests/`) have no path
floor, whether they add or modify tests. Both reviewers decide whether such a change is low;
a test that weakens, removes or skips an assertion is not low.
Changing this policy or its enforcement is itself `high` and cannot use the
new exemption to merge itself.

## Record the decision

Each axis adds `risk: {level, rationale, evidence, rollback}` to its existing
review record. `level` is `low`, `medium` or `high`; the other fields are nonempty
strings. `rationale` states the concrete impact, `evidence` identifies the supporting code and observed checks,
and `rollback` describes how to undo the change and any irreversible effects.
Keep the findings and risk reasoning of both axes independent. Risk does not
replace the existing `verdict`, and a risk assessment cannot override a failed
review.

The final level is the highest of both assessments and the changed-path floors.
New `verify` attempts require both complete assessments. Historical receipts
remain readable; missing risk or path evidence is explicitly `unclassified`
and requires human review, never inferred as low or rewritten into old receipts.
Missing evidence takes precedence over a known path floor in the displayed
level: keep `unclassified`, retain the known floor in `reasons`, and route to
`full-human` even when that floor is high.
Head, tree, patch or target changes retain the workflow's existing re-review and
verification requirements.

The PR and full report show the final level and route, each axis's reasoning,
evidence and rollback, and the human attention still required. `evaluate` keeps
its existing readiness status and adds `risk: {level, route, reasons}` and
`autoMergeCandidate`. Routes are `automatic` for low, `quick-human` for medium,
and `full-human` for high or unclassified; `reasons` is a string array.
`autoMergeCandidate` is true only for a `ready` low-risk result; `ready` requires the
current-head report publication receipt. Candidate status does not prove pre-merge
ticket completion; that remains the coordinator's explicit check.

## Execute the route

The low-risk route authorizes only a managed PR's immediate merge to `main` after
all existing requirements pass at the current head. Before writing, refresh the
complete Issue/PR discussion, current head and target, CI, review states and
mergeability. Confirm every pre-merge local ticket and acceptance result. Keep post-merge acceptance pending with its prerequisite visible.

Any explicit hold, pause, draft, unresolved discussion, active changes request,
required human approval, failed/pending check, missing evidence or stale identity
keeps the PR waiting under the existing workflow. Neither classification nor
candidate status supplies missing conditions. Do not self-approve, dismiss
reviews, weaken rulesets or bypass checks.

Use an authenticated GitHub immediate merge operation with the expected current
head SHA. If the available tool cannot enforce that SHA, leave the merge waiting.
Do not enable GitHub auto-merge or enqueue a merge that may execute later against
another head. Read back the merged PR and merge commit before recording success;
an error or head change requires a fresh assessment of the current state.

Medium, high and unclassified PRs retain final human review and merge. Existing
explicit authorization for a particular PR remains applicable after its required
verification and review; a risk label does not supply that authorization. The
low-risk exemption grants no Issue-closing authority: follow the tracker's
separate authorization, main-integration and complete-acceptance checks, including
PR/commit closing keywords and automatic-closing associations.
