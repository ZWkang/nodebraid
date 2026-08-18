---
status: accepted
---

# 使用 Plugin 组合整个 Canvas Runtime

除 Plugin Host、Service Token、状态与错误模型构成的最小基座外，Kernel、Session、Command、Renderer、Interaction、History 等画布能力都由 Plugin 提供 Runtime Service。Plugin Host 默认不安装任何基础能力；Canvas Composition 通过同一 Plugin Graph 中的 Child Installation 显式组合所需能力，子 Installation 随父 Activation 释放。Kernel Plugin 拥有 Document，释放该 Installation 就结束对应 Document 生命周期；持久化与恢复不由 Host 隐式完成。
