---
name: Agent Issue Delivery
description: Implement a confirmed defect or approved specification and deliver a verified visual PR.
on:
  workflow_dispatch:
    inputs:
      issue_number:
        description: GitHub issue carrying ready-for-agent and bug or approved-spec.
        required: true
        type: string
  bots: [github-actions]
concurrency:
  group: agent-delivery-${{ inputs.issue_number }}
  cancel-in-progress: false
  job-discriminator: ${{ inputs.issue_number }}
permissions:
  contents: read
  issues: read
  pull-requests: read
engine:
  id: codex
  config: |
    [features]
    multi_agent = true
network:
  allowed: [defaults, github, node]
tools:
  github:
    toolsets: [repos, issues, pull_requests]
  bash: true
  edit:
skills:
  - .agents/skills/tdd
  - .agents/skills/code-review
  - .agents/skills/ponytail
  - .agents/skills/ponytail-review
  - .agents/skills/pr
  - .agents/skills/show-me
safe-outputs:
  environment: agent-publish
  add-comment:
    target: '*'
  create-pull-request:
    github-token: ${{ secrets.AGENT_PR_TOKEN }}
    base-branch: main
    draft: false
    fallback-as-issue: false
    if-no-changes: error
    protected-files: blocked
    auto-close-issue: false
    allowed-branches: [feat/issue-*]
steps:
  - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1
    with:
      node-version: 22.13.0
  - uses: oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6
    with:
      bun-version: 1.2.19
  - run: bun install --frozen-lockfile
  - run: bunx agent-browser install --with-deps
pre-agent-steps:
  - name: Load and validate the current issue
    env:
      GH_TOKEN: ${{ github.token }}
      ISSUE_NUMBER: ${{ inputs.issue_number }}
      ISSUE_REPOSITORY: ${{ github.repository }}
    run: bun run scripts/prepare-agent-issue.ts
post-steps:
  - name: Verify the final workspace independently of the agent report
    run: bun run check
jobs:
  safe_outputs:
    if: needs.agent.result == 'success'
    pre-steps:
      - name: Require the PR credential that also triggers CI
        env:
          AGENT_PR_TOKEN: ${{ secrets.AGENT_PR_TOKEN }}
        run: |
          if [ -z "$AGENT_PR_TOKEN" ]; then
            echo '::error::Set AGENT_PR_TOKEN to a repository-scoped GitHub App token or fine-grained PAT before enabling delivery.'
            exit 1
          fi
---

# Deliver issue #${{ inputs.issue_number }}

Read `.tmp/agent-issue.json`, `AGENTS.md`, `CONTEXT.md`, the linked specification,
relevant ADRs, and `docs/agents/agentic-workflows.md`. `CONTEXT.md` is this repo's
canonical glossary, including when an installed skill calls it `GLOSSARY.md`.
Apply the installed `ponytail` skill at its full level while planning and
implementing: understand affected callers first, reuse existing code and platform
features, and make the smallest complete change. Keep the approved public
contracts, error handling and verification intact.
This workflow authorizes routine planning, implementation, tests, independent
reviews, and a PR for this issue. It invokes the installed `pr` and `show-me`
guidance as part of delivery. Do not ask for task-by-task approval.

1. Search for an open PR already fixing this issue. If found, post its link on
   the issue and report that delivery is already in progress; do not create a
   duplicate PR. Re-read current issue labels before changing code. If the task
   has been closed, superseded, or requires a new product/architecture decision,
   report the reason and return it to design discussion.
2. Capture `git rev-parse HEAD` as the base. Read the linked investigation and
   reproduce the exact defect, or map the approved spec's acceptance criteria.
   Split work into verifiable vertical slices with real dependencies. Have an
   independent planning subagent check coverage, dependencies, scope and public
   test seams against the source spec. Fix the plan without changing the spec.
3. Use TDD at the agreed public seams. Delegate independent slices when useful;
   the main agent owns integration and verifies each result. Prefer existing
   interfaces. For a defect, show the regression test failing before the fix,
   then passing after it. Preserve original failures and remove temporary debug
   instrumentation. Choose additional verification using the documented matrix.
4. Review the complete resulting workspace, including new files. The installed
   code-review skill's `base...HEAD` command does not include uncommitted work:
   materialize a complete patch against the captured base with new files included
   and give the same immutable patch to independent Standards and Spec reviewers.
   Supply source docs, not the implementer's conclusions. The Standards reviewer
   receives the `ponytail-review` skill path and instructions in its brief and
   applies them to the connected callers and dependencies; fold
   its evidence-backed findings into that axis rather than adding a duplicate
   review round. Required public interfaces and ADR decisions take precedence over
   suggestions to remove an abstraction. Fix evidence-backed
   findings and review every correction. Record patch digest and review results.
5. Run the affected checks and the repository `bun run check`. A failed check or
   unfinished review prevents requesting a PR. Do not weaken assertions, disable
   checks, change acceptance criteria, add fake success, or add silent fallback
   behavior to obtain a pass. Record the exact commands, results and patch digest.
6. Use a source branch named `feat/issue-<number>`. Request a PR through the
   `create-pull-request` safe output, with `Fixes #<number>` and the installed `pr`
   template: Summary with a focused diagram/diff, Evidence with observed
   before/after behavior and checks, and Merge Danger with compatibility and
   blast radius. Use actual browser screenshots for visual changes when useful;
   otherwise use real execution evidence. Link detailed logs rather than filling
   the PR with the entire execution transcript.

GitHub writes belong to safe outputs; never push, close the source issue, or
merge a PR directly. Leave the implementation as local workspace changes for
gh-aw to collect. Only this issue's changes belong in the patch. Automation
configuration and steering files are protected by gh-aw; report a need to change
them explicitly rather than attempting to bypass protection. Do not claim PR
creation or CI success until their actual results are available.
