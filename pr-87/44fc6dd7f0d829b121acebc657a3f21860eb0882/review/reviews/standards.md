What this change does: Interaction saves the Connection materializer that passed validation and uses that same callback for the Activation. This revision also incorporates main’s Session input-capture repair.

Verdict: passed. Looks good. Ship.

Reviewed identity:

- Base: `63e11db27145a2cb50123bd3727883905249d0c1`
- Head: `c8c6dea0c0329ae94559c6e841c141bb9f80bb97`
- Tree: `fe967ca7a98576c7abe9b10f717f115bd6218f98`
- Binary patch SHA256: `892ccbbeee271106b76da8fabd408917cdff328f7ea557bc4166d5cfc32bfbb1`

Hard standards: no violations found. Re-read the complete three-file patch, regression cases, Issue #86, its empty discussion, prepared plan and supplied PR #87 checkpoint. Current AGENTS, CONTRIBUTING, CONTEXT, tracker/discussion rules and applicable principle guidance remain unchanged.

The callback is read after existing shape/key checks. Its validated identity is retained in a frozen configuration, without changing original read errors or fresh-Activation revalidation. This follows Boundary Discipline and Type System Discipline. Traced terminal cleanup, materialization, Port checks, typed Command, Kernel commit and History observation against ADR0068/0069 and ADR0028/0029. Current Session’s owned IDs, Snapshot identity and FIFO notifications remain compatible with Interaction mutations and Renderer subscriptions.

Judgment checks: no concrete Fowler smell found. For one isolated Host per Canvas, one local capture is sufficient. No wrapper, cache, new interface, dependency, input cap or fallback is needed or added.

Independent check: `bun test packages/plugin-interaction/tests packages/plugin-session/tests packages/plugin-renderer/tests` passed 85 tests / 383 assertions at this head. This includes the changed-getter Connection regression, recovery/read-error controls, Session capture/FIFO and Renderer reconciliation. These use real Runtime services with a boundary Renderer fixture, not native browser input.

Verified saved patch bytes/hash, inspection/task binding, clean worktree and `git diff --check`. Local parents are the earlier unpublished sync and captured main; the published source remains an ancestor. The independent remote append parent is preserved in the prepared task and need not equal the local immediate parent. Confirmed the compiled Session dependency includes the current capture implementation. Commands/output are in `standards-command-log.txt`.

Not checked: fresh builds, browsers, full engineering gate, new-head CI, live feedback refresh, API publication/tree readback or merge. Earlier reports and checks were not relabeled for this identity. This review covers Standards and ponytail-review only.
