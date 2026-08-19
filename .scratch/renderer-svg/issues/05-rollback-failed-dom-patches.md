# 05 — 回滚失败的 DOM patch

**What to build:** 让通过预检后仍遇到浏览器 DOM 异常的增量 Commit 恢复原 Projection，并在恢复也失败时明确进入只能 reset 或 dispose 的失步状态。

**Blocked by:** 04 — 验证完整 Commit evidence 与派生 Edge.

**Status:** resolved

- [x] 通过真实浏览器边界故障注入使一次增量 DOM 操作中途失败。
- [x] 回滚成功时恢复元素 attributes、存在性、顺序和原 Renderer Baseline，然后抛出原始 DOM 异常。
- [x] 回滚本身失败时抛 `AggregateError` 并标记本地失步。
- [x] 失步后 Commit 明确失败，有效 reset 可重建 Projection 并恢复正常增量更新。

## Answer

增量 Commit 现在以 DOM mutation journal 记录 Edge/Node layer 原 child identity/顺序与每个属性旧值。真实 SVG 方法中途抛错时会逆序恢复并重抛原异常；回滚也失败则聚合全部错误、保留原 Baseline 并将 Projection 标记为失步，直到有效 reset 重建。
