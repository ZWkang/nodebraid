---
status: accepted
---

# 将跨包诊断契约集中到独立叶子包

NodeBraid 使用零运行时依赖且无副作用的 `@nodebraid/diagnostics` 统一承载 NodeBraidError 基类、诊断事件与 Fault 协议、安全错误描述和不可变诊断值处理。Kernel、Runtime、Layout 与 Runtime Plugin 包可以直接向下依赖该包，`@nodebraid/core` 只负责重导出；这些契约不放入 `@nodebraid/runtime-cordis` 或 `@nodebraid/core`，避免纯包反向依赖 Runtime 或内部包反向依赖公共 facade。

该包是一个 deep module：外部 seam 只暴露错误基类、事件/Reporter 数据契约和确定性描述函数，Host scope 补全、值校验冻结、因果树遍历、Sink 隔离与最终平台上报都留在 implementation。测试通过同一公开 interface 验证行为，不为内部时钟、序号器或遍历器增加公共 seam。
