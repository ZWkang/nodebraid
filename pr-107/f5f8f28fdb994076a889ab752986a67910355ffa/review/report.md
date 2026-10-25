# Verification report

Run: 254352c8-6f50-44d9-be37-7b6d52fb1c1b · ZWkang/nodebraid · issue #106

## Reviewed and published source

- Review base: `aba0795079c6e3182d14b698f212c437092ed844`
- Independently prepared append parent: `edf10e2d670ce98f65fb766c7d4b3f3abe0c887a`
- Published head: `f5f8f28fdb994076a889ab752986a67910355ffa`
- Reviewed local head: `4ecbeb33f7753079be127693fb3c7d2fc55d0e6e`
- Tree: `170f9438e1204675c9973a945cb84416c1d454fc`
- Complete binary patch SHA-256: `6552a9093fbf333280dfc261414c04e6d3a4b48c77b93a19259366715aed66e5`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

## Confirmed defect

On fetched clean main `dcf13482b68bc2422fc4d714df1226ab0ef259aa`, Create Edge rereads caller-owned input after validating it. A separately typechecked actual compiled public Host/Kernel/Command/Interaction probe supplies a legal `CreateEdgeInput.edge` getter: the first six reads return a complete a→b Edge; the seventh returns a complete a→a Edge. Both Nodes exist and the source/target Anchors remain a/source and b/target.

- Stable a→b input succeeds, committing target b at revision2 (edge getter reads7).
- Stable self-loop with a/source and a/target rejects `interaction / INVALID_CONNECTION`, preserving the exact View at revision1.
- Changing input succeeds with **source a, target a, selfLoop=true**, although the validated target Anchor is b. A later root read substitutes an Edge that never passed Endpoint/Anchor/self-loop/Port validation.

The assertion forbidding a substituted self-loop exits1. The probe typechecks before execution; all IDs and field values are valid public types, no internal handler or mocked Kernel is used. The Renderer is an explicit application-owned in-memory public Provider; no native/browser input coverage is claimed. Original source, output and observations are retained in local run `20261023T105725-discovery-interaction-create-edge`: `create-edge-repro.ts`, `create-edge-red.log`, `create-edge-observations.json`, `repro-typecheck.log`. Existing Create Edge/Connection tests pass3 tests/30 assertions.

## Contract and cause

[Accepted ADR0069](https://github.com/ZWkang/nodebraid/blob/dcf13482b68bc2422fc4d714df1226ab0ef259aa/docs/adr/0069-materialize-complete-edges-before-the-create-command.md) assigns Endpoint, Port, self-loop, Node-existence and Edge-ID checks to one synchronous Create Edge Transaction. Application materialization remains before the Command; ID/type/opaque data stay application-owned. [The public input](https://github.com/ZWkang/nodebraid/blob/dcf13482b68bc2422fc4d714df1226ab0ef259aa/packages/plugin-interaction/src/contracts.ts) carries a complete CanvasEdge and source/target Anchor evidence. [ADR0029](https://github.com/ZWkang/nodebraid/blob/dcf13482b68bc2422fc4d714df1226ab0ef259aa/docs/adr/0029-preserve-domain-and-external-error-identity.md) preserves external failures and [ADR0012](https://github.com/ZWkang/nodebraid/blob/dcf13482b68bc2422fc4d714df1226ab0ef259aa/docs/adr/0012-keep-domain-data-opaque-to-kernel.md) keeps data opaque.

In `create-edge-command.ts`, shape validation, Endpoint/Anchor comparison, current Node/Port checks, duplicate-ID check and `transaction.edges.add(input.edge)` reread roots and structural fields. Kernel permits graph self-loops; the feature owner must not validate one Edge and write another.

## Acceptance

- Capture each input root (edge/source/target), Edge ID/type, Endpoint shells and nodeId/optional portId, and Anchor nodeId/optional portId/role once at the existing Create Edge handler boundary. Validate and apply the same owned structural values through every subsequent guard and the single write. Ordinary getters, inherited/non-enumerable values and their receivers remain supported.
- The real changing-root reproduction must commit the accepted a→b Edge, never the later self-loop; stable self-loops and Endpoint/Anchor mismatches must retain `INVALID_CONNECTION`. Current missing Node/Port Definition and duplicate Edge-ID failures retain `STALE_GESTURE` and exact committed View/revision/History preservation.
- Preserve abort-before-input reads, existing Edge→source Anchor→target Anchor shape/error short circuits, Edge field/Endpoint and Anchor field read order, and original external thrown-value identity. Preserve all checks and their order inside the Transaction.
- Keep opaque data untraversed and unfrozen. Preserve the existing `data in edge` shape phase; read its value only at the existing Kernel Writer phase, after role/Endpoint/self-loop/Node/Port/ID preflight, once with the original receiver. Retain that exact data reference. Do not move application materializer callbacks into the Transaction.
- Preserve valid Node-level and Port-aware connections, metadata, one complete Edge per Commit, History Undo/Redo, current dynamic Port validation and cleanup. Do not alter Kernel graph/self-loop policy, Move Nodes/Delete Selection, Gesture/Shortcut policy, materializer configuration, public API or dependencies; no new accessor ban, cap, retry, fallback, generic registry or broad validation refactor.
- Public test-first red/green and stable valid/invalid/getter/error/opaque-data/Port/History controls; original compiled public probe; relevant and affected checks; independent Standards with ponytail-review and Spec on exact head/tree/complete patch; versioned formal full check; actual remote tree/first parent, current-head CI, full original review Markdown and immutable complete report/media readback.
- Keep this Issue open for human review/merge, actual main integration and whole-Issue acceptance.

## Deduplication

Read all105 Issue/PR records (100+5) and54 PRs through final short pages. Full #27 and #104 bodies and all discussions were read and archived. #27 owns Fragment arrays; #104 / PR #105 deliberately owns only Move Nodes and leaves Create Edge pending. Closed materializer/config repairs and the open Kernel Node-owned-fields repair do not capture this Create Edge input. Unmerged branch behavior is not counted as deployed main.


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

What this change does: Create Edge keeps the structural values that passed validation through the final write. Opaque data is still read later by the Kernel Writer with its original receiver.

Source identity:
- Base: aba0795079c6e3182d14b698f212c437092ed844
- Head: 4ecbeb33f7753079be127693fb3c7d2fc55d0e6e
- Tree: 170f9438e1204675c9973a945cb84416c1d454fc
- Binary patch SHA256: 6552a9093fbf333280dfc261414c04e6d3a4b48c77b93a19259366715aed66e5

Scope: complete base...head diff, both files and all 513 new test lines; commits edf10e2 and 4ecbeb3. Canonical saved bytes, merge parents, independent base, append parent and prepared/inspection digest agree. Read Issue #106 and its empty discussion, plus accepted Issue #108 and ADR0084/0085 as integration context.

Hard standards: No violations found. Boundary Discipline and ADR0069's shape, role, Endpoint, self-loop, live Node/Port and duplicate-ID checks keep their order. Data presence remains a shape check; its value remains after every guard. Original exceptions and opaque references remain intact under ADR0029/0012.

Judgment-only smells: No concrete finding across the Fowler baseline. Endpoint and Anchor have different existing empty-port rules, which justify separate capture functions. Private structural copies protect the accepted values from application Port callbacks.

Ponytail assessment: Correct and lean for isolated Canvas Hosts and synchronous commits. I traced Gesture materialization, Command/Port checks, current Kernel copying, Document codecs, Example restore/materializers and History's actual baseline-commit identity handling. Ordinary Edge commits remain recordable after a successful Baseline.

Independent checks at this head:
- `bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts`: exit 0, 153 tests, 745 assertions.
- Compiled public-package stdin probe, file round trip → Baseline → Create Edge → Undo/Redo: exit 0. Edge root/data were each read once; Undo preserved restored Nodes and Redo retained the opaque Map reference.
- Final identity, clean-status and whitespace audits passed.

Engineering context update: the 2026-10-23 SVG failure remains preserved in `affected.log`. The coordinator's unchanged whole-SVG rerun on 2026-10-25 passed with byte-identical bundles; the subsequent complete `affected-after-svg-investigation.log` run also passed. The original browser/CLI trigger remains unproven, as recorded in `svg-failure-investigation.json`. No source/assertion change, fallback or automatic retry was added. These browser/affected checks were not independently run by this reviewer.

Not checked independently: TypeScript, builds, native browsers, full engineering check, CI, publication or main integration.

Verdict: passed for Standards/ponytail source review. Formal full verification and remote checks remain pending.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

# Spec review — Issue #106 / PR #107 synchronization

Verdict: **passed**. 未发现功能验收遗漏、错误实现或范围扩张；不代表完整工程验收通过。

- Base: `aba0795079c6e3182d14b698f212c437092ed844`
- Head: `4ecbeb33f7753079be127693fb3c7d2fc55d0e6e`
- Tree: `170f9438e1204675c9973a945cb84416c1d454fc`
- Complete binary patch SHA256: `6552a9093fbf333280dfc261414c04e6d3a4b48c77b93a19259366715aed66e5`

已独立重读 Issue106 全文及全部零评论、prepared request/同步计划和空反馈/依赖记录，核验完整两文件 diff、513行公共回归、实际 fix/merge 提交。merge 有序父节点为 `edf10e2d670ce98f65fb766c7d4b3f3abe0c887a`、上述 base。另读已接受 Issue108、ADR0084/0085、新 CONTEXT、History Baseline、Document codec 和 Example ID materializer；依据当前 AGENTS/code-review、ADR0069/0012/0029 追踪兼容性。

Issue106 要求 “Validate and apply the same owned structural values”。Edge/source/target、ID/type、Endpoint/Anchor fields 一次捕获；shape、角色、Endpoint/self-loop、live Node、动态 Port、重复 ID 与最终写入复用该值。guard 顺序和空 Endpoint/Anchor Port 的既有区别保持，原 getter receiver、继承/non-enumerable 属性及原始 thrown-value 无包装。

data 仍按要求 “only at the existing Kernel Writer phase”。存在性检查在 Edge shape 阶段，实际值由私有 getter 在所有 semantic guards 后以原 Edge receiver 读取一次，不遍历/冻结业务 data。新 Node-copy 修复没有改变 Edge Writer；metadata、单 Edge Commit、Undo/Redo 与失败原子性保持，没有额外 API、策略、Registry、cap 或 fallback。

新 History 以操作及 Commit identity 识别 Baseline；Create Edge 仍产生普通 Commit，后续编辑正常记录。Document 使用显式应用 codec，未向 Command 增加 JSON 数据政策；Example 分配 ID 时查询当前图，避免恢复文件中的已有 ID 冲突。相对本轮 base 没有扩张到其他 Command 或文档实现。

独立实际命令：`bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts` **153 pass /745 assertions，exit0**。其中额外 Core roundtrip 文件贡献1 test/5 assertions；协调器三 package 命令的152/740是另一次执行，分别记录。`git diff --check BASE...HEAD` exit0；HEAD/tree、canonical patch/hash 与保存文件一致。原始独立输出保存在 `spec-commands.log`。

工程上下文更新：原 affected SVG 失败 `__nodebraidRendererSvgRuntimeInteractionProjection is not a function` 保留于 affected.log；协调器随后运行未修改的完整 SVG suite及整套 affected-after-svg-investigation.log 均exit0，包含SVG、Example Document和docs。调查记录确认相关bundle字节一致，未改源码、断言或harness，也未增加fallback；环境/CLI触发根因尚未证明。这些浏览器结果由协调器执行，本审查未独立运行构建、类型检查、affected、compiled probe、浏览器或完整检查。五个preview、远端CI/发布/readback、合并及main验收仍未由本审查验证。更新前完整报告保留在 spec-before-browser-status-update.md。


## Behavior evidence

### original-affected-svg-fixture-failure

check — failed; exit 1; expected exit 0.

The first current4ec affected attempt failed before the RuntimeInteractionProjection scenario could run because its browser global function was absent. Original source bundle contains the function. Same exact bundle later passes the unchanged whole SVG suite and fresh entire affected check; precise original browser/CLI trigger is unproven, no code or assertion changed, no fallback/retry introduced. This is retained failure history, not a passing product check.

Command: `bun run check:affected --base aba0795079c6e3182d14b698f212c437092ed844`

[Original command output](logs/behavior-1.log)

### same-bundle-svg-focused-investigation

check — passed; exit 0; expected exit 0.

Unmodified complete SVG public browser suite executes successfully in its fresh owned session; generated bundle SHA256 exactly equals original failure bundle4dd32e. Original trigger not reproduced; no root-cause fix claimed.

Command: `bun run --filter '@nodebraid/renderer-svg' test:browser:self`

[Original command output](logs/behavior-2.log)

### current-complete-affected-reverification

check — passed; exit 0; expected exit 0.

Fresh whole current4ec affected types/consumers/public tests/Example Document and SVG native browsers/docs succeed after explicit failure investigation; original failed attempt preserved separately.

Command: `bun run check:affected --base aba0795079c6e3182d14b698f212c437092ed844`

[Original command output](logs/behavior-3.log)

### current-public-integration

check — passed; exit 0; expected exit 0.

Fresh Interaction/History/Document public suites152tests740assertions pass at current source with approved Baseline contract.

Command: `bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests`

[Original command output](logs/behavior-4.log)

### current-original-compiled-controls

check — passed; exit 0; expected exit 0.

Original typechecked three public CreateEdge controls execute against actual current compiled public packages and shared Runtime tokens; accepted a→b remains, no substituted self-loop, ordinary unsupported control rejects.

Command: `bun run /Users/zhou/.codex/local-workflows/nodebraid/runs/254352c8-6f50-44d9-be37-7b6d52fb1c1b/build-and-run-current.ts`

[Original command output](logs/behavior-5.log)

### independent-standards-commands

check — passed; exit 0; expected exit 0.

Independent current-source public suites153tests745assertions include Core Document roundtrip1test5assertions; separate real public file restore/Baseline/CreateEdge/UndoRedo control is embedded in the original command log and not added to that count. Browser coverage not claimed by this reviewer.

Command: `bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts`

[Original command output](logs/behavior-6.log)

### independent-spec-commands

check — passed; exit 0; expected exit 0.

Independent current-source public suites153tests745assertions include Core Document roundtrip1test5assertions; no browser coverage claimed. Original complete commands retained.

Command: `bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts`

[Original command output](logs/behavior-7.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
