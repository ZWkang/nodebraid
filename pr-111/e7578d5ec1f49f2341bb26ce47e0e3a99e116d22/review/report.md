# Verification report

Run: issue-110-main-sync · ZWkang/nodebraid · issue #110

## Reviewed and published source

- Review base: `58889a92b7cc7a3c953efe115ff6d8664924e094`
- Independently prepared append parent: `4ca21d481614496fe7f73f9ea784a03f214e33f7`
- Published head: `e7578d5ec1f49f2341bb26ce47e0e3a99e116d22`
- Reviewed local head: `73762f996c72ddf33a6efa6406b198f4f3041cc0`
- Tree: `1e321cae6f572eed44afaf8d3092f9a1e3450f26`
- Complete binary patch SHA-256: `8e77938c1470dc9638ca32a26083ae9c044e5af788da195b3b665c32a88b8456`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## PR risk and merge route

Risk: high. Route: full-human.

- standards: high — 完整变更修改 Agent 指令、审查与即时合并权限策略，涉及 .agents、docs/agents、scripts、AGENTS.md 和格式配置，触发 high 最低等级。同步 main 不降低该权限变更的风险。
- spec: high — This delivery changes merge authorization and the Agent review, verification and publication policy. Its protected paths and policy-self-change rule require high risk and full human review; synchronizing independent main changes does not lower that classification.
- .agents/skills/code-review/SKILL.md: minimum high risk.
- .agents/skills/pr-risk/SKILL.md: minimum high risk.
- .agents/skills/pr/SKILL.md: minimum high risk.
- .agents/workflows/local-agent.md: minimum high risk.
- .prettierignore: minimum high risk.
- AGENTS.md: minimum high risk.
- docs/agents/agentic-workflows.md: minimum high risk.
- docs/agents/discussion-workflow.md: minimum high risk.
- docs/agents/issue-tracker.md: minimum high risk.
- docs/agents/pr-evidence.md: minimum high risk.
- docs/agents/principles.md: minimum high risk.
- scripts/check-agent-workflows.ts: minimum high risk.
- scripts/local-agent-run.ts: minimum high risk.
- scripts/local-agent.ts: minimum high risk.
- scripts/pr-risk.ts: minimum high risk.
- scripts/verification-report.ts: minimum high risk.

### standards risk: high

Impact and reasoning: 完整变更修改 Agent 指令、审查与即时合并权限策略，涉及 .agents、docs/agents、scripts、AGENTS.md 和格式配置，触发 high 最低等级。同步 main 不降低该权限变更的风险。

Evidence: 在新 base 58889a9 与 head 73762f9 上核对完整补丁、合并父节点、干净索引及无路径重叠；main 的 Create Edge 文件逐字节保留。新 head 的风险、evaluate 及 Create Edge 公共 seam 实际执行 66 项全部通过；当前 run 的 7 文件定向日志另记录 54 pass。新 run 全量 verify 尚未计入此审查。

Rollback: 回退发布的风险路由提交 4ca21d481614496fe7f73f9ea784a03f214e33f7，保留同步 main 的 Create Edge 修复，可恢复原人工审阅与合并流程；无数据迁移。历史审查和验证证据保留原身份。若策略已触发其他真实合并，须逐项审查并回退相应交付，回退策略提交不会撤销那些合并。

### spec risk: high

Impact and reasoning: This delivery changes merge authorization and the Agent review, verification and publication policy. Its protected paths and policy-self-change rule require high risk and full human review; synchronizing independent main changes does not lower that classification.

Evidence: Inspected actual main and merge deltas, the full 22-file delivery scope, source spec and workflow call chains at 73762f9. No conflicts or package divergence remain. New targeted.log records 54 passing tests; PR #111 discussion/review surfaces were read and empty. The corrected VitePress floor remains present. New-head full verification and published evidence remain pending.

Rollback: Revert the risk-routing delivery commit 4ca21d481614496fe7f73f9ea784a03f214e33f7 while retaining main synchronization and PR #107 changes; preserve durable run records. This restores the previous human-merge policy. Any PR already merged under the policy requires its own reviewed revert; policy rollback cannot undo that external operation.

Automatic routing is a candidate only. The coordinator still checks current PR status, report publication, pre-merge acceptance and authorization immediately before a head-bound merge.

## Acceptance plan

## Problem
所有托管 PR 均默认等待人工审阅和合并，低影响、可逆且已完整验证的改动也需要相同人工介入。

## Scope and behavior
在现有本地订阅工作流增加 PR 风险分级，复用独立 Standards/Spec review、完整工程检查、报告发布与当前 head 的 GitHub 检查：
- low：影响局部、容易回滚、没有公共契约或敏感边界变化；两轴均明确判定 low 才可成为免人工合并候选。
- medium：行为、兼容公共 API、Runtime 生命周期、并发或资源管理变化，保留人工重点审阅与合并。
- high：权限、凭据、破坏性状态变更、审查/验证/发布策略等变化，保留完整人工审阅与合并。
- 不因 patch 小、Markdown 后缀、单独 CI 绿灯或单轴通过判为低风险。判断包含具体影响、验证依据和回滚方案；分歧取高等级。
- 分级绑定既有 head/tree/完整 binary patch。历史收据缺少分级时明确未评估，不能获得自动合并资格；新 verify 要求两轴分级完整。
- 对审查规则、Agent 指令、CI/发布/验证脚本等受保护路径设置最低 high；公共框架实现至少 medium。路径只能提高等级，不能证明低风险。
- evaluate 保留现有 ready/repair/waiting 等状态，额外输出风险与合并路由。自动合并仅为候选，实际写入前仍读取当前完整讨论、检查、报告发布回执以及合并前 ticket/验收。
- 低风险通过上述条件后，由既有本地 Agent 使用绑定当前 head 的即时合并；不启用等待未来 head 的 GitHub auto-merge 队列，不自批、不 dismiss、不绕过分支保护。Issue 关闭继续使用既有独立授权和验收规则。
- 制度自身修改合并权限，属于 high，不能使用新规则自行自动合并。

## Implementation
新增项目级 pr-risk skill 作为分级规则入口；在现有 review、verify、evaluate 与完整验证报告中贯通分级。同步 AGENTS、工作流、tracker、讨论及 PR 说明。无新调度器、模型 API、依赖或 GitHub ruleset 放宽。

## Acceptance
1. 两轴 low、medium/high、分歧、缺失与非法评估、受保护路径和历史收据均有自动化回归。
2. 当前 head/base 变化、CI 失败或等待、required review、changes requested、未解决讨论仍阻止自动合并候选。
3. CLI 从真实 Git diff 采集变更路径；风险证据随原有验证及发布身份保存，报告显示两轴依据和最终路由。
4. 文档、skill 和执行规则一致；报告发布和合并前验收仍由协调者实际核对，不宣称 evaluate 已自动验证这些步骤。
5. 定向检查、独立双轴 review、agents:run verify 的全量检查和当前 head 报告发布均完成；交付一个面向 main 的 PR。

### risk-routing

Independent risk classifications, protected path floors, current-head candidate routing and historical receipts pass public API/CLI regression tests.

Dependencies: none

### workflow-and-report

Risk skill, workflow, README and report agree; risk evidence shown without claiming coordinator-only checks ran.

Dependencies: risk-routing

### review-and-delivery

Independent Standards/Spec pass, full verify passes, source PR and exact-head report published/read back; high-risk change remains for human review.

Dependencies: workflow-and-report

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

改动将两轴风险评估、路径最低等级和合并候选接入既有验证及报告流程。以 base 58889a92b7cc7a3c953efe115ff6d8664924e094、head 73762f996c72ddf33a6efa6406b198f4f3041cc0 审查完整补丁及 main 同步结果。

未发现 Must fix、Should fix 或 Nice to have 问题。实际比较确认完整 binary patch 与已审查实现逐字节一致，22 个 PR 路径与 main 新增的两处 Create Edge 改动没有重叠；合并树完整保留 main 的实现和测试版本。重新读取了 Create Edge 输入捕获及注册、调用位置，未发现与工作流风险模块的调用耦合。git diff --name-only --diff-filter=U 与 git ls-files -u 均为空，工作区干净。

风险边界仍由共享纯函数判定，CLI 采集真实 Git 双路径并验证新审查字段；历史记录保持 unclassified。VitePress 配置维持 high，候选状态仍依赖既有 current-head、CI 和 review 判断；报告没有把候选写成已完成的发布回读或实际合并。

本次在新 head 实际运行 `bun test tests/pr-risk.test.ts tests/local-agent-run.test.ts packages/plugin-interaction/tests/create-edge-input-values.test.ts`：66 pass、0 fail，日志 standards-tests.log；另已读取本 run targeted.log 的 54 pass、0 fail 结果。未以旧 run 的全量结果替代新树验证。

Verdict: Ship（Standards passed；high/full-human）。Not checked: 本审查未执行新 run 的全量 agents:run verify、远端报告发布或实际合并。

## Spec review

Verdict: passed. [Original report](reviews/spec.md)

Independent Spec review after main synchronization, against Issue #110 and its confirmed approval comment. Fixed base 58889a92b7cc7a3c953efe115ff6d8664924e094; head 73762f996c72ddf33a6efa6406b198f4f3041cc0. Read the new prepared task, source spec, actual merge delta, complete changed-file scope and related call chains. Verified clean worktree, empty unmerged index and git diff --check. The complete binary patch remains identical to the corrected implementation, confirmed by its SHA-256 rather than assumed from commit names.

No specification findings. Main added captured Create Edge inputs and their public-seam regression tests in packages/plugin-interaction. Both files exactly match the new base in this delivery; there is no remaining PR diff in that package and no import relationship with risk classification, verification, evaluation or report generation. The merge therefore preserves both main's changes and the reviewed risk-routing implementation.

The requirements remain implemented: independent assessments bind head/tree/complete patch; new verify rejects missing or malformed risk; real Git paths preserve rename source/destination; disagreements and protected-path floors raise risk; historical missing evidence stays unclassified; current-head/base, CI, required reviews, changes requests and unresolved feedback retain their blockers. Reports show both assessments and final routing. VitePress build configuration retains the corrected high floor. Documentation keeps current-head report readback and pre-merge acceptance with the coordinator, requires immediate expected-head merges, and preserves separate Issue-closing authorization.

Read the new run's targeted.log: 54 tests passed across seven files, including real Git CLI and report fixtures. Refreshed PR #111 comments, review submissions and review threads via the GitHub connector: all were empty at this review checkpoint. Prior full-check results remain historical; this head still needs its own agents:run verify and report publication/readback. This review modifies no repository source, remote state or prior run.

## Behavior evidence

### report-red

red — passed; exit 1; expected exit 1.

Before the implementation, the report contract assertions fail because risk is absent; 7 pre-existing cases pass. Original log retained from the implementation run.

Command: `bun test tests/verification-report.test.ts`

[Original command output](logs/behavior-1.log)

### vitepress-red

red — passed; exit 1; expected exit 1.

Before the correction, the real VitePress configuration is classified low despite the required high floor. Original failing public-seam log retained.

Command: `bun test tests/pr-risk.test.ts`

[Original command output](logs/behavior-2.log)

### current-head-green

green — passed; exit 0; expected exit 0.

At synchronized head 73762f9, 54 tests and 313 assertions pass, including both report contracts, the VitePress high-risk floor, Git rename handling, old receipts and current-head CI/review blockers.

Command: `bun test tests/pr-risk.test.ts tests/local-agent-run.test.ts tests/local-agent-cli.test.ts tests/local-agent-bases.test.ts tests/pr-feedback.test.ts tests/github-feedback.test.ts tests/verification-report.test.ts`

[Original command output](logs/behavior-3.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
