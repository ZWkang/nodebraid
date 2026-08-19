# 05 — 收口取消与 Activation 生命周期

**What to build:** 让 History 的 Command、Service、Observer、subscriber 与 Entry 全部归当前 Activation 所有，明确撤销提交前后的取消边界，并在任一 Required Service 消失时停止所有旧行为。

**Blocked by:** 04 — 串行化 Observer 重入与 History Replay.

**Status:** resolved

- [x] 已取消 execution 在 Transaction 前保留 signal reason 失败，Kernel revision 不变。
- [x] Kernel 已提交后的取消不改判 Command 结果，不做补偿 replay。
- [x] Kernel 或 Command Provider 消失时，History 停用并清理 Observer、subscriber 与 Command registrations。
- [x] 旧 History Service 与清理窗口内的 handler 以 `SERVICE_DISPOSED` 显式失败。
- [x] 重新 Activation 从当时 Kernel revision 建立空 History Baseline，不继承 Entry、subscriber 或 pending replay。
- [x] Activation 结束后释放 History Entry 持有的 Change Set 引用。

## Answer

History 现在在 Transaction 前尊重调用方取消，而 Commit 之后不伪造失败或补偿。Activation AbortSignal 会在依赖停用的第一步关闭 History，使旧 Service 与清理窗口 handler 显式失效，然后注销 Commands 与 Observer。Kernel 或 Command Provider 重装都会从当时 revision 建立不继承 Entry 的新 Baseline。
