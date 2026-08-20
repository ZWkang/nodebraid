---
status: accepted
---

# 用逐 Node position 证据保护移动提交

Move Nodes Command 为每个目标携带 Node ID、起点 position 与绝对目标 position，不绑定全局 Document revision，也不将相对 delta 自动重基到新位置。Handler 在一次同步 Transaction 中确认全部 Node 仍存在且当前 position 与起点相同，再从当前完整 Node 仅替换 position；任一目标删除或已被移动都以 Stale Gesture 拒绝整次提交，无关 Commit 与其他字段变化则不阻断用户操作。这在不覆盖并发位置写入的同时，避免全局 revision 冲突造成无关拒绝，并保留 drag 期间的 Node data、size 或其他字段更新。
