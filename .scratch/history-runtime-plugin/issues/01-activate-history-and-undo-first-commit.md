# 01 — 激活 History 并撤销首个 Baseline 后 Commit

**What to build:** 新增 `@nodebraid/plugin-history`，让它在真实 Kernel 与 Command Service 都可用时从当前 revision 建立空 History Baseline，记录第一个后续 Recordable Commit，并让调用方通过强类型 Undo Command 撤销它。

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] 每次 Activation 提供独立 History Service，初始 Snapshot 为不可 Undo、不可 Redo。
- [x] Activation 以 Kernel 当前 revision 为 Baseline，不补录此前 Commit。
- [x] Baseline 后的首个 Recordable Commit 使 Undo 可用。
- [x] Undo 通过 Command Service 反向 replay 该 Change Set，返回新 CanvasCommit 并产生单调 revision。
- [x] 通过真实 Plugin Host、Kernel、Command 与 History 公开 seam 完成逐条 red → green。

## Answer

真实 Plugin Host 现在可以在非零 Kernel revision 上激活空 History，只记录 Baseline 后的首个 Commit，并通过 Command Service 反向 replay 其 Change Set。公开 tracer 测试先因 History 模块缺失红灯，最小实现后以 revision 3 CanvasCommit、Baseline Node 保留和 Undo/Redo 可用性全部绿灯。
