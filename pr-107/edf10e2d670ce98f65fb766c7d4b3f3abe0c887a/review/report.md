# Verification report

Run: 27c37196-e03a-4248-8365-dc0f67bb9c25 · ZWkang/nodebraid · issue #106

## Reviewed and published source

- Review base: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Independently prepared append parent: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Published head: `edf10e2d670ce98f65fb766c7d4b3f3abe0c887a`
- Reviewed local head: `1d1d86af6d647a0ef2ef0b6cd6c6839deb3e8fdd`
- Tree: `f4a32721d5036a2e22a2c27d2a217eb7db10280e`
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
- Keep this Issue open for human review/merge, actual main integration and whole-Issue acceptance. This future PR has no agent merge authorization.

## Deduplication

Read all105 Issue/PR records (100+5) and54 PRs through final short pages. Full #27 and #104 bodies and all discussions were read and archived. #27 owns Fragment arrays; #104 / PR #105 deliberately owns only Move Nodes and leaves Create Edge pending. Closed materializer/config repairs and the open Kernel Node-owned-fields repair do not capture this Create Edge input. Unmerged branch behavior is not counted as deployed main.


### public-edge-capture-regression-and-fix

Public Create Edge test-first regression retains the same structural Edge/Endpoint/Anchor values through all guards and the Kernel write, preserving original opaque-data phase/error identity.

Dependencies: none

### affected-consumers

Original compiled Create Edge three controls, property/shape/error/Port/History regressions, relevant types/public suites and affected consumers pass.

Dependencies: public-edge-capture-regression-and-fix

### independent-review

Independent Standards with ponytail-review and Spec inspect the exact committed complete head/tree/patch against Issue106, ADR0069/0029/0012 and the current public Create Edge contract.

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

What this change does: Create Edge keeps the structural values it validates and uses those values for every Transaction check and the final write. Opaque data stays at the existing Kernel Writer read phase.

Source identity:
- Base: dcf13482b68bc2422fc4d714df1226ab0ef259aa
- Head: 1d1d86af6d647a0ef2ef0b6cd6c6839deb3e8fdd
- Tree: f4a32721d5036a2e22a2c27d2a217eb7db10280e
- Binary patch SHA256: 6552a9093fbf333280dfc261414c04e6d3a4b48c77b93a19259366715aed66e5

Scope: the complete base...head diff, sole commit 1d1d86a, both files, and all 513 lines of the new public regression file. The saved patch matches Git byte for byte. Inspection and prepared-task identities agree. I read the saved Issue #106 request, its complete empty discussion, and the independent plan.

Documented standards: No violations found. The capture boundary preserves shape-check order and original thrown values, as required by Boundary Discipline and ADR0029. The late data getter keeps the original receiver and opaque reference under ADR0012. ADR0069's role, Endpoint, self-loop, Node, Port and duplicate-ID checks still precede the single write.

Judgment-only smells: No concrete finding across the Fowler baseline. Endpoint and Anchor capture have different existing empty-port rules; merging them would erase a real contract difference. The private copies are needed to stop application Port callbacks from changing accepted evidence.

Ponytail assessment: Correct, safe and lean for one isolated Host per Canvas and synchronous Commands. I traced Gesture cleanup/materialization, Command execution, Port definitions, Kernel freezing and rollback, and History undo/redo. Regressions cover inherited and non-enumerable getters, exact error identity, validation order, late data reads and unchanged state on failure.

Independent checks at this head: `bun test packages/plugin-interaction/tests packages/plugin-history/tests` exited 0: 101 tests, 576 assertions. Identity audit and `git diff --check` passed; the checkout stayed clean.

Not checked independently: TypeScript, build, browser rendering, full engineering check, CI, publication or main integration. The Renderer fixture is not visual evidence.

Verdict: passed. Looks good. Ship.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

# Spec review — Issue #106

Verdict: **passed**. 未发现要求遗漏、错误实现或未请求的范围扩张。

- Base: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Head: `1d1d86af6d647a0ef2ef0b6cd6c6839deb3e8fdd`
- Tree: `f4a32721d5036a2e22a2c27d2a217eb7db10280e`
- Complete binary patch SHA256: `6552a9093fbf333280dfc261414c04e6d3a4b48c77b93a19259366715aed66e5`

已独立读取 Issue106 全文及全部零评论、input/prepared plan、fixture-correction，确认 request 与原始正文一致。核验完整两文件补丁、唯一提交、inspection/complete.patch，并完整审阅新增513行公共测试。依据 AGENTS/CONTEXT、tracker/discussion/code-review、ADR0069/0068/0012/0029，追踪 Interaction 注册、Command、Port runtime、Kernel Writer 和 History。

Issue 要求 “Validate and apply the same owned structural values”。handler 一次捕获 Edge/source/target roots、ID/type、两 Endpoint 与 Anchor 的 nodeId/portId/role；shape 仍按 Edge → source Anchor → target Anchor 短路。Transaction 内仍依次检查角色、Endpoint/Anchor 与 self-loop、当前 Node、动态 Port Definition、重复 Edge ID，最后仅写入同一已捕获 Edge；应用 Port callbacks 改写原输入不会替换写入结构。

Issue 要求 data “read … only at the existing Kernel Writer phase … once with the original receiver”。data presence 仍在 Edge shape 后、Anchor roots 前检查；私有 getter 在 Writer 最后复制 data 时以原 Edge/Proxy receiver 转发一次 Get。未提前读取、遍历或冻结 opaque data，原值/原异常保留；所有 semantic guard 均先于该读取。Node-level/Port-aware 连接、原 INVALID_CONNECTION/STALE_GESTURE 顺序、pre-abort、单 Commit metadata、History undo/redo 与 cleanup 保持。未修改其他 Commands/Gesture、materializer、Kernel、公开 API、依赖或新增 cap/fallback。

实际独立执行当前 head：`bun test packages/plugin-interaction/tests packages/plugin-history/tests` **101 pass /576 assertions，exit0**；`git diff --check BASE...HEAD` exit0；HEAD/tree、完整 binary patch/hash 与记录一致。原始日志见同目录 `spec-commands.log`，已回读。公共应用 Renderer Provider 属于 backend seam，结果不证明原生浏览器输入。

未独立运行构建、类型检查、原 compiled probe、affected、浏览器或完整工程检查；既有协调器结果未计作独立执行。远端发布/current-head CI、完整原始报告/media readback、人工合并与 main 全 Issue 验收仍未由本审查验证。


## Behavior evidence

### public-edge-substitution-red

red — passed; exit 1; expected exit 1.

Original public Command regression after successful typecheck writes target a when the accepted input/expected literal is b. The original compiled three controls separately show stable valid and invalid outcomes; this failure is actual behavior, not setup.

Command: `bun test packages/plugin-interaction/tests/create-edge-input-values.test.ts`

[Original command output](logs/behavior-1.log)

### current-public-edge-input-controls

green — passed; exit 0; expected exit 0.

40 current type-corrected public Command regressions pass268 assertions: one structural observation/receiver; exact read/error/abort and late data phases; no premature data reads for semantic rejection; dynamic Port callbacks cannot replace captured evidence; opaque data reference and History preserved.

Command: `bun test packages/plugin-interaction/tests/create-edge-input-values.test.ts`

[Original command output](logs/behavior-2.log)

### current-related-interaction-history

green — passed; exit 0; expected exit 0.

101 complete public Interaction/History tests pass576 assertions at current source, including existing Command/Connection/Gesture/config/cleanup and History behavior.

Command: `bun test packages/plugin-interaction/tests packages/plugin-history/tests`

[Original command output](logs/behavior-3.log)

### current-original-compiled-reproduction

green — passed; exit 0; expected exit 0.

Same real public compiled controls: stable valid a→b succeeds; stable self-loop rejects INVALID_CONNECTION and preserves View; original changing edge root is read once, succeeds with accepted a→b and never writes the later self-loop.

Command: `bun run /Users/zhou/.codex/local-workflows/nodebraid/runs/27c37196-e03a-4248-8365-dc0f67bb9c25/build-and-run-current.ts`

[Original command output](logs/behavior-4.log)

### current-affected-consumers

check — passed; exit 0; expected exit 0.

Actual affected checks pass selected dependent packages/types/tests, real SVG/Examples browsers and docs. Original plan/log are retained; this does not replace later formal full verify.

Command: `bun run check:affected --base origin/main`

[Original command output](logs/behavior-5.log)

### historical-role-fixture-type-failure

check — failed; exit 1; expected exit 0.

Historical expanded fixture typecheck failed because generic trace helper widened fixed source/target literals to string. Two as-const annotations preserve the actual public literal types without changing runtime inputs, assertions or production code. Current typecheck-corrected.log is exit0 and all focused/related tests reran successfully; this is not a current delivery failure.

Command: `bun run --filter '@nodebraid/plugin-interaction' typecheck:self`

[Original command output](logs/behavior-6.log)

### independent-standards-execution

check — passed; exit 0; expected exit 0.

Original independent standards review executed101 complete Interaction/History tests /576 assertions at exact reviewed head 1d1d86af6d647a0ef2ef0b6cd6c6839deb3e8fdd. Implementer evidence is separate and was not counted as independent.

Command: `bun test packages/plugin-interaction/tests packages/plugin-history/tests`

[Original command output](logs/behavior-7.log)

### independent-spec-execution

check — passed; exit 0; expected exit 0.

Original independent spec review executed101 complete Interaction/History tests /576 assertions at exact reviewed head 1d1d86af6d647a0ef2ef0b6cd6c6839deb3e8fdd. Implementer evidence is separate and was not counted as independent.

Command: `bun test packages/plugin-interaction/tests packages/plugin-history/tests`

[Original command output](logs/behavior-8.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
