---
status: accepted
---

# 通过 Subscription 发布 Renderer Input

CanvasRenderer 以 `subscribeInput(listener)` 建立独立、可幂等取消的 Renderer Input Subscription，并按 Provider 标准化后的真实输入顺序同步通知；订阅不发送初始值。Input callback 不进入 Renderer Factory config，Renderer 也不公开可写事件队列、Pull cursor、RxJS Observable 或原生事件监听器。这个 seam 让 Runtime 在实例创建后拥有输入观察生命周期，同时保持 Provider config 只描述后端创建条件，并将具体 Input union、回调隔离与重入顺序作为同一窄订阅协议的后续约束。
