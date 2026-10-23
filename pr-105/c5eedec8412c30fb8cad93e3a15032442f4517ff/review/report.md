# Verification report

Run: 7d9d42d2-cee2-447b-9a45-edd9e018324e · ZWkang/nodebraid · issue #104

## Reviewed and published source

- Review base: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Independently prepared append parent: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Published head: `c5eedec8412c30fb8cad93e3a15032442f4517ff`
- Reviewed local head: `ecfd1b0b21617717012ad3070d836c3d3b20c542`
- Tree: `68258a4c6774fd95d27cd7fb44bdfb3fea049b38`
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
- Keep this Issue open until human final review/merge, actual main integration and whole-Issue acceptance. This new PR has no merge authorization.

## Deduplication

Read complete all-state103 Issue/PR records (100+3) and53 PRs through final short pages. No Move Nodes capture repair exists. Read #76 and its complete discussion: its accepted indexed capture is confined to Session. #86 owns Connection materializer capture, #100 Basic Canvas policy and #102 direct Kernel Node-owned fields. Their existing implementations/PRs do not capture this Command's moves, and unmerged branch capabilities are not counted as deployed main.


### public-move-capture-regression-and-fix

Public Command red/green retains a single indexed Move Nodes input through validation/stale checking/application, with exact existing shape/finite/order/error behavior.

Dependencies: none

### affected-consumers

Original compiled stale-iterator reproduction, getter/array/error/History public controls, current Interaction/History suites, types and affected consumer checks pass.

Dependencies: public-move-capture-regression-and-fix

### independent-review

Independent Standards with ponytail-review and Spec review the complete exact committed head/tree/patch against original Issue104, ADR0014/0029 and existing public Move Nodes semantics.

Dependencies: affected-consumers

### formal-engineering-check

Pinned deployed main agents:run verify executes the sole formal full bun run check after both independent reviews pass and retains original logs.

Dependencies: independent-review

### source-publication

Actual remote source tree and first parent match checked tree and independently captured append parent before local branch mapping.

Dependencies: formal-engineering-check

### current-head-ci-and-reports

Current-head real CI, all paginated feedback, full actual independent review Markdown and report/preview bytes pass immutable publication/readback before readiness.

Dependencies: source-publication

### human-merge

Human final review and normal protected merge into main.

Dependencies: current-head-ci-and-reports

### main-integration-acceptance

Fetched actual main contains delivery merge and passes fresh whole-Issue public acceptance before closure.

Dependencies: human-merge

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: Move Nodes captures the caller’s collection, normalized length, indexed entries, Node IDs and Point scalars once. Every validation, stale check and write uses those same owned values.

Reviewed identity:

- Base: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Head: `ecfd1b0b21617717012ad3070d836c3d3b20c542`
- Tree: `68258a4c6774fd95d27cd7fb44bdfb3fea049b38`
- Binary patch SHA256: `ef11b89e48d00e77457c1c825a6f270804c73bc44437773f3b9624d9178497e4`

Scope: complete three-dot base-to-head diff, the shared Move Nodes handler and all 465 lines of `move-input-values.test.ts`. Read Issue #104 with its complete empty discussion, independent plan, fixture-correction record and current project rules/principles.

Hard standards: no violations found. Capture stays in the feature handler under ADR0014 and Boundary Discipline. Abort precedes input reads. Whole-input shape checking still precedes duplicate/order/finite checks, and all stale sources are checked before writes. The capture preserves Node-ID → basePosition x/y → position x/y order and original external failures under ADR0029.

Length conversion happens once. Native lazy indices avoid caller traversal hooks and eager bulk allocation; BigInt/Symbol errors and first-entry failures remain exposed. Existing semantic NodeId construction uses the already-declared Kernel dependency. Captured Point copies prevent later caller reads from changing admitted evidence or targets. The single Transaction retains current unrelated Node fields/data, metadata, no-op identity and one History entry.

Traced public Command registration/execution, Node Drag caller, capture helpers, Kernel writers and History replay. Other Commands and Gesture/Shortcut policies are unchanged. Tests use real Host/Kernel/Command/History services and an explicit Renderer backend fixture, not native browser input.

Judgment checks: no concrete Fowler smell found. Under one Canvas Host moving a finite selection, copying remains linear in move count and belongs at this owner. No Registry, generic framework, public interface, cap or fallback was added.

Actual independent check: `bun test packages/plugin-interaction/tests packages/plugin-history/tests` passed 99 tests / 479 assertions at this head. Coverage includes stale traversal substitution, read/exception identity, native lengths, sparse and inherited inputs, shape precedence, atomic movement and Undo/Redo. Original command output is in `standards-tests.log`.

Also verified exact revisions, full patch bytes/hash, task/inspection binding, clean worktree and `git diff --check`. Implementer logs were not counted as independent execution.

Not checked independently: compiled reproduction, typecheck/builds, browsers, full engineering gate, live feedback, CI, publication or merge.

Verdict: passed. Looks good. Ship.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

# Spec review — Issue #104

Verdict: **passed**. 未发现规格遗漏、错误实现或范围扩张。

- Base: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Head: `ecfd1b0b21617717012ad3070d836c3d3b20c542`
- Tree: `68258a4c6774fd95d27cd7fb44bdfb3fea049b38`
- Complete binary patch SHA256: `ef11b89e48d00e77457c1c825a6f270804c73bc44437773f3b9624d9178497e4`

已独立读取 Issue104 全文及全部零评论、input/prepared plan、fixture-correction；原始 request 与 Issue 正文一致。核验完整两文件补丁、唯一提交、inspection/complete.patch，完整审阅新增465行公共回归。依据当前 AGENTS/CONTEXT、tracker/discussion、code-review、ADR0014/0029，追踪 Interaction 注册 → Command handler → Kernel Transaction/History，以及既有 Session/Kernel native-index 模式。

Issue 要求 “Use exactly those owned values for every existing validation, stale check and write”。handler 只读取一次 moves、length、各索引及 Node ID/Point/scalar；能力边界内复制到私有值后，unique/canonical/finite、全量 stale preflight 和写入均复用该集合。真实索引中的 stale b 不再被应用 iterator 隐藏，所有 stale 检查完成后才开始替换 Node。

Issue 要求保留 “whole-input shape validation before unique/canonical/finite checks” 与 “native length coercion and lazy first-entry failure”。capture 维持 Node ID → basePosition x/y → position x/y 的 shape 短路，完整捕获后再执行既有值校验；数值长度只转换一次，借自有 length descriptor 惰性遍历，不预分配、不读取应用 traversal/map/constructor/species。原始 getter/非 Error 失败无包装，pre-abort 仍先于输入读取，空/重复/乱序/非有限/缺失/过期错误保持。

仅 shared Move Nodes handler 改变；当前 Node 非位置字段及 opaque data 从 live Node 保留，metadata、no-op identity、单 Transaction、History undo/redo 路径不变。未修改 Kernel、其他 Command、Gesture/Shortcut、公开 API、依赖或新增 cap/fallback。

实际独立执行：`bun test packages/plugin-interaction/tests packages/plugin-history/tests` **99 pass /479 assertions，exit0**；`git diff --check BASE...HEAD` exit0；HEAD/tree、完整 patch/hash 与记录一致。原始输出见 `spec-commands.log`。应用 Renderer Provider 是公共 backend seam，此结果不证明原生浏览器输入。

未独立运行构建、类型检查、compiled probe、affected、浏览器或完整工程检查；远端发布/current-head CI、完整报告/media、人工合并及 main 全 Issue 验收未由本审查验证。


## Behavior evidence

### public-stale-iterator-red

red — passed; exit 1; expected exit 1.

Original public Command regression before the repair resolves a stale-b move when it must reject; exact stable controls also failed the compiled discovery assertion. This is a real behavior failure after typecheck, not a setup failure.

Command: `bun test packages/plugin-interaction/tests/move-input-values.test.ts`

[Original command output](logs/behavior-1.log)

### current-public-move-input-controls

green — passed; exit 0; expected exit 0.

38 public Host/Command/Kernel/History regressions pass171 assertions: fixed input/receiver reads; hidden stale/sparse entries; original read/throw/abort phases; nonfinite first scalars; native lazy length/coercion; unchanged Views; current Node fields/opaque data; multi-move metadata, no-op and Undo/Redo.

Command: `bun test packages/plugin-interaction/tests/move-input-values.test.ts`

[Original command output](logs/behavior-2.log)

### current-related-interaction-history

green — passed; exit 0; expected exit 0.

99 complete Interaction/History public tests pass479 assertions, including original Command/config/Gesture/cleanup and related History behaviors.

Command: `bun test packages/plugin-interaction/tests packages/plugin-history/tests`

[Original command output](logs/behavior-3.log)

### current-original-compiled-reproduction

green — passed; exit 0; expected exit 0.

Same three real compiled public controls: valid target moves; stable stale target rejects; the original custom-iterator stale-b case now rejects exact STALE_GESTURE and preserves exact View/revision. Input/expected behavior unchanged; current public dist was built by affected check and resolved with shared Runtime/Token identity.

Command: `bun run /Users/zhou/.codex/local-workflows/nodebraid/runs/7d9d42d2-cee2-447b-9a45-edd9e018324e/build-and-run-current.ts`

[Original command output](logs/behavior-4.log)

### current-affected-consumers

check — passed; exit 0; expected exit 0.

Real affected check passes all selected consumers/types/tests, Layout public integration, native SVG/Examples browser suites and docs. Scope is in affected-plan.log; it does not replace the sole formal full verify after both independent reviews.

Command: `bun run check:affected --base origin/main`

[Original command output](logs/behavior-5.log)

### independent-standards-execution

check — passed; exit 0; expected exit 0.

Original independent standards reviewer output at exact local ecfd1b0b21617717012ad3070d836c3d3b20c542:99 Interaction/History public tests /479 assertions. This is separate from implementer execution, builds and full engineering verification.

Command: `bun test packages/plugin-interaction/tests packages/plugin-history/tests`

[Original command output](logs/behavior-6.log)

### independent-spec-execution

check — passed; exit 0; expected exit 0.

Original independent spec reviewer output at exact local ecfd1b0b21617717012ad3070d836c3d3b20c542:99 Interaction/History public tests /479 assertions. This is separate from implementer execution, builds and full engineering verification.

Command: `bun test packages/plugin-interaction/tests packages/plugin-history/tests`

[Original command output](logs/behavior-7.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
