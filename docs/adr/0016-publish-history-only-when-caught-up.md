---
status: accepted
---

# 只在 History 追平 Kernel 后发布 Snapshot

History 仍按 revision 处理每个 Canvas Commit，但只在已观察 revision 与 Kernel 当前 revision 一致时替换公开 History Snapshot 并通知 subscriber；同一轮 Kernel 分发中的中间状态可以合并。这个取舍不向订阅者暴露尚未追平的 History，使 subscriber 在通知中重入执行 Undo 或 Redo 时不会立即因 observer 滞后而失败。
