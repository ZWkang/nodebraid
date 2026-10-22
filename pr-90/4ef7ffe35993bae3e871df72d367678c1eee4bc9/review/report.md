# Verification report

Run: 320f79b4-d5e4-4516-85e5-c383ab104c3c · ZWkang/nodebraid · issue #88

## Reviewed and published source

- Review base: `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`
- Independently prepared append parent: `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`
- Published head: `4ef7ffe35993bae3e871df72d367678c1eee4bc9`
- Reviewed local head: `58f3bf4479a5804d3294f83ebd8ea42f76ab644c`
- Tree: `1194376ec126ce02cd375aae019e0e4286b2637e`
- Complete binary patch SHA-256: `30897c7363497cddaa543f825c64a7a6af564998ce18e2f84082809966616bfe`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

## Confirmed defect

On fetched main `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`, Layout Runtime inspects a directly implemented Engine's resolved Proposal before checking whether the execution was cancelled during computation.

A real compiled public Host/Kernel/Command/Layout probe compares the same Provider function:
- Without cancellation, a direct `LayoutEngine` commits the expected Node position at revision 2.
- When wrapped with `defineLayoutEngine`, cancelling during computation preserves the exact Abort reason and reads no Proposal fields.
- With direct `LayoutEngine` installation, the same cancellation still reads `sourceRevision`. A lazy Proposal getter's error replaces the Abort reason. No layout commit occurs, but the caller receives the wrong failure and cancelled output is inspected.

The public assertion requiring cancellation before Proposal inspection exits 1. Original source/output: local run `20261022T072944-maintenance`, `layout-cancellation-repro.ts` and `layout-cancellation-red.log`. Existing Runtime tests pass (8 tests / 15 assertions).

## Contract and cause

[ADR 0026](https://github.com/ZWkang/nodebraid/blob/1c85d79db1e275e59f84a9bb77d1fe75c0a582e6/docs/adr/0026-validate-layout-contracts-at-their-ownership-boundaries.md) requires cancellation checks around every asynchronous boundary. [ADR 0029](https://github.com/ZWkang/nodebraid/blob/1c85d79db1e275e59f84a9bb77d1fe75c0a582e6/docs/adr/0029-preserve-domain-and-external-error-identity.md) preserves original external errors and Abort reasons. The [Layout Runtime contract](https://github.com/ZWkang/nodebraid/blob/1c85d79db1e275e59f84a9bb77d1fe75c0a582e6/website/en/modules/plugin-layout.md) explicitly supports third-party Engines and checks the signal before and after every asynchronous boundary.

In [layout-plugin.ts](https://github.com/ZWkang/nodebraid/blob/1c85d79db1e275e59f84a9bb77d1fe75c0a582e6/packages/plugin-layout/src/layout-plugin.ts), `await engine.compute(...)` is embedded inside `validateLayoutProposal(...)`. The next Runtime cancellation check happens after validation. Engines using the official helper have an earlier check; directly implemented Engines expose the missing Runtime check.

## Acceptance

- Check the execution signal immediately after a successful Engine computation resolves, before reading or validating its Proposal. Preserve the existing post-validation check, live revision check and single synchronous Transaction.
- Cancelled direct and helper Engines preserve the exact original Abort reason without inspecting resolved Proposal fields or committing.
- Preserve uncancelled direct-Engine success, invalid Proposal rejection, original uncancelled getter errors, original computation rejection, pre-abort behavior, cancellation triggered during validation, stale/concurrent revision protection, metadata, net-zero results and lifecycle cleanup.
- Use the existing public Host/Command/Kernel seam for a red/green regression and relevant controls. Add no API, mandatory helper, accessor ban, wrapping policy, retry, cap or fallback.
- Complete related Layout/Command checks, independent Standards + ponytail-review / Spec, full engineering verification, actual current-head CI and complete report/media publication/readback.
- Keep this Issue open until actual main integration and final acceptance.

## Deduplication

Complete all-state metadata through final short pages (87 Issues/PRs, 45 PRs) found no existing Runtime post-computation cancellation repair. Closed #78 / PR #79 repair accepted Request/Proposal values, including repeated getter reads; #21 concerns disposal-promise publication before Abort reentry. Neither inserts the missing Runtime cancellation check.

### public-regression-and-minimal-repair

Preserve the original main public cancellation red and working ordinary/helper controls. Add a failing public Host/Command/Kernel regression before production edit; insert the missing post-compute cancellation check, preserve post-validation check and existing error precedence, and pass related and affected checks.

Dependencies: none

### independent-review

Independent Standards plus ponytail-review and Spec review the same complete head/tree/patch against original Issue88 and ADR0026/0029, with no actionable findings.

Dependencies: public-regression-and-minimal-repair

### formal-engineering-check

Versioned deployed-main agents:run verify executes real full bun run check after targeted checks and both reviews, saving original logs and stable source identity.

Dependencies: independent-review

### publish-and-current-head-acceptance

Publish exact reviewed tree with saved first parent, create one PR to main, verify actual current-head CI, complete feedback, mergeability and immutable full report/media publication/readback.

Dependencies: formal-engineering-check

### main-integration-acceptance

Keep Issue88 open until final human review/merge, actual fetched-main integration and whole-Issue acceptance.

Dependencies: publish-and-current-head-acceptance

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: Layout Runtime checks cancellation immediately after successful Engine computation, before inspecting the resolved Proposal. The existing check after validation remains, protecting against cancellation triggered by Proposal getters.

Verdict: passed.

Reviewed identity:

- Base: 1c85d79db1e275e59f84a9bb77d1fe75c0a582e6
- Head: 58f3bf4479a5804d3294f83ebd8ea42f76ab644c
- Tree: 1194376ec126ce02cd375aae019e0e4286b2637e
- Binary patch SHA256: 30897c7363497cddaa543f825c64a7a6af564998ce18e2f84082809966616bfe

Hard standards: No violations found in the complete two-file patch. ADR0026 and the public Layout Runtime documentation require cancellation checks around asynchronous boundaries, including directly implemented Engines. ADR0029 preserves Abort reasons and original external errors. The new check uses the existing native signal mechanism without forcing defineLayoutEngine, wrapping failures or changing public contracts.

Both checks are necessary: the first precedes caller-owned Proposal reads; the second handles cancellation during validation. Computation rejection bypasses the new successful-result check and keeps its original failure. Live revision protection, metadata and the single synchronous Kernel Transaction remain unchanged.

Judgment / ponytail: No actionable Fowler smell or correctness, safety, load, speed or testing finding. A local awaited result and one signal check repair the owning Runtime boundary without new abstraction, dependency, cap or fallback. Read all 224 new test lines, direct/helper Engine paths, Command signal forwarding and execution settlement, Proposal validation/freezing, stale checks, Kernel writes, lifecycle registration cleanup and actual application/export callers. Assumed load: isolated Canvas Runtimes with asynchronous third-party Engines and concurrent cancellation or Document changes.

Actual checks at this head:

- Independently verified clean tree, commit history, exact head/tree/hash, prepared-task/inspection identity and complete.patch byte-for-byte.
- Read the retained test-only red: direct Engine returned the Proposal getter failure instead of cancellation, while the helper control passed.
- `git diff --check`: passed.
- `bun test packages/plugin-layout/tests packages/layout-api/tests packages/plugin-command/tests`: 69 passed, 0 failed, 169 assertions. All eight new cancellation/control cases pass, including rejected computation, validation-time cancellation, normal single commit and net-zero behavior.

Not checked: other affected consumers, TypeScript checks, builds, browser suites, full engineering gate, current-head CI, publication and remote evidence readback. Targeted results do not establish delivery readiness.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: **passed**

独立审查完整两文件补丁及 224 行新公共回归、Issue #88 全文/空讨论、独立 prepared request/五步依赖计划、真实空 blocker 页、AGENTS/CONTEXT、code-review/讨论规范、ADR0026/0029、Layout Runtime 文档与 Engine → Command → Kernel 调用链。未发现规格遗漏、错误实现或未请求的扩张。

满足“Check the execution signal immediately after a successful Engine computation resolves, before reading or validating its Proposal”：成功 await 后先检查 execution.signal，随后才进入 validator；原验证后检查、live revision 比较与单 Transaction 保留。直接实现与 helper Engine 均保留精确 Abort reason，取消后不读取 Proposal、无提交。await 的计算拒绝仍原样传播，包括已 abort 时；未取消 getter/结构性错误、pre-abort、验证中取消、metadata、net-zero、stale/concurrent 与生命周期路径保持。没有强制 helper、新 API、包装策略、accessor ban、cap、retry 或 fallback。

本轮实际运行 `bun test packages/plugin-layout/tests packages/layout-api/tests packages/plugin-command/tests tests/layout-providers.test.ts`：73 pass、0 fail、261 assertions。真实 Host/Command/Kernel 回归覆盖上述取消边界和保留性控制，并验证 Dagre/ELK/History 组合；原始命令、head/tree、输出及 exit 0 已保存 `spec-targeted-tests.log`。`git diff --check` 通过；commit 列表、精确身份、完整 binary patch、保存的 inspection/complete.patch 与干净工作树核对一致。

未执行 build、browser、affected/full engineering gate 或独立 compiled public probe；未验证当前 head 的远端 CI、报告/媒体发布及回读、最终 main 集成。定向检查不代表完整交付验收。

- base: `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`
- head: `58f3bf4479a5804d3294f83ebd8ea42f76ab644c`
- tree: `1194376ec126ce02cd375aae019e0e4286b2637e`
- raw binary patch SHA256: `30897c7363497cddaa543f825c64a7a6af564998ce18e2f84082809966616bfe`


## Behavior evidence

### original-main-public-red

red — passed; exit 1; expected exit 1.

原始 main1c85 编译后公共 Host/Command/Kernel 复现：普通直接 Engine 正常提交；helper 取消保留原 reason 且不读取 Proposal；直接 Engine 取消后读取 Proposal，getter error 覆盖原 reason。真实行为断言失败，预期 exit1。

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/20261022T072944-maintenance/layout-cancellation-repro.ts`

[Original command output](logs/behavior-1.log)

### initial-probe-parse-failure

check — failed; exit 1; expected exit 0.

首次外部调查脚本缺少对象结尾括号，Bun 解析失败；此记录不是产品缺陷或 TDD red。修正脚本后才得到上面的真实公共行为失败，保留原始解析日志。

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/20261022T072944-maintenance/layout-cancellation-repro.ts`

[Original command output](logs/behavior-2.log)

### tdd-public-runtime-red

red — passed; exit 1; expected exit 1.

生产代码修改前，新增公共 Runtime 取消回归真实失败：direct Engine 收到 Proposal getter error；helper 对照通过。原 test-only patch 与日志保留，预期 exit1。

Command: `bun run --filter '@nodebraid/plugin-layout' test`

[Original command output](logs/behavior-3.log)

### tdd-public-runtime-green

green — passed; exit 0; expected exit 0.

补上 Runtime post-compute signal check 后，同一 direct/helper 公共回归通过，精确保留取消对象、读取0次、Kernel View 不变。执行于后续控制用例加入前。

Command: `bun run --filter '@nodebraid/plugin-layout' test:self`

[Original command output](logs/behavior-4.log)

### current-compiled-public-cancellation

green — passed; exit 0; expected exit 0.

精确提交58f3bf4479a5804d3294f83ebd8ea42f76ab644c 的编译后公共包实际运行：直接/helper Engine 取消均保留原 reason，Proposal读取0次，revision仍1；普通直接 Engine 对照提交位置100,0到revision2。

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/320f79b4-d5e4-4516-85e5-c383ab104c3c/current-public-probe.ts`

[Original command output](logs/behavior-5.log)

### current-connected-layout-contracts

green — passed; exit 0; expected exit 0.

精确固定提交上的 Layout API/Runtime、真实 Dagre/ELK、Command/Kernel 和根 Layout 联合公共检查通过95项测试、319条断言。包括正常直接 Engine、invalid Proposal、getter exception、compute rejection（含abort）和validation中取消；保留过期/并发、Port topology及History测试。

Command: `bun test packages/layout-api/tests packages/plugin-layout/tests packages/layout-dagre/tests packages/layout-elk/tests packages/plugin-command/tests packages/plugin-kernel/tests tests/layout-providers.test.ts`

[Original command output](logs/behavior-6.log)

### affected-consumers-browser-and-docs

check — passed; exit 0; expected exit 0.

实际 affected 检查通过 Layout Runtime/Core/Examples 的类型、构建和产物、根 Layout 联合测试、真实 Basic SVG/Clipboard 浏览器和文档检查。执行于提交前；完整 precommit patch 与提交补丁逐字节一致。正式 verify 单独运行当前提交。

Command: `bun run check:affected --base 1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`

[Original command output](logs/behavior-7.log)

### formal-check-attempt-1-failed

check — failed; exit 1; expected exit 0.

第一次正式 verify 在不变的工作流 CLI 集成测试中触发3个默认5秒超时，完整672项中669通过/3失败。保留真实完整失败日志；不提高超时、不删断言，不将局部 green 当作交付。

Command: `bun run check`

[Original command output](logs/behavior-8.log)

### workflow-timeout-isolated-failure

check — failed; exit 1; expected exit 0.

第一次分离复现仍有2个既有CLI用例超时，失败位置不同；3项通过/2失败。保留真实诊断日志，不作为修复成功。

Command: `bun test tests/local-agent-cli.test.ts tests/local-agent-bases.test.ts`

[Original command output](logs/behavior-9.log)

### unchanged-workflow-diagnostic-green

check — passed; exit 0; expected exit 0.

与当前main字节一致的CLI实现/测试，在main对照5项/84断言通过；修复分支原样复验也5项/84断言通过，最慢3059.72ms。未调整5秒配置、断言或执行范围；仅诊断，不替代正式全量。

Command: `bun test tests/local-agent-cli.test.ts tests/local-agent-bases.test.ts`

[Original command output](logs/behavior-10.log)

### formal-check-attempt-2-failed

check — failed; exit 1; expected exit 0.

不改源码、断言和5秒配置，在 main/当前分支对照通过后再次执行完整 verify。完整672项中671通过/1失败，既有main-sync CLI用例5103.91ms超时。原始日志保留；当前不能交付ready。

Command: `bun run check`

[Original command output](logs/behavior-11.log)

### unchanged-workflow-recheck-081447

check — passed; exit 0; expected exit 0.

同一提交在本轮原样工作流复验通过5项/84断言，最慢main-sync4393.93ms；源码、断言和默认5000ms未改。仅为恢复正式完整验证的诊断结果，不替代全量门槛。

Command: `bun test tests/local-agent-cli.test.ts tests/local-agent-bases.test.ts`

[Original command output](logs/behavior-12.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
