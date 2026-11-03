# Legacy delivery recovery

New specs use one Issue and one PR to `main`; see the
[tracker](./issue-tracker.md) and [local workflow](../../.agents/workflows/local-agent.md).
Read this page only when resuming work that predates that model: parent/child
Issues, stacked PRs, `feat/issue-N-integration` branches or runs without
`baseRefName`/`expectedParent`. Do not bulk delete, close, recreate or rewrite
old records to fit the new model.

## Parent/child Issues

Existing parent/child Issues keep their IDs, discussions, native relationships
and evidence. `agents:run reconcile` checks them through the `specs` aggregate:
each spec lists `children` and `slices: [{id, task}]` covering the approved scope
(unsplit slices use `task: null`); each task names its `parent`. `children` and
`blockers` are complete REST pages through the last page shorter than 100 items
(`[[]]` when empty). Declared slices, parent links and native relationships must
agree; missing links, cycles and unreadable pages are errors, not an empty frontier.

Close an existing child, read it back and reconcile again before assessing its
parent. The parent closes only after all children, the parent criteria, actual
main integration and existing closure authorization.

If an existing relationship needs an authorized repair, use numeric database IDs,
not issue numbers or GraphQL node IDs, and read relationships back afterwards:

- Resolve an ID: `gh api repos/ZWkang/nodebraid/issues/<number> --jq .id`.
- Add a child: `gh api --method POST repos/ZWkang/nodebraid/issues/<parent-number>/sub_issues -F sub_issue_id=<child-database-id>`.
- Add a blocker: `gh api --method POST repos/ZWkang/nodebraid/issues/<child-number>/dependencies/blocked_by -F issue_id=<blocker-database-id>`.
- List children: `gh api --paginate repos/ZWkang/nodebraid/issues/<parent-number>/sub_issues`.
- List blockers: `gh api --paginate repos/ZWkang/nodebraid/issues/<child-number>/dependencies/blocked_by`.

An unavailable API or permission is a reported failure, not a reason to replace
the relationship with a text-only link.

## Stacked and integration PRs

`feat/issue-N-integration` branches and `[agent] ` titles remain managed. An open
stacked PR keeps the same CI/feedback maintenance, but passing it yields
`needs-integration`, not main delivery readiness. Its target SHA is still bound
to the prepared run: a moved feature-branch target requires a new run.

Once the upstream PR's actual merge is contained in fetched main, retarget the
open successor to main, prepare a new run and repeat reviews and verification.
An already merged successor cannot be retargeted: open a follow-up integration PR
with its actual code, preserving the original task, PR and merge-commit links. The
follow-up may reuse the original implementation head without the old
feature-branch merge commit; select it as the task's `delivery` and verify its
acceptance. Merge status on a feature branch never establishes completion.

A task whose selected delivery merge commit is absent from fetched main is
`needs-integration`, even when GitHub already closed the source Issue. Historical
PR ancestry is not an integration queue: once a follow-up delivery reached main
and was accepted, do not integrate the old feature-branch merge again.

## Legacy runs

Runs without `baseRefName` or `expectedParent` stay readable with their original
digests and published reports. `evaluate` returns `waiting-verification` for them
and `prepare`, `verify`, `publication` and `agents:report` refuse to extend them.
Prepare a new run; never fill missing fields in the old task. Receipts without
risk or changed-path evidence are `unclassified` and route to full human review.

## Migration acceptance

The local subscription migration was first accepted against
[Issue #6](https://github.com/ZWkang/nodebraid/issues/6): a Dagre public-seam
reproduction at `9d2964337e7e1a86d98d02d7ad7397905375087d` exited 1 because a
legal special ID dropped an edge constraint. The earlier API triage run
[39364597209](https://github.com/ZWkang/nodebraid/actions/runs/39364597209)
failed before start without `CODEX_API_KEY`/`OPENAI_API_KEY` and does not count as
a local run. That migration keeps its human-merge requirement; later deliveries
follow the risk route.
