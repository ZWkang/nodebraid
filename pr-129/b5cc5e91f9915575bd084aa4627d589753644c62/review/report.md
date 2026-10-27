# Verification report

Run: ac599065-2060-403e-baa3-e20ab3670f6d · ZWkang/nodebraid · issue #128

## Reviewed and published source

- Review base: `6fd2d016f6330cc422508b3e51229bea4be2cce0`
- Independently prepared append parent: `6fd2d016f6330cc422508b3e51229bea4be2cce0`
- Published head: `b5cc5e91f9915575bd084aa4627d589753644c62`
- Reviewed local head: `d1924090cd37125c9955ebfe869e8e0e974d0776`
- Tree: `1590be6c815c785a35b2755ad0532aecc193c46a`
- Complete binary patch SHA-256: `6bcbb10f76f389ffc3a2cdeb30b5f3544c02787e280dbff6020cc6126e834342`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## PR risk and merge route

Risk: medium. Route: quick-human.

- standards: medium — Compatible public framework capability ownership repair changes accepted inherited/non-enumerable flags and support checks across helper Engines and Runtime Providers. The complete delivery includes public packages/layout-api/src implementation, imposing medium risk under the deployed policy. Focused human review is required; test size or green checks cannot reduce the floor.
- spec: medium — 完整交付修改公共Layout API能力所有权和Provider可执行性，命中packages/*/src的medium路径下限。严格身份测试改善覆盖，但不降低继承/隐藏声明及能力门禁的行为风险，仍需重点人工审阅。
- packages/layout-api/src/layout-engine.ts: minimum medium risk.

### standards risk: medium

Impact and reasoning: Compatible public framework capability ownership repair changes accepted inherited/non-enumerable flags and support checks across helper Engines and Runtime Providers. The complete delivery includes public packages/layout-api/src implementation, imposing medium risk under the deployed policy. Focused human review is required; test size or green checks cannot reduce the floor.

Evidence: Complete base 6fd2d016f6330cc422508b3e51229bea4be2cce0 to head d1924090cd37125c9955ebfe869e8e0e974d0776 patch 6bcbb10f76f389ffc3a2cdeb30b5f3544c02787e280dbff6020cc6126e834342 and connected API/Runtime/Dagre/ELK/History code were independently re-read. Fresh selected public tests exited 0 with 154 tests and 1025 assertions. The two original Error identity regressions now check didThrow and caught-value toBe, closing the previous finding. Source, canonical bytes, task identity and clean checkout checked before/after. Browser/full engineering checks were not independently run.

Rollback: Restore base 6fd2d016f6330cc422508b3e51229bea4be2cce0 by reverting the complete Issue128 delivery: d1924090cd37125c9955ebfe869e8e0e974d0776 and d15e80423973e27a7f1619d129093496f3594c0d in reverse order, or reverting their complete mapped published commit(s), then recreate Engine/Runtime instances. Reverting only the latest test commit does not undo the implementation. No persisted schema migration is introduced. Code rollback does not undo application Commands already executed; their effects require the application's existing History or recovery process.

### spec risk: medium

Impact and reasoning: 完整交付修改公共Layout API能力所有权和Provider可执行性，命中packages/*/src的medium路径下限。严格身份测试改善覆盖，但不降低继承/隐藏声明及能力门禁的行为风险，仍需重点人工审阅。

Evidence: 完整base→d192两文件及253行测试、能力/Proposal/Runtime和Dagre/ELK调用链重新核对；本轮新进程483tests/2776assertions通过，含严格Error身份和54个falsey用例。当前main6fd2 pr-risk blob596298db784c4f3424968cd05a3aca4a6471b1b3独立核实。

Rollback: 普通回退提交撤销完整base6fd2→d192交付，即d1924090cd37125c9955ebfe869e8e0e974d0776与d15e80423973e27a7f1619d129093496f3594c0d两提交或未来映射的完整发布改动；只回退测试提交不足。无schema/数据迁移；会恢复能力丢失缺陷，代码回退不能撤销应用已执行的Command。

Automatic routing is a candidate only. The coordinator still checks current PR status, report publication, pre-merge acceptance and authorization immediately before a head-bound merge.

## Acceptance plan

## Confirmed defect

At main `6fd2d016f6330cc422508b3e51229bea4be2cce0`, `defineLayoutEngine` loses required Layout Capability values supplied through prototype getters or non-enumerable own properties. Both are valid, strictly typechecked `LayoutCapabilities` implementations whose three flags are `true`.

The helper copies only enumerable own properties. Its public `engine.capabilities.incremental`, `fixedNodes` and `selfLoops` are consequently `undefined`. An incremental Layout Request is rejected as `UNSUPPORTED_FEATURE` before the supported Provider runs.

A six-control compiled public-package program reproduces the defect with real Host, Kernel, Command, History and Layout composition:

- Helper + prototype getters: fails; all three flags disappear and compute is never called.
- Helper + non-enumerable own flags: the same failure.
- Helper + ordinary enumerable flags, and all three corresponding direct Engine controls: pass; each computes once, commits the expected position and supports actual Undo/Redo.

The initial strict typecheck and bundle both pass; the compiled program exits 1 with two failures and four passing controls. Rejected calls preserve the exact Document View and History Snapshot and produce no partial Commit. The Provider is an explicit typed control implementation; this is public contract evidence, not a Dagre/ELK algorithm or browser claim.

## Contract and cause

[LayoutCapabilities](https://github.com/ZWkang/nodebraid/blob/6fd2d016f6330cc422508b3e51229bea4be2cce0/packages/layout-api/src/contracts.ts) declares three readonly booleans without an own-property or enumerability restriction. [ADR-0026](https://github.com/ZWkang/nodebraid/blob/6fd2d016f6330cc422508b3e51229bea4be2cce0/docs/adr/0026-validate-layout-contracts-at-their-ownership-boundaries.md) requires an owned frozen Capability shell and explicit unsupported-feature checks.

[The helper](https://github.com/ZWkang/nodebraid/blob/6fd2d016f6330cc422508b3e51229bea4be2cce0/packages/layout-api/src/layout-engine.ts) currently uses `Object.freeze({ ...definition.capabilities })`. Enumeration drops declared values instead of retaining them. The Runtime capability check correctly rejects the resulting missing values, so the repair belongs at the shared helper's ownership boundary.

## Acceptance

- Preserve each declared incremental, Fixed Node and self-loop capability value in the helper's owned frozen shell, including inherited getters and non-enumerable own properties. Preserve both true and false.
- Capture the capability source once and each required value once, with its original receiver. Keep the owned values stable if the caller later changes its source.
- Preserve existing own enumerable copying behavior, original read exceptions and shallow ownership. Do not freeze caller-owned objects or traverse application data.
- The original six-control public reproduction must become green. Supported helper and direct Engines still execute normally; false capabilities still reject before Provider computation, without a Commit.
- Preserve Provider configuration/receiver and original failures, cancellation, Proposal validation, live-revision checks, canonical output, Fixed Nodes, one Commit/net-zero results and History Undo/Redo.
- No new capability, default Provider, Registry, public API, flag coercion/default, plain-record/accessor restriction, retry, cap, fallback, dependency or unrelated Engine/Command binding change.
- Use public Layout API and actual Host/Kernel/Command/Layout/History tests, test-first regression, related/affected checks, independent Standards with ponytail-review and Spec/risk, formal full check, exact publication/current-head CI and complete immutable report/media readback.
- Keep this Issue open through real main integration and whole-Issue acceptance.

## Minimal public reproduction

Run from the repository after building its public packages:

```ts
import assert from 'node:assert/strict';
import { defineLayoutEngine, type LayoutCapabilities } from '@nodebraid/layout-api';

class Supported implements LayoutCapabilities {
  get incremental(): boolean { return true; }
  get fixedNodes(): boolean { return true; }
  get selfLoops(): boolean { return true; }
}

const engine = defineLayoutEngine<void>({
  id: 'supported',
  capabilities: new Supported(),
  compute: input => ({
    sourceRevision: input.revision,
    positions: input.nodes.map(node => ({ id: node.id, position: node.position })),
  }),
});

assert.equal(engine.capabilities.incremental, true);
assert.equal(engine.capabilities.fixedNodes, true);
assert.equal(engine.capabilities.selfLoops, true);
```

The first assertion fails because the helper publishes `undefined`. An ordinary object with the same three enumerable flags passes.

## Deduplication

Complete all-state collections contain 127 Issue/PR records (50 + 50 + 27) and 65 PRs (20 + 20 + 20 + 5). Related bodies, complete discussions, PR reviews/inline threads and changed files were read. #78/PR #79 repair Request and Proposal capture; #88/PR #90 repair cancellation before Proposal inspection; #98/PR #99 repair the Engine object bound by the Runtime Plugin. Their changes do not repair `layout-engine.ts` capability copying. The accepted Port-topology scope in #37 retains the existing capability constraints. No existing delivery covers this helper failure.


### public-red

Preserve independent typed compiled6 red (2 helper failures/4 controls) and add a public Layout Engine capability repository tracer that fails before production change.

Dependencies: none

### capture-declared-capabilities

The existing helper retains declared inherited/non-enumerable/own flags as once-captured owned values, preserving own enumerable copying, original receivers/errors/shallow ownership and all existing Layout policies.

Dependencies: public-red

### integration-and-independent-review

Original byte-identical compiled6 becomes green, expanded public value/error/Provider/Runtime/History regressions and affected checks pass; independent Standards+ponytail/Spec with full current risk pass on complete exact head/tree/patch.

Dependencies: capture-declared-capabilities

### formal-engineering-check

Pinned main agents:run verify executes the real formal full bun run check after both reviews. Preserve all attempts and do not pre-run or repeat this head full check.

Dependencies: integration-and-independent-review

### publish-current-head

Normal remote tree/expected first parent readback, one PR to main Refs128, current source CI and all mapped native scenes/full original review-report immutable publication/readback are verified.

Dependencies: formal-engineering-check

### required-review-and-authorized-merge

Use canonical fetched-main pr-risk and actual specific authorization; satisfy required human route and all current discussion/strict protection/ticket gates before an immediate expected-head merge. No self approval/queue/bypass.

Dependencies: publish-current-head

### main-integration-acceptance

After actual normal merge, fresh main whole-Issue public/compiled acceptance and actual main CI/Deploy pass before independently authorized summary/readback/archive/completed closure.

Dependencies: required-review-and-authorized-merge

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: preserves declared Layout capability values when they are inherited or non-enumerable. The helper still copies enumerable metadata and owns a shallow frozen shell.

- Base: `6fd2d016f6330cc422508b3e51229bea4be2cce0`
- Head: `d1924090cd37125c9955ebfe869e8e0e974d0776`
- Tree: `1590be6c815c785a35b2755ad0532aecc193c46a`
- Binary patch SHA256: `6bcbb10f76f389ffc3a2cdeb30b5f3544c02787e280dbff6020cc6126e834342`
- Task digest: `78e4d4e2ec9c37ff55c487cd2c78900a462bd8c3534f0a961853f4836bcedeb9`

Re-read the complete base-to-head patch, both commits, all 253 test lines, saved Issue128/empty discussion and independent plan. Traced current Input, capability validation, helper, Proposal ownership, Runtime, concrete Dagre/ELK and real Command/History integration. Canonical saved patch, clean checkout and source identities passed independent checks before/after testing. Earlier Standards evidence remains unchanged.

Hard documented standards: no remaining violation found. ADR0026 ownership is established at the helper: the source is captured once, enumerable copying runs first, and only absent declared flags are subsequently read. Values and original receivers are retained without defaults, coercion or freezing caller metadata. Unsupported features still fail before computation. Cancellation, Proposal validation, live revision checks and one-Transaction/net-zero behavior remain unchanged.

The previous P2 is closed. Both Error-object cases now assert the actual caught value with `toBe(original)`; the shared helper also checks didThrow, so an absent throw cannot masquerade as `throw undefined`. The fixture-constant assertion is removed. This now tests ADR0029 and `principle-test-behavior-not-implementation` directly.

Judgment-only Fowler smells: no concrete finding. Ponytail: correctly owned, safe and lean for isolated Canvas Engines; the shared test assertion removes real duplication without another production abstraction.

Independent `bun test packages/layout-api/tests packages/plugin-layout/tests packages/layout-dagre/tests packages/layout-elk/tests tests/layout-providers.test.ts` exited 0: **154 tests, 1025 assertions**. Full raw output is retained.

Risk: **medium**, under deployed `pr-risk` and its public-source floor. This changes capability acceptance across Providers; complete-source review and the fresh public checks support focused human review. Rollback must revert the complete Issue128 delivery: both commits in reverse order, or the complete mapped publication, restoring the base and recreating Engines. No schema migration exists; code rollback cannot undo application Commands already executed.

Not independently run: TypeScript, builds, browsers, affected/full checks, original compiled-six program, remote CI or publication/main acceptance.

**Verdict: passed. Looks good. Ship.** This is not merge approval.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: passed

base: 6fd2d016f6330cc422508b3e51229bea4be2cce0
head: d1924090cd37125c9955ebfe869e8e0e974d0776
tree: 1590be6c815c785a35b2755ad0532aecc193c46a
binary patch SHA256: 6bcbb10f76f389ffc3a2cdeb30b5f3544c02787e280dbff6020cc6126e834342
taskDigest: 78e4d4e2ec9c37ff55c487cd2c78900a462bd8c3534f0a961853f4836bcedeb9

独立重新读回 [Issue128](https://github.com/ZWkang/nodebraid/issues/128) 全文/完整评论；最终读回2026-10-27 04:43:49 UTC，open、bug/ready-for-agent，评论0，prepared request未变。审查完整base→head两文件补丁、253行测试及Layout API→Provider/Runtime→Kernel/Command/History调用链，结合CONTEXT、ADR0020/21/24/25/26/29与指定main规范。实际Git补丁与本head归档字节一致，当前生产代码已重新检查，不以旧报告替代。

未发现遗漏、错误实现或范围扩张。source与三个required flags各取值一次，继承/非枚举和普通true/false进入owned frozen shell；原own-enumerable浅复制、额外字符串/Symbol引用和receiver保持，caller对象/metadata不冻结。false仍在Provider执行前拒绝；config、异常、取消、Proposal/Fixed Node/实时revision及单Commit/净零/UndoRedo边界未改，没有新API/默认/coercion/Registry。

针对 “Preserve existing own enumerable copying behavior, original read exceptions and shallow ownership”，新expectThrownValue同时断言didThrow和caught===original；两个Error对象用例及54个falsey用例不会因相同message或未抛undefined而假绿。移除对原fixture常量类型的断言没有弱化实际抛值身份验证。

本轮新进程执行 `bun test packages/layout-api/tests packages/plugin-layout/tests packages/layout-dagre/tests packages/layout-elk/tests packages/plugin-command/tests packages/kernel/tests packages/plugin-history/tests tests/layout-providers.test.ts`：483 pass、0 fail、2776 assertions，34文件，exit0；diff-check通过，前后HEAD/tree/patch/clean一致。未复用旧head计数/额外probe。新head原编译6的源码字节、bundle/入口哈希与green记录仅作读取核验。完整原始输出在spec-tests.log。

未本人执行build/typecheck/affected/browser/formal full、原compiled6或远端发布/CI/媒体/merge/main验收。Spec通过不代表人工批准或整项交付完成。

risk: {"level": "medium", "rationale": "完整交付修改公共Layout API能力所有权和Provider可执行性，命中packages/*/src的medium路径下限。严格身份测试改善覆盖，但不降低继承/隐藏声明及能力门禁的行为风险，仍需重点人工审阅。", "evidence": "完整base→d192两文件及253行测试、能力/Proposal/Runtime和Dagre/ELK调用链重新核对；本轮新进程483tests/2776assertions通过，含严格Error身份和54个falsey用例。当前main6fd2 pr-risk blob596298db784c4f3424968cd05a3aca4a6471b1b3独立核实。", "rollback": "普通回退提交撤销完整base6fd2→d192交付，即d1924090cd37125c9955ebfe869e8e0e974d0776与d15e80423973e27a7f1619d129093496f3594c0d两提交或未来映射的完整发布改动；只回退测试提交不足。无schema/数据迁移；会恢复能力丢失缺陷，代码回退不能撤销应用已执行的Command。"}


## Behavior evidence

### original-public-compiled-six-red

red — passed; exit 1; expected exit 1.

Main6fd2 typed public6 executes actual Host/Kernel/Command/Layout/History: two helper Capability snapshots lose inherited/nonenumerable flags and reject; four controls pass. Exit1 is this product behavior, not compile/setup failure. Original strictTSC/bundle exit0 and raw source/bundle are preserved.

Command: `NODEBRAID_LAYOUT_REPRO_RESULTS=/Users/zhou/.codex/local-workflows/nodebraid/runs/20261027T035938-layout-boundaries/observations.json bun /Users/zhou/.codex/local-workflows/nodebraid/runs/20261027T035938-layout-boundaries/build/layout-capabilities-repro.js`

[Original command output](logs/behavior-1.log)

### repository-public-tracer-red

red — passed; exit 1; expected exit 1.

The initial repository public defineLayoutEngine tracer fails with expected three booleans but actual empty object before production edit. Full untracked test preimage and binary patch retained.

Command: `bun test packages/layout-api/tests/capability-values.test.ts`

[Original command output](logs/behavior-2.log)

### repository-public-tracer-green

green — passed; exit 0; expected exit 0.

The initial single public regression passes after the shared owner is repaired; later expanded error/value cases and actual review correction are separate records.

Command: `bun test packages/layout-api/tests/capability-values.test.ts`

[Original command output](logs/behavior-3.log)

### current-original-compiled-six-green

green — passed; exit 0; expected exit 0.

Byte-identical original entry now has six passing controls on reviewed locald192409, strictTSC/bundle/actual execution exit0; inherited/nonenumerable helper flags are true and real Layout Commit/UndoRedo succeed. Publishedb5 maps to this exact tree through actual publication proof; no local execution is relabeled as a remote execution.

Command: `NODEBRAID_LAYOUT_REPRO_RESULTS=/Users/zhou/.codex/local-workflows/nodebraid/runs/ac599065-2060-403e-baa3-e20ab3670f6d/original-green/d1924090cd37125c9955ebfe869e8e0e974d0776/observations.json bun /Users/zhou/.codex/local-workflows/nodebraid/runs/ac599065-2060-403e-baa3-e20ab3670f6d/original-green/d1924090cd37125c9955ebfe869e8e0e974d0776/build/layout-capabilities-repro.js`

[Original command output](logs/behavior-4.log)

### actual-review-identity-assertion-repair

check — passed; exit 0; expected exit 0.

An independent d15e Standards P2 demonstrated Error-object toThrow compares message. A new test-only commit uses didThrow+strict toBe, preserving undefined detection and raw identity;81 strengthened regressions/771assertions pass. Both current-head independent reviews and full check subsequently cover them. Original historical reports are separately declared at their own head.

Command: `bun test packages/layout-api/tests/capability-values.test.ts`

[Original command output](logs/behavior-5.log)

### current-head-affected-check

check — passed; exit 0; expected exit 0.

At current reviewed head d192409, affected check passes six packages plus real Examples browser suites and docs. This is targeted development validation; the formal full check has its own original receipt.

Command: `bun run check:affected --base 6fd2d016f6330cc422508b3e51229bea4be2cce0`

[Original command output](logs/behavior-6.log)

### current-standards-independent-tests

check — passed; exit 0; expected exit 0.

Current independent Standards+ponytail review passes154 public tests/1025assertions, riskmedium. Whole current report and separate risk retained; not a human approval.

Command: `bun test packages/layout-api/tests packages/plugin-layout/tests packages/layout-dagre/tests packages/layout-elk/tests tests/layout-providers.test.ts`

[Original command output](logs/behavior-7.log)

### current-spec-independent-tests

check — passed; exit 0; expected exit 0.

Current independent Spec review passes483 public tests/2776assertions, riskmedium. Original command and scope appear in the independent report; no full/browser publication is attributed to this axis.

Command: `bun test packages/layout-api/tests packages/plugin-layout/tests packages/layout-dagre/tests packages/layout-elk/tests packages/plugin-command/tests packages/kernel/tests packages/plugin-history/tests tests/layout-providers.test.ts`

[Original command output](logs/behavior-8.log)

### actual-source-linux-ci

check — passed; exit 0; expected exit 0.

Actual sourceCI40452926659 checks122019570845 succeeds at publishedb5:1361 tests/7342 assertions on Linux, plus real browser/build/docs checks. Local full uses7348 assertions; these are distinct actual executions. PR Deploy is normally skipped.

Command: `bun run check`

[Original command output](logs/behavior-9.log)

### native-auto-layout-repeat-undo-redo

check — passed; exit 0; expected exit 0.

Publishedb5 real owned Chromium native clicks produce revisions1→2→2→3→4, same Node/Edge IDs, retained Selection and Viewport; ordinary Dagre/full/LR layout changes positions, repeat is netzero, Undo/Redo restore them. See [native before](native-layout/before.png), [after](native-layout/after.png), and result.json. Before/after are one-head interactions, not base-code comparison. Existing production dist was built at locald192 with verified identical published tree; no rebuild/old media relabel. This ordinary UI run does not simulate getter substitution.

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/ac599065-2060-403e-baa3-e20ab3670f6d/native-layout/capture.ts`

[Original command output](logs/behavior-10.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
