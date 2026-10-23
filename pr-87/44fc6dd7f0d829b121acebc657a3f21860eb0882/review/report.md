# Verification report

Run: 2298fe08-989f-4762-bb5b-b0ee49c384c2 · ZWkang/nodebraid · issue #86

## Reviewed and published source

- Review base: `63e11db27145a2cb50123bd3727883905249d0c1`
- Independently prepared append parent: `a0deed7cf576e7af80555daaf206943432e5fb63`
- Published head: `44fc6dd7f0d829b121acebc657a3f21860eb0882`
- Reviewed local head: `c8c6dea0c0329ae94559c6e841c141bb9f80bb97`
- Tree: `fe967ca7a98576c7abe9b10f717f115bd6218f98`
- Complete binary patch SHA-256: `892ccbbeee271106b76da8fabd408917cdff328f7ea557bc4166d5cfc32bfbb1`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

## Confirmed defect

On fetched main `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`, Interaction validates a caller-owned `connection.materializeEdge` getter, then reads it again when creating the effective Connection configuration.

A real compiled public-package Host/Kernel/Renderer/Interaction probe supplies a getter that first returns a valid synchronous materializer and then `null`. Activation succeeds, but the next valid public Renderer Input Connection Gesture cannot create an Edge.

Actual outcomes:

```json
{"control":{"activation":"active","calls":1,"revision":2,"edgeIds":["accepted-edge"],"released":1,"faults":[]},"actual":{"activation":"active","readsAfterActivation":2,"calls":0,"revision":1,"edgeIds":[],"released":1,"faults":[{"name":"nodebraid.plugin.interaction.connection-materializer.fault","error":"TypeError: materializeEdge is not a function"}]}}
```

The ordinary materializer control commits the expected Edge. The assertion that an active Interaction must retain the materializer accepted during validation exits 1. Existing Interaction tests pass (35 tests / 200 assertions). The original compiled public source/output remain in run `20261022T063044-discovery` (`interaction-materializer-repro.ts`, `interaction-materializer-red.log`).

This is a public Renderer Input/Service/Command reproduction, not a claim of native browser input.

## Contract and cause

[ConnectionConfig](https://github.com/ZWkang/nodebraid/blob/1c85d79db1e275e59f84a9bb77d1fe75c0a582e6/packages/plugin-interaction/src/contracts.ts) requires a synchronous materializer function. Existing public [config tests](https://github.com/ZWkang/nodebraid/blob/1c85d79db1e275e59f84a9bb77d1fe75c0a582e6/packages/plugin-interaction/tests/config.test.ts) reject non-functions as `InteractionError / INVALID_CONFIG`; [Port Connection tests](https://github.com/ZWkang/nodebraid/blob/1c85d79db1e275e59f84a9bb77d1fe75c0a582e6/packages/plugin-interaction/tests/port-connection.test.ts) exercise one materialization and one committed Edge. ADR 0068 retains Interaction's single validation and gesture authority.

In [resolveInteractionConfig](https://github.com/ZWkang/nodebraid/blob/1c85d79db1e275e59f84a9bb77d1fe75c0a582e6/packages/plugin-interaction/src/interaction-config.ts), the function-type check and the subsequent frozen-shell construction consume separate property reads. The frozen result can therefore contain a value that was never accepted by the function check.

## Acceptance

- Capture `materializeEdge` once per Interaction Activation, after existing Connection shape/key checks. Validate and retain that same function in the owned frozen effective configuration.
- Keep ordinary/getter-backed valid materializers usable through the public Connection Gesture, with exact Endpoints, one application call, one Edge Commit and normal terminal cleanup.
- Preserve malformed/unknown config rejection and error precedence, first-read exception identity, callback failure reporting/cleanup, disposal, and fresh-Activation revalidation. Add no API, dependency, accessor ban, cap, retry or fallback.
- Add a public red/green regression on the existing Host/Renderer Input/Kernel seam and relevant invalid/getter/fresh-Activation controls. Run connected Interaction/Renderer/Session/Runtime/Composition checks, independent Standards + ponytail-review / Spec, full engineering verification, actual current-head CI and complete report/media publication/readback.
- Keep this Issue open until actual main integration and final acceptance.

## Deduplication

Complete all-state metadata through final short pages (85 Issues/PRs, 44 PRs) found no existing direct Interaction materializer capture repair. #84 / PR #85 repair Basic Canvas's factory-time Connection shell capture; direct `interactionPlugin` installation bypasses that Composition and remains affected. #76 concerns Session mutators.

### synchronize-main

Independently capture fetched main and actual published head before an append-only local merge into existing PR87. Preserve approved Interaction materializer capture semantics; no new product behavior.

Dependencies: none

### integration-compatibility

Run fresh public Interaction tests and affected checks for the integration delta. Save complete new base/head/tree/patch; historical evidence remains historical.

Dependencies: synchronize-main

### independent-review

Fresh independent Standards plus ponytail-review and Spec inspect full current PR scope against original Issue86 and current main.

Dependencies: integration-compatibility

### formal-engineering-check

Pinned main versioned agents:run verify executes real full bun run check after both axes pass; preserve all attempts.

Dependencies: independent-review

### publish-current-head

Publish exact checked tree with original published head first parent and captured main parent; validate actual current-head CI, complete feedback and immutable report/preview before readiness.

Dependencies: formal-engineering-check

### authorized-merge

Recheck actual head/base, strict checks and all feedback immediately before normal expected-head PR merge. No bypass, approve/dismiss, force push or auto-merge setting.

Dependencies: publish-current-head

### main-integration-acceptance

Fetch actual merged main, verify ancestry and complete original Issue86 public behavior acceptance, publish summary and close only after all criteria pass.

Dependencies: authorized-merge

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: Interaction saves the Connection materializer that passed validation and uses that same callback for the Activation. This revision also incorporates main’s Session input-capture repair.

Verdict: passed. Looks good. Ship.

Reviewed identity:

- Base: `63e11db27145a2cb50123bd3727883905249d0c1`
- Head: `c8c6dea0c0329ae94559c6e841c141bb9f80bb97`
- Tree: `fe967ca7a98576c7abe9b10f717f115bd6218f98`
- Binary patch SHA256: `892ccbbeee271106b76da8fabd408917cdff328f7ea557bc4166d5cfc32bfbb1`

Hard standards: no violations found. Re-read the complete three-file patch, regression cases, Issue #86, its empty discussion, prepared plan and supplied PR #87 checkpoint. Current AGENTS, CONTRIBUTING, CONTEXT, tracker/discussion rules and applicable principle guidance remain unchanged.

The callback is read after existing shape/key checks. Its validated identity is retained in a frozen configuration, without changing original read errors or fresh-Activation revalidation. This follows Boundary Discipline and Type System Discipline. Traced terminal cleanup, materialization, Port checks, typed Command, Kernel commit and History observation against ADR0068/0069 and ADR0028/0029. Current Session’s owned IDs, Snapshot identity and FIFO notifications remain compatible with Interaction mutations and Renderer subscriptions.

Judgment checks: no concrete Fowler smell found. For one isolated Host per Canvas, one local capture is sufficient. No wrapper, cache, new interface, dependency, input cap or fallback is needed or added.

Independent check: `bun test packages/plugin-interaction/tests packages/plugin-session/tests packages/plugin-renderer/tests` passed 85 tests / 383 assertions at this head. This includes the changed-getter Connection regression, recovery/read-error controls, Session capture/FIFO and Renderer reconciliation. These use real Runtime services with a boundary Renderer fixture, not native browser input.

Verified saved patch bytes/hash, inspection/task binding, clean worktree and `git diff --check`. Local parents are the earlier unpublished sync and captured main; the published source remains an ancestor. The independent remote append parent is preserved in the prepared task and need not equal the local immediate parent. Confirmed the compiled Session dependency includes the current capture implementation. Commands/output are in `standards-command-log.txt`.

Not checked: fresh builds, browsers, full engineering gate, new-head CI, live feedback refresh, API publication/tree readback or merge. Earlier reports and checks were not relabeled for this identity. This review covers Standards and ponytail-review only.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: **passed**

独立重审新 main 基线的完整三文件补丁及全部 config/Gesture/recovery 回归、原 Issue #86 全文/空讨论/依赖、独立 prepared plan、AGENTS/CONTEXT、tracker/讨论规范、code-review、ADR0068/0028 及当前 config → Activation → Connection → Command → Kernel/History/Session 链。未发现规格遗漏、错误实现或范围扩张。

满足“Capture materializeEdge once per Interaction Activation, after existing Connection shape/key checks”：原 shape/key 检查后只读一次，同一函数用于类型验证和 owned frozen effective config。准确 Endpoints、单次应用调用/Edge Commit、原始 getter/callback 异常、清理/故障报告和 fresh Activation 重新校验保持，无跨 Activation 缓存或新 API、cap、accessor ban、retry/fallback。新 main 的 Session ownership 与这些公开调用和订阅路径兼容。

本轮实际运行 `bun test packages/plugin-interaction/tests packages/plugin-session/tests packages/plugin-renderer/tests`：85 pass、0 fail、383 assertions；`git diff --check` 通过。核对完整 patch/inspection、head/tree、干净工作树；本地 parents 为 bcde801/main63e，published a0deed7 确为祖先，新增 integration delta 仅已合入的 Session 两文件。未把 local immediate parent 误记为远端追加父。命令/原始输出在 `spec-review-commands.log`，旧报告结果未换绑。

当前 published a0deed7 的完整 comments/reviews/threads 均空，无新增反馈；被审 head 尚未发布。未执行 full verify、build/browser、affected/docs 全套，未验证最终 API 发布 parents/tree、新 head CI/反馈、证据回读及 merge/main 验收。公共 Renderer Input adapter 不代表 native browser 验证。

- base: `63e11db27145a2cb50123bd3727883905249d0c1`
- head: `c8c6dea0c0329ae94559c6e841c141bb9f80bb97`
- tree: `fe967ca7a98576c7abe9b10f717f115bd6218f98`
- binary patch SHA256: `892ccbbeee271106b76da8fabd408917cdff328f7ea557bc4166d5cfc32bfbb1`


## Behavior evidence

### current-interaction-contract

green — passed; exit 0; expected exit 0.

Fresh public Interaction37 tests/213 assertions, including accepted materializer identity and real Port-qualified Connection/History behavior. Historical TDD stays at original identities.

Command: `bun run --filter @nodebraid/plugin-interaction test`

[Original command output](logs/behavior-1.log)

### session-renderer-consumer-integration

check — passed; exit 0; expected exit 0.

Fresh Interaction+Session+Renderer public tests at the combined head pass85 tests/383 assertions after actual Session main integration.

Command: `bun test packages/plugin-interaction/tests packages/plugin-session/tests packages/plugin-renderer/tests`

[Original command output](logs/behavior-2.log)

### main-integration-affected

check — passed; exit 0; expected exit 0.

Actual delta from prior local bcde sync includes Session changes. Planned affected packages, public root composition tests, actual browser suites and docs all pass; original output preserved.

Command: `bun run check:affected --base bcde801296e7d81f3062866ff4b7b197788d8e90`

[Original command output](logs/behavior-3.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
