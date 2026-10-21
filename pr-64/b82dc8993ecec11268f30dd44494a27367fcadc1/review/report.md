# Verification report

Run: 1740c201-2bcf-4297-8ccb-dfa62668b385 · ZWkang/nodebraid · issue #60

## Reviewed and published source

- Base: `8406cc9373ba2d73e7363f347e4d96a624215397`
- Published head: `b82dc8993ecec11268f30dd44494a27367fcadc1`
- Reviewed local head: `144df662761420bb38af31095cfb18f1c3e64ec2`
- Tree: `2daee1bf5661f546e965872fb4310b84eb364a57`
- Complete binary patch SHA-256: `e52c29ad692756743772393d1114c16877803ed28819679a66300e0bbb06bf83`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

## Problem

已确认规格的交付在三个边界出现中断：父规格的执行授权未转为明确可执行子任务；叠加 PR 合并到功能分支后被视为已完成但提交未进入 main；子任务、验收证据和父规格状态没有统一核对。规格标题同时存在 `Spec:` 与 `spec:`。

已观察的实例：#37 / #42 的 PR #49 已合并到 `feat/issue-41`，但其 merge commit `eb3e056dd6fcd19b9ab69722ac447cce848c2d78` 不是 main 的祖先；#44 的实施 PR #50 已合并，但原生子任务关系与外部验收仍未完成；#52 的标题与执行状态曾未同步。

## Accepted outcome

- 父规格标题统一为 `spec:`；规格识别与执行资格仍使用明确类型/标签、批准范围和实际关系，不以标题大小写授予执行权限。
- 每次恢复任务时核对父规格、子任务、阻塞任务、已有 PR、当前负责人和未完成验收。已授权可交付的规格拆分到现有子任务或补齐缺失切片；保留明确的仅本地执行/暂停/未批准范围及活跃负责人的工作，不重复实现。
- 维护叠加 PR 的反馈和 CI；上游合入后将仍开放的后续 PR 转向 main，再验证该提交。已合并到非默认分支的 PR 必须形成明确的后续集成状态，不能直接完成源 Issue。需要新集成 PR 时保留原始 PR/提交/任务链，不重复实现或强推。
- 关闭实现 Issue 前核对实际交付提交进入当前 fetched main；关闭父规格前核对全部子任务及规格验收证据。关闭权限与合并权限沿用明确用户授权，默认仍保留人审，不自动开启 auto-merge、不 dismiss review。
- 将上述恢复与收尾步骤接入现有 local-agent 协议及相关 skills；不新增调度器、模型 API 或凭据搬运。

## Verification

沿用既有 GitHub 元数据、反馈归一化和本地 CLI seam，增加能重现已合并功能分支未进入 main、叠加 PR 仍需维护、父规格剩余验收与规范标题的回归；Git 集成判断使用真实临时仓库及实际祖先关系，不复制旧 receipt 作为独立输入。相关检查、完整 bun run check、独立 Standards（含 ponytail-review）与 Spec review、实际远端 tree/提交及当前 CI 都须验证。

## Delivery

流程修复由现有恢复工作树实施；产品交付仍复用已有实现分支与代码。与 #37/#42、#44、#52 的恢复操作分别记录真实证据，不把规范发布或标题改名当成任务完成。

### stacked-feedback

Stacked and integration branches retain feedback maintenance but are not default-branch ready.

Dependencies: none

### delivery-reconciliation

CLI uses real Git ancestry, native relationships, ownership, opt-out and full acceptance to report frontier and authorized closure.

Dependencies: stacked-feedback

### protocol

Protocol and skills consistently require spec: titles, recover approved slices, preserve PR chains and verify default-branch delivery before closure.

Dependencies: delivery-reconciliation

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: 对账规格、子任务和实际 main 集成状态，维护叠加 PR，并在推导执行或关闭候选前拒绝不完整的决策元数据。

**Standards：passed。硬性规范违规 0 项；判断性 smell 0 项。**

本次复核绑定下列新 base/head，覆盖完整 19 文件 patch。独立重新计算 binary patch SHA-256，并逐文件比较 Git blob：全部与已完成 Standards 审查的 `d44d3e9196157e8fb0757d6b667e4f9d2493fa51` 一致，原缺失 `merged` 导致重复候选的问题修复仍完整保留。

检查了新 main 的全部 3 文件变更：仅调整 Canvas Fragment 的空 Node 集合校验及 Fragment/Clipboard 回归测试，与本次流程脚本、状态契约及其调用链无重叠或依赖影响。因此，依据当前 AGENTS、工程原则、code-review、ponytail-review 和 Fowler baseline，完整 patch 的 Standards 结论保持通过。

固定身份：

- Base：`8406cc9373ba2d73e7363f347e4d96a624215397`
- Head：`144df662761420bb38af31095cfb18f1c3e64ec2`
- Tree：`2daee1bf5661f546e965872fb4310b84eb364a57`
- Binary patch SHA-256：`e52c29ad692756743772393d1114c16877803ed28819679a66300e0bbb06bf83`

Verdict: Ship（代码审查通过）。
Not checked: 本次执行了 Git 身份、完整 patch/blob 和 main 影响复核，未重跑测试或全量检查，未核验发布和远端 CI；此前定向测试及 CLI 复现保留原提交身份，不改标为新 head 的测试结果。


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

Spec review: passed，0 项发现。

审查依据：[Issue #60](https://github.com/ZWkang/nodebraid/issues/60) 的 Accepted outcome 与 Verification，覆盖相对当前 main 的完整 19 文件改动。

- 缺失：未发现。规格标题统一为 `spec:`，但执行资格仍取决于批准范围、标签、原生关系与执行状态；恢复流程核对子任务、阻塞、现有 PR、负责人及逐项验收，并保留 local-only、paused 和其他活跃负责人的工作。
- 错误实现：未发现。PR 与 Issue 决策元数据缺失或非法时明确失败，不产生执行前沿或关闭候选。交付以 fetched main 的真实 Git 祖先关系判断；选定后续 delivery 完成后不会再次恢复旧功能分支 merge。retarget 即使 head 不变也使旧验证失效；legacy digest 可读但不能直接获得 ready。父规格收尾要求所有切片、原生子任务、交付及验收完成，关闭候选不替代证据核验和既有权限。
- 范围越界：未发现。修改接入现有 local-agent 协议和 skills，未增加调度器、模型 API、凭据路径、自动合并或绕过 review 的行为。

合入最新 main 后，独立比较了全部 19 个变更路径的 base blob、最终 blob 与完整 binary patch，均与已审查修正保持一致。main 新增的三处 Fragment/Clipboard 改动仅将 Node 非空验证移至规范化集合并增加回归，与本次工作流改动没有重叠，也未改变 #60 的 Spec 判断。

本轮为代码及合入影响复核，未重复执行测试或全量检查；历史测试日志保持原提交身份。全量工程检查、远端发布/CI 和实际恢复结果不由本报告宣称完成。

固定审查身份：

- Base: `8406cc9373ba2d73e7363f347e4d96a624215397`
- Head: `144df662761420bb38af31095cfb18f1c3e64ec2`
- Tree: `2daee1bf5661f546e965872fb4310b84eb364a57`
- Binary patch SHA-256: `e52c29ad692756743772393d1114c16877803ed28819679a66300e0bbb06bf83`


## Behavior evidence

### stacked-red

red — passed; exit 1; expected exit 1.

A stacked PR remains managed and reports needs-integration instead of excluded.

Command: `bun test tests/pr-feedback.test.ts`

[Original command output](logs/behavior-1.log)

### retarget-red

red — passed; exit 1; expected exit 1.

Changing the PR target at the same head must invalidate previous verification.

Command: `bun test tests/local-agent-run.test.ts`

[Original command output](logs/behavior-2.log)

### frontier-red

red — passed; exit 1; expected exit 1.

Approved work exposes a frontier that respects blockers, active owners and execution choices.

Command: `bun test tests/local-agent-reconcile.test.ts`

[Original command output](logs/behavior-3.log)

### upstream-red

red — passed; exit 1; expected exit 1.

An open stacked PR becomes a retarget-and-reverify candidate only after upstream integration.

Command: `bun test tests/local-agent-reconcile.test.ts`

[Original command output](logs/behavior-4.log)

### repository-red

red — passed; exit 1; expected exit 1.

Merged PR evidence must belong to the requested base repository.

Command: `bun test tests/local-agent-reconcile.test.ts --timeout 30000`

[Original command output](logs/behavior-5.log)

### follow-up-delivery-red

red — passed; exit 1; expected exit 1.

Selected follow-up delivery prevents repeated integration of the historical feature-branch merge.

Command: `bun test tests/local-agent-reconcile.test.ts --timeout 30000`

[Original command output](logs/behavior-6.log)

### incomplete-pr-metadata-red

red — passed; exit 1; expected exit 1.

Missing PR merged metadata must not return an integrated task to the execution frontier.

Command: `bun test tests/local-agent-reconcile.test.ts --timeout 30000`

[Original command output](logs/behavior-7.log)

### invalid-issue-state-red

red — passed; exit 1; expected exit 1.

Invalid task and parent Issue state must fail before computing delivery or closure candidates.

Command: `bun test tests/local-agent-reconcile.test.ts --timeout 30000`

[Original command output](logs/behavior-8.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
