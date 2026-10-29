# Verification report

Run: d0a84499-2252-4ce2-bb46-8ac90da845ab · ZWkang/nodebraid · issue #140

## Reviewed and published source

- Review base: `447d7ae999959888b2dd3aefeaef1fa1784dcb7d`
- Independently prepared append parent: `447d7ae999959888b2dd3aefeaef1fa1784dcb7d`
- Published head: `cfb017c59c7fdcf71f4eff19aba5fca4b065d4f2`
- Reviewed local head: `f5df3997555bf3470eababb626c0b87c453720c1`
- Tree: `4591a2f466a7435ca4e4cd27aa948f695b929b02`
- Complete binary patch SHA-256: `953ff2e94631ef139d4a4d0c99f435a498681385d41be888daaa881b10d8176a`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## PR risk and merge route

Risk: medium. Route: quick-human.

- standards: medium — Public Runtime implementation changes which original error objects appear in cleanup diagnostic observation. Public packages/*/src has a medium floor; a one-line change and successful checks do not establish low risk.
- spec: medium — 公开Runtime框架源码改变清理诊断中原错误身份和未变化聚合保留行为；packages/*/src适用最低medium，一行补丁和绿检查不能证明low。未改变公共API、依赖或审查/发布政策。
- packages/runtime-cordis/src/host-diagnostics.ts: minimum medium risk.

### standards risk: medium

Impact and reasoning: Public Runtime implementation changes which original error objects appear in cleanup diagnostic observation. Public packages/*/src has a medium floor; a one-line change and successful checks do not establish low risk.

Evidence: Complete current patch953ff2e94631ef139d4a4d0c99f435a498681385d41be888daaa881b10d8176a at headf5df3997555bf3470eababb626c0b87c453720c1/tree4591a2f466a7435ca4e4cd27aa948f695b929b02 vs independently saved447d7ae. Actual changed paths are host-diagnostics.ts and diagnostic-cleanup.test.ts; reviewed complete cleanup/diagnostic call chain, same-test-byte primary red/green, legitimate diagnosed-member filtering, current affected exit0/stable and unchanged-public-program8of8. Reviewer product/Git/GitHub execution0; evidence paths are tdd/, affected-receipt.json and public-controls/.

Rollback: Use a normal subsequent commit reverting the single production comparison change and its regression additions, retaining original evidence. No persistent data migration or irreversible write; rollback reintroduces the NaN cleanup-diagnostic aggregate identity defect without changing the caller disposal rejection contract.

### spec risk: medium

Impact and reasoning: 公开Runtime框架源码改变清理诊断中原错误身份和未变化聚合保留行为；packages/*/src适用最低medium，一行补丁和绿检查不能证明low。未改变公共API、依赖或审查/发布政策。

Evidence: 完整f5df3997/tree4591a2f4/patch953ff2e9两路径及Host/Activation/Installation/Diagnostics调用链独立阅读；同测试字节primary真red→green，dirty同patch相关319/2374与typecheck0，当前head affected0/stable、原字节公共8新strict0/Bun0/8of8以及653产物/模块归属已核对。Spec自身执行0，未借旧head结果。

Rollback: 正常追加回退Issue140两路径补丁，保留其他已集成main功能；无数据迁移或不可逆操作，但会重新引入NaN聚合诊断身份缺陷，须重新验证。

Automatic routing is a candidate only. The coordinator still checks current PR status, report publication, pre-merge acceptance and authorization immediately before a head-bound merge.

## Acceptance plan

## Confirmed public behavior

At main `447d7ae999959888b2dd3aefeaef1fa1784dcb7d`, an Owned Resource throwing a native `AggregateError([NaN])` keeps its original object in the Installation/Host disposal rejection, but loses that object from the raw cleanup Diagnostic Event when a Sink is enabled. No error member has previously been diagnosed or removed in this case.

The first strict TypeScript compilation exited0. The emitted JavaScript ran once with native Bun and the actual public package imports: 8 controls, 6 passed and 2 failed, final assertion exit1. Both failures were the enabled-Sink NaN-member cases (Installation and Host routes). Error-member controls and disabled-Sink cases passed. All eight preserved rejection members, reverse cleanup, disposed state and cached disposal results. No product build/full check/browser/CI was executed for this probe.

```ts
import { createPluginHost, definePlugin, runtimeDiagnosticEvents } from '@nodebraid/runtime-cordis';
const original = new AggregateError([NaN], 'application cleanup');
const events: import('@nodebraid/diagnostics').DiagnosticEvent[] = [];
const host = createPluginHost({ diagnostics: { sink(event) { events.push(event); } } });
const installation = host.install(definePlugin({ setup(context) {
  context.own(() => { throw original; });
} }));
await installation.whenActive();
const failure = await installation.dispose().then(
  () => { throw new Error('Expected cleanup rejection'); },
  error => error,
);
const observed = events.find(event => event.name === runtimeDiagnosticEvents.installationDisposeFailed);
console.log(observed?.error === failure); // false; no member was filtered
await host.dispose();
```

The complete assertion program locates the original AggregateError by reference through framework-owned aggregate wrappers. Source SHA256 `6650d16ccf78006be316e10435d51cdd8754a41e5248aad92da5e2e02b11a91b`. Its original red source, emitted JS/map, raw logs, observations and compiler/runtime receipts are retained. The actual653-file main build prerequisites matched before and after this investigation; these are existing build bytes, not a new check result.

## Existing contract and cause

- [ADR0028](https://github.com/ZWkang/nodebraid/blob/447d7ae999959888b2dd3aefeaef1fa1784dcb7d/docs/adr/0028-separate-diagnostics-from-error-propagation.md) separates diagnostics from failure propagation and defines raw optional errors.
- [ADR0029](https://github.com/ZWkang/nodebraid/blob/447d7ae999959888b2dd3aefeaef1fa1784dcb7d/docs/adr/0029-preserve-domain-and-external-error-identity.md) preserves original external failure object identity in diagnostic observation.
- The current public DiagnosticEvent.error type is unknown. The finite-number restriction belongs to safe attributes/details, not opaque raw errors or AggregateError members.
- Existing public cleanup tests preserve the original aggregate object when diagnostic filtering removes nothing. The Runtime filter compares retained members with `===`; NaN is not equal to itself, so it rebuilds an otherwise unchanged aggregate and each affected ancestor.

This is an observation-identity defect. The actual disposal rejection remains correct. Existing removal of already-diagnosed members is still intentional and must not be disabled.

## Acceptance

1. With an enabled Sink and no members removed, cleanup diagnostics retain the original application AggregateError object containing NaN, through both Installation and Host disposal. Preserve the original rejection and aggregation stages.
2. Preserve intentional diagnostic de-duplication when members were already diagnosed, sparse/inherited members, original numeric values including signed zero, ordinary references, cycles and supported native read/error behavior. Keep caller arrays/errors unchanged.
3. Preserve disabled ordinary diagnostics, exactly one cleanup observation, reverse cleanup, terminal state, cached disposal Promise/outcome, configured Sink and Fault Reporter behavior. No new error-value restrictions, API, dependency, cap, retry, fallback or flattening policy.
4. Add a public lifecycle red-green regression before the minimal implementation; run related and affected consumers, independent Standards + ponytail-review and Spec with current-head risk, then canonical formal full verification. Re-run the unchanged public assertion program against the actual newly built repair.
5. Verify actual source publication tree/append parent, current-head complete CI/feedback and immutable full report/media publication/readback. Deliver one PR to main with Refs, retain this Issue open for actual-main whole-task acceptance, and use the existing independent review/merge/closure gates.

## Deduplication

Complete all-state collections contained139 unique Issue/PR records (100+39) and71 PRs. Related Issues13/31/69/80/134/136 and deliveries14/32/70/81/135/138 were read with complete discussions, review threads/replies and file lists.

- #13/#14 concerns safe diagnostic values, not raw unknown errors.
- #31/#32 concerns the separate JSON error-description output.
- #69/#70 removed caller-owned collection hooks; #134/#135 retained cleanup and native inspection failures. Their completed fixes remain valid. The new case has ordinary native arrays and no inspection exception.
- #80/#81 captures Host/event fields; #136/#138 fixes Shortcut rejection classification. Neither covers this NaN comparison in Runtime aggregate filtering.
- No current open delivery covers this bounded input; #137 remains a separate feature owned by its existing worktree.


## Complete current source discussion

No comments were present in the complete current readback. Canonical source: https://github.com/ZWkang/nodebraid/issues/140

### retain-unchanged-cleanup-diagnostic-identity

At the existing public Host/PluginContext.own/Installation Sink seam, retain a genuine NaN aggregate identity regression red before the minimal shared fix; preserve legitimate de-duplication, numeric values, lifecycle and errors.

Dependencies: none

### verify-current-public-and-affected-consumers

Commit only the defect source/test paths; run current-head check:affected and the unchanged original strict typed eight-case public program on actual repair package artifacts. Preserve original red evidence and exact artifact provenance.

Dependencies: retain-unchanged-cleanup-diagnostic-identity

### independent-axes-and-formal-engineering-check

Standards plus ponytail-review and independent Spec review bind exact head/tree/full binary patch/actual changedFiles and complete risk. After both pass, run canonical agents:run verify for a new real full bun run check; retain actual attempts and logs.

Dependencies: verify-current-public-and-affected-consumers

### publish-current-head-complete-evidence

Normally append the original Issue branch and one main PR using Refs140. Verify actual complete remote tree/ordered parents/base inheritance, current CI/full feedback and actual immutable full report plus all mapped preview scenes readback before technical ready.

Dependencies: independent-axes-and-formal-engineering-check

### required-human-review-and-authorized-merge

Apply actual current main risk policy (source floor medium), required focused human review and authorized immediate expected-head merge with actual merge/tree/parents readback. No standing-grant waiver, self approval, bypass or future-head queue.

Dependencies: publish-current-head-complete-evidence

### actual-main-whole-issue-acceptance-and-authorized-close

After actual merge, fresh main whole-Issue functional/ticket acceptance and actual main CI/necessary Deploy must pass. Only separately authorized summary and completed close, both readback/archive, can complete closure.

Dependencies: required-human-review-and-authorized-merge

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

# Standards + ponytail-review

What this change does: 在 Runtime 清理诊断树的既有“成员未变”判定中使用 Object.is，使原样保留的 NaN 不再触发重建 AggregateError。原始 disposal rejection、真正的诊断去重和生命周期流程保持原义。

**Verdict: passed。发现0项；没有必须修复项或有具体反例的 Fowler smell。**

## 固定身份与范围

- Base / expectedParent：`447d7ae999959888b2dd3aefeaef1fa1784dcb7d`（分别保存）。
- Head：`f5df3997555bf3470eababb626c0b87c453720c1`；tree：`4591a2f466a7435ca4e4cd27aa948f695b929b02`。
- 完整 binary patch SHA256：`953ff2e94631ef139d4a4d0c99f435a498681385d41be888daaa881b10d8176a`。
- 实际 changedFiles：`packages/runtime-cordis/src/host-diagnostics.ts`、`packages/runtime-cordis/tests/diagnostic-cleanup.test.ts`，无 rename。

已完整读取两路径及 PluginActivation→Installation→Host 清理、cleanup-errors、HostDiagnostics 选择/发射、raw DiagnosticEvent 与安全 attributes 的调用链；也读取完整既有 cleanup/inspection 测试、Runtime 契约和 README。判断依据为当前 AGENTS/CONTEXT、ponytail full/review、pr-risk、[Issue140](https://github.com/ZWkang/nodebraid/issues/140)、ADR0004/0028/0029及 Boundary Discipline、Fix Root Causes、Test Behavior、Type System、Idempotence、Prove It Works。

## 独立判断

- 首个错误决定确在共享判定：NaN 经递归原样返回，却因 === 不自等而导致不必要的重建。单行 Object.is 修在负责这个保证的边界；未改发射点、caller rejection、集合遍历、异常传播或包装层次。
- 真正已诊断的引用仍由 WeakSet 过滤；长度/成员比较仍决定何时重建必要的父聚合。没有通过无条件返回原错误来取消去重，也没有把 unknown raw error 错套有限数值 attributes/details 的约束。
- 新增公开回归观察真实 Host/Installation 的返回结果与 Sink 事件：无过滤 NaN 原聚合身份、Host 混合 NaN/-0/Infinity/-Infinity/undefined/Error、真实已诊断成员过滤后保留未变的 NaN 子聚合。逆序清理、缓存 outcome、disposed 状态、caller 数组/值未改与旧稀疏/继承/循环/原生读取失败回归均保留。
- 以进程内 Host 的现有错误树为负载边界，本改动没有新增遍历、集合或共享状态；每个既有比较仅换用标准库同值比较。未声称资源极限、任意调度或性能提升，也没有新增抽象、依赖、cap、retry、fallback、flattening 或错误值禁令。

## 本次实际证据与归属

实读 `tdd/primary-red/receipt.json`、`combined.log` 和对应 green：完全相同 test bytes SHA `83dbd208fe68f3159f8d789a5e0353c04029236df1234afa8e924a7af6338413` 在生产未改时1 fail/4 assertions，最小修复后1 pass/8 assertions。随后 dirty 阶段 related Runtime＋Diagnostics 319/2374、严格 typecheck0 的完整 patch 与本 head 相同；这不是正式 full。

当前 `affected-receipt.json` 绑定本 head/tree/patch，实际 exit0/stable，范围为17个受影响 package、两项根组合测试、React/Examples/SVG browser 和 docs；原 stdout/stderr hash 已逐字节核对。该检查构建本次 Runtime/Diagnostics 所需产物及所选消费者，不推断所有无关产物都重新构建。

`public-controls/receipts.json` 和原始 observations 记录同字节八控制程序 SHA `6650d16ccf78006be316e10435d51cdd8754a41e5248aad92da5e2e02b11a91b` 在本 head 新 strict compile0、原生 Bun0、8/8。两项原 Sink-on NaN 红条件现在保留原聚合引用；其余 rejection/cleanup/cache 检查、uncaught0、unhandled0及 listener 移除均成立。Sink-off 的空事件仅证明普通诊断禁用，不拿不存在的载荷宣称身份已验。核对653份观察到的公共产物 byte/hash 与执行前一致，Runtime 的实际 JS 已含本次 Object.is；未复用旧 main 的6/8红结果为新 green。

上述测试/编译/affected 均由执行器实际运行；本独立 reviewer 新执行测试、编译、build、browser、Git/GitHub均为 **0**。原红、后续 green、旧失败和原计划报告保持原身份。

## 风险与门禁

**Risk: medium / quick-human。** 公开 Runtime src 改变清理诊断的错误对象身份选择，路径最低 medium；单行改动和绿检查不能降为 low。依据为上述完整两路径、调用链和本次固定身份的公开红绿/去重/affected 证据。回滚可用正常后续提交撤销该单行实现与对应回归；无持久化数据迁移或不可逆写入，但会重新引入 NaN 清理诊断身份缺陷，调用者拒绝语义不变。

Not checked: 正式 full 尚待双轴通过后的 canonical verify；远端 source/CI、当前 head 全文报告与动态六场景媒体发布回读、所需人工审阅/merge及实际 main 整项验收未由本轴认证。后续门禁是待执行交付阶段，不是本次代码缺陷。


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

## Spec — passed

审查身份：base/expectedParent `447d7ae999959888b2dd3aefeaef1fa1784dcb7d`；head `f5df3997555bf3470eababb626c0b87c453720c1`；tree `4591a2f466a7435ca4e4cd27aa948f695b929b02`；完整binary patch SHA256 `953ff2e94631ef139d4a4d0c99f435a498681385d41be888daaa881b10d8176a`。真实变更仅 `packages/runtime-cordis/src/host-diagnostics.ts`、`packages/runtime-cordis/tests/diagnostic-cleanup.test.ts`，无rename。

已独立阅读[Issue140](https://github.com/ZWkang/nodebraid/issues/140)完整正文及0评论、完整补丁、两份变更文件和Host/Activation/Installation→未诊断错误选择→Sink调用链，对照ADR0004/0028/0029及公开DiagnosticEvent.error契约。未发现缺项、错误实现或范围扩张。

- 验收1：唯一生产改动将此边界的未变化成员比较改为Object.is；原样保留的NaN不再触发无必要聚合重构。原resource AggregateError及聚合阶段保留，调用者rejection的数据流不变；修复没有把未知错误限制为JSON-safe值。
- 验收2/3：已诊断引用的筛除、实际过滤后的父聚合重建、稀疏/继承索引、循环和读取异常路径均保留。新增公共Host混合NaN/-0/±Infinity/undefined/Error控制检查原数组与值、逆序清理、终态和缓存；真实已诊断过滤控制要求移除已诊断Error同时保留未变化NaN子聚合，可挡住“总返回原aggregate”的错误简化。没有新增API、依赖、读取次数、重试、cap或fallback政策。
- 验收4的本阶段证据已实读：`tdd/primary-red`与`primary-green`使用同一测试字节SHA83dbd208…，生产未改时实际0pass/1fail，最小修复后1pass；原失败保留。dirty阶段Runtime＋Diagnostics319/2374及typecheck0绑定同patch，未称为commit formal执行。当前head的`affected-receipt.json`为0/stable，原stdout/stderr哈希相符。公共程序SHA6650d16c…与原红逐byte相同，`public-controls`新strict emit0、原生Bun0、8/8；旧main原Bun1/6/8不改。新观察的诊断原聚合、拒绝原值、清理、终态、缓存与Host结果全部通过，Fault/uncaught/unhandled均0，listener移除；四项Sink-off只证明无普通事件，不伪称诊断载荷身份。653公共产物前后hash相同，模块解析及实际Object.is产物已核对。

风险 **medium / quick-human**。公开框架诊断身份及清理观察行为改变，适用public src最低medium；一行改动或绿检查不支持low。依据是完整当前源码链、上述真实红绿/affected/公共程序及其局限。回滚应正常追加回退本两路径补丁；无持久数据迁移，但原NaN诊断身份缺陷会恢复，需要重新验证。

本轴自行执行编译/测试/build/browser/Git/GitHub均0；结论来自独立阅读与本次真实证据核对。有限八控制不证明任意调度、资源极限或whole Runtime；非native浏览器证据。后续正式full、远端当前head CI/报告媒体发布及main验收尚待工作流执行，本review不认证交付已完成。

Spec发现 **0项**；无最高严重问题。


## Behavior evidence

### primary-baseline-red

red — passed; exit 1; expected exit 1.

Production still matched main447. The single public lifecycle regression failed at the original diagnostic/rejection identity assertion: 0pass/1fail, four assertions. The later same-byte green is separate.

Command: `bun test packages/runtime-cordis/tests/diagnostic-cleanup.test.ts --test-name-pattern 'terminal cleanup diagnostics retain an unchanged AggregateError containing NaN'`

[Original command output](logs/behavior-1.log)

### primary-minimal-green

green — passed; exit 0; expected exit 0.

The exact same test-file bytes passed after changing only the production same-value comparison: one test/eight assertions. Additional compatibility cases were added afterwards.

Command: `bun test packages/runtime-cordis/tests/diagnostic-cleanup.test.ts --test-name-pattern 'terminal cleanup diagnostics retain an unchanged AggregateError containing NaN'`

[Original command output](logs/behavior-2.log)

### runtime-typecheck-dirty

check — passed; exit 0; expected exit 0.

Strict Runtime package typecheck passed before commit. This dirty source had the same complete binary patch as the reviewed commit; it is not the later formal engineering check.

Command: `bun run --filter '@nodebraid/runtime-cordis' typecheck`

[Original command output](logs/behavior-3.log)

### related-runtime-diagnostics-dirty

check — passed; exit 0; expected exit 0.

Runtime and Diagnostics suite passed319tests/2374assertions, including three new lifecycle cases. This is dirty-stage evidence with the complete patch matching the later commit; overlapping suite results are not added together.

Command: `bun test packages/runtime-cordis/tests packages/diagnostics/tests`

[Original command output](logs/behavior-4.log)

### compiled-public-baseline-red

red — passed; exit 1; expected exit 1.

Original strict compile0 preceded this actual native Bun assertion exit1 on main447: eight controls/six passed/two enabled-Sink NaN identity failures. Caller rejection/lifecycle checks remained correct. BASELINE_PROGRAM_DIR selects the retained baseline program directory for portable replay.

Command: `bun "$BASELINE_PROGRAM_DIR/compiled/runtime-nan-diagnostic.js"`

[Original command output](logs/behavior-5.log)

### current-head-affected

check — passed; exit 0; expected exit 0.

Actual reviewed local head f5df399 passed the selected17-package affected check, root combinations, browser suites and docs with clean/stable head/tree. This is distinct from the formal full engineering check.

Command: `bun run check:affected --base 447d7ae999959888b2dd3aefeaef1fa1784dcb7d`

[Original command output](logs/behavior-6.log)

### compiled-public-repair-green

green — passed; exit 0; expected exit 0.

Byte-identical original entry SHA6650d16c was newly strict-compiled0 and natively executed0 against actual current-head affected-built Runtime/Diagnostics artifacts: all eight controls passed. Four Sink-off cases establish no ordinary events; actual identity payload checks apply to Sink-on cases. REPAIR_PROGRAM_DIR selects the retained repair directory for portable replay.

Command: `bun "$REPAIR_PROGRAM_DIR/compiled/runtime-nan-diagnostic.js"`

[Original command output](logs/behavior-7.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
