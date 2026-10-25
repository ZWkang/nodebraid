# Verification report

Run: 7a9bde03-a107-49db-bfd2-0cd5bc8b49e9 · ZWkang/nodebraid · issue #104

## Reviewed and published source

- Review base: `58889a92b7cc7a3c953efe115ff6d8664924e094`
- Independently prepared append parent: `26e6d48c8d43494db72d20b1dc4d919b06a28f04`
- Published head: `47647275982f9aed5ccf595c14096a72a25c018c`
- Reviewed local head: `d27ee24eaec5add059be9d413b4fcdf347256ab4`
- Tree: `abd83973678bfdf50b852efdb8c4a77067a75e4b`
- Complete binary patch SHA-256: `ef11b89e48d00e77457c1c825a6f270804c73bc44437773f3b9624d9178497e4`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

## Confirmed defect

Fetched main `dcf13482b68bc2422fc4d714df1226ab0ef259aa` traverses the caller's Move Nodes array four times: shape checks, unique/order/finite checks, stale-position checks, then writes. A typechecked actual compiled public Host/Kernel/Command/Interaction probe supplies an ordinary `MoveNodeInput[]` containing `a` and a stale move for `b`, with its legal custom iterator yielding `a` on the first three passes and stale `b` on the fourth.

- Node a starts at x=0; its valid move targets x=10.
- Node b starts at x=100; its supplied basePosition.x is99 and target x=120.
- Stable valid b input commits at revision2.
- Stable stale b input rejects `interaction / STALE_GESTURE`, preserving the exact View at revision1.
- The changing iterator instead runs4 times, commits **only b at x=120 / revision2**, and never rejects its stale basePosition. The stale-check phase inspected a different move from the one written.

The assertion requiring stale evidence to reject exits1. The reproduction typechecks before execution and uses only public exported packages, real Host/Services and an explicitly application-owned in-memory Renderer Provider; no malformed IDs, internal handler, mocked Kernel or browser/native-input claim. Original source/output: local run `20261023T101255-discovery-interaction-command-inputs` (`move-iterator-repro.ts`, `move-iterator-red.log`, `move-iterator-observations.json`, `repro-typecheck.log`). Existing14 public Command/input tests pass110 assertions.

## Contract and cause

[The public MoveNodeInput/MoveNodesInput contract](https://github.com/ZWkang/nodebraid/blob/dcf13482b68bc2422fc4d714df1226ab0ef259aa/packages/plugin-interaction/src/contracts.ts) accepts readonly array/Point values and carries each Node's base position. [The current handler](https://github.com/ZWkang/nodebraid/blob/dcf13482b68bc2422fc4d714df1226ab0ef259aa/packages/plugin-interaction/src/move-nodes-command.ts) explicitly requires nonempty unique canonical IDs, finite coordinates, and matching current source positions before one synchronous Transaction. [Module documentation](https://github.com/ZWkang/nodebraid/blob/dcf13482b68bc2422fc4d714df1226ab0ef259aa/website/modules/plugin-interaction.md) states that competing writes are rejected using each Node's base position. [ADR0014](https://github.com/ZWkang/nodebraid/blob/dcf13482b68bc2422fc4d714df1226ab0ef259aa/docs/adr/0014-keep-command-dependencies-in-feature-plugins.md) keeps the feature handler responsible for its own Kernel operations; [ADR0029](https://github.com/ZWkang/nodebraid/blob/dcf13482b68bc2422fc4d714df1226ab0ef259aa/docs/adr/0029-preserve-domain-and-external-error-identity.md) preserves external failures.

The handler rereads `input.moves`, entries and their nodeId/basePosition/position fields between validation and application, so iterator/property changes can substitute the target/evidence after admission. The accepted Session capture repair #76 owns a different mutator; it does not repair this Command.

## Acceptance

- At the existing Move Nodes handler boundary, capture the incoming moves collection and native array-like length once, read owned indices lazily without caller iterator/method/constructor/species hooks, and capture each entry's Node ID, Point shells and x/y scalars once. Use exactly those owned values for every existing validation, stale check and write.
- The real stale-b iterator reproduction must reject `STALE_GESTURE` and preserve the exact committed View, revision and History; valid first values remain usable when later reads would change or throw. Validate every captured indexed entry, including sparse/hidden invalid/stale entries.
- Preserve abort-before-input reads, shape/error short circuits and read order (Node ID, basePosition x/y, position x/y), whole-input shape validation before unique/canonical/finite checks, original thrown-value identity, native length coercion and lazy first-entry failure. No eager bulk allocation, cap, accessor prohibition or silent fallback.
- Preserve empty/duplicate/out-of-order/nonfinite/missing/stale rejection, exact errors, all-or-nothing multi-Node movement, current unrelated Node fields/opaque data, no-op identity, metadata and History undo/redo. Do not sort or silently repair invalid Command input.
- Repair only Move Nodes input capture in its shared handler. Do not change Kernel, Create Edge/Delete Selection, Gesture/Shortcut policy, public API, dependencies or Runtime lifecycle. Pending adjacent interfaces stay queued.
- Public test-first red/green, stable valid/invalid controls and getter/array/error regressions; original compiled public reproduction; related Interaction/History/consumer checks; independent Standards with ponytail-review and Spec on exact source; versioned formal full check; actual remote tree/first-parent, current-head CI, complete original review Markdown and immutable report/media readback.
- Keep this Issue open until human final review/merge, actual main integration and whole-Issue acceptance.

## Deduplication

Read complete all-state103 Issue/PR records (100+3) and53 PRs through final short pages. No Move Nodes capture repair exists. Read #76 and its complete discussion: its accepted indexed capture is confined to Session. #86 owns Connection materializer capture, #100 Basic Canvas policy and #102 direct Kernel Node-owned fields. Their existing implementations/PRs do not capture this Command's moves, and unmerged branch capabilities are not counted as deployed main.


### synchronize-main

Capture current fetched main and published source head independently before append-only synchronization of the existing delivery branch. Preserve original Issue scope.

Dependencies: none

### integration-compatibility

Fresh public affected consumers and integration checks pass. Save complete current head/tree/binary patch; historical evidence retains its original source.

Dependencies: synchronize-main

### independent-review

Fresh independent Standards with ponytail-review and Spec inspect the complete current patch against original Issue, ADRs and current main.

Dependencies: integration-compatibility

### formal-engineering-check

Pinned main versioned agents:run verify executes the real full bun run check after both review axes pass; preserve every attempt.

Dependencies: independent-review

### publish-current-head

Actual remote tree and original append parent match verification; current-head CI, complete feedback, immutable full report/media publication and readback pass.

Dependencies: formal-engineering-check

### authorized-merge

Recheck current source/base, strict checks and all feedback immediately before a normal expected-head merge. Preserve review disputes and protection.

Dependencies: publish-current-head

### main-integration-acceptance

Verify actual fetched main ancestry and the whole original Issue through fresh public acceptance; publish outcomes and close only after complete acceptance.

Dependencies: authorized-merge

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: Move Nodes captures the incoming collection, IDs and coordinates once. All validation, stale-position checks and writes then use those private values.

Source identity:
- Base: 58889a92b7cc7a3c953efe115ff6d8664924e094
- Head: d27ee24eaec5add059be9d413b4fcdf347256ab4
- Tree: abd83973678bfdf50b852efdb8c4a77067a75e4b
- Binary patch SHA256: ef11b89e48d00e77457c1c825a6f270804c73bc44437773f3b9624d9178497e4

Scope: complete base...head diff, both files and all 465 new public test lines. Commits c5eedec, 26e6d48 and d27ee24 were inspected. Canonical saved patch bytes, merge parents, independent base, append parent and prepared/inspection digest agree. Read Issue #104, its complete empty discussion and the new plan.

Hard standards: No violations found. Boundary Discipline and ADR0014 keep capture in the shared feature handler. Abort precedes input reads. Whole-input shape checks precede duplicate/order/finite checks; every stale check precedes any write. Length conversion happens once, followed by native lazy indexed traversal. Original failures remain unwrapped under ADR0029, including falsey thrown values. Node fields and opaque data keep ADR0012's ownership boundary.

Judgment-only smells: No concrete finding across the full Fowler baseline. One Point helper serves both Point fields. Sharing it with Kernel/replay parsing would change validation ownership and error timing, so no extra abstraction is justified.

Ponytail assessment: Correct and lean for isolated Canvas Hosts and synchronous transactions. I traced Gesture completion, Command registration, current Kernel copying, Document restoration, History Baseline/recordable-commit handling and the existing Create Edge path under ADR0084/0085. Captured moves remain independent of caller getters while existing canonical order, metadata and no-op behavior remain intact.

Independent checks at this head:
- `bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts`: exit 0; 191 tests, 916 assertions.
- Separate compiled public-package stdin control: file round trip → Baseline → no-op Move → two-Node Move → Undo/Redo, exit 0. Collection/length/x/y each read once; restored graph, parent/size and opaque Map identities survived replay. This control is additional to the Bun counts.
- Final identity, clean-status and whitespace audits passed.

Not checked independently: TypeScript, builds, native browsers, full engineering check, remote CI, publication or main acceptance. The external Renderer fixture is not browser evidence.

Verdict: passed. Looks good. Ship.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

# Spec review — Issue #104 / PR #105 final synchronization

Verdict: **passed**. 未发现功能验收遗漏、错误实现或范围扩张。

- Base: `58889a92b7cc7a3c953efe115ff6d8664924e094`
- Head: `d27ee24eaec5add059be9d413b4fcdf347256ab4`
- Tree: `abd83973678bfdf50b852efdb8c4a77067a75e4b`
- Complete binary patch SHA256: `ef11b89e48d00e77457c1c825a6f270804c73bc44437773f3b9624d9178497e4`

已独立重读 Issue104 全文/零评论、prepared request/同步计划、完整两文件补丁及465行回归；核验实际提交和有序父节点 `26e6d48c8d43494db72d20b1dc4d919b06a28f04`、上述 base。依据当前 AGENTS/CONTEXT/code-review、ADR0014/0029/0012、0084/0085，追踪 Move→Kernel/History，以及当前 Create Edge、Document restore 和 Example materializer。

Issue 要求 “Use exactly those owned values for every existing validation, stale check and write”。moves、native length、索引、ID/Point/scalar 一次捕获后，所有阶段复用本地值；真实 stale/sparse 条目不能被 caller traversal 隐藏。shape 仍整批先于 unique/order/finite，保持 ID→base x/y→position x/y 短路、原 receiver/继承属性/外部 thrown-value。长度只转换一次且惰性访问，保留 BigInt/Symbol、Infinity 首条失败等原生行为，没有预分配、cap、排序修复或 fallback。

一次同步 Transaction 先检查全部来源，再只替换当前 Node.position；type/size/parent/opaque data、metadata、no-op identity 和失败原子性保持。新 History 按实际操作及 Commit identity 识别 Baseline，恢复后的 Move 仍是普通可撤销编辑。Document codec 没有进入 Move 数据路径；新 Create Edge 捕获位于独立 handler。相对当前 base 未扩张 Kernel、其他 Command、Gesture/Shortcut、公开 API 或依赖。

依赖稳定后独立执行：`bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts` **191 pass /916 assertions，exit0**，包含额外 Core roundtrip 的1 test/5 assertions。`git diff --check BASE...HEAD` exit0；HEAD/tree、完整 canonical patch/hash 与 inspection/complete.patch 一致。原始输出见 `spec-commands.log`，已回读。

未独立运行构建、类型检查、compiled probe、affected、浏览器或完整工程检查；五个 native preview、远端发布/current-head CI、完整报告/media readback、合并及 main 全 Issue 验收未由本审查验证。旧 head 的报告与结果未换绑。


## Behavior evidence

### current-complete-affected

check — passed; exit 0; expected exit 0.

Current source affected checks include types, consumers, native SVG/Example Document browsers and docs; exit0.

Command: `bun run check:affected --base 58889a92b7cc7a3c953efe115ff6d8664924e094`

[Original command output](logs/behavior-1.log)

### current-public-integration

check — passed; exit 0; expected exit 0.

Current public Interaction/History/Document and Core roundtrip suites191tests916assertions pass with explicit Baseline and current Kernel/CreateEdge contracts.

Command: `bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts`

[Original command output](logs/behavior-2.log)

### current-original-compiled-controls

check — passed; exit 0; expected exit 0.

Original three Move controls execute against actual current compiled public packages and shared Runtime tokens: stable valid succeeds, stable stale rejects, custom iterator cannot hide stale indexed entry; exact View preserved. Separate TypeScript check passed.

Command: `bun run /Users/zhou/.codex/local-workflows/nodebraid/runs/7a9bde03-a107-49db-bfd2-0cd5bc8b49e9/build-and-run-current.ts`

[Original command output](logs/behavior-3.log)

### independent-standards-commands

check — passed; exit 0; expected exit 0.

Independent exact-source four-package/Core suites191tests916assertions; separate real public file restore/Baseline/no-op/MoveTwo/UndoRedo stdin control source and output preserved in original log, not counted as Bun tests. No native browser claim.

Command: `bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts`

[Original command output](logs/behavior-4.log)

### independent-spec-commands

check — passed; exit 0; expected exit 0.

Independent exact-source four-package/Core suites191tests916assertions, including Core roundtrip1test5assertions. No native browser claim.

Command: `bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts`

[Original command output](logs/behavior-5.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
