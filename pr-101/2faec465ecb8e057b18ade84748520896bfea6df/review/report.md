# Verification report

Run: 6d69806c-94ef-4955-908d-ed755036f118 · ZWkang/nodebraid · issue #100

## Reviewed and published source

- Review base: `227192241e003231e2b939fe7b814bdc075ba2a3`
- Independently prepared append parent: `bef165a67f17d2cbc28519baa4efe6da11d6c56f`
- Published head: `2faec465ecb8e057b18ade84748520896bfea6df`
- Reviewed local head: `a1ff3d87e5e07f049ed30a6285124d1e415ec565`
- Tree: `6efa3dfc1aaeb1905bb6fb3a81c4a47c126070c9`
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

What this change does: Basic Canvas captures all four numeric Interaction settings when its Plugin is created. Inherited and non-enumerable values now reach the same Interaction validator as ordinary properties.

Source identity:
- Base: 227192241e003231e2b939fe7b814bdc075ba2a3
- Head: a1ff3d87e5e07f049ed30a6285124d1e415ec565
- Tree: 6efa3dfc1aaeb1905bb6fb3a81c4a47c126070c9
- Binary patch SHA256: bda03b6671b10f555d74473aff2fa4f39350bf84019c7a4bcb0a67f91fa0221f

Scope: the complete base...head diff, both files and all 159 new test lines. Commits bef165a and a1ff3d8 were inspected. The canonical saved patch matches Git byte for byte. The merge parents, independent review base, expected append parent and task/inspection digest agree. I read the complete Issue #100 request, its empty discussion and the prepared plan.

Hard standards: No violations found. ADR0066 and Boundary Discipline keep validation in Interaction; the preset only owns a snapshot. Normal property reads preserve inherited values, non-enumerable values, getter receivers and original exceptions. Rest/spread still retains unknown fields for existing validation. Default/nullish handling, Connection capture and nested copying, Renderer configuration identity and Child cleanup remain unchanged.

Judgment-only smells: No concrete finding across the full Fowler baseline. The shared factory changes one capture step, without duplicating Interaction's validation or introducing another configuration model.

Ponytail assessment: Correct and lean for isolated Canvas Hosts. I traced creation-time capture, fresh Host installations, Interaction normalization, wheel/pan Session updates, Command/History lifecycle and Examples. Current Runtime Binding validation and the separately installed Layout Plugin remain compatible. Public tests exercise invalid policies, observable zoom/drag behavior, mutation isolation, getter failures, Connection behavior and cleanup.

Independent command at this exact head:
`bun test packages/preset-basic/tests packages/plugin-interaction/tests packages/plugin-history/tests`

Result: exit 0; 108 tests, 455 assertions. Final source identity, whitespace and clean-status audits passed.

Not checked independently: TypeScript, builds, browser interaction, full engineering check, current remote CI, publication or main integration. Synthetic Renderer input is public API evidence, not browser evidence.

Verdict: passed. Looks good. Ship.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

# Spec review — Issue #100 / PR #101 synchronization

Verdict: **passed**. 未发现验收遗漏、错误实现或范围扩张。

- Base: `227192241e003231e2b939fe7b814bdc075ba2a3`
- Head: `a1ff3d87e5e07f049ed30a6285124d1e415ec565`
- Tree: `6efa3dfc1aaeb1905bb6fb3a81c4a47c126070c9`
- Complete binary patch SHA256: `bda03b6671b10f555d74473aff2fa4f39350bf84019c7a4bcb0a67f91fa0221f`

已独立重读 Issue100 完整正文及全部零评论、prepared request/同步计划和空反馈/依赖记录，确认 request 与正文一致。完整审查两文件 diff、159行新增回归和 fix/merge 提交；实际 merge 第一父为 `bef165a67f17d2cbc28519baa4efe6da11d6c56f`，第二父为上述 main base。依据当前 AGENTS/CONTEXT、tracker/discussion、code-review、ADR0066/0029 和 Interaction/Renderer 公共契约追踪调用链。

Issue 要求四个数值字段 “through their normal public property reads … once each”。snapshot 显式读取 dragThreshold、wheelZoomSensitivity、minZoom、maxZoom；rest 排除已捕获字段，原 receiver、继承/non-enumerable 语义和单次读取保持。冻结的值被各 Host Installation 复用，后续 caller mutation 不会替换它们；合法值仍产生相应 zoom/pan，非法值仍由 Interaction 的 INVALID_CONFIG 拒绝。未把默认值或合法性判断迁入 Preset。

Issue 要求保留 “Connection single capture and nested snapshot … Renderer config identity and ordinary readiness, rollback and cleanup”。Connection 原快照分支、unknown/malformed 转交、原始 getter failure、Renderer Config 引用及 Child 安装/回滚/释放路径不变。新 main 的 Runtime descriptor guard 不改变普通静态 Service Bindings；Engine binding 仍属于显式 sibling Layout，Composition 未因此安装额外能力。无新公开 API、策略、Registry、依赖或 fallback。

独立执行当前 head：`bun test packages/preset-basic/tests packages/plugin-interaction/tests packages/plugin-session/tests packages/plugin-renderer/tests` **132 pass /530 assertions，exit0**；`git diff --check BASE...HEAD` exit0。HEAD/tree、完整 canonical patch/hash 与 inspection 和 complete.patch 一致；原始输出见同目录 `spec-commands.log`，已回读。Recording Renderer 只证明公共 backend seam，不证明原生浏览器输入。

未独立运行构建、类型检查、compiled 六组 probe、affected、浏览器或完整工程检查；协调器结果未计作本轮执行。远端发布/current-head CI、完整报告/media、合并和 main 全 Issue 验收未由本审查验证。


## Behavior evidence

### current-related-public-seams

check — passed; exit 0; expected exit 0.

Fresh synchronized local head current preset/Interaction/Session/History public suites pass144tests581assertions.

Command: `bun test packages/preset-basic/tests packages/plugin-interaction/tests packages/plugin-session/tests packages/plugin-history/tests`

[Original command output](logs/behavior-1.log)

### current-compiled-controls

check — passed; exit 0; expected exit 0.

Actual freshly built public direct and Basic Canvas routes reject invalid numeric policy through enumerable/inherited/nonenumerable shapes in all6controls with INVALID_CONFIG.

Command: `bun run /Users/zhou/.codex/local-workflows/nodebraid/runs/6d69806c-94ef-4955-908d-ed755036f118/compiled-policy-repro.ts`

[Original command output](logs/behavior-2.log)

### current-affected

check — passed; exit 0; expected exit 0.

Fresh current source affected types/public consumers/native Example browser/docs all pass.

Command: `bun run check:affected --base 227192241e003231e2b939fe7b814bdc075ba2a3`

[Original command output](logs/behavior-3.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
