# Issue tracker: GitHub

One spec is one GitHub Issue and one delivery PR targeting main. Use `spec: ` for
the Issue title. GitHub holds the requirement, decisions, discussion and delivery
status. Implementation tickets remain local steps in the existing run plan.

Use the connected GitHub tools or an already authenticated `gh` CLI. Infer the
repository from `git remote -v` and specify it explicitly in writes. Do not copy
credentials or change authentication to make an operation appear successful.

## Conventions

- Search open and closed Issues and PRs before creating work; continue the same
  spec Issue and delivery PR when they already exist.
- Read the Issue body, all comment pages, labels and linked PR feedback before
  acting. Refresh the local archive through the existing `archive-issue` command;
  a reading copy does not establish current execution eligibility.
- Publish confirmed functional scope, test seams and acceptance criteria without
  private chat content. Follow the repository's public writing rules.
- Apply `enhancement`, `approved-spec` and `ready-for-agent` to the same approved
  spec Issue once execution is authorized; preserve pauses, local-only execution,
  outstanding design questions and active owners. Title case alone grants no authority.
- Keep one `feat/issue-N` branch and one main PR for the spec. Use `Refs #N`
  while post-merge acceptance remains and close explicitly after it passes;
  use `Fixes #N` only when merge is the last acceptance condition and closure is
  authorized. Check closing keywords in commits and automatic-closing Development
  links too. Local steps may produce several commits and parallel implementation.
- Close the Issue only after completed local work, current verification and
  published evidence, actual main integration, acceptance and existing user
  authorization. A passing test or a feature-branch merge alone is insufficient.
- Historical child Issues and stacked PRs remain readable evidence. Do not bulk
  rewrite their relationships or require that structure for new specs.

With `gh`, use `--repo <owner>/<repo>` and `--body-file <path>` for exact multiline
Issue, PR and comment text. Paginate collection reads. Read back every authorized
write; access or publication failures stay explicit and must not be reported as
completed operations.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, read the PR's current description, diff, complete discussion
and review feedback, then apply the same triage roles as Issues. Keep external
requests distinct from the repository's managed delivery PRs. GitHub shares one
number space across Issues and PRs; resolve the referenced object's actual type.

## When a skill says "publish to the issue tracker"

For a spec, create or update the one source GitHub Issue and read it back. For
implementation tickets, use the existing local run plan described by
`to-tickets`; do not create GitHub Issues, sub-issues, native ticket dependencies
or stacked PRs. No new `.scratch/` tickets or ticket directory is needed.

## When a skill says "fetch the relevant ticket"

Read the source GitHub Issue and current PR, then the referenced local plan step
and its evidence. Use `runs/<run-id>/input.json.plan`, the independent immutable
`prepared-task.json.plan`, and `completed-steps.json`; a ticket ID is a local step
ID, not a GitHub Issue number. Preserve old referenced local files as history.

## Wayfinding operations

Used by `/wayfinder`. The **map** is the same source spec Issue, with Notes,
Decisions-so-far and Fog sections when useful. It does not require another Issue.

- **Ticket**: a local `plan` step with `id`, `blockedBy` and `acceptance`. Record
  its research, prototype, grilling or implementation purpose in the acceptance
  description when useful; use the existing run artifacts for results.
- **Blocking**: local `blockedBy` step IDs, validated by `prepare` and `frontier`.
- **Frontier**: run `agents:run frontier` with the saved run and
  `completed-steps.json`; select work whose blockers have actual completion evidence.
- **Claim**: preserve the source Issue's current owner and coordinate internal
  step ownership in the existing run/handoff. Do not create another Issue or
  assign every local step through GitHub.
- **Resolve**: preserve the result and verification in the run, then record the
  completed step ID. A public functional decision may be summarized on the same
  spec Issue under existing publication authorization. Completing a ticket does
  not close the spec; all planned work and delivery acceptance must be complete.

Review and publication can themselves be plan steps. Record completion after
success, not before `verify`. Ready for merge review requires all pre-merge
steps/acceptance, current-head checks, reviews and published evidence. Record
post-merge prerequisites in the plan and handoff and retain those steps as pending;
ready does not require main integration. Closure requires actual main integration,
all remaining evidence and an empty local frontier. Check external prerequisites
and permission as well as dependencies before executing a frontier step.
