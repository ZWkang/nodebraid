---
title: '@cflow/diagnostics'
description: CFlow 的结构化错误、不可变 Diagnostic Event 与安全错误描述契约。
---

# `@cflow/diagnostics`

`@cflow/diagnostics` 是一个零运行时依赖、无副作用的叶子 package。它统一 CFlow 各模块的结构性错误身份、Diagnostic Event 数据契约和安全描述函数，但把具体输出与持久化完全交给宿主。

::: warning Package 尚未公开发布
该名称表示当前源码模块边界，不代表可以从 npm 安装。请按 [Quick Start](/guide/quick-start) 从源码验证。
:::

## 解决的问题

如果每个 package 都自行定义错误形状和事件载荷，调用者很难稳定判断失败，也无法安全地将未知 Error 转成可序列化数据。`@cflow/diagnostics` 提供一条所有纯模块和 Runtime Plugin 都能向下依赖的窄 seam：

- CFlow 结构性错误使用稳定的 `domain + code` 身份；
- details 与 event attributes 只能包含安全、不可变的 Diagnostic Value；
- 原始 Error、AggregateError 和未知 thrown value 可以确定性描述；
- Diagnostic Sink 与 Fault Reporter 共享统一、Host-scoped 的事件 envelope。

## 何时使用

- 编写 CFlow package，需要定义领域结构性错误时。
- 编写 Host Adapter，需要接收、描述并转发 Diagnostic Event 时。
- 在进程或传输边界前，需要把未知失败安全转换为 JSON-ready 描述时。
- 需要判断 `CFlowError.domain` 与 `code`，而不依赖错误 message 文案时。

普通应用可以从 `@cflow/core` 使用同一组重导出。直接依赖这个 package 适合希望保持零 Runtime 依赖的底层模块。

## 提供能力

- `CFlowError`：所有 CFlow 结构性错误的泛型基类，保存 `domain`、`code`、不可变 details 与可选 cause。
- `DiagnosticsError`：诊断协议自身的结构性错误。
- `DiagnosticEvent`、`DiagnosticEventInput` 与 `DiagnosticScope`：不可变事件 envelope 与输入契约。
- `DiagnosticSink` 与 `FaultReporter`：宿主接管事件与 Fault 的同步边界。
- `PluginDiagnostics`：Plugin 侧的 `emit()` 与 `reportFault()` 窄接口。
- `normalizeDiagnosticAttributes()`：复制、校验并递归冻结 Diagnostic attributes。
- `describeError()`：保留 CFlow Error、原生 Error、AggregateError、cause 和循环引用语义的 JSON-ready 描述。
- `describeDiagnosticEvent()`：保留事件 envelope，并把原始 error 替换为安全描述。
- `describeNonFiniteNumber()`：为 `NaN` 与正负无穷提供统一诊断表示。
- `diagnosticEvents`：Diagnostics 自身的稳定、可搜索事件名目录。

## 依赖与组合

```text
Kernel / Layout API / Providers ──▶ @cflow/diagnostics
Runtime Host / Runtime Plugins ───▶ @cflow/diagnostics
@cflow/core ──────────────────────▶ re-export only
Host Adapter ◀──────────────────── DiagnosticSink / FaultReporter
```

该 package 没有运行时依赖，也不依赖 Plugin Host。纯计算 package 可以只创建并抛出结构性错误；Plugin Host 与 Runtime Plugin 在自己拥有的生命周期、监听者隔离或清理边界产生事件。事件的 Host、Installation、Activation、Plugin、序号和时间上下文由 Runtime 补全，不由这个叶子 package 猜测。

## 公共入口

| 类别      | 公共入口                                                                                                                      |
| --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 错误      | `CFlowError`、`CFlowErrorOptions`、`DiagnosticsError`、`DiagnosticsErrorCode`                                                 |
| 诊断值    | `DiagnosticValue`、`DiagnosticAttributes`、`normalizeDiagnosticAttributes`、`DiagnosticValueError`、`describeNonFiniteNumber` |
| 事件      | `DiagnosticEvent`、`DiagnosticEventInput`、`DiagnosticScope`、`DiagnosticLevel`、`diagnosticEvents`                           |
| Host 边界 | `DiagnosticSink`、`FaultReporter`、`DiagnosticFault`、`PluginDiagnostics`                                                     |
| 安全描述  | `describeError`、`describeDiagnosticEvent` 及对应 description 类型                                                            |

Package 只有一个公开子路径：`@cflow/diagnostics`。

## 生命周期与错误语义

这个 package 本身没有 Host、Plugin Installation 或后台任务生命周期；校验和描述函数都是同步操作。

### 结构性错误

`CFlowError` 的跨包身份是 `domain + code`。Error `name` 只表示具体类，message 供人阅读，不承担协议身份。details 会被递归复制和冻结，并且只接受：

- `null`、boolean、string 与有限 number；
- 上述值组成的 array；
- 只含字符串键和 data property 的 plain record。

accessor、Symbol 键、函数、类实例、循环引用与非有限 number 会在精确路径上显式失败。单一下游原因保存在 `cause`；多个并列失败保留为有层次的 `AggregateError.errors`，不会默认拍平。

用户 Callback、Plugin Setup、Command Handler、Provider 与 Abort reason 等外部失败不会被强制包装成 `CFlowError`。`describeError()` 只生成旁路描述，不改变原对象或调用传播语义。

### Diagnostic Event 与 Fault

Diagnostic Event 是不可变的进程内观察数据。`DiagnosticSink` 同步接收事件；异步上传、批量或写盘应由 Sink 背后的 Adapter 安排。无法通过调用结果返回的 Fault 同时交给 `FaultReporter`，成功写入 Sink 不表示 Fault 已被处理。

诊断事件不会替代 throw/reject，也不会因为构造或重新抛出一个错误而自动产生。Runtime 只应在自己拥有失败和状态转换的语义边界记录一次。

## 限制与非目标

- 不是 logger，不调用 console。
- 不写文件、网络、Sentry 或 OpenTelemetry。
- 不提供过滤、采样、重试、批量、队列或持久化。
- 不把 Diagnostic Event 作为 Runtime Service，也不创建全局可变诊断对象。
- 不消费、替换或改变原有失败的对象身份和控制流。
- 不在错误上定义 severity、retryable、HTTP status 或传输策略。
- 不允许 attributes/details 携带 Plugin 配置、Runtime Service、Node/Edge 业务数据或任意对象。

## 验证依据

- `packages/diagnostics/tests/index.test.ts` 验证稳定事件名、安全值校验、递归冻结、`domain + code`、cause/AggregateError 树、循环引用和 JSON-ready 描述。
- `packages/diagnostics/tests/types.test.ts` 验证 Diagnostic Event 的只读类型以及 `PluginDiagnostics.reportFault()` 的固定 error-level 契约。
- `packages/diagnostics/tests/package-import.test.ts` 验证构建后可通过 package name 使用 `CFlowError`。
- declaration isolation 检查验证该 package 的公开类型在无 workspace 环境下保持独立，并确认没有运行时依赖。
