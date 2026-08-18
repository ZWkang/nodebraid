---
status: accepted
---

# 将纯 Kernel 与 Kernel Plugin adapter 分离

`@cflow/kernel` 只提供进程内的 Document、Transaction、Canvas Snapshot、Canvas Query 与 Change Set 能力，不依赖 Plugin Host、Cordis、Runtime、Renderer 或 `@cflow/core`。Kernel Plugin adapter 在这个 seam 之外把 Kernel 作为 Runtime Service 提供并拥有其生命周期；adapter 的具体包位置暂缓到纯 Kernel interface 得到实现证据后再决定。这样既保留 Everything is Plugin 的 Canvas Composition，又避免生命周期组合反向塑造或污染 Kernel。
