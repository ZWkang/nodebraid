---
status: accepted
---

# 使用 reset 或 commit 更新 Renderer Document

Renderer 通过一个 `updateDocument` interface 接收 discriminated union：`reset` 携带完整 `CanvasView`，用于首次同步与重新建立基线；`commit` 携带 Kernel 已原子产生的完整 `CanvasCommit`，使整图重建实现可以读取 `commit.after`，增量实现可以读取 `commit.changeSet`。Interface 不强制具体增量策略，但更新调用返回时 Renderer 的逻辑状态必须已经接受该更新，后续 Hit Test 能观察新状态；实际像素绘制可以由 Provider 批处理。不拆分 `setSnapshot` 与 `applyChanges` 两个存在调用时序和证据错配风险的方法，也不重新组合可能属于不同 revision 的 Snapshot 与 Change Set。Session Snapshot 通过独立更新通道交付，Selection 与 Viewport 不进入 Document Change Set。
