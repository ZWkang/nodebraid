---
status: accepted
---

# 将 Command 依赖留在定义它的 Plugin 中

官方 `@nodebraid/plugin-command` 只提供 Command 的类型安全注册、执行、取消与生命周期，不直接依赖 Kernel Service 或未来 Session Service。定义 Command handler 的 Feature Plugin 通过自己的静态 Service Binding 获取所需能力并闭包使用它们；这样 Command Service 不会成为隐藏的 Service locator，同一执行 seam 也能组合 Document 与非 Document 行为。
