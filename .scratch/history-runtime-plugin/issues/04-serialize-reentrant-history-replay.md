# 04 — 串行化 Observer 重入与 History Replay

**What to build:** 让 History 在 Kernel Observer 同步重入、Commit 排队和 Command 重入并存时仍严格按 revision 维护 Entry，只抑制确切的自身 Replay Commit，并只在追平 Kernel 后发布 Snapshot。

**Blocked by:** 02 — 完成 Redo、分支失效与基础错误; 03 — 发布稳定 History Snapshot 订阅.

**Status:** resolved

- [x] Activation-private pending replay 正确关联 transact 返回前立即投递的 Replay Commit。
- [x] Replay 在已有 Kernel 分发中被排队时，以确切 CanvasCommit 身份延后关联。
- [x] pending replay 期间的重叠 Undo/Redo 以 `HISTORY_BUSY` 失败，不排队。
- [x] History 尚未追平 Kernel 时以 `HISTORY_NOT_CAUGHT_UP` 失败，并报告两个 revision。
- [x] Replay 分发期间产生的 Recordable Commit 仍被记录，并按标准分支语义清空 redo。
- [x] 公开 Snapshot 只在 observed revision 追平 Kernel 时发布，同轮中间态可合并。

## Answer

History 现在以 observed revision 和 Activation-private pending replay 维护严格 Commit 顺序。立即投递由 transact 动态范围关联，排队投递由确切 CanvasCommit 身份关联；重叠 replay 与 observer 滞后分别显式失败。真实重入测试还证明了 Recordable Commit 不会被 replay 标记吞掉，公开 Snapshot 只在追平后发布。
