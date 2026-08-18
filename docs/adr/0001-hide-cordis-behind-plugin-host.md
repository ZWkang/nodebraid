---
status: accepted
---

# 将 Cordis 隐藏在 CFlow Plugin Host 之后

CFlow 定义自己的 Plugin 与 Plugin Host interface，只把 Cordis 用作内部生命周期实现。每个 Canvas Runtime 拥有一个隔离的 Plugin Host，支持动态安装和异步幂等释放，并在一次 Plugin Installation 生命周期内保持配置不变。这个 seam 将 Cordis 的生命周期与类型变化集中在一个 module 内，避免它们扩散到所有 CFlow 插件。
