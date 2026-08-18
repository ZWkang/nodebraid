---
status: accepted
---

# 每次 Plugin Activation 独立拥有并释放资源

Plugin 静态声明它提供的 Service Token，并在 Activation 中提交对应 Runtime Service；未提供已声明 Token 时激活失败。setup 可以异步执行，并获得在停用或 dispose 时触发的 AbortSignal。Plugin 在 Activation 中登记的 Service、订阅与其他资源都归该 Activation 所有，并按登记逆序释放；相关依赖方先于 Service Provider 停用。清理过程即使遇到错误也继续尝试其余 disposer，最终用 AggregateError 显式报告全部失败。首版不统一配置 Schema，运行时配置错误由 Plugin setup 显式抛出。
