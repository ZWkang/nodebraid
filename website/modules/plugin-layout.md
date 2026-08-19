---
title: '@cflow/plugin-layout'
description: 将一个 Layout Engine 静态绑定为强类型 Runtime Command，并安全提交 Proposal。
---

# `@cflow/plugin-layout`

::: warning Package 尚未公开发布
该名称表示当前源码模块边界，不代表可以从 npm 安装。请按 [Quick Start](/guide/quick-start) 从源码验证。
:::

## 解决的问题

Layout Engine 可以异步计算位置，但不能直接修改权威 Document。`@cflow/plugin-layout` 把一个 concrete Engine 与一个应用持有的强类型 Command 静态绑定，在真实 Canvas Runtime 中完成 Input projection、capability validation、异步计算、stale protection 与原子提交。

## 何时使用

- 你需要从 Command Service 执行 Dagre、ELK 或第三方 Engine；
- 你希望布局提交自然进入 Kernel observer 与 History；
- 你需要取消和并发 revision 防护；
- 你希望多个 Provider 以不同 Command token 共存，而不是通过全局 Registry 选择。

如果你只需要离线计算 Proposal、不需要提交 Document，可以直接使用 `@cflow/layout-api` 与 Engine。

## 提供的能力

- `createLayoutPlugin({ engine, command })`：创建一个具名 Runtime Plugin；
- `LayoutCommandInput<Config>`：mode、Fixed Node IDs 与 Provider-specific config；
- `LayoutCommandResult`：提交产生的 `CanvasCommit | null`；
- 自动创建与冻结 Layout Input；
- capability 与 Proposal validation；
- cooperative cancellation；
- source revision 与 live Kernel revision 双重 stale 防护；
- 一个 Proposal 对应一个同步 Kernel Transaction。

## 依赖与组合

每个生成的 Plugin 静态要求 `KernelService` 和 `CommandService`。它依赖 `@cflow/layout-api`、`@cflow/plugin-kernel`、`@cflow/plugin-command` 与 CFlow Plugin Host seam，不依赖 `@cflow/core`。

应用需要自行：

1. 选择一个 `LayoutEngine<Config>`；
2. 用 `defineCommand()` 创建与该 Config 匹配的 Command token；
3. 创建 Layout Plugin；
4. 与 Kernel Plugin、Command Plugin 一起安装；
5. 等待所需 Installation 激活后执行 Command；
6. 最终释放 Plugin Host。

## 公共入口

```ts
import {
  createLayoutPlugin,
  type CreateLayoutPluginOptions,
  type LayoutCommandInput,
  type LayoutCommandResult,
} from '@cflow/plugin-layout';
```

这些入口也由 `@cflow/core` 重导出；concrete Provider 不会被 core 隐式带入。

## 生命周期与提交语义

Plugin Activation 注册 Command，并把 registration 作为 Owned Resource。Activation 结束时，Command registration 按 Command Service 规则从 lookup 移除、取消并等待 in-flight execution。

Command 在每个异步边界前后检查调用方的 `AbortSignal`。Proposal validation 后会立即比较当前 Kernel revision；如果不再等于 source revision，则以 `STALE_PROPOSAL` 失败，不提交部分结果。

有效位置在一个同步 Transaction 中替换。Transaction metadata 使用 `origin: 'layout'` 与实际 Command ID，使 Diagnostics 和 History 可以识别行为来源，但 metadata 不控制正确性。

## 限制与非目标

- 不提供 `LayoutService`；
- 不提供动态 Provider Registry 或默认 Provider；
- 不排队、重试或 rebase stale Proposal；
- 不为每个 Node 创建独立 Transaction；
- 不处理 preview、animation、Edge Routing 或 persistence；
- 不把 Provider-specific config 合并成通用 schema。

## 验证依据

Runtime tests 通过真实 Plugin Host、Kernel Plugin 与 Command Plugin 验证 typed Command、单 Commit、net-zero、capability rejection、cancellation、stale revision、invalid Proposal 与 cleanup；仓库级测试还用 Dagre 和 ELK 验证 concrete Provider composition。
