---
status: accepted
---

# 强制 Plugin Graph 显式且无环

Plugin 只能获取静态声明的 Required Service，也只能提交静态声明的 Service Token；引入依赖环的安装会被拒绝，并报告完整环路。每个 Plugin Installation 内的生命周期转换保持串行，依赖关系按图有序执行，互不依赖的 Installation 可以并发激活。Canvas、Kernel 等基础 Runtime Service 也由内部 Plugin 提供，不存在绕过 Plugin 生命周期的 `host.provide()`。Plugin Host 的 dispose 是异步幂等终态，完成后不能重新安装 Plugin。
