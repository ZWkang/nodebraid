---
status: accepted
---

# 保持 History Replay 单飞且不排队

History 只在没有进行中的 Replay、且已观察到 Kernel 当前 revision 时接受 Undo 或 Redo Command；重叠调用与尚未追平的 observer 重入分别显式失败，成功 Command 则在对应 Replay Commit 已按 revision 顺序更新 History 后完成。唯一的生命周期例外是 Replay Commit 已由 Kernel 成功提交、但 Required Service 消失使当前 Activation 在接收该 Commit 前结束；此时已开始的 Command 以确切 Commit 成功收口，不再更新或发布已丢弃的 History 状态。虽然 Command Service 允许并发与重入，History 不为这些调用排队，因为延后执行会把调用时的栈顶意图静默替换成之后的另一个 History Entry。
