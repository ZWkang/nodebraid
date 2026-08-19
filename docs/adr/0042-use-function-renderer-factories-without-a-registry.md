---
status: accepted
---

# 使用函数式 Renderer Factory 且不建立 Registry

`@cflow/renderer-api` 只定义从调用方按不可变值持有的类型化配置创建 `CanvasRenderer | PromiseLike<CanvasRenderer>` 的泛型 Renderer Factory 函数类型。每个官方或第三方 Provider package 只依赖 renderer-api，自行导出具名创建函数与具体配置类型、自行验证 Target 和后端选项，不共享通用 Schema、配置合并或 Provider Registry；多个官方 Provider 平级且没有默认实现。`@cflow/core` 重导出 renderer-api 与 session-api，但不反向聚合任何具体 Provider，从而让后端依赖和环境类型只进入明确选择该 Provider 的应用。
