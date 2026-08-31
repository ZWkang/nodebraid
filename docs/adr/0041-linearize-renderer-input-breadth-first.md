---
status: accepted
---

# 以广度优先顺序线性化 Renderer Input

Renderer Input Subscription 分成同步控制相位与行为相位：Provider 在每条已规范化 Input 入队前固定当前 Disposition listener 集合并同步求出 backend-neutral Input Disposition，使重入原生事件也能在自己的 handler 返回前请求阻止默认动作；`void` 允许默认动作，任一有效 prevent 请求成为最终结果，后续 listener 不能撤销。行为 listener 随后按注册顺序接收 Input，通知期间产生的重入 Input 进入 FIFO 队列，所有行为 listener 先观察 N 再观察 N+1；本轮订阅或取消只影响下一条 Input，取消幂等且不发送初始值。Listener 抛错或 malformed Disposition 不能吞掉其他 listener 已产生的 prevent；Provider 先应用最终 Disposition，再显式暴露单个原始错误或 `AggregateError`。Renderer dispose 立即拒绝新 Input 与新订阅并取消现有关系，从而同时保持默认动作时机和确定的行为顺序，而不暴露原生事件循环。
