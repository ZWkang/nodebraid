---
title: '@cflow/core'
description: CFlow 当前已交付公共能力的统一 facade。
---

# `@cflow/core`

`@cflow/core` 是普通 CFlow 应用的首选公共入口。它把已经交付的值契约、Plugin Host、Runtime Plugin 与通用 Layout contract 汇总到一个 facade，同时保留各窄 package 的原始类型和行为。

::: warning Package 尚未公开发布
该名称表示当前源码模块边界，不代表可以从 npm 安装。请按 [Quick Start](/guide/quick-start) 从源码验证。
:::

## 解决的问题

应用不应为了创建一个 Canvas Runtime 而先记住整张 package 依赖图。`@cflow/core` 提供一个稳定入口，让应用可以在同一模块中取得 Kernel、Session、Command、History、Interaction、Layout、Renderer contract、Diagnostics 与 Plugin Host API。

它是 facade，不是另一个 Runtime：重导出的值、类型、错误和生命周期实现仍由各自的窄 package 拥有。

## 何时使用

- 编写 CFlow 应用或产品集成，并需要组合多项官方能力。
- 跑通从 Plugin Host 到 Kernel Transaction 的最小链路。
- 希望先使用统一入口，等依赖边界明确后再按需改为窄 package import。

如果正在编写 CFlow 内部 package，或只需要一条非常窄的底层契约，应直接依赖对应 package，避免下层模块反向依赖公共 facade。

## 提供能力

`@cflow/core` 当前重导出：

- `@cflow/diagnostics` 的结构化错误与 Diagnostic Event 契约；
- `@cflow/kernel` 的纯图模型、Transaction、Canvas View、Canvas Query 与 Change Set；
- `@cflow/session-api` 的不可变 Session 值；
- `@cflow/renderer-api` 的后端中立 Renderer contract；
- `@cflow/interaction-api` 的后端中立 Interaction Projection 值；
- `@cflow/runtime-cordis` 的 CFlow-owned Plugin Host API；
- Kernel、Command、Session、Renderer、Interaction 与 History Runtime Plugin；
- 通用 Layout API 与 Layout Runtime Plugin。

具体 Layout Provider 保持独立：`dagreLayoutEngine` 和 `elkLayoutEngine` 不在 facade 中。`@cflow/renderer-svg` 已作为具体 Renderer Provider 交付，但同样不由 core 选择或重导出。

## 依赖与组合

```text
Application
    │
    ▼
@cflow/core (facade)
    ├── Diagnostics / Kernel / Session / Interaction / Renderer contracts
    ├── Plugin Host
    ├── official Runtime Plugins
    └── generic Layout contracts and integration
```

从 core import 不会创建全局状态，也不会安装任何默认 Plugin。应用仍要创建自己的 Plugin Host，并显式安装所需能力；Provider 选择也仍由应用负责。

高级消费者可以绕过 facade，直接依赖 `@cflow/kernel`、`@cflow/runtime-cordis` 或其他窄 package。两种入口共享同一份实现，不形成两套运行时。

## 公共入口

Package 只有一个公开子路径：`@cflow/core`。代表性的公共入口包括：

| 能力        | 代表入口                                                                       |
| ----------- | ------------------------------------------------------------------------------ |
| Plugin Host | `createPluginHost`、`definePlugin`、`defineService`                            |
| Kernel      | `createCanvasKernel`、`kernelPlugin`、`kernelService`                          |
| Command     | `defineCommand`、`commandPlugin`、`commandService`                             |
| Session     | `sessionPlugin`、`sessionService`                                              |
| History     | `historyPlugin`、`historyService`、`undoCommand`、`redoCommand`                |
| Layout      | `createLayoutInput`、`defineLayoutEngine`、`createLayoutPlugin`、`LayoutError` |
| Renderer    | `createRendererPlugin`、`rendererService`、`RendererError`                     |
| Interaction | `interactionPlugin`、`moveNodesCommand`、`interactionDiagnosticEvents`         |
| Diagnostics | `CFlowError`、`diagnosticEvents`、`describeError`                              |

完整导出等于 facade 源码中各 public package 的显式 `export *`；没有额外的隐藏子路径。

## 生命周期与错误语义

`@cflow/core` 不新增生命周期。通过它创建的 Plugin Host、Plugin Installation、Kernel 或其他能力，完全沿用所属 package 的公共语义：

- Plugin Installation 仍以 `pending`、`active`、`failed`、`disposed` 表达状态；
- Kernel Transaction 仍保持同步、原子提交；
- CFlow 结构性错误仍以稳定的 `domain + code` 标识；
- Plugin Setup、Command Handler、Provider 和 Abort 等外部失败仍保留原始值；
- 多个并列清理错误仍以 `AggregateError` 暴露。

Facade 测试会同时从 `@cflow/core` 验证这些对象的类型与行为，避免重导出造成契约漂移。

## 限制与非目标

- 不自动安装 Kernel、Command、Session、History、Interaction、Layout 或 Renderer Plugin。
- 不提供默认 Canvas Composition 或开箱即用编辑器 preset。
- 不重导出 Dagre、ELK 等具体 Layout Provider。
- 不选择或重导出 `@cflow/renderer-svg` 等 concrete Renderer Provider。
- 不提供框架 Adapter、UI 组件、持久化或协作能力。
- 不把 Cordis 类型暴露给应用。
- 当前不能作为 CFlow package 从 npm 安装。

## 验证依据

- Facade 源码逐项重导出当前 public packages。
- `packages/core/tests/index.test.ts` 从 facade 验证 Diagnostics、Plugin Host、Kernel、Session、Renderer、Interaction、Command 与 History 公共 seam。
- `packages/core/tests/layout.test.ts` 验证通用 Layout API 可见，同时 Dagre 与 ELK Provider 不会泄漏。
- declaration artifact 检查验证构建后的公开类型边界。
