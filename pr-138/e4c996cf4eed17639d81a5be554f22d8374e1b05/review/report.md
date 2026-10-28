# Verification report

Run: 0190bc60-7c9b-4f72-8cd2-28acb0ee31d1 · ZWkang/nodebraid · issue #136

## Reviewed and published source

- Review base: `fe94ea93ed6b06e65e5d29f7846e132a53f8cded`
- Independently prepared append parent: `fe94ea93ed6b06e65e5d29f7846e132a53f8cded`
- Published head: `e4c996cf4eed17639d81a5be554f22d8374e1b05`
- Reviewed local head: `618cb61d25990415e4ab27f0132f2247dc7b8972`
- Tree: `bf0a2377f8e5cd5596b692e98d936d9ae4905a39`
- Complete binary patch SHA-256: `c2fc1bdcb28af89dc09cd4c44b4137503e5e02f3b36d589762e64db655caf476`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## PR risk and merge route

Risk: medium. Route: quick-human.

- standards: medium — Public framework implementation changes Shortcut failure reporting and lifecycle execution completion. Runtime ownership and compatible behavior changes require medium at the public src path floor; small scope and passing checks do not establish low risk.
- spec: medium — 公开Interaction源码改变异步Command拒绝分类及execution完成/Binding预约释放；影响失败可见性与生命周期，但未改变公共API、依赖、权限或构建/审查政策。publicsrc最低medium，范围窄及绿检查不使其降为low。
- packages/plugin-interaction/src/shortcut-runtime.ts: minimum medium risk.

### standards risk: medium

Impact and reasoning: Public framework implementation changes Shortcut failure reporting and lifecycle execution completion. Runtime ownership and compatible behavior changes require medium at the public src path floor; small scope and passing checks do not establish low risk.

Evidence: Complete two-path patch and connected Command/Interaction/Runtime/Basic/Duplicate/Clipboard callers reviewed at exact head618cb61; fresh independent public Bun run passed867 tests/6557 assertions. Before/after identity checks matched full tree, canonical binary bytes/SHA256, clean status, current compiled repair and unchanged policies. Historical dirty/public program results are kept separate and not relabeled.

Rollback: Revert the complete Issue136 commit618cb61d25990415e4ab27f0132f2247dc7b8972 (or its complete future published mapping) back to basefe94ea93ed6b06e65e5d29f7846e132a53f8cded and recreate affected Shortcut Bindings/Hosts rather than relying on cached disposal outcomes. This restores the earlier classification defect and cannot undo application Commands already executed.

### spec risk: medium

Impact and reasoning: 公开Interaction源码改变异步Command拒绝分类及execution完成/Binding预约释放；影响失败可见性与生命周期，但未改变公共API、依赖、权限或构建/审查政策。publicsrc最低medium，范围窄及绿检查不使其降为low。

Evidence: 精确618/treebf0/完整patchc2fc两文件独立审查；own新公共833tests6377assertions0并核对前后clean/targetbase/patch/相关dist hash。修订Issue136+唯一澄清评论、ADR74/28/29、prototype/code×7原值×Sink×dispose矩阵；另核验协调器affected0与v3真实base红/head绿，旧错误oracle未被涂绿。

Rollback: 正常审核后完整revert618cb61d25990415e4ab27f0132f2247dc7b8972，或未来实际published映射的整项生产/回归改动，到fe94ea93ed6b06e65e5d29f7846e132a53f8cded。将重新暴露已确认的分类异常/挂起缺陷；代码回退不会撤销已经执行的应用Command、替换现有Activation代码或自动释放此前挂起的execution/reservation。

Automatic routing is a candidate only. The coordinator still checks current PR status, report publication, pre-merge acceptance and authorization immediately before a head-bound merge.

## Acceptance plan

## Confirmed defect

Base: `fe94ea93ed6b06e65e5d29f7846e132a53f8cded`.
Public seam: real Plugin Host + Basic Canvas Composition + Command Service + Interaction Shortcut, driven through a typed Recording Renderer’s public normalized Keyboard Input control/behavior phases. This is not a native keyboard or SVG claim.

A Command Handler throws an application-owned Proxy(Error). Its native `getPrototypeOf` trap throws a separate inspection failure. Direct Command execution rejects with the original Proxy by reference and does not invoke that trap. The Shortcut rejection classifier invokes it through `error instanceof CommandError`; the classifier’s exception escapes an ignored Promise before Fault reporting and execution completion.

The original strict TypeScript compile exited **0**. The emitted-JS native Bun probe exited **1**, with two passing controls and one failure:

```json
{"route":"direct-command-proxy-control","passed":true,"originalIdentity":true,"prototypeReads":0,"commandRegistrationDisposed":true,"hostDisposed":true}
{"route":"shortcut-ordinary-error-control","passed":true,"faults":1,"originalFaultPreserved":true,"bindingDisposed":true,"reservationReleased":true,"hostDisposed":true}
{"route":"shortcut-proxy-rejection","passed":false,"handlerCalls":1,"prototypeReads":1,"faults":0,"originalFaultPreserved":false,"unhandledRejections":1,"unhandledIsInspectionFailure":true,"commandRegistrationDisposed":true,"bindingDisposed":false,"reservationReleased":false,"conflictCode":"SHORTCUT_ALREADY_REGISTERED","hostDisposed":false,"rendererDisposed":false}
```

All public disposals were attempted. The failed control records pending public cleanup after the Handler rejection and finite native event-loop turns; it does not claim cleanup success or infer a wall-clock timeout. The isolated Bun child actually exited1, and no browser/server was started. Both ordinary controls completed their Host/Renderer cleanup.

Original full public-program SHA256: `1e759b79df9d0528d6c9ac636e3f03134173a2a57fa462b1d71ed4b62e4d1f2a`. Source, emitted JS/map, original stdout/stderr, all observations, command/exit receipts and exact production artifact hashes are retained unchanged.

## Reproduction

After the public workspace build, use a real Host with `createBasicCanvasPlugin(() => recordingRenderer)` and a Consumer requiring `commandService` and `interactionShortcutService`. The recording fixture implements the existing `CanvasRenderer` interface and drives the subscribed control and behavior callbacks with ordinary normalized `key.down`.

```ts
const original = new Error('caller-owned Command rejection');
const inspectionFailure = new Error('native getPrototypeOf failed');
const rejection = new Proxy(original, {
  getPrototypeOf() { throw inspectionFailure; },
});
const command = defineCommand<void, void>('repro.shortcut.classification');
const commandRegistration = commands.register(command, () => { throw rejection; });
const binding = {
  shortcut: {
    code: 'KeyP',
    modifierAlternatives: [{ alt: false, control: false, meta: false, shift: false }],
  },
  command,
};
const registration = shortcuts.register(binding);
// recordingRenderer emits key.down, KeyP, repeat:false, all modifiers:false.
// Both control and behavior phases return {defaultAction:'prevent'}.
// The Handler finishes; Command Registration disposal resolves.
await commandRegistration.dispose();
// Actual: the Binding disposal Promise remains pending and a new
// shortcuts.register(binding) still throws SHORTCUT_ALREADY_REGISTERED.
const disposal = registration.dispose();
```

The full probe also captures the actual unhandled rejection and verifies its identity against `inspectionFailure`, so the observation is not based only on a pending flag.

## Contract and cause

- [ADR0074](https://github.com/ZWkang/nodebraid/blob/fe94ea93ed6b06e65e5d29f7846e132a53f8cded/docs/adr/0074-compose-shortcuts-through-interaction-authority.md) requires a disposed Binding to stop admission, abort and wait for its started Commands, then release its reservation. Non-capability Command rejections use the stable command Fault path.
- [ADR0028](https://github.com/ZWkang/nodebraid/blob/fe94ea93ed6b06e65e5d29f7846e132a53f8cded/docs/adr/0028-separate-diagnostics-from-error-propagation.md) separates diagnostic observation from failure propagation.
- [ADR0029](https://github.com/ZWkang/nodebraid/blob/fe94ea93ed6b06e65e5d29f7846e132a53f8cded/docs/adr/0029-preserve-domain-and-external-error-identity.md) preserves original external failures and aggregate stages.

In `packages/plugin-interaction/src/shortcut-runtime.ts`, the rejected-execution callback performs native CommandError classification before `finish()`. A classification exception bypasses the completion of the Shortcut-owned execution. The Command Service already settles its own execution; the missing handling belongs to this Shortcut boundary.

## Acceptance

1. A completed Handler rejection cannot strand Shortcut execution ownership. Binding disposal settles after all started Commands finish and releases the reservation; original/cached disposal behavior and fresh Binding isolation remain valid.
2. Preserve the original application rejection by reference. If native error classification itself fails, expose that actual inspection failure alongside the original through the existing stable command Fault path, without silent success, replacement, empty errors or flattening.
3. Preserve genuine `COMMAND_NOT_FOUND` capability-unavailable rejection, expected disposal aborts, ordinary Handler result/error identity, command ID/scope, input Disposition, repeat/gesture arbitration and concurrent/reentrant waiting/reservations. Do not add a Proxy/accessor/record ban, API, timeout, retry, cap, fallback or cancellation policy.
4. Preserve the original independent three-control compiled source, both actual failed executions and every observation unchanged; do not relabel its root-only compound-error predicate green. Ordinary direct/Shortcut controls still require original root identity. Independently execute a clearly versioned public verification that keeps all existing lifecycle/input requirements and additionally requires exactly one compound command Fault, an AggregateError with exactly two slots, and Object.is(slot0, original rejection) plus Object.is(slot1, actual inspection failure). Retain the old root-only observation separately. Repository public Host/Command/Shortcut regressions must be red before implementation and green afterward; no fake collector or weakened failure/completion assertion.
5. Run related/affected consumers, independent Standards + ponytail-review and Spec with exact head/tree/patch/path risk, then canonical formal full verification. Verify actual remote tree/first parent, current-head CI, complete immutable report and mapped native media publication/readback.
6. Keep this Issue open with Refs through normal integration and actual-main whole-Issue acceptance; apply the deployed human-review/merge route and separate closing authority.

## Deduplication

Complete all-state collections: **135 unique Issue/PR records (100+35)** and **69 unique PRs**, with final short pages and unique-ID checks. Related Issue bodies/all comments and PR descriptions/files/reviews/inline threads/replies were read completely:

- #16/#17 retains the original caller signal; #33/#34 rechecks Command admission after options reentry. They do not change Shortcut rejection classification.
- #21/#23 caches Host/Installation disposal before abort reentry. This Binding has a cached Promise, but its already-finished execution is never completed.
- #35/#36 captures Duplicate factory options; #126/#127 captures Shortcut/Binding values. Their implemented value ownership remains intact.
- #69/#70 and #80/#81 concern Runtime diagnostic traversal and event field capture; #134/#135 handles terminal Runtime cleanup inspection. This is the separate Shortcut Command-rejection classifier and its completion path.
- The existing open #110/#128/#130/#132 acceptance/owner records stay separate. No active delivery covers this reproduction.

## Verification clarification

See https://github.com/ZWkang/nodebraid/issues/136#issuecomment-6463977910 for the existing-contract distinction between ordinary root identity and a compound Fault retaining both failures. The original probe SHA256 and all its failed runs remain unchanged; the corrected verification has a separate source hash and actual execution. This is an oracle correction under ADR0028/0029, not a new public API, error policy or permission.


### public-red

Preserve independent strict compiled3 red at fe94 (two controls pass, Shortcut native classification fails with original loss and pending ownership). Add a genuine public Host/Command/Shortcut repository tracer red before implementation, preserving original source/logs.

Dependencies: none

### classify-and-complete

Shortcut-owned completed execution always settles; native CommandError classification failures remain explicit together with the original rejection through stable command Fault. Preserve ordinary identity, genuine capability unavailable, expected aborts, reservations, cached disposal and fresh Binding isolation; no API, policy, cap, retry or fallback.

Dependencies: public-red

### affected-and-independent-review

Related tests and affected consumers pass; independently execute a clearly versioned compound-error public3 program with exactly one Aggregate Fault and two exact original/inspection slots while preserving every lifecycle/input requirement. Retain original root-only source and both failed runs unchanged and never label them green. Expand legitimate native classification, ordinary identity, capability, abort and waiting controls. Exact-head independent Standards+ponytail and Spec full Markdown/risk both pass.

Dependencies: classify-and-complete

### formal-engineering-check

Only after both axes passed, fixed fetched-main agents:run verify really executes this attempt complete bun run check with independent stable head/tree/patch and full raw logs. Preserve all failed/corrected attempts.

Dependencies: affected-and-independent-review

### publish-current-head

One normal append-only delivery PR targeting main with Refs136, actual remote complete tree/ordered firstparent/base inheritance and identity readback. Real current source CI, complete current immutable report and dynamic mapped native manifest/media byte/size/SHA256/Gitblob readback before readiness.

Dependencies: formal-engineering-check

### required-review-and-authorized-merge

All current feedback/checks/evidence/premerge tickets/protection and canonical required focused human review/specific authorization pass before normal immediate expected-head merge. Risk does not create authority; no selfapprove/dismiss/force/bypass/auto queue.

Dependencies: publish-current-head

### main-integration-acceptance

After actual integration fetch main, whole Issue/public program/all tickets and actual main CI/necessary Deploy pass before separately authorized acceptance summary ID+digest/readback/archive and completed close. Keep source open otherwise.

Dependencies: required-review-and-authorized-merge

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: Keeps Shortcut execution completion reliable when native Command-error inspection throws. One stable command Fault retains the original rejection and actual inspection failure; completion runs in finally.

- Base: `fe94ea93ed6b06e65e5d29f7846e132a53f8cded`
- Head: `618cb61d25990415e4ab27f0132f2247dc7b8972`
- Tree: `bf0a2377f8e5cd5596b692e98d936d9ae4905a39`
- Binary patch SHA256: `c2fc1bdcb28af89dc09cd4c44b4137503e5e02f3b36d589762e64db655caf476`
- Changed files: `packages/plugin-interaction/src/shortcut-runtime.ts`; `packages/plugin-interaction/tests/lifecycle.test.ts`.

**Hard standards:** No documented violation found. ADR0074's wait/reservation/release contract and ADR0028/0029's Fault and original-failure contracts remain intact. The narrow classification catch preserves two exact failure references without flattening. The outer finally releases only the completed execution; concurrent executions remain tracked. Genuine capability-unavailable and expected disposal-abort branches retain their existing behavior.

I traced Command execution, Interaction wiring, scoped Runtime diagnostics, Basic Composition and Duplicate/Clipboard registrations. Public tests cover prototype/code inspection, seven actual thrown values, Sink enabled/disabled, disposal before/after rejection, cached disposal and replacement Binding isolation. The fixture implements the public Renderer seam; it is not native keyboard evidence.

**Judgment:** No concrete Fowler smell needs a change. Classification and completion belong at this existing Shortcut owner; another abstraction would add no needed responsibility. Assumed load: isolated per-Canvas Hosts with concurrent Shortcut executions and arbitrary application Handler failures. Looks good. Ship.

**Independent checks:** `/Users/zhou/.bun/bin/bun test packages/plugin-interaction/tests packages/plugin-command/tests packages/runtime-cordis/tests packages/diagnostics/tests packages/plugin-duplicate-selection/tests packages/plugin-clipboard/tests packages/preset-basic/tests` exited 0: **867 pass, 0 fail, 6557 assertions**, 48 files. Full raw output retained. Exact canonical patch bytes, two paths, unchanged policy, clean head/tree and current compiled repair matched before/after.

**Discussion/evidence:** Read Issue 136 and comment 6463977910. Historical root-only public-program failures remain failures; no old program or dirty-tree result is certified green at this head. Repository assertions directly check Fault name, Command ID/scope and both failure identities.

**Risk: medium.** Public implementation changes Fault propagation and execution ownership. Evidence is the complete connected-code review and fresh 867-test run. Revert the entire 618cb61 delivery to base fe94 and recreate affected Bindings/Hosts. Rollback cannot undo application Commands already executed. Focused human review/merge remains required under canonical pr-risk.

Not checked independently: build, formal full check, browsers, corrected compiled-program certification, publication or current-head CI. Worktree access stopped.

**Verdict: passed** (Standards + ponytail-review).


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

Spec verdict: **passed（已实现代码/功能）**；无未解决实现缺口或范围扩张。Risk **medium**。

base `fe94ea93ed6b06e65e5d29f7846e132a53f8cded`；head `618cb61d25990415e4ab27f0132f2247dc7b8972`；tree `bf0a2377f8e5cd5596b692e98d936d9ae4905a39`；完整 binary patch SHA256 `c2fc1bdcb28af89dc09cd4c44b4137503e5e02f3b36d589762e64db655caf476`。完整两文件已审，prepared digest `c21362e67c91892b2f4caf6fd624c9218f305c7e5140875a5e40ba036f4852c0`。

Issue136 要求“cannot strand Shortcut execution ownership”和“inspection failure alongside the original”：窄 catch 只处理 native `instanceof`/`code` 分类，严格保留 `[原 rejection, 实际 inspection]` 两引用，之后仍走一个稳定 command Fault；finally 完成该已结算 execution。没有吞错、flatten、Proxy 禁令或 fallback。普通错误保持根身份；真 `COMMAND_NOT_FOUND`、expected disposal abort、Command ID/scope、Disposition、repeat/Gesture 仲裁、cached disposal、reservation 等待及 fresh Binding 语义保持。

**审查发现并解决的验收缺口：**公共 v2 未检查 Fault 名称、commandId、scope，与澄清评论6463977910的要求不完整。源码未为此改动；独立 v3 加入这些精确断言及冻结检查，输入与原生命周期要求不减弱。同一 v3（SHA256 `46ebafd3cb55210872817d4a6b32ee57be1f64b5c559e605c6d47df38d642004`）在真实 base 红2/3、exit1，在618绿3/3、exit0，两个 strict TSC 均0；模块路径、实际输出及源/JS/map hash 已核验。这是协调器执行，非我的计数。原1e759两次失败、v2 dirty结果与旧 root-only false 均原样保留，不冒称原程序 green。

独立执行 `bun test packages/plugin-interaction/tests packages/plugin-command/tests packages/runtime-cordis/tests packages/diagnostics/tests packages/plugin-history/tests packages/preset-basic/tests packages/core/tests`：**833 pass /6377 assertions，exit0**。前后精确身份、clean、完整patch及相关dist hash未变。已完整读取修订Issue/唯一澄清评论、六条验收、七步计划与公共调用链；父 affected exit0单独记录。

当前仅认证实现：正式 full、远端发布/CI、报告媒体回读、人审合并及实际 main/关闭阶段仍 pending，逐项见JSON。未执行 full/build/affected/browser/GitHub，未认证其它Issue；Recording Renderer不证明 native keyboard，已停读工作树。

公开源码改变异步失败与生命周期所有权，风险 medium。回滚需完整回退618或其未来真实发布映射到fe94；回退会重新暴露原缺陷，不能撤销已执行Command或自动处理已有活跃/挂起Runtime。


## Behavior evidence

### original-public-v1-main-red

red — passed; exit 1; expected exit 1.

Historical original strict program1e759 at basefe94 actually failed2/3, exit1, with original rejection loss/unhandled inspection and pending Binding/Host. Expected red reproduction; not product success.

Command: `native Bun original public3 at basefe94`

[Original command output](logs/behavior-1.log)

### original-public-v1-fixed-root-only-oracle-failure

check — failed; exit 1; expected exit 0.

Retained original byte-identical program still fails2/3 at minimal fixed dirty patch2e311 because its root-only predicate rejects a compound Fault; lifecycle is fixed. This historical failure remains FAILED, not a current-head acceptance certificate.

Command: `native Bun unchanged original public3 at minimal fixed dirty source`

[Original command output](logs/behavior-2.log)

### repository-primary-red

red — passed; exit 1; expected exit 1.

Actual public Host/Command/Shortcut tracer fails before production edit;0pass1fail with native prototype-inspection error.

Command: `bun test packages/plugin-interaction/tests/lifecycle.test.ts --test-name-pattern Shortcut rejection inspection`

[Original command output](logs/behavior-3.log)

### repository-primary-green

green — passed; exit 0; expected exit 0.

The exact same primary tracer bytes pass1test/10assertions after the minimal fix; historical dirty-stage result kept separate.

Command: `bun test packages/plugin-interaction/tests/lifecycle.test.ts --test-name-pattern Shortcut rejection inspection`

[Original command output](logs/behavior-4.log)

### public-v2-dirty-partial-success

check — passed; exit 0; expected exit 0.

Historical ecd4 public3 passed compound-slot/lifecycle checks at dirty source, but lacked direct Fault name/id/scope assertions. Retained as partial evidence only; superseded by explicit v3, not final eligibility.

Command: `native Bun public v2 partial compound oracle`

[Original command output](logs/behavior-5.log)

### public-v3-base-red

red — passed; exit 1; expected exit 1.

The stricter v3 with stable name/id/scope/freeze, exact two error slots and all prior cleanup constraints really fails2/3 at actual basefe94; same bytes as head green.

Command: `native Bun strict emitted public v3 at basefe94`

[Original command output](logs/behavior-6.log)

### public-v3-head-green

green — passed; exit 0; expected exit 0.

Exact same v3 bytes at local618 strictTSC0/nativeBun0,3/3; one stable immutable Fault, original+inspection reference slots, complete Binding/Host/Renderer cleanup; legacy root observation remains false in compound case.

Command: `native Bun strict emitted public v3 at local618`

[Original command output](logs/behavior-7.log)

### related-typecheck

check — passed; exit 0; expected exit 0.

Related Interaction typecheck and test dependencies passed at precommit source contents c2fc; not called a remote/head execution.

Command: `bun run --filter @nodebraid/plugin-interaction typecheck`

[Original command output](logs/behavior-8.log)

### related-public-suite

check — passed; exit 0; expected exit 0.

Related public Interaction/Command/Runtime/Diagnostics suite704tests5742assertions passed at precommit c2fc source contents; current formal full is recorded separately.

Command: `bun test packages/plugin-interaction/tests packages/plugin-command/tests packages/runtime-cordis/tests packages/diagnostics/tests`

[Original command output](logs/behavior-9.log)

### affected-current-head

check — passed; exit 0; expected exit 0.

Exact local618 affected consumers7packages, SVG/Examples browser and Docs pass, source stable; sourceCI later is a separate execution.

Command: `bun run check:affected --base fe94ea93ed6b06e65e5d29f7846e132a53f8cded`

[Original command output](logs/behavior-10.log)

### independent-standards-current-head

check — passed; exit 0; expected exit 0.

Independent Standards own867tests6557assertions at618, source/identity stable, medium; not counted as coordinator execution.

Command: `independent Standards public Bun suite`

[Original command output](logs/behavior-11.log)

### independent-spec-current-head

check — passed; exit 0; expected exit 0.

Independent Spec own833tests6377assertions at618, source/identity stable, medium; v2 finding and v3 actual resolution are retained.

Command: `independent Spec public Bun suite`

[Original command output](logs/behavior-12.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
