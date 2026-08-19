---
status: accepted
---

# 以广度优先顺序线性化 Renderer Input

Renderer Input 的每轮通知固定当前 listener 集合并按注册顺序同步调用；本轮订阅或取消只影响下一条 Input，取消幂等且不发送初始值。Listener 抛错不能阻断后续 listener 或改变输入顺序，由拥有观察边界的 Runtime 诊断与 Fault seam 恰好报告一次；listener 返回值不控制后端行为。通知期间重入产生的新 Input 进入 FIFO 队列，所有 listener 先观察 N 再观察 N+1；Renderer dispose 立即拒绝新 Input 与新订阅并取消现有关系，从而让 Provider、Interaction 与测试共享一个确定的输入顺序，而不暴露原生事件循环。
