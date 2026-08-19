---
status: accepted
---

# 将 Selection 严格绑定到当前 Kernel View

Session 静态依赖 Kernel Service，外部设置 Selection 时只接受当前 Kernel View 中存在的 NodeId 与 EdgeId，包含未知实体时整次拒绝且保持原状态。Kernel Commit 依据该 Commit 的 `after` View 移除已失效的选择，但不产生新的 Kernel Change Set 或 History；若 Commit 在 Session subscriber 内重入，reconciliation 按 Session 的广度优先转换顺序在当前通知轮结束后执行。相比允许预选或不受约束的延迟清理，这个边界让稳定通知点上的 Selection 可以直接解析，也避免 Session 形成独立于 Document 的实体生命周期。
