What this change does: Kernel replay owns the Graph Change fields and structural Node/Edge values accepted during validation. Preflight and forward/reverse application use those same values instead of rereading caller-controlled records.

Verdict: passed. Looks good. Ship.

Reviewed identity:

- Base: `2092dcdee82f453e8569dd0dca384d10781bc408`
- Head: `cba486a0576f98f1969e9fa91761d979280e62c1`
- Tree: `c30dee926bbbe35d0bbb2bbb6a4267cdf2561a5c`
- Binary patch SHA256: `300b8e7d7b4b8c95b5e1497b0029281e7f935aef23c6768708152b0593011088`

Hard standards: no violations found. Read the complete three-file patch, all 568 regression-test lines, current project rules and applicable principle guidance. Read Issue #89, its empty discussion/blockers, the prepared plan and supplied PR #91 description and complete empty feedback checkpoint.

The capture helpers preserve validation order, original exceptions, existing semantic IDs and Kernel-owned frozen shells. Whole-set source preflight still precedes writes, matching ADR0011. Opaque data keeps its original receiver, reference identity and comparison/materialization read phase; it is not eagerly read, copied or deep-frozen, matching ADR0012. Pure Kernel errors remain separate from Runtime observation under ADR0028/0029. Revision-header logic is unchanged; Issue #92 is a separate boundary.

Judgment checks: no concrete Fowler smell found. For one synchronous Kernel per Canvas, linear capture is needed to make accepted records stable. The private helpers stay with entity ownership. Traced Transaction → validation → preflight → EntityWriter → relation indexes → commit/History replay, and current Session, Layout and Runtime consumers. No new public interface, dependency, cap, retry or fallback was added.

Independent checks after dependency construction completed: `bun test packages/kernel/tests packages/plugin-history/tests tests/layout-providers.test.ts` passed 151 tests / 740 assertions at this head. They cover Node/Edge and both replay directions, changing fields, caught-conflict atomicity, inherited values, opaque-data errors/phases, normal replay and real Dagre/ELK Undo/Redo.

Verified exact saved patch/hash, task/inspection binding, original source first parent, captured main second parent, clean worktree and `git diff --check`. Current prepared compiled Kernel dependencies contain the capture helpers. Commands/raw output are in `standards-command-log.txt`.

Not checked: fresh builds/typecheck, browsers, full engineering gate, live feedback refresh, new-head CI, publication or merge. Historical TDD/check results were not relabeled. This report covers independent Standards and ponytail-review only.
