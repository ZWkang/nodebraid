---
status: accepted
---

# 用待删目标证据保护 Selection 删除

Delete Selection Command 同时接收 Selection 与发起时的精确 Canvas Snapshot，但不使用全局 revision 作为 optimistic lock。Kernel 在无关 Commit 中保留未变实体的根值 identity，任何真正 replace（包括 remove 后以相同值 re-add 的 ABA）都产生新 identity；Handler 因此在一个同步 Transaction 中预检每个显式选中 Node、显式选中 Edge 与选中 Node 的完整 incident Edge 闭包仍与该 Snapshot 保持同一目标 identity。不相关 Commit 可继续，任一目标消失、替换或新增 incident Edge 则以 Stale Selection 拒绝整次删除。预检通过后先按规范 ID 顺序删除去重 Edge 闭包，再按规范 ID 顺序删除去重 Node；这既避免误删竞争写入，也不因无关 revision 变化拒绝用户意图。
