---
title: '@cflow/layout-dagre'
description: 基于 Dagre 的确定性 whole-canvas full Layout Provider。
---

# `@cflow/layout-dagre`

::: warning Package 尚未公开发布
该名称表示当前源码模块边界，不代表可以从 npm 安装。请按 [Quick Start](/guide/quick-start) 从源码验证。
:::

## 解决的问题

`@cflow/layout-dagre` 把 Dagre 的分层有向图布局适配到 CFlow `LayoutEngine` seam。它处理 Dagre 的中心点坐标，将结果规范化为 CFlow Node 边界左上角的绝对 World Position。

## 何时使用

- 你需要 whole-canvas full layout；
- 你需要简单、确定性的分层方向与 spacing 配置；
- 你的请求不需要 incremental stability 或 Fixed Node；
- 你希望支持空图、断连分量、平行 Edge、有向环和 self-loop input。

如果现有 Node 必须固定在绝对位置，或需要 incremental mode，请选择 [`@cflow/layout-elk`](/modules/layout-elk) 的 Stress algorithm。

## 提供的能力

`dagreLayoutEngine` 声明：

```ts
{ incremental: false, fixedNodes: false, selfLoops: true }
```

配置支持：

- `direction`: `TB`、`BT`、`LR` 或 `RL`；
- `nodeSpacing`；
- `edgeSpacing`；
- `rankSpacing`；
- `marginX` 与 `marginY`。

所有 spacing 与 margin 必须是有限非负数。缺省方向为 `TB`，缺省 spacing 由 Provider adapter 固定并验证。

## 依赖与组合

该 package 只依赖 `@cflow/layout-api` 与 Dagre，不依赖 Plugin Host、Kernel Runtime、Command Service 或 `@cflow/core`。

直接调用 Engine 会得到未提交 Proposal；在 Canvas Runtime 中使用时，通过 [`@cflow/plugin-layout`](/modules/plugin-layout) 将 `dagreLayoutEngine` 绑定到应用定义的 Command token。

## 公共入口

```ts
import { dagreLayoutEngine, type DagreDirection, type DagreLayoutConfig } from '@cflow/layout-dagre';
```

`@cflow/core` 不重导出该 Provider，应用必须显式依赖它。

## 计算与坐标语义

Provider 为每个 Node 传入 width/height，为每个 Edge 保留独立 ID 以支持 multigraph。Dagre 返回 Node center；adapter 分别减去一半 width 和 height，得到 CFlow top-left World Position。Proposal 的 source revision 始终来自 Layout Input。

计算前后都会检查 `AbortSignal`。配置错误以原始 `TypeError` 或 `RangeError` 暴露，共享 input/capability/proposal failure 使用 `LayoutError`。

## 限制与非目标

- 不支持 `incremental` mode；
- 不支持 Fixed Node；
- 不提供 Runtime Plugin 或预定义 Command；
- 不提交 Kernel；
- 不返回 Edge Routing；
- 不成为默认 Provider，也不进入 Registry。

## 验证依据

Provider tests 覆盖方向、spacing、确定性、空图、零尺寸 Node、断连分量、平行 Edge、环、自环、取消与错误配置；仓库级组合测试还通过真实 Runtime Command 提交 Dagre Proposal。
