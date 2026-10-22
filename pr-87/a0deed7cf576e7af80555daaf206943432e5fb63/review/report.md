# Verification report

Run: c919e546-eb6b-4993-9495-af12c49ed14b · ZWkang/nodebraid · issue #86

## Reviewed and published source

- Review base: `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`
- Independently prepared append parent: `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`
- Published head: `a0deed7cf576e7af80555daaf206943432e5fb63`
- Reviewed local head: `a97f651634cf5ba21746f8d58accb859ded0dfdf`
- Tree: `a3a0c53514037a947aa39143348b46fe8270389c`
- Complete binary patch SHA-256: `892ccbbeee271106b76da8fabd408917cdff328f7ea557bc4166d5cfc32bfbb1`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

Repair Issue86 by capturing Connection materializeEdge once per Interaction Activation after existing shape/key checks; validate and retain the same function. Preserve malformed-config/error precedence, original failures, real Connection Edge Commit/cleanup and fresh-Activation revalidation. Source: https://github.com/ZWkang/nodebraid/issues/86

### public-regression-and-minimal-repair

Preserve real compiled public main red and working ordinary materializer control; add existing Renderer Input/Kernel gesture red before production edit. Capture accepted callback once, add relevant invalid/getter/recovery controls, and pass related public services plus affected checks.

Dependencies: none

### independent-review

Independent Standards plus ponytail-review and Spec inspect exact complete head/tree/patch against original Issue86/ADR0068/0028/contracts, with no actionable findings.

Dependencies: public-regression-and-minimal-repair

### formal-engineering-check

Deployed-main versioned agents:run verify runs actual full bun run check after bothreviews and targetedchecks, preserving original logs and stable exact source.

Dependencies: independent-review

### publish-and-current-head-acceptance

Publish exact checked source tree with independently saved first parent, one PR to main. Verify actual current-head CI, complete feedback/mergeability and full report/media publication plus immutable all-file readback before ready.

Dependencies: formal-engineering-check

### main-integration-acceptance

Keep Issue86 open until final review/merge, actual fetched main integration and whole-Issue acceptance.

Dependencies: publish-and-current-head-acceptance

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: Interaction captures connection.materializeEdge once per Activation after existing shape and key checks. The function validated by typeof is the same function retained in the frozen effective configuration and used by Connection Gestures.

Verdict: passed.

Reviewed identity:

- Base: 1c85d79db1e275e59f84a9bb77d1fe75c0a582e6
- Head: a97f651634cf5ba21746f8d58accb859ded0dfdf
- Tree: a3a0c53514037a947aa39143348b46fe8270389c
- Binary patch SHA256: 892ccbbeee271106b76da8fabd408917cdff328f7ea557bc4166d5cfc32bfbb1

Hard standards: No violations found in the complete three-file patch. ADR0068 keeps configuration validation and Gesture authority within Interaction. ADR0028 preserves observable Fault reporting without replacing callback failures. Boundary Discipline and Type System Discipline retain runtime function validation at the owning boundary. AGENTS.md and CONTRIBUTING.md regression requirements are supported by the retained real Gesture red and current public tests.

Callback capture remains local to resolveInteractionConfig, which runs for every fresh Activation. Unknown Connection fields still fail before the getter is read; invalid first values still produce INVALID_CONFIG. Original getter exceptions propagate unchanged. No public contract, callback wrapper, persistent cache, accessor restriction, cap or fallback was added.

Judgment / ponytail: No actionable Fowler smell or correctness, safety, load, speed or testing finding. The minimal local capture fixes the first incorrect ownership decision. Reviewed all changed tests and production code, Interaction setup/recovery, Renderer Input delivery, terminal Preview/Capture cleanup, materialization, Create Edge Command/Kernel checks, Fault reporting, and Composition/Examples callers. Assumed load: isolated per-Canvas Hosts with synchronous application materializers.

Actual checks at this head:

- Verified clean tree, commit history, exact head/tree/hash, prepared-task/inspection identity and complete.patch byte-for-byte.
- `git diff --check`: passed.
- `bun test packages/plugin-interaction/tests`: 37 passed, 0 failed, 213 assertions. The new Gesture case observes one accepted callback invocation, exact Endpoints, revision-2 Edge Commit, one Capture release, cleared Preview and no Fault. Recovery and existing failure/cleanup controls also pass.

Not checked: broader affected consumers, TypeScript checks, builds, full engineering gate, native browser input, current-head CI, publication or remote evidence readback. Public Renderer Input adapter tests do not establish real browser behavior.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: **passed**

独立审查完整三文件补丁、全部新增 Gesture/config/recovery 控制、原 Issue #86 全文/空讨论与真实依赖、独立 prepared plan、ADR0068/0028，以及 resolveInteractionConfig → Activation → Renderer Input → materializer → Create Edge Command → Kernel/terminal cleanup 调用链。未发现规格遗漏、错误实现或未请求的扩张。

满足“Capture materializeEdge once per Interaction Activation, after existing Connection shape/key checks”：本地变量仅在原 shape/key 校验通过后读取，function 检查和冻结 effective Connection 使用同一引用。不会在 Gesture 时重读应用 getter，也不缓存跨 Activation 的接受结果。既有配置/未知字段错误先后与首读异常身份保持；正确 Endpoints、单次应用调用、单 Edge Commit 和清理仍由既有 Runtime/Command/Kernel 边界负责。回调失败仍通过原 Fault Reporter 暴露，保留原错误并先完成终态清理；dependency recovery 重新校验配置。无 API、依赖、accessor ban、cap、retry 或 fallback 新增。

本轮实际执行 `bun test packages/plugin-interaction/tests`：37 pass、0 fail、213 assertions；使用真实 Host/Kernel/Services/Commands 与公共 Renderer Input adapter，包含 changing getter、Port Endpoints、原 callback 故障和 fresh Activation。此为公共服务/输入验证，不宣称 native browser 输入。`git diff --check` 通过；commit 列表、精确 head/tree、完整 binary patch、保存的 inspection/complete.patch 及干净工作树均核对。

未独立运行连接消费者整套、affected、类型/构建、browser 或 full engineering gate；未执行当前 head 的 compiled public probe、远端 CI、报告/媒体发布及回读、main 集成。其他执行者或旧源码的通过不计为本轮实际检查。

- base: `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`
- head: `a97f651634cf5ba21746f8d58accb859ded0dfdf`
- tree: `a3a0c53514037a947aa39143348b46fe8270389c`
- raw binary patch SHA256: `892ccbbeee271106b76da8fabd408917cdff328f7ea557bc4166d5cfc32bfbb1`


## Behavior evidence

### original-main-public-red

red — passed; exit 1; expected exit 1.

原始 main1c85 的编译后公共 Host/Input 复现：Interaction 激活成功，但重复读取回调后保存 null。合法连线没有调用已验证函数，没有提交 Edge，并报告 TypeError；普通函数对照提交 accepted-edge。原始断言预期 exit1，仅作为历史缺陷证据。

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/20261022T063044-discovery/interaction-materializer-repro.ts`

[Original command output](logs/behavior-1.log)

### tdd-renderer-input-red

red — passed; exit 1; expected exit 1.

修改生产代码前，新增公共 Renderer Input/Kernel 连线回归失败，应用回调记录为空。原始仅回归测试的 patch 和失败输出均保留，预期 exit1。

Command: `bun test packages/plugin-interaction/tests/port-connection.test.ts --test-name-pattern 'before its getter changes'`

[Original command output](logs/behavior-2.log)

### tdd-renderer-input-green

green — passed; exit 0; expected exit 0.

捕获回调一次后，同一公共回归通过：精确 Endpoints、一次 Edge Commit/revision2、一次 getter 读取、正常 Capture/Preview 终止清理且无 Fault。这是最终控制用例和提交前的真实工作区 green。

Command: `bun test packages/plugin-interaction/tests/port-connection.test.ts --test-name-pattern 'before its getter changes'`

[Original command output](logs/behavior-3.log)

### initial-consumer-build-failure

check — failed; exit 1; expected exit 0.

首次消费者检查在 preset-basic package-name import 失败，新工作区尚未构建这个独立消费者的 dist。保留失败输出；执行既有消费者构建后，未改变导入或断言的测试重新通过。

Command: `bun test packages/plugin-interaction/tests packages/plugin-renderer/tests packages/plugin-session/tests packages/runtime-cordis/tests packages/preset-basic/tests`

[Original command output](logs/behavior-4.log)

### current-compiled-public-gesture

green — passed; exit 0; expected exit 0.

精确固定 head a97f651 的实际编译后公共包保留已接受回调：getter1次、应用函数1次、accepted-edge、revision2、释放1次且无 Fault；普通函数对照结果一致。

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/c919e546-eb6b-4993-9495-af12c49ed14b/current-public-probe.ts`

[Original command output](logs/behavior-5.log)

### current-connected-public-services

green — passed; exit 0; expected exit 0.

精确当前提交的 Interaction/Renderer/Session/Runtime/Composition 公共检查实际通过208项测试、918条断言；包含 Interaction37项/213条断言，覆盖 malformed getter、未知字段优先级和恢复时的原始读取异常。

Command: `bun test packages/plugin-interaction/tests packages/plugin-renderer/tests packages/plugin-session/tests packages/runtime-cordis/tests packages/preset-basic/tests`

[Original command output](logs/behavior-6.log)

### affected-consumers-and-browsers

check — passed; exit 0; expected exit 0.

消费者构建完成后，真实 affected 检查通过相关类型/产物、Examples/SVG 浏览器 suite 和文档。执行于提交前；precommit 与提交后的完整 binary patch 逐字节一致。正式 verify 独立运行，不将开发检查换绑为正式提交验收。

Command: `bun run check:affected --base 1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`

[Original command output](logs/behavior-7.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
