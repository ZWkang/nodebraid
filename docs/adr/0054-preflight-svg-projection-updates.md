---
status: accepted
---

# 在修改 SVG 投影前完整预检

`@cflow/renderer-svg` 在修改 Renderer Baseline、Session 或 DOM 前完整验证更新 evidence。Document 预检包括 Snapshot 实体结构、唯一且规范排序的 ID、Provider Geometry capability、Commit before/after/Change Set revision 与内容一致性，以及 before 与当前本地 Baseline 的一致性；增量计划还要重算受 Node 变化影响但未直接出现在 Change Set 中的 Edge。Provider 只消费 Snapshot 与 Commit evidence，不调用 `CanvasQuery`；接受更新时复制 CFlow-owned entity shell 与 Geometry，`type`、`parentId` 及 opaque `data` 只为 evidence 一致性保留，其中 `data` 保留原引用但不解释或深拷贝。Session 预检要求已有 Document Baseline，并验证 Selection 的结构、规范顺序、唯一性与实体可解析性，以及 Viewport 的有限值与正 zoom。任一预检失败都 all-or-throw，旧 DOM、Baseline 与 Session 保持不变。预检后的增量 DOM patch 使用回滚日志：未知 DOM 异常发生后先逆序恢复已应用操作再抛出原异常；回滚也失败则抛 `AggregateError` 并将实例标记为失步，之后只接受 `reset` 或 `dispose`。
