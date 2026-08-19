---
title: '@cflow/runtime-cordis'
description: CFlow-owned Plugin Host、Runtime Service 与 Installation 生命周期。
---

# `@cflow/runtime-cordis`

`@cflow/runtime-cordis` 为每个 Canvas Runtime 提供隔离的 Plugin Host。它使用强类型 Service Token 连接 Plugin，通过 Runtime Service 可用性驱动 Activation，并让所有资源拥有清晰、可等待的释放边界。

Cordis 只存在于 package 内部实现中。公共入口只使用 CFlow 自己的术语与类型。

::: warning Package 尚未公开发布
该名称表示当前源码模块边界，不代表可以从 npm 安装。请按 [Quick Start](/guide/quick-start) 从源码验证。
:::

## 解决的问题

画布能力之间既有依赖，也有独立生命周期。CFlow 需要在不引入全局 Service locator 的前提下，回答这些问题：

- Required Service 尚未可用时，消费者应处于什么状态；
- Provider 出现或消失时，依赖方如何激活、停用与重新激活；
- Plugin Setup 失败时，如何回滚本次 Activation 的部分资源；
- 多个 Plugin 如何避免 Service 冲突和依赖环；
- 整个 Canvas Runtime 如何完成异步、幂等的释放。

## 何时使用

- 普通应用通常经由 `@cflow/core` 使用这套 API。
- 编写基础设施或高级集成，并且只希望依赖 Plugin Runtime 时，可以直接使用这个窄 package。
- 编写新的 Runtime Plugin，需要静态声明 Required Service、Provided Service 和 Owned Resource 时使用。

它不是 Document 或编辑器 Runtime。若需要 Kernel、Command、Session 等能力，仍需安装对应 Plugin。

## 提供能力

- 使用 `defineService()` 创建强类型 Service Token；Token 身份独立于可读的诊断名称。
- 使用 `definePlugin()` 固化 `requires`、`provides` 与 `setup` 契约。
- 使用 `createPluginHost()` 创建隔离且初始为空的 Plugin Host。
- 通过 `PluginContext.services` 访问静态声明的 Required Service。
- 通过 `PluginContext.own()` 登记随当前 Activation 释放的 Owned Resource。
- 通过 `PluginContext.install()` 创建随父 Activation 释放的 Child Installation。
- 通过 `PluginInstallation` 读取稳定 Snapshot、订阅状态、等待 active 或显式 dispose。
- 可选接入 Host-scoped `DiagnosticSink` 与 `FaultReporter`，观察结构化生命周期事件和无法返回给调用者的 Fault。

## 依赖与组合

```text
Plugin A provides Service Token
              │
              ▼
Plugin B requires Service Token ──▶ Activation
```

Plugin 在定义时静态声明 Service Binding。首版没有 Optional Service，也没有动态 `get()` 或 `provide()`。同一 Host 内，一个 Service Token 同时只能由一个 Plugin Installation 保留；Token 从安装开始保留到该 Installation dispose，不能因 `pending` 或 `failed` 自动让给另一个 Provider。

Plugin Graph 必须保持无环。依赖方会先于 Provider 停用；互不依赖的 Installation 可以并发激活，但单个 Installation 内的 setup 与 cleanup 串行执行。

该 package 直接依赖 `@cflow/diagnostics`，并在内部使用锁定版本的 Cordis 生命周期实现。它不依赖 `@cflow/core`。

## 公共入口

| 类别             | 公共入口                                                                       |
| ---------------- | ------------------------------------------------------------------------------ |
| 创建函数         | `createPluginHost`、`definePlugin`、`defineService`                            |
| Host 与 Plugin   | `PluginHost`、`Plugin`、`PluginDefinition`、`PluginContext`                    |
| Service          | `ServiceToken`、`ServiceTokenBase`、`ServiceBindings`、`BoundServices`         |
| Installation     | `PluginInstallation`、`InstallationSnapshot` 及四种状态 Snapshot               |
| 生命周期辅助     | `Awaitable`、`OwnedResourceDisposer`                                           |
| Diagnostics 配置 | `PluginHostOptions`、`PluginHostDiagnosticsOptions`、`runtimeDiagnosticEvents` |
| 结构性错误       | `PluginHostError` 及其 code/details 类型                                       |

公共接口中没有 Cordis Context、Fiber、Service、effect 或其他 Cordis 类型。

## 生命周期与错误语义

### Installation 状态

```text
install() ─▶ pending ─▶ active
               ▲          │
               └──────────┘ Required Service 消失后完成 cleanup，可再次激活

pending/active ─▶ failed   setup 或契约失败，本次 Installation 的终态
pending/active/failed ─▶ disposed   显式释放后的终态
```

- `install()` 立即返回 Installation；缺少 Required Service 时 Snapshot 为 `pending` 并列出缺失 Token。
- Required Service 全部可用后开始一次新的 Activation。`setup` 可以异步执行，并收到在停用或 dispose 时触发的 `AbortSignal`。
- `setup` 成功后，声明的 Provided Service 一次性、原子发布；缺失、额外或无效的返回值会让 Activation 失败，不发布部分结果。
- Active Installation 的依赖消失时，Host 先清理依赖方，再清理 Provider；未来依赖恢复时会使用固定安装配置创建全新的 Activation 状态。
- `failed` 不会隐式重试。调用方必须 dispose 后重新 install。
- `dispose()` 异步且幂等；Host dispose 完成后不能再安装 Plugin。

### Owned Resource 与等待

Owned Resource 按登记逆序释放。即使一个 disposer 失败，其余 disposer 仍会继续执行，最终以 `AggregateError` 保留所有失败及聚合阶段。

`whenActive()` 在 active 时立即完成，在 pending 时等待下一次 active，在 failed 或 disposed 时拒绝。传给 `whenActive(signal)` 的 Signal 只取消这一位等待者，不改变 Installation 生命周期。

### 错误与诊断

Plugin Host 自己产生的结构性失败使用 `PluginHostError`，稳定身份为 `domain = "runtime.plugin-host"` 加 code：

- `HOST_DISPOSED`
- `INSTALLATION_DISPOSED`
- `CONTRACT_VIOLATION`
- `PROVIDER_CONFLICT`
- `DEPENDENCY_CYCLE`
- `INVALID_DEFINITION`

Plugin Setup 抛出的业务错误保持原始对象身份，不统一包装。多个清理错误使用 `AggregateError`。

Diagnostic Sink 是同步、只观察的出口：事件成功送达不能消费 throw/reject，也不能改变 Installation 状态。Sink 或 Fault Reporter 自身失败会沿独立 Fault 路径显式暴露，不会递归写回同一个失败出口。

## 限制与非目标

- Host 初始为空，不隐式安装任何 Canvas 能力。
- 不拥有 Document、Kernel、Command、Session、History、Layout 或 Renderer。
- 不提供 Optional Service、动态 Service lookup、动态 provide 或全局 Registry。
- 不允许同一 Host 内出现 Service Provider 冲突或 Plugin Graph 环路。
- 不负责持久化、恢复、配置 Schema 或业务配置校验。
- 不参与拖拽、命中、逐帧绘制等高频画布路径。
- 不提供日志系统；Diagnostics 的输出、上传、过滤与存储由宿主 Adapter 决定。
- 不公开任何 Cordis 类型，也不要求消费者理解 Cordis 生命周期对象。

## 验证依据

- `packages/runtime-cordis/tests/index.test.ts` 覆盖 Service Token 身份、静态 Binding、pending/active/failed/disposed、Provider 保留、依赖顺序、重新激活、Child Installation、并发 Activation 与幂等清理。
- 同一测试套件验证循环依赖、Provider 冲突、Provided Service 原子发布、Setup 原始失败和多清理错误聚合。
- `packages/runtime-cordis/tests/diagnostics.test.ts` 验证 Host-scoped 不可变事件、同步 Sink、Fault 隔离及事件与 Snapshot 的先后关系。
- `packages/runtime-cordis/tests/error-contract.test.ts` 验证 `PluginHostError` 继承共享 `CFlowError` 契约。
