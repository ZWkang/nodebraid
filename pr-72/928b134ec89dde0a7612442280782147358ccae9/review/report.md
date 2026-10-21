# Verification report

Run: a8623a08-ce32-4cf3-8a2e-54d4686fa497 · ZWkang/nodebraid · issue #71

## Reviewed and published source

- Base: `56ccf1267941b3034f1a8204cb554358c2a4fff1`
- Published head: `928b134ec89dde0a7612442280782147358ccae9`
- Reviewed local head: `1dad0a6abb2fd6ee73925be0db015dcd5cc5ff24`
- Tree: `a146ee3b034d9b0900e38738ab6bd4ef3e785d75`
- Complete binary patch SHA-256: `f8eda9ca8d3bd177e0752f9c181e0f8fdffc7464e87e3fd2328e9ae67966be15`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

## Problem

需求规格、实施子 Issue 和叠加 PR 分属不同交付层级，维护者需要额外维护父子关联、汇总子任务并追踪最终 main 集成，容易使已确认需求停留在中间状态。

## Delivery model

一个需求/spec 对应一个 GitHub Issue 和一个面向 main 的 PR。需求 Issue 保存问题、范围、已确认设计、验收和讨论，标题使用 `spec: `。实现可以拆成多个 ticket、多个提交并由多个 Agent 协作，但 ticket 只保留在本地，同一需求持续更新同一个 PR。

- 本地 ticket 复用现有 run 的 `plan: [{id, blockedBy, acceptance}]`、`completed-steps.json` 与执行证据；必要的阅读说明也保存在该 run。按依赖推进，恢复时读取实际状态。
- GitHub 不再为实施 ticket 创建子 Issue、阻塞关系或叠加 PR。不同需求之间真实存在的依赖仍按其事实处理，不能把本地 ticket ID 当成 GitHub Issue 编号。
- 新需求以单一交付 Issue 进入现有对账和验证流程；规格批准、是否执行、负责人和待验收项保持明确。既有 Issue 本地阅读副本仍是 GitHub 内容的只读归档。
- 最终 PR 直接关联并关闭源 spec Issue。关闭仍以实际 main 集成、完整验收、当前提交检查和既有合并/关闭权限为准，本地 ticket 完成不单独证明交付完成。
- 历史父子 Issue、已发布 PR 和原始证据保留，不批量改写或删除。旧层级仅用于既有记录的追踪和恢复。

## Acceptance

1. AGENTS、to-spec、to-tickets、PR 模板、本地执行协议与 Issue tracker 约定采用一致的单 Issue/单 PR 模型；拆票结果明确保存在 worktree 外的 run 目录。
2. 复用 `prepare/frontier/reconcile`：本地 ticket 可排序、检查依赖并从已完成项恢复；新需求无需 GitHub 原生子 Issue 即可进入执行和交付验收。
3. 更新过程不增加调度器、模型调用、凭据路径或另一套任务存储，不改变 Canvas 公共契约；其他正在进行的任务不被接管。
4. 已有状态回归保持通过；真实临时 Git/CLI 场景核对一个 spec Issue、多个本地 ticket、一个 main PR 的完整状态链。验证范围与未执行项如实记录。
5. 完整 patch 经过独立 Standards（含 ponytail-review）与 Spec 审查，再执行完整交付检查、实际发布与当前 head CI 验证。

Refs #60, #63.

### single-delivery-protocol

All workflow and skill entry points use one spec Issue and one main PR; local tickets reuse the prepared plan and legacy records remain readable.

Dependencies: none

### local-ticket-cli-validation

Real Git and public CLI tests cover single-Issue readiness/acceptance and local ticket dependency progress/resume without creating remote child Issues.

Dependencies: single-delivery-protocol

### review-and-delivery

Independent Standards/Spec, one full verification, exact remote publication, report readback and current-head CI pass before delivery.

Dependencies: local-ticket-cli-validation

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: 用一个 spec Issue 和一个 main PR 交付新需求，本地 ticket 复用现有计划与证据，并区分合并前 ready、合并后验收和 Issue 关闭。

**Standards：passed。硬性规范违规 0 项；启发式 smell 0 项。**

本次复审覆盖完整 12 文件 patch；逐项审查新增 8 文件关闭规则，另外 4 文件与上次已完整审阅的 blob 相同。已重新计算实际 head/tree/binary patch 身份，依据当前 AGENTS、Issue tracker、本地协议、相关 skills、ponytail-review、Fowler baseline 和适用工程原则检查一致性。

默认 PR 模板现在使用 `Refs #N`。合并后仍有验收时，同一 Issue 保持开放并在验收后显式关闭；只有合并本身是最后剩余验收条件且关闭已获授权，才允许 `Fixes #N`。各入口一致要求核对 PR、提交消息和自动关闭的 Development 关联，避免仅修改正文后仍提前关闭。

此前 ready 的顺序修复仍完整保留：合并前步骤和当前 head 检查、审查、报告决定 ready；依赖 main 的步骤按保存的 acceptance 保持 pending，关闭才核对真实 main 集成、全部 ticket 证据和剩余验收。frontier 仍只提供依赖候选，没有把协调者核对描述为自动门禁。

单 Issue/单 PR、本地计划恢复、隔离协作者汇入同一交付及历史链保留相互一致。生产运行时代码无 diff，两个真实 CLI 用例保持不变；没有新增状态字段、存储、调度、审批或凭据路径，也没有削弱错误暴露和源码身份要求。

固定身份：

- Base：`56ccf1267941b3034f1a8204cb554358c2a4fff1`
- Head：`1dad0a6abb2fd6ee73925be0db015dcd5cc5ff24`
- Tree：`a146ee3b034d9b0900e38738ab6bd4ef3e785d75`
- Binary patch SHA-256：`f8eda9ca8d3bd177e0752f9c181e0f8fdffc7464e87e3fd2328e9ae67966be15`

Verdict: Ship（代码审查通过）。
Not checked: 本次未运行测试、全量检查或发布。已核对旧验证记录仍绑定 `7fd2f1af23c0537629425835a1d82cf3252aaf4a`、exit 0、source stable；它不证明当前 head 已通过全量检查。


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

Spec review: passed，0 项未解决发现。

依据 [Issue #71](https://github.com/ZWkang/nodebraid/issues/71) 的单 spec Issue/单 main PR 模型与完整验收，独立复核相对固定 base 的全部 12 文件 patch，并检查本次 8 个入口的关闭条件修正。

- 两项 P2 均已解决。ready 只要求合并前步骤/验收和真实当前 head 的检查、审查及报告；依赖合并后操作的步骤保留 pending，关闭才要求 main 集成、全部剩余验收及空本地 frontier。PR 默认使用普通 Refs；存在合并后验收时保持 Issue 开放，验收后按既有权限显式关闭。只有 merge 是最后条件且关闭已获授权才使用 Fixes，并核对 PR、commit 消息和 Development 自动关闭关联，避免仅改正文仍提前关闭。这与 [GitHub 关闭关联行为](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue)一致。
- 缺失：未发现。同一获准实施的 spec Issue 直接进入 ready，一个 main PR 持续承载全部本地票及提交；计划、完成记录和证据保存在 worktree 外现有 run。prepare/frontier 处理本地依赖和恢复，flat reconcile 使用 specs=[]、parent=null，无需创建子 Issue。历史关系和原始证据保留。
- 错误实现：未发现。各启用入口的 ready、关闭、Refs/Fixes 条件一致；frontier 是依赖候选，仍核对外部前提与权限。verify 前不提前勾完审查/发布票，本地票也不替代整份 spec 的验收，文档未把协调检查宣称为自动门禁。
- 越界：未发现。无新增 runtime、phase 字段、调度、模型调用、凭据或任务存储；保留活跃 owner 和隔离 worker 协作边界，不改变 Canvas 契约。

两项 CLI 回归源码与此前完整审查一致。本轮未运行测试；7fd 的真实全量结果仍绑定旧 head，不能复用为本 head 成功。当前 head 的全量检查、发布、CI 和合并尚不由本报告宣称完成。原两项发现及旧报告保留原身份。

固定审查身份：

- Base: `56ccf1267941b3034f1a8204cb554358c2a4fff1`
- Head: `1dad0a6abb2fd6ee73925be0db015dcd5cc5ff24`
- Tree: `a146ee3b034d9b0900e38738ab6bd4ef3e785d75`
- Binary patch SHA-256: `f8eda9ca8d3bd177e0752f9c181e0f8fdffc7464e87e3fd2328e9ae67966be15`


## Behavior evidence

Behavior evidence: not provided. The full engineering check does not establish regression red/green coverage.

## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
