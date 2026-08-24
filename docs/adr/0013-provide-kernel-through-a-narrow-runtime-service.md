---
status: accepted
---

# 通过窄 Runtime Service 提供 Kernel

官方 `@nodebraid/plugin-kernel` 直接依赖 `@nodebraid/kernel` 与 `@nodebraid/runtime-cordis` 的 NodeBraid-owned interface，并为每次 Activation 创建一份新的 revision-zero Kernel；它不暴露裸 `CanvasKernel`，而只提供包含读取、同步事务和有序 Canvas Commit 观察的 `KernelService`。Commit 分发和 Observer 生命周期留在 adapter 内，既不污染纯 Kernel，也不为当前唯一 Runtime 提前抽取推测性的 plugin-api 包。
