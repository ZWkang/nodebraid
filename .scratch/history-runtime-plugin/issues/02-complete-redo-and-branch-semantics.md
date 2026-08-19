# 02 — 完成 Redo、分支失效与基础错误

**What to build:** 在首个 Undo 闭环上完成 Redo 与稳定错误语义，让 Replay Commit 保留准确诊断 metadata、不重复记录自身，并让新 Recordable Commit 显式截断 redo 分支。

**Blocked by:** 01 — 激活 History 并撤销首个 Baseline 后 Commit.

**Status:** resolved

- [x] Redo 正向 replay 最近 Undo 的 History Entry，返回新 CanvasCommit。
- [x] Undo/Redo Commit 分别使用 `history.undo` / `history.redo` commandId 与 `history` origin。
- [x] Replay Commit 不被当作新 Recordable Commit，反复 Undo/Redo 不增生额外 Entry。
- [x] Undo 后的新 Recordable Commit 清空 redo。
- [x] 空栈 Undo/Redo 分别以 `UNDO_EMPTY` / `REDO_EMPTY` 显式失败，不改变 Kernel 或 History Snapshot。

## Answer

History 现在通过同一个强类型 Command seam 完成 Undo 与 Redo，返回带 `history` origin 和准确 commandId 的新 CanvasCommit。公开测试锁定了 Replay Commit 不增生 Entry、新分支清空 redo，以及两个空栈错误不改变 Kernel 或 Snapshot。
