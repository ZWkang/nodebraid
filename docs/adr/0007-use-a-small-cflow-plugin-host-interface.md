---
status: accepted
---

# 使用小而完整的 CFlow Plugin Host interface

CFlow Plugin 通过静态 Service Binding 声明 `requires` 与 `provides`；Plugin Context 只以 `context.services.<binding>` 暴露 Required Service，并提供当前 Activation 的 AbortSignal、Owned Resource 登记和 Child Installation 创建能力。setup 通过返回值一次性提交全部 Provided Service，由 Host 校验后原子发布，不公开动态 `get()`、`provide()`、Host Service lookup 或任何 Cordis 类型。Plugin Installation 只公开稳定 Snapshot、订阅、`whenActive()` 和异步幂等 dispose；`whenActive()` 在 active 时立即完成、pending 时等待下一次 active、failed 或 disposed 时拒绝，调用方传入的 AbortSignal 只取消本次等待。结构性错误统一使用带 `code` 的 `PluginHostError`，Plugin setup 错误保持原值，多个清理错误使用 `AggregateError`。公开创建入口保持为 `defineService()`、`definePlugin()` 与 `createPluginHost()`。
