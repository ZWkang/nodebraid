# CFlow Command Runtime Plugin

**Status:** ready-for-agent

## Problem Statement

Plugin Host 已提供 Runtime Service 与 Activation 生命周期，Kernel Plugin 已提供权威 Document 的读取、同步 Transaction 和 Commit 观察，但 Runtime 阶段仍缺少可注册、可异步准备并由交互或应用统一调用的 Command 能力。若每个 Feature Plugin 自建字符串映射、取消和释放规则，Command 身份、重复注册、进行中执行与 Plugin 停用之间会产生不一致行为。

## Solution

新增可发布的 `@cflow/plugin-command`。`commandPlugin` 在每次 Activation 中提供一个空的 `CommandService`；Feature Plugin 通过强类型 `Command` token 注册 handler，并把返回的 `CommandRegistration` 交给自己的 Activation。调用方通过同一 token 执行并得到 `Promise` 结果。

Command Service 只拥有注册和执行生命周期，不直接依赖 Kernel 或 Session。Feature Plugin 通过自己的 Required Service 获取 Kernel、Session 或外部能力并闭包到 handler 中。每次执行收到独立 AbortSignal 和规范 Command ID；调用方取消、Command 注销或 Service 释放都会中止对应执行。清理会等待 handler 真正结束，不使用超时或假成功。

## Interface Decisions

- `defineCommand<Input, Output>(id)` 创建运行时身份唯一且输入、输出类型不变的 Command token；非空 ID 用于诊断和 Transaction metadata，不替代 token 身份。
- `CommandService.register(command, handler)` 注册一个 handler，并返回具有异步幂等 `dispose()` 的 `CommandRegistration`。
- 同一 Command token 或相同诊断 ID 同时只能有一个注册；冲突同步抛出结构化 `CommandError`。
- `CommandService.execute(command, input, options?)` 始终返回 `Promise<Output>`，同步或异步 handler 错误保持原值。
- `CommandExecutionContext` 只暴露本次执行的 `signal` 和 `commandId`，不提供动态 Runtime Service lookup。
- Command 可以并发与重入执行；首版不引入队列、优先级、middleware、重试或串行化。
- 注销先让 Command 对新调用不可见，再 Abort 并等待全部进行中执行；handler 忽略 AbortSignal 时 dispose 明确保持未完成。
- Command Service dispose 关闭全部残留注册；旧 Service 后续注册或执行以稳定错误显式失败。
- `@cflow/plugin-command` 依赖 `@cflow/runtime-cordis`，不依赖 `@cflow/kernel`、`@cflow/plugin-kernel` 或 `@cflow/core`；core 只重导出公开 seam。

## Behavioral Requirements

1. 每次 Command Plugin Activation 提供一份新的空 Command Service。
2. 已注册的同步与异步 handler 通过 Command token 接收输入并返回类型安全结果。
3. 未注册、伪造、重复 token 与重复诊断 ID 都显式失败且不留下部分注册。
4. handler 可读取规范 `commandId`，并可通过所属 Feature Plugin 闭包使用 Kernel Service 完成异步准备后的同步 Transaction。
5. 每次执行获得独立 AbortSignal；调用方 AbortSignal 只取消该次执行。
6. Command Registration dispose 幂等，阻止新执行、取消并等待既有执行，然后允许同一 token 重新注册。
7. Command Service dispose 等待所有残留执行；Provider 重装后得到不继承注册的新 Service。
8. 声明不得泄漏 Cordis 类型，内部包不得依赖 core，Kernel 保持纯净。

## Testing Decisions

- 行为测试只通过真实 `createPluginHost()`、`commandPlugin`、`commandService` 与 Consumer Plugin。
- 每个 vertical slice 遵循 red → green，一次加入一个公开行为测试再写最小实现。
- 使用真实 Kernel Plugin 验证一次异步 Command 准备后通过同步 Transaction 提交，但 Command package 本身不依赖 Kernel。
- 类型测试覆盖 Command 输入输出不变性、handler 推导、readonly token 与无配置 Plugin。
- 发布验证覆盖声明泄漏、package-name import、clean-check 和 dry-run pack。

## Out of Scope

- 动态字符串执行、Command 列表/搜索、别名、菜单与快捷键贡献。
- Command middleware、权限、优先级、队列、去重、串行化、撤销策略与 History。
- 自动 Transaction、自动写入 `commandId`、Kernel/Session 注入或 Runtime Service locator。
- 重试、超时、错误吞没、后台续跑与 fake success。
- Command 持久化、远程执行、进度事件、Telemetry 和跨 Runtime 注册。
