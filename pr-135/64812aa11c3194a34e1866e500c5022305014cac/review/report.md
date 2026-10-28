# Verification report

Run: 5297ba1b-e4d6-414f-9a95-d7cb19392296 · ZWkang/nodebraid · issue #134

## Reviewed and published source

- Review base: `e282d6291c98deac2fd65879c94b6bf2881ede6b`
- Independently prepared append parent: `e282d6291c98deac2fd65879c94b6bf2881ede6b`
- Published head: `64812aa11c3194a34e1866e500c5022305014cac`
- Reviewed local head: `37d7131df1b2ffff2c37fb83ac4bc3877795e377`
- Tree: `4800054aa64c34564818f5a5533b4e6698a35e32`
- Complete binary patch SHA-256: `3892550546e1ce446f9847dbd0d9c8deb88eced0739335a106cc9f4b71b2b60b`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## PR risk and merge route

Risk: medium. Route: quick-human.

- standards: medium — Public Runtime code changes terminal cleanup rejection and diagnostic member observation across all Plugin Host consumers. This retains the deployed public-source medium floor and warrants focused human review. The newly integrated Basic Connection configuration/Child lifecycle caller was independently checked; a small unchanged relative patch or green prior attempt cannot establish low risk.
- spec: medium — 公共Runtime cleanup rejection/诊断遍历边界改变，命中packages/*/src的medium下限；新Basic Child生命周期兼容性通过仍需重点人工审阅原树/inspection并列、Sink开关和去重，不能以相同diff或绿测判low。
- packages/runtime-cordis/src/host-diagnostics.ts: minimum medium risk.
- packages/runtime-cordis/src/plugin-installation.ts: minimum medium risk.

### standards risk: medium

Impact and reasoning: Public Runtime code changes terminal cleanup rejection and diagnostic member observation across all Plugin Host consumers. This retains the deployed public-source medium floor and warrants focused human review. The newly integrated Basic Connection configuration/Child lifecycle caller was independently checked; a small unchanged relative patch or green prior attempt cannot establish low risk.

Evidence: Complete newly prepared base e282d6291c98deac2fd65879c94b6bf2881ede6b to head 37d7131df1b2ffff2c37fb83ac4bc3877795e377, tree 4800054aa64c34564818f5a5533b4e6698a35e32 and canonical patch 3892550546e1ce446f9847dbd0d9c8deb88eced0739335a106cc9f4b71b2b60b independently verified. Current Runtime source/test, full Issue134 and Basic/Interaction/Command/History caller chain were read. Fresh independent Runtime/Diagnostics/Basic suites passed 393 tests and 2773 assertions, with compiled Runtime/Basic path presence and exact source checks before/after. No earlier review or full-check result is relabeled as this identity.

Rollback: Revert the complete Issue134 commit 37d7131df1b2ffff2c37fb83ac4bc3877795e377, or its full mapped published delivery, restoring base e282d6291c98deac2fd65879c94b6bf2881ede6b and preserving its already integrated Basic/Shortcut/SVG/Layout fixes. Create fresh Host/Installation instances because disposal promises/outcomes are cached. No schema migration is introduced. Code rollback cannot reverse completed cleanup effects or application Commands already executed; those require the application's existing recovery.

### spec risk: medium

Impact and reasoning: 公共Runtime cleanup rejection/诊断遍历边界改变，命中packages/*/src的medium下限；新Basic Child生命周期兼容性通过仍需重点人工审阅原树/inspection并列、Sink开关和去重，不能以相同diff或绿测判low。

Evidence: 当前完整三文件/323行测试及Host/Installation/Activation/Diagnostics调用链重新核对，新maine282的Basic inherited/hidden materializer→Renderer Child资源链已审查；本人新460tests/3024assertions及6+2公共Host/Basic场景通过。采用basee282 canonical risk blob596298db784c4f3424968cd05a3aca4a6471b1b3。

Rollback: 正常回退37d7131df1b2ffff2c37fb83ac4bc3877795e377完整三文件或未来实际mapped publication，保留e282已有其它修复；无schema/依赖/数据迁移，会恢复inspection替换cleanup及无Sink遍历缺陷。代码回退不能恢复已释放资源或撤销既有Command/cleanup副作用，需依既有生命周期重建Host/Installation。

Automatic routing is a candidate only. The coordinator still checks current PR status, report publication, pre-merge acceptance and authorization immediately before a head-bound merge.

## Acceptance plan

## Confirmed defect

Base: `6fd2d016f6330cc422508b3e51229bea4be2cce0`.
Public seam: `@nodebraid/runtime-cordis.createPluginHost()` → `PluginContext.own()` → Installation or Host `dispose()`.

A resource throws an application-owned `AggregateError`. Reading that error's `errors` property throws a separate inspection failure. Terminal Runtime diagnostic filtering then replaces the resource failure with the inspection failure. Host disposal retains only that replacement, so the original resource failure is absent from both returned error trees.

The original strictly typechecked, emitted-JS public probe ran once against the real production package. It produced two failures and two ordinary-aggregate controls:

```json
{"route":"installation","kind":"throwing-errors-getter","originalAggregateIdentityPreserved":false,"rootIsSecondaryFailure":true,"getterReads":1,"cleanupOrder":["late","failing","early"],"installationState":"disposed"}
{"route":"host","kind":"throwing-errors-getter","originalAggregateIdentityPreserved":false,"secondaryInspectionFailureInReturnedTree":true,"getterReads":1,"cleanupOrder":["late","failing","early"],"installationState":"disposed"}
```

The actual final assertion exits 1 (2/4 controls preserve the original).
This is rejection replacement, **not** a hanging disposal Promise. No product rebuild, full check, online CI failure or mocked Runtime was used.

## Minimal reproduction

Run with the already built public packages:

```ts
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

const original = new AggregateError([new Error('owned resource failed')], 'cleanup');
const inspectionFailure = new Error('errors getter failed');
Object.defineProperty(original, 'errors', {
  get() { throw inspectionFailure; },
});
const host = createPluginHost({ diagnostics: { sink() {} } });
const installation = host.install(definePlugin({
  setup(context) {
    context.own(() => { throw original; });
  },
}));
await installation.whenActive();
const result = await installation.dispose().then(
  () => ({ ok: true as const }),
  error => ({ ok: false as const, error }),
);
if (!result.ok) console.log(result.error === inspectionFailure); // actual true
await host.dispose();
```

The independent full probe uses descriptor-only traversal of framework wrappers, checks original identities before reading member descriptors, and never invokes the failing application getter itself. Source SHA256: `a064d97c4edf1e017bf76d1ac64061e06e43eae6b75ed732907750b8afcb295b`.

## Contract and scope

- [ADR 0004](https://github.com/ZWkang/nodebraid/blob/6fd2d016f6330cc422508b3e51229bea4be2cce0/docs/adr/0004-own-resources-per-plugin-activation.md) requires all resource cleanup to be attempted and its failures explicitly aggregated.
- [ADR 0028](https://github.com/ZWkang/nodebraid/blob/6fd2d016f6330cc422508b3e51229bea4be2cce0/docs/adr/0028-separate-diagnostics-from-error-propagation.md) separates diagnostic observation from error propagation and disables ordinary diagnostics without a Sink.
- [ADR 0029](https://github.com/ZWkang/nodebraid/blob/6fd2d016f6330cc422508b3e51229bea4be2cce0/docs/adr/0029-preserve-domain-and-external-error-identity.md) preserves original external failure references and aggregation stages.

`PluginInstallation.dispose()` selects undiagnosed members before rethrowing the original cleanup error. A native inspection exception exits that selection and reaches the final rejection handler instead. Repair this boundary without suppressing either failure or imposing a new error/accessor policy.

## Acceptance

1. Installation and Host disposal retain every original resource failure by reference, with their existing aggregate stages, even when diagnostic member inspection fails.
2. Any inspection failure that actually occurs remains explicitly observable alongside the resource failure; do not swallow it, replace the original with it, return success, or substitute an empty error list.
3. Ordinary diagnostics disabled without a Sink must not introduce diagnostic-only inspection effects. Preserve configured Sink/Fault Reporter behavior, single cleanup observation and existing de-duplication.
4. Preserve reverse resource cleanup, terminal status, cached disposal Promise/outcome, sparse/inherited members, cycles, supported native indexed reads and original read exceptions. No public API, dependencies, accessor/record ban, cap, retry, fallback or error-tree flattening.
5. Public red/green regressions, affected consumers, independent Standards + ponytail-review and Spec with current-head risk, then canonical formal full verification. Verify actual remote tree/parent, current-head CI and complete immutable report/media publication/readback.
6. Keep this Issue open with Refs until normal merge and actual-main whole-task acceptance. Apply the current main human-review/merge and independent closing gates.

## Deduplication

Fresh complete all-state collections contain 133 unique Issue/PR records and 68 unique PRs, with final short pages and no duplicate IDs. Related requirements and delivery discussions/files/reviews/threads were read completely.

- Closed #69 / merged #70 removes caller-owned map/filter/iterator hooks from Runtime member traversal. That repair remains valid; this is the still-unhandled **native inspection failure boundary**, which needs to retain both resource and inspection failures rather than reimplement the hook removal.
- #31 / #32 concerns the separate Diagnostics error-description output. Its native read failures remain visible; that pure description API is outside this repair.
- #80 / #81 captures Host/event fields once. It does not protect disposal rejection from inspection exceptions.
- No active Issue/PR covers this new public reproduction. Existing managed #127/#129/#131/#133 remain separate and unchanged.


### public-red

Retain original typed compiled4 source/binary/log (2 red, 2 controls), and a repository public Host/own/dispose tracer genuinely red with complete source/preimage.

Dependencies: none

### preserve-disposal-failures

Retain original resource aggregate references and any native diagnostic inspection failure explicitly; disabled ordinary diagnostics performs no diagnostic-only error traversal; preserve cleanup/caching/de-duplication and no policy/API expansion.

Dependencies: public-red

### affected-and-independent-review

Affected public consumers plus original byte-identical compiled4 green and expanded public failure/normal lifecycle controls pass; independent exact-head Standards+ponytail and Spec full Markdown/risk pass.

Dependencies: preserve-disposal-failures

### formal-engineering-check

Only after both axes pass, fixed fetched-main agents:run verify really executes this attempt full bun run check and records stable exact identity with original logs/receipt.

Dependencies: affected-and-independent-review

### publish-current-head

One normal append-only delivery PR to main Refs134; actual remote full tree/firstparent and user identity readbacks, real source CI, current dynamic mapped native manifest and immutable full report/media byte/hash/Gitblob readback.

Dependencies: formal-engineering-check

### required-review-and-authorized-merge

All current feedback/checks/evidence/premerge tickets/protection and actual canonical human/specific authorization satisfied before any expected-head immediate merge. No selfapprove/dismiss/force/bypass/auto queue.

Dependencies: publish-current-head

### main-integration-acceptance

After actual normal integration fetch main; whole Issue public/compiled acceptance and all tickets, actual main CI/required Deploy pass, then separate closing authority, summary comment ID+digest/readback/archive and completed close.

Dependencies: required-review-and-authorized-merge

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: preserves original Runtime cleanup trees alongside diagnostic inspection failures. With no ordinary Sink, diagnostic-only inspection is disabled.

- Base: `e282d6291c98deac2fd65879c94b6bf2881ede6b`
- Head: `37d7131df1b2ffff2c37fb83ac4bc3877795e377`
- Tree: `4800054aa64c34564818f5a5533b4e6698a35e32`
- Binary patch SHA256: `3892550546e1ce446f9847dbd0d9c8deb88eced0739335a106cc9f4b71b2b60b`
- Task digest: `613d5f6a05a5231f6d9a41b64cc61b06d6df2e548b60c191145fa259567fa883`

Independently reviewed the current complete three-file patch and all 323 new test lines, full Issue134/empty discussion and new preparation. Read the present Runtime chain plus newly integrated Basic Connection snapshot/tests, Interaction validation, Gesture/Command invocation and Child resource ownership. Canonical saved bytes, parent, clean checkout and exact identities passed fresh before/after checks.

Hard documented standards: no violations found. ADR0004 cleanup still attempts resources in reverse order and explicitly aggregates failures. The terminal catch retains the existing resource tree and the actual inspection failure as separate members, preserving references and stages under ADR0029. ADR0028 ordinary-diagnostics disabling avoids member-read side effects without changing the cleanup rejection or required Fault Reporter behavior.

Installation/Host cached disposal outcomes, terminal status, dependency cleanup and child de-duplication retain their flow. Basic's inherited/non-enumerable materializer ownership remains at its configuration boundary; its readiness, cleanup and genuine Command/History paths compose with the Runtime repair without new policy.

Judgment-only Fowler smells: no concrete finding. Ponytail: correct, safe and lean for bounded application Host lifecycles. The existing terminal boundary contains the fix; no extra abstraction, accessor ban, retry, cap, flattening or success substitute is introduced.

Fresh independent `/Users/zhou/.bun/bin/bun test packages/runtime-cordis/tests packages/diagnostics/tests packages/preset-basic/tests` exited 0: **393 tests, 2773 assertions**. This invocation covers current inspection-failure controls and the new Basic boundary, including configuration rejection, Host isolation, materialization, Undo/Redo and cleanup. Full raw output is retained; older execution counts were not transferred.

Risk: **medium**, under the deployed public-source floor. Cleanup error/observation behavior affects all Runtime consumers; the complete review and fresh public checks support focused human review. Rollback: revert the entire `37d7131` delivery or mapped publication to this base, preserving integrated fixes, and create fresh Hosts. Code rollback cannot reverse completed resource cleanup or application Commands already executed.

Not independently run: strict TypeScript, product builds, browsers, affected/full checks, compiled-four controls or remote CI/publication. This report covers only the pinned comparison. Worktree access has stopped.

**Verdict: passed. Looks good. Ship.** This is not merge approval.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: passed

base: e282d6291c98deac2fd65879c94b6bf2881ede6b
head: 37d7131df1b2ffff2c37fb83ac4bc3877795e377
tree: 4800054aa64c34564818f5a5533b4e6698a35e32
binary patch SHA256: 3892550546e1ce446f9847dbd0d9c8deb88eced0739335a106cc9f4b71b2b60b
taskDigest: 613d5f6a05a5231f6d9a41b64cc61b06d6df2e548b60c191145fa259567fa883

读取本轮 [Issue134](https://github.com/ZWkang/nodebraid/issues/134) 完整正文/空评论快照和独立新prepared request/plan，重新审查完整三文件/323行测试及Host→Installation→Activation→诊断/Fault/清理链。新maine282的Basic materializer→Composition七Child→Renderer/Interaction资源与相关公共用例已核对，依据当前main规范/CONTEXT、ADR0004/0028/0029。实际补丁与本轮review.patch字节一致；旧报告/正式verify未复用。

未发现缺失、scope creep或错误实现。对照 “retain every original resource failure by reference”，诊断选择的窄catch用固定消息并列保留原cleanup完整树与发生的inspection原值，原阶段/falsey值不丢失；无Sink先禁用普通诊断遍历，仍reject原树，required Fault不受影响。原逆序清理、disposed终态、缓存Promise/outcome、native读取异常和父子去重保留，没有flatten、重试或新API/策略。新增Basic声明回调复制不改变这些清理职责。

本人新进程执行 `bun test packages/runtime-cordis/tests packages/diagnostics/tests packages/preset-basic/tests packages/plugin-command/tests packages/plugin-kernel/tests packages/plugin-renderer/tests packages/plugin-interaction/tests/lifecycle.test.ts packages/core/tests`：460 pass、0 fail、3024 assertions，30文件，exit0。六场景SOURCE逐字节新执行6/6，验证二次native读取、无Sink必需Fault与Sink故障；另真实Basic七Child+继承Connection的Renderer清理错误两场景2/2：Sink无/有时inspection读取0/1，原失败/实际inspection保留、dispose一次、终态及缓存拒绝保持。显式Renderer是公共Provider fixture，不是native浏览器证明。

diff-check通过，最后HEAD/tree/patch/clean核对后已停读工作树；精确程序/命令/原始输出在spec-tests.log。协调器public4/affected仅只读核验，未重复执行。未本人运行build/typecheck/affected/browser/full、GitHub/远端CI/发布/媒体/merge/main验收；结论仅绑定e282→37，不是人工批准或整项完成。

risk: {"level": "medium", "rationale": "公共Runtime cleanup rejection/诊断遍历边界改变，命中packages/*/src的medium下限；新Basic Child生命周期兼容性通过仍需重点人工审阅原树/inspection并列、Sink开关和去重，不能以相同diff或绿测判low。", "evidence": "当前完整三文件/323行测试及Host/Installation/Activation/Diagnostics调用链重新核对，新maine282的Basic inherited/hidden materializer→Renderer Child资源链已审查；本人新460tests/3024assertions及6+2公共Host/Basic场景通过。采用basee282 canonical risk blob596298db784c4f3424968cd05a3aca4a6471b1b3。", "rollback": "正常回退37d7131df1b2ffff2c37fb83ac4bc3877795e377完整三文件或未来实际mapped publication，保留e282已有其它修复；无schema/依赖/数据迁移，会恢复inspection替换cleanup及无Sink遍历缺陷。代码回退不能恢复已释放资源或撤销既有Command/cleanup副作用，需依既有生命周期重建Host/Installation。"}


## Behavior evidence

### original-public-red

red — passed; exit 1; expected exit 1.

Original public main6fd red remains 2 failed /2 ordinary controls; not re-executed after newmain. Logs and exact TS are retained as history.

Command: `bun compiled/runtime-disposal-error-inspection.js`

[Original command output](logs/behavior-1.log)

### original-repo-red

red — passed; exit 1; expected exit 1.

First repository tracer true behavioral failure loses original cleanup AggregateError at6fd.

Command: `bun test packages/runtime-cordis/tests/diagnostic-inspection.test.ts`

[Original command output](logs/behavior-2.log)

### no-sink-tracer-red

red — passed; exit 1; expected exit 1.

Intermediate correction still unnecessarily inspects ordinary diagnostics with no Sink; getter reads1 expected0. Preserved pre-final source.

Command: `bun test packages/runtime-cordis/tests/diagnostic-inspection.test.ts --test-name-pattern disabled`

[Original command output](logs/behavior-3.log)

### historical-fixture-type-failure

check — failed; exit 2; expected exit 0.

Original probe TS2740 direct {} assignment to declared AggregateError.errors any[]; intentionally invalid runtime value corrected via native Object.defineProperty without changing assertions/product source. Historical failure not newmain execution.

Command: `bun run --cwd packages/runtime-cordis typecheck:self`

[Original command output](logs/behavior-4.log)

### current-public-green

green — passed; exit 0; expected exit 0.

Actual current37d7131 strictTS0 and new native Bun4/4; byte-identical original TS with actual current Runtime production artifacts, original+secondary error identities preserved, reverse cleanup/disposed/cache intact.

Command: `bun public-controls/compiled/runtime-disposal-error-inspection.js`

[Original command output](logs/behavior-5.log)

### historical-type-corrected

check — passed; exit 0; expected exit 0.

Original fixture typing corrected with native Object.defineProperty preserving malformed {} input/assertions, no production bytes changed; original strict Runtime typecheck0 atpre-commit final source. Current formal full provides separate newidentity type validation.

Command: `bun run --cwd packages/runtime-cordis typecheck:self`

[Original command output](logs/behavior-6.log)

### prior-8aed-formal

check — passed; exit 0; expected exit 0.

Prior8aed/basebafb actual formal full0/stable,1578tests9289assertions,313.145s. Publication gate detected realmain e282 and preserved this receipt as historical; never a current37d claim or remote execution.

Command: `bun canonical local-agent.ts verify prior-8aed-run reviews.json decisions.json`

[Original command output](logs/behavior-7.log)

### affected-current

check — passed; exit 0; expected exit 0.

Actual current37d affected0/262.641s, consumers, browsers and docs, separate from full.

Command: `bun run check:affected --base e282d6291c98deac2fd65879c94b6bf2881ede6b`

[Original command output](logs/behavior-8.log)

### standards-current

check — passed; exit 0; expected exit 0.

Independent current37d Standards393 tests/2773assertions, no old counts reused.

Command: `bun test current Runtime/Diagnostics/Basic public suites`

[Original command output](logs/behavior-9.log)

### spec-current

check — passed; exit 0; expected exit 0.

Independent current37d Spec460 tests/3024assertions plus6+2 actual public Host/Basic controls; recording Renderer fixture is explicitly nonbrowser/nonnative.

Command: `bun test current public suites; saved6+2 actual programs`

[Original command output](logs/behavior-10.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
