# Standards + ponytail-review — Issue #78 / PR #79 新 main 基线复审

Verdict: passed

- Base: `710038f0ed0cfc830580241ca1e90fca5f50677e`
- Head: `67ac72702760081093265d585cbe66f880dc9fa9`
- Tree: `4b17d60e90aaf7e20e0237ddf0c37e320ae15747`
- Binary patch SHA-256: `109bbee66116db007cb9e6bc86769dfebef001cc3f100c9b15a9bfcb0ea356de`

已独立核验新源记录、Issue 全文/空评论、准备任务、合并双父及完整五文件补丁。新 main 的规范更新已核对；Layout、关联 Runtime 和 Provider 实现未因 main 同步改变。本轮使用当前 head 的实际测试结果。

## 硬规范

未发现违反。`layout-input.ts` 的 mode 在校验、诊断和发布间共用一次捕获值；非法类型/模式和原始读取异常先于 Fixed Node 处理，后者不能改写已接受模式，符合 ADR0026 的 Request 边界。

`proposal-validation.ts` 保留一次原始 positions 序列及 sourceRevision、ID、position、坐标读取。精确覆盖、规范排序、Fixed Node 检查和冻结均使用自有已验证值，符合 ADR0021/0026。revision、重复/未知 ID、x/y 的错误优先级及原始失败身份保持。

已重新追踪 Input → Engine → shared validator → freeze → Runtime/Kernel/History。必要的 Runtime 重验、取消、实时 stale 检查及单次 Transaction 未删除；测试复用真实 Dagre/ELK、Host、Command、Kernel、Session 与 History，符合 Boundary Discipline、Fix Root Causes 和 Test Behavior, Not Implementation。

## 判断性 smell / ponytail

未发现有具体后果的可操作 smell。字段捕获位于既有负责模块，坐标 helper 复用同一检查并保留短路。没有额外公共 seam、cap、retry 或 fallback；按单 Canvas 布局负载，额外存储线性，排序复杂度保持。当前实现符合最小充分改动与可验证切片原则。

## 当前提交实际检查及限制

本轮 Layout API、Runtime、真实 Dagre/ELK 及根 Runtime/History 测试：62 pass、208 assertions（Bun 1.4.2）。完整范围 `git diff --check` 通过，工作树干净。

未执行构建、仓库 full check、浏览器、远端发布、实时 PR 反馈查询或当前 head CI。旧基线报告保持历史身份；本报告不把定向通过或计划选择 full 当作全量验收成功。
