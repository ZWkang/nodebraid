# Verification report

Run: 2f1cec56-3d1d-4c7d-8bb4-f34f02b359c0 · ZWkang/nodebraid · issue #96

## Reviewed and published source

- Review base: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Independently prepared append parent: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Published head: `fcfffbd89b540602c483ac7efcfef82633431bc7`
- Reviewed local head: `52d1b084845d66bdc93c54b9a6c6a3b03ebf2ece`
- Tree: `0c18884e64538f7f35fe06d705b7616fa04ede14`
- Complete binary patch SHA-256: `97060c5f0836d17173abb889d652e2a5e77423273017335d3926a9ef0de4532d`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

## Confirmed defect

On fetched main `dcf13482b68bc2422fc4d714df1226ab0ef259aa`, public `definePlugin()` exposes an internal `TypeError` when a Service Binding record lists a string key whose own property descriptor is absent. The same malformed input fails in both `requires` and `provides`.

After a fresh `@nodebraid/runtime-cordis` build, a compiled public API probe compared ordinary valid bindings, non-enumerable bindings and a legal JavaScript Proxy with `ownKeys() => ['service']` and `getOwnPropertyDescriptor() => undefined`. Valid bindings succeed; non-enumerable bindings correctly reject with `PluginHostError / INVALID_DEFINITION`; the absent-descriptor input instead fails on `.enumerable` with `TypeError`. No supplied getter or Proxy trap throws, and the binding value is never read. The actual structural-error assertion exits 1 in both fields. Existing Runtime tests pass: **127 tests / 544 assertions**.

Minimal reproduction:

```ts
import { definePlugin, PluginHostError } from '@nodebraid/runtime-cordis';
const bindings = new Proxy({}, {
  ownKeys: () => ['missing'],
  getOwnPropertyDescriptor: () => undefined,
});
try {
  definePlugin({ requires: bindings, setup() {} });
} catch (error) {
  if (!(error instanceof PluginHostError) || error.code !== 'INVALID_DEFINITION') throw error;
}
```

Original executable and output are retained in discovery run `20261023T051654-discovery-runtime-adversarial`: `binding-descriptor-repro.ts`, `binding-descriptor-red.log`, `runtime-build.log`, `runtime-existing-tests.log`. This is a compiled public Runtime API reproduction; no browser behavior is claimed.

## Contract and cause

[ADR 0007](https://github.com/ZWkang/nodebraid/blob/dcf13482b68bc2422fc4d714df1226ab0ef259aa/docs/adr/0007-use-a-small-nodebraid-plugin-host-interface.md) and [ADR 0029](https://github.com/ZWkang/nodebraid/blob/dcf13482b68bc2422fc4d714df1226ab0ef259aa/docs/adr/0029-preserve-domain-and-external-error-identity.md) distinguish NodeBraid structural errors from original caller failures. The existing `definePlugin()` public tests reject malformed Binding records with `INVALID_DEFINITION`. The shared `normalizeServiceBindings()` assumes every `Reflect.ownKeys()` result still has an own descriptor and dereferences a non-null assertion at runtime. A disappearing own key or lawful Proxy can violate that assumption without throwing an external error.

## Acceptance

- Reject a listed Binding with no own descriptor through the existing `PluginHostError / INVALID_DEFINITION` path, in both `requires` and `provides`, before reading its value.
- Keep valid ordinary, null-prototype and accessor Bindings working; preserve capture/read ordering and existing non-enumerable, symbol and forged-token rejection.
- Preserve original failures thrown by prototype, own-key, descriptor and value reflection; do not catch or wrap external exceptions.
- Reuse the shared Binding normalizer and existing public Runtime test seam. No public API, Proxy/accessor ban, fallback, retry, dependency or unrelated refactor.
- Public failing/passing regressions, affected consumers, independent Standards with ponytail-review and Spec, formal full engineering verification, exact publication, current-head CI and complete immutable report/preview readback.
- Keep this Issue open until actual main integration and whole-Issue acceptance. Future delivery PR remains for human merge.

## Deduplication

Read all-state Issues/PR metadata and bodies through final short pages: **95 records and 49 PRs**. Existing Runtime #20/#21/#24 cover duplicate Provided Tokens, disposal reentry and Provided-result rollback; #69/#80 cover diagnostic traversal/capture. None covers missing Service Binding descriptors during `definePlugin()` normalization.

### public-regression-and-fix

First add a real public definePlugin missing-descriptor regression; preserve its failing log, then fix the shared normalizer and verify both fields, valid controls and original reflection failures.

Dependencies: none

### affected-consumers

Actual affected Runtime consumers pass; preserve the complete current source head/tree/binary patch.

Dependencies: public-regression-and-fix

### independent-review

Independent Standards with ponytail-review and Spec both review the exact fixed diff against the original Issue, ADRs and current main.

Dependencies: affected-consumers

### formal-engineering-check

Pinned main versioned agents:run verify runs the actual full bun run check once after both reviews pass, preserving all original logs.

Dependencies: independent-review

### published-evidence

Exact source tree/first parent publication, current-head CI, full paginated feedback and immutable report/preview readback pass.

Dependencies: formal-engineering-check

### human-merge

Human review and normal protected main merge.

Dependencies: published-evidence

### main-integration-acceptance

Fetch actual main, verify merge ancestry and whole original Issue through fresh public compiled API acceptance; keep Issue open before this.

Dependencies: human-merge

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: The shared requires/provides normalizer rejects missing Binding descriptors through the existing INVALID_DEFINITION path. The complete patch now also verifies that reflection exceptions retain their original object identity.

Reviewed identity:

- Base: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Head: `52d1b084845d66bdc93c54b9a6c6a3b03ebf2ece`
- Tree: `0c18884e64538f7f35fe06d705b7616fa04ede14`
- Binary patch SHA256: `97060c5f0836d17173abb889d652e2a5e77423273017335d3926a9ef0de4532d`

Scope: the complete three-dot base-to-head diff, including both commits, `plugin-definition.ts` and all 91 lines of `binding-records.test.ts`. Re-read the unchanged Issue #96 and empty discussion/blockers, prepared plan, complete corrected patch and connected normalization/Host contracts. Applied the current code-review, ponytail-review and relevant project principles.

Previous finding closed: `packages/runtime-cordis/tests/binding-records.test.ts:64` now asserts `expect(received).toBe(failure)` after capturing the actual thrown value. The shared matrix covers both fields and all four reflection operations. A replacement Error with the same message, or no exception, now fails this identity assertion. This addresses Test Behavior Not Implementation and ADR0029. Production sources are byte-unchanged from 5bb.

Hard standards: no remaining violations found. The descriptor check precedes value access in the existing shared owner. Plain/accessor/null-prototype/Proxy controls remain; non-enumerable, symbol and forged-token rejection is unchanged. External reflection still has no catch or wrapper. Definition metadata is installed only after normalization succeeds, consistent with ADR0007.

Judgment checks: no concrete Fowler smell found. For per-Canvas Hosts with multiple Plugin definitions, the existing linear normalization remains sufficient. No abstraction, public interface, dependency or fallback was added.

Actual independent checks: resolved new base/head/tree, read complete diff/commit list, matched corrected patch bytes/hash and inspection/task binding, checked clean worktree and `git diff --check`. Read `runtime-identity-corrected.log`, which reports 140 tests / 561 assertions; those tests were supplied evidence and were not independently rerun.

Not checked independently at this head: tests, typecheck/builds, browsers, full gate, CI, publication or merge. Earlier reports and execution logs retain their original identities.

Verdict: passed. Looks good. Ship.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

# Spec review — Issue #96

Verdict: **passed**. 旧 P2 已解决；未发现其余要求缺失、错误实现或范围扩张。

- Base: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Head: `52d1b084845d66bdc93c54b9a6c6a3b03ebf2ece`
- Tree: `0c18884e64538f7f35fe06d705b7616fa04ede14`
- Complete binary patch SHA256: `97060c5f0836d17173abb889d652e2a5e77423273017335d3926a9ef0de4532d`

已重新独立审查完整两文件补丁、两个提交、原始 Issue96 全文和空 comments/blockers、prepared plan、当前 normalizer 及 frozen definition → Host/Activation 消费路径；结合 AGENTS/CONTEXT、tracker/discussion、code-review、ADR0007/0029 核对原始验收。

Issue 要求 “Preserve original failures … do not catch or wrap external exceptions”。八个反射失败场景现在捕获实际 thrown value 后使用 `toBe(failure)`：包装/重建同名同消息 Error 会失败，未抛错时 received 为 undefined 也会失败。该断言确实覆盖原对象身份，旧 `toThrow(Error)` 只检查 name/message 的测试缺口已修复，生产代码未因此改变。

Issue 要求缺失 own descriptor “in both requires and provides, before reading its value”。共享 normalizer 在 descriptor 为 undefined 或 non-enumerable 时进入既有 `runtime.plugin-host / INVALID_DEFINITION` 分支；不读取缺失 Binding 值，前一 getter 删除后续 key 也明确拒绝。prototype/own-key/descriptor/value 外部异常保持无 catch 传播。普通、null-prototype、合法 Proxy/accessor、symbol/non-enumerable/forged Token 的既有校验顺序、单次值捕获和冻结路径保持；没有新增公共 API、禁令、依赖或 fallback。

实际独立检查：HEAD/tree、完整 diff 与新 inspection/complete patch 的 SHA256 一致；第二提交生产 diff 为空；`git diff --check BASE...HEAD` exit 0，并复核本地 matcher 声明。本轮**未独立执行测试、构建、affected、浏览器或完整工程检查**。当前 head 远端发布/CI、报告与 preview readback、main 集成和全 Issue 验收尚未由本审查验证；旧报告和旧结果不换绑新身份。


## Behavior evidence

### missing-descriptor-red

red — passed; exit 1; expected exit 1.

Both public requires/provides bindings with absent descriptors must expose runtime.plugin-host/INVALID_DEFINITION before value access. Original implementation actually throws TypeError; assertion failure is retained. Earlier environment and incorrect-domain attempts are separately retained and are not this definitive regression.

Command: `bun test packages/runtime-cordis/tests/binding-records.test.ts`

[Original command output](logs/behavior-1.log)

### runtime-public-green

green — passed; exit 0; expected exit 0.

Historical 5bb3528 public Runtime tests passed before the independent identity-matcher finding; original log retains that scope. Current strict-identity tests are a separate entry.

Command: `bun test packages/runtime-cordis/tests`

[Original command output](logs/behavior-2.log)

### original-compiled-repro

green — passed; exit 0; expected exit 0.

Historical 5bb3528 compiled public reproduction passed with its exact source SHA; original source/path adaptations recorded. Current head is separately executed.

Command: `bun run /Users/zhou/.codex/local-workflows/nodebraid/runs/2f1cec56-3d1d-4c7d-8bb4-f34f02b359c0/compiled-green-repro.ts`

[Original command output](logs/behavior-3.log)

### affected-consumers

check — passed; exit 0; expected exit 0.

Historical 5bb3528 affected Runtime consumers, browsers and docs passed; original check retained. Do not bind this log to the corrected52d1 head.

Command: `bun run check:affected --base dcf13482b68bc2422fc4d714df1226ab0ef259aa`

[Original command output](logs/behavior-4.log)

### runtime-current-identity-green

green — passed; exit 0; expected exit 0.

Current52d1 source executes all140 Runtime public tests/561 assertions, including strict identity assertions for all eight external reflection failures.

Command: `bun test packages/runtime-cordis/tests`

[Original command output](logs/behavior-5.log)

### compiled-current-repro

green — passed; exit 0; expected exit 0.

Current52d1 freshly built public Runtime barrel reruns the original absent-descriptor assertion and ordinary/non-enumerable controls with exact current SHA. No assertion changed.

Command: `bun run /Users/zhou/.codex/local-workflows/nodebraid/runs/2f1cec56-3d1d-4c7d-8bb4-f34f02b359c0/compiled-current-repro.ts`

[Original command output](logs/behavior-6.log)

### affected-current-consumers

check — passed; exit 0; expected exit 0.

Current52d1 actual affected Runtime consumers, real React/SVG/Example browsers and documentation pass after strict-identity correction.

Command: `bun run check:affected --base dcf13482b68bc2422fc4d714df1226ab0ef259aa`

[Original command output](logs/behavior-7.log)

### environment-first-attempt

check — failed; exit 1; expected exit 0.

First new-worktree attempt failed before assertions because generated @nodebraid/diagnostics was absent. Preserved as an environment failure; it is not a TDD regression. Documented dependency build resolved it without changing assertions.

Command: `bun test packages/runtime-cordis/tests/binding-records.test.ts`

[Original command output](logs/behavior-8.log)

### test-domain-first-attempt

green — failed; exit 1; expected exit 0.

Early test mistakenly expected domain runtime, so even corrected production failed against the existing runtime.plugin-host identity. This actual failed attempt is retained. Corrected the assertion, restored original production for definitive red, then applied the same fix for definitive green.

Command: `bun test packages/runtime-cordis/tests/binding-records.test.ts`

[Original command output](logs/behavior-9.log)

### matcher-gap-reproduction

check — passed; exit 0; expected exit 0.

Real Bun matcher probe proves a distinct same-message Error satisfies toThrow(Error); independent review rejected that weak assertion. Current committed toBe(original) tests close the gap. This is matcher-observation evidence, not product-success evidence.

Command: `bun run /Users/zhou/.codex/local-workflows/nodebraid/runs/2f1cec56-3d1d-4c7d-8bb4-f34f02b359c0/assertion-identity-probe.ts`

[Original command output](logs/behavior-10.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.

## Review text publication correction

The first generated bundle rendered local review-file paths as text. This correction publishes the complete original independent reviews above and at the same review links, with their original reviewed identities and verification limits. Original prepared, verification and publication receipts are unchanged. It does not represent a new review, engineering check or source revision. Earlier immutable publications remain available in Git history.
