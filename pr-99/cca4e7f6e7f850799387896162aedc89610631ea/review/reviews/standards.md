What this change does: Layout Plugin captures one concrete Engine at creation. Its name, capability checks and computation retain that object, including the compute method receiver across later Activations.

Reviewed identity:

- Base: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Head: `cd18e1f097b6fb38cadd432bfa82931029eed58c`
- Tree: `d2d7e8ceefafaec243840ac318ea699b73a92dc9`
- Binary patch SHA256: `50f0622fe0fe29d74744f01660840841c10ff8d59ccc7fa34fd8d42c0131dc69`

Scope: complete three-dot base-to-head diff, both commits, `packages/plugin-layout/src/layout-plugin.ts` and all 140 lines of `engine-binding.test.ts`. Read the original Issue #98, prepared plan and complete follow-up comment 6359256086. The earlier interrupted review is not treated as a passed review.

Hard standards: no violations found. The factory now reads options.engine once before creating Plugin metadata. The retained reference is used for capability validation and `engine.compute(...)`; the method is not detached. The same reference survives Kernel dependency recovery. Command-token access and Engine internals remain unchanged.

The two direct Engine fixtures now declare async compute, matching `Promise<LayoutProposal>` in the public interface. The correction changes only those two keywords; receiver, call-count, position, reactivation and strict original-error assertions remain. This resolves the fixture conformance problem without weakening the behavioral regression.

Reviewed current project rules/principles and ADR0019/0021/0024/0025/0026/0029. Traced Examples and Provider callers through Engine/helper capability checks, Command cancellation, Proposal validation, Kernel Transaction and History. Cancellation guards, stale protection, metadata, net-zero behavior and cleanup remain intact.

Judgment checks: no concrete Fowler smell found. For per-Canvas Hosts with independently executed Layout Commands, one captured reference is sufficient. No Registry, new interface, dependency, extra validation policy or fallback was added.

Actual independent checks: resolved exact revisions, read full diff/commit list, matched corrected patch bytes/hash and inspection/task binding, checked clean worktree and `git diff --check`. Reviewed supplied conformant red/typecheck records and the green log reporting 19 tests / 61 assertions; these commands were not independently rerun. The earlier synchronous-fixture TS2322 is not counted as successful evidence.

Not checked independently: tests, typecheck/builds, browsers, full gate, current-head CI, publication or merge. The affected check was still running during this review. Earlier results retain their original source identities.

Verdict: passed. Looks good. Ship.
