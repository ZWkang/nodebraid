# Verification report

Run: 6effc8e5-4000-4e99-a7db-33a105722045 · ZWkang/nodebraid · issue #100

## Reviewed and published source

- Review base: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Independently prepared append parent: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Published head: `bef165a67f17d2cbc28519baa4efe6da11d6c56f`
- Reviewed local head: `65b1da44adec388fd586d9806670ce3895972752`
- Tree: `a4c45edaf0ef9ec63f3e0bdeb3ee6e9983adde93`
- Complete binary patch SHA-256: `bda03b6671b10f555d74473aff2fa4f39350bf84019c7a4bcb0a67f91fa0221f`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

## Confirmed defect

On fetched main `dcf13482b68bc2422fc4d714df1226ab0ef259aa`, Basic Canvas silently discards inherited or non-enumerable numeric Interaction policy fields. A legal class with `minZoom = 2` and `maxZoom = 1` exposed through prototype getters is rejected by direct Interaction installation, but becomes active through `createBasicCanvasPlugin()`.

A fresh compiled public-package probe creates real Plugin Hosts, Kernel, Port, Command, Session, Renderer Plugin and Interaction. A public-interface recording Renderer supplies the external backend seam; no Runtime collaborator or configuration validator is mocked. Six comparisons complete with Host cleanup:

| Policy fields | Direct Interaction | Basic preset |
| --- | --- | --- |
| own enumerable minZoom 2 / maxZoom 1 | INVALID_CONFIG | INVALID_CONFIG |
| inherited class getters, same values | INVALID_CONFIG | **active** |
| own non-enumerable fields, same values | INVALID_CONFIG | **active** |

The invariant that the preset preserves the supplied invalid policy fails with exit 1. The exact reproduction also typechecks against current compiled public declarations. Existing preset tests still pass: **20 tests / 57 assertions**. Fresh preset build and declaration/artifact checks pass.

Original executable source and outputs: local run `20261023T072954-discovery-preset-basic`, `preset-policy-repro.ts`, `preset-policy-red.log`, `preset-policy-types.log`, `preset-build.log`, and `preset-tests.log`.

## Contract and cause

[ADR0066](https://github.com/ZWkang/nodebraid/blob/dcf13482b68bc2422fc4d714df1226ab0ef259aa/docs/adr/0066-publish-a-backend-neutral-basic-canvas-composition.md) keeps the preset an ordinary Composition with Interaction owning policy validation. The existing public [readiness tests](https://github.com/ZWkang/nodebraid/blob/dcf13482b68bc2422fc4d714df1226ab0ef259aa/packages/preset-basic/tests/readiness.test.ts) require creation-time Interaction snapshots, original Interaction failures, and supported inherited/non-enumerable Connection fields. [InteractionConfig](https://github.com/ZWkang/nodebraid/blob/dcf13482b68bc2422fc4d714df1226ab0ef259aa/packages/plugin-interaction/src/contracts.ts) is a readonly structural interface. Direct [Interaction normalization](https://github.com/ZWkang/nodebraid/blob/dcf13482b68bc2422fc4d714df1226ab0ef259aa/packages/plugin-interaction/src/interaction-config.ts) reads its known numeric properties normally.

The preset's `snapshotInteractionConfig()` explicitly captures Connection, but obtains `dragThreshold`, `wheelZoomSensitivity`, `minZoom` and `maxZoom` only from object rest/spread. Rest/spread excludes inherited and non-enumerable properties. Interaction therefore validates defaults instead of the supplied policy. The defect belongs to the preset's ownership transfer, not Interaction validation.

## Acceptance

- Capture all four existing numeric Interaction policy properties through their normal public property reads at Composition creation, once each, and retain those values in the owned snapshot across caller mutation and fresh Host installations.
- Inherited, non-enumerable and ordinary enumerable policies must retain the same supported values. Invalid supplied policies must still fail through Interaction's existing INVALID_CONFIG validation instead of becoming defaults.
- Preserve the original first-read getter exception identity; valid/default/undefined behavior; existing Connection single capture and nested snapshot; unknown/malformed field handling; Renderer config identity and ordinary readiness, rollback and cleanup.
- Repair the shared preset factory with the smallest sufficient change. Do not change public interfaces, validation ownership, optional Plugin installation, algorithm policies, security rules or Runtime behavior. No accessor ban, retry, cap, fallback or dependency.
- Use the existing public Host/Composition/Renderer seam for red/green and relevant valid/invalid/getter/fresh-Host controls, then connected consumers and affected checks, independent Standards with ponytail-review and Spec, the versioned formal full check, exact source/tree/first-parent publication, current-head CI and complete immutable report/media readback.
- Keep this Issue open until human merge, actual main integration and whole-Issue acceptance. Public API policy regressions and ordinary browser Canvas scenes establish different coverage.

## Deduplication

Complete all-state collections contain **99 Issue/PR records and 51 PRs**, both through final short pages. Full #84 and #86 bodies and all discussion were read: #84 / PR #85 retain the Connection object across changing getters; #86 / PR #87 retain its validated materializer in direct Interaction. Neither preserves these four numeric policy properties through the preset. Current #96 / PR #97 and #98 / PR #99 repair Runtime Binding descriptors and Layout Engine identity, respectively; they do not touch this factory.


### public-policy-regression-and-fix

Public Host/Composition red-green retains four numeric policies for inherited/non-enumerable fields; original getter failures and one capture per property remain observable.

Dependencies: none

### affected-consumers

Current affected consumers/types and compiled original reproduction pass; valid policies, fresh Hosts, defaults and prior Connection/lifecycle behavior preserved.

Dependencies: public-policy-regression-and-fix

### independent-review

Independent Standards with ponytail-review and Spec inspect exact committed head/tree/full binary patch against original Issue100 and applicable ADRs.

Dependencies: affected-consumers

### formal-engineering-check

Pinned deployed main agents:run verify executes the actual full check after both reviews pass and retains original logs.

Dependencies: independent-review

### source-publication

Actual remote tree equals verified tree and first parent matches independently saved append parent.

Dependencies: formal-engineering-check

### current-head-ci-and-reports

Current published-head CI, complete paginated feedback, full report and applicable preview artifacts pass immutable byte/hash readback.

Dependencies: source-publication

### human-merge

Human review and normal protected merge to main.

Dependencies: current-head-ci-and-reports

### main-integration-acceptance

Fetched actual main includes delivery merge and passes fresh whole-Issue public acceptance before closure.

Dependencies: human-merge

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: Basic Canvas captures all four numeric Interaction policy properties through normal property reads when creating the Plugin. Inherited and non-enumerable values are retained in the owned snapshot instead of being replaced by defaults.

Reviewed identity:

- Base: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Head: `65b1da44adec388fd586d9806670ce3895972752`
- Tree: `a4c45edaf0ef9ec63f3e0bdeb3ee6e9983adde93`
- Binary patch SHA256: `bda03b6671b10f555d74473aff2fa4f39350bf84019c7a4bcb0a67f91fa0221f`

Scope: complete three-dot base-to-head diff, the preset factory and all 159 lines of `numeric-policy.test.ts`. Read the fresh canonical Issue #100 with its complete empty discussion, independent plan and fixture-correction record. Applied current project rules, local workflow, code-review/ponytail-review and relevant principles.

Hard standards: no violations found. The preset captures values; Interaction still validates them, consistent with ADR0066 and Boundary Discipline. Each known property is read once with its original receiver. Connection remains the first capture and its nested snapshot logic is unchanged. Unknown enumerable fields remain available to existing Interaction validation. Default/undefined handling, Renderer configuration identity and lifecycle ownership remain intact.

Traced Examples → Composition → Interaction normalization → wheel/pan → Session → Renderer observation, plus readiness/rollback cleanup. The public tests use real Host/Runtime services and an explicit Renderer backend fixture; they do not claim native browser input. Original getter failures are checked by strict object identity.

Judgment checks: no concrete Fowler smell found. For one isolated Host per Canvas, the existing small snapshot helper is the correct owner. The change adds no validator, interface, dependency, fallback, new policy or speculative abstraction.

Actual independent check: `bun test packages/preset-basic/tests` passed 47 tests / 147 assertions at this head. It covers all four invalid policies across enumerable/inherited/non-enumerable properties, effective zoom/drag behavior, one-time capture across mutation and fresh Hosts, original errors, Connection and existing lifecycle controls. Raw output is saved in `standards-tests.log`.

Also verified exact head/tree/base, full saved patch bytes/hash, prepared-task/inspection binding, clean worktree and `git diff --check`. Implementer red/green and affected results were not relabeled as independent execution.

Not checked independently: typecheck/builds, browsers, full engineering gate, live GitHub refresh, current-head CI, publication or merge.

Verdict: passed. Looks good. Ship.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

# Spec review — Issue #100

Verdict: **passed**. 未发现规格遗漏、错误实现或未请求的范围扩张。

- Base: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Head: `65b1da44adec388fd586d9806670ce3895972752`
- Tree: `a4c45edaf0ef9ec63f3e0bdeb3ee6e9983adde93`
- Complete binary patch SHA256: `bda03b6671b10f555d74473aff2fa4f39350bf84019c7a4bcb0a67f91fa0221f`

已独立读取 Issue100 完整原文及全部零评论、prepared/input 计划和 fixture-corrections，核验完整两文件补丁、唯一提交、inspection/complete.patch。依据当前 AGENTS/CONTEXT、tracker/discussion、code-review、ADR0066/0029，以及 Preset → Interaction normalization/runtime → Renderer/Session 的公共契约审查。

Issue 要求 “Capture all four existing numeric Interaction policy properties … once each”。共享 factory 显式以正常属性读取捕获 dragThreshold、wheelZoomSensitivity、minZoom、maxZoom，随后只保存并冻结该值；rest 排除这些已捕获字段，不会重复执行其 getter。继承、non-enumerable 与 enumerable 的数值均到达同一 Interaction validator，invalid 值不再丢失为默认值。默认/nullish 语义仍由原 validator 处理，未增加 preset 校验或改变错误域。

Issue 同时要求保留原 first-read getter identity、Connection snapshot、unknown/malformed handling、Renderer config identity 与 lifecycle。新 getter 回归使用捕获后 toBe 验证原对象；既有 Connection 单次读取及 nested copy/freeze 分支不变。非法整体配置继续交 Interaction，剩余 enumerable shell 保留原未知字段处理；Renderer Config 仍按原引用转交。Child 安装、readiness、rollback、逆序 cleanup 和可选 sibling 能力未改变，无新 API、Registry、策略、依赖或 fallback。

独立执行当前 head 的 `bun test packages/preset-basic/tests`：**47 pass / 147 assertions，exit 0**，包括数值策略、fresh Hosts、Connection/readiness、Renderer Config identity 与 cleanup 控制；`git diff --check BASE...HEAD` exit 0，完整 raw patch/hash 与记录一致。命令和原始输出保存在同目录 `spec-commands.log`。Recording Renderer 是公开应用 backend seam，此结果不证明原生浏览器交互。

未独立运行构建、类型检查、affected、浏览器或完整工程检查，未将已有协调器日志计为独立执行。当前 head 远端发布/CI、完整报告/media readback、人工合并及 main 全 Issue 验收仍未由本审查验证。


## Behavior evidence

### conformant-public-policy-red

red — passed; exit 1; expected exit 1.

Type-valid public regressions against original main factory reject bad policy but fail because inherited/non-enumerable fields are dropped. Source was restored in finally; unchanged final fixtures then pass the fixed factory. Retained original failing execution.

Command: `bun test packages/preset-basic/tests/numeric-policy.test.ts`

[Original command output](logs/behavior-1.log)

### current-public-composition

green — passed; exit 0; expected exit 0.

Current 65b1 source passes47 Composition public tests/147 assertions. Real public Renderer Input verifies sensitivity/clamps/drag threshold for enumerable/inherited/non-enumerable fields, caller mutation, two fresh Hosts, exact original getter errors and actual cleanup. This is public API input, not native browser input.

Command: `bun test packages/preset-basic/tests`

[Original command output](logs/behavior-2.log)

### current-connected-public-seams

green — passed; exit 0; expected exit 0.

Current exact committed source passes connected preset, direct Interaction and Renderer public seam suites, preserving configuration ownership, original domain errors, lifecycle and actual backend seam behavior.

Command: `bun test packages/preset-basic/tests packages/plugin-interaction/tests packages/plugin-renderer/tests`

[Original command output](logs/behavior-3.log)

### current-original-compiled-repro

green — passed; exit 0; expected exit 0.

Original six real public-package comparisons repeated with only nine compiled package paths adapted to the task checkout. Both direct Interaction and preset now reject all three invalid-policy property forms with INVALID_CONFIG; every actual Host is disposed.

Command: `bun compiled-policy-repro.ts`

[Original command output](logs/behavior-4.log)

### current-affected-consumers

check — passed; exit 0; expected exit 0.

Actual affected checks include core facade/preset/root Layout composition, Example browser suites and documentation. Passed before commit at byte-identical source; committed identity recorded independently in inspection.json.

Command: `bun run check:affected --base origin/main`

[Original command output](logs/behavior-5.log)

### historical-test-literal-failure

check — failed; exit 1; expected exit 0.

Initial supplemental test used a transposed literal for exp(0.1). Original failure retained; corrected expected literal to1.1051709180756477 without changing tolerance/production, then real conformant red/green rerun. Not a current-source delivery failure.

Command: `bun test packages/preset-basic/tests`

[Original command output](logs/behavior-6.log)

### historical-bun-each-types

check — failed; exit 1; expected exit 0.

Initial readonly literal tuple was passed directly to Bun test.each, whose declarations require a mutable array. Original type error retained; use a mutable copy without changing inputs. Corrected fixtures typecheck even with original production before definitive red replay.

Command: `bunx tsgo --noEmit -p packages/preset-basic/tsconfig.json`

[Original command output](logs/behavior-7.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.

## Review text publication correction

The first generated bundle rendered local review-file paths as text. This correction publishes the complete original independent reviews above and at the same review links, with their original reviewed identities and verification limits. Original prepared, verification and publication receipts are unchanged. It does not represent a new review, engineering check or source revision. Earlier immutable publications remain available in Git history.

[Original independent check output](reviews/standards-tests.log)

[Original independent check output](reviews/spec-commands.log)
