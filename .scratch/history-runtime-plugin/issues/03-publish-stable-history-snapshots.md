# 03 — 发布稳定 History Snapshot 订阅

**What to build:** 让 History Service 通过稳定不可变 Snapshot 和确定性 subscribe seam 暴露 Undo/Redo 可用性，不公开 Entry 数量、内容或内部栈。

**Blocked by:** 01 — 激活 History 并撤销首个 Baseline 后 Commit.

**Status:** resolved

- [x] Snapshot 只包含 `canUndo` 与 `canRedo`，在公开值不变时保持根引用。
- [x] subscribe 不立即通知，只在公开 Snapshot 改变时按注册顺序通知。
- [x] 新增或移除 listener 不改变已开始的本轮 recipient snapshot，unsubscribe 幂等。
- [x] listener 错误不阻断后续 listener，并通过平台错误通道显式报告。
- [x] 内部 Entry 变化但两个布尔值不变时不发布无语义通知。

## Answer

History Service 现在以只读 `canUndo` / `canRedo` Snapshot 与 future-change subscribe seam 发布可用性。公开值未改变时根引用稳定且不通知；通知固定本轮 recipient、按注册顺序运行，一个 listener 失败只进入平台错误通道，不阻断其他 Consumer。
