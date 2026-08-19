---
status: accepted
---

# 要求 Renderer Commit 连续并显式重置

`reset` 接受一份完整 Canvas View 并建立 Renderer Baseline；后续 `commit` 的 before revision 必须等于当前 Baseline，Commit 的 before、after 与 Change Set revision evidence 也必须彼此一致，成功后才把 after revision 设为新 Baseline。重复、stale、跳号或内部不一致的 Commit 都显式报告失步，不能被忽略、猜测合并或部分应用。Renderer 没有 Kernel 读取权，因此重新同步由 Runtime adapter 读取最新 Canvas View 并发送新的 `reset`，从而把 revision 检查留在 Renderer seam、把权威状态恢复留在拥有 Kernel Service 的深 Runtime implementation。
