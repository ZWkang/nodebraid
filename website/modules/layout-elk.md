---
title: '@cflow/layout-elk'
description: 基于 ELK 的 full Layout Provider，并通过 Stress 支持 incremental 与 Fixed Node。
---

# `@cflow/layout-elk`

::: warning Package 尚未公开发布
该名称表示当前源码模块边界，不代表可以从 npm 安装。请按 [Quick Start](/guide/quick-start) 从源码验证。
:::

## 解决的问题

`@cflow/layout-elk` 将 ELK 适配到 CFlow `LayoutEngine` seam。它既能执行 Layered full layout，也能使用 Stress algorithm 处理 incremental stability 和 Fixed Node，并把 ELK component-local 结果恢复为 CFlow absolute World Position。

## 何时使用

- 你需要 ELK Layered full layout；
- 你需要 incremental layout；
- 你需要一个或多个 Node 保持绝对位置；
- 你希望通过 deterministic random seed 固定同版本、同输入和同配置的结果。

如果只需要更轻量的确定性 full layout，不需要 incremental 或 Fixed Node，可以选择 [`@cflow/layout-dagre`](/modules/layout-dagre)。

## 提供的能力

`elkLayoutEngine` 声明：

```ts
{ incremental: true, fixedNodes: true, selfLoops: true }
```

配置支持：

- `algorithm`: `layered` 或 `stress`；
- `direction`: `UP`、`DOWN`、`LEFT` 或 `RIGHT`；
- `nodeSpacing`；
- `layerSpacing`；
- `padding`；
- `randomSeed`。

`incremental` mode 和任何 Fixed Node 都要求 `stress`。使用其他 algorithm 时会以 `UNSUPPORTED_FEATURE` 明确失败，而不是忽略请求。

## 依赖与组合

该 package 只依赖 `@cflow/layout-api` 与 `elkjs`，不依赖 Plugin Host、Kernel Runtime、Command Service 或 `@cflow/core`。

直接使用 Engine 可计算未提交 Proposal；在 Canvas Runtime 中，通过 [`@cflow/plugin-layout`](/modules/plugin-layout) 将 `elkLayoutEngine` 绑定到强类型 Command。

## 公共入口

```ts
import {
  elkLayoutEngine,
  type ElkLayoutAlgorithm,
  type ElkLayoutConfig,
  type ElkLayoutDirection,
} from '@cflow/layout-elk';
```

`@cflow/core` 不重导出该 Provider，选择 ELK 的应用显式承担其依赖。

## Fixed Node 与坐标语义

ELK 可能分别平移断连分量。adapter 为每个连接分量计算回到 CFlow World Space 的 translation：

- 有 Fixed Node 时，所有 Fixed Node 必须证明同一个 translation，且最终位置完全不变；
- incremental 且没有 Fixed Node 时，使用分量平均 translation 保持整体接近原位置；
- full layout 且没有 Fixed Node 时，不额外平移结果。

如果同一分量的 Fixed Node 无法由一个 translation 同时保持，Proposal 以 `INVALID_PROPOSAL` 失败。

## 生命周期与错误语义

Engine 在加载 ELK、调用布局和返回 Proposal 的异步边界检查取消。algorithm/direction/spacing/padding/seed 配置由 Provider 验证；共享请求与 Proposal 仍由 `@cflow/layout-api` 验证。

首版使用 ELK bundled in-process worker implementation，并包含 Bun loader compatibility path。它没有暴露 Worker ownership 或独立 Worker 配置。

## 限制与非目标

- incremental 与 Fixed Node 不适用于 `layered`；
- 不提供 Runtime Plugin、预定义 Command 或默认配置 Registry；
- 不提交 Kernel；
- 不返回 Edge Routing；
- 不提供调用方管理的 Worker execution；
- 不包含 cache、preview 或 persistence。

## 验证依据

Provider tests 覆盖 Layered 与 Stress、方向和配置、empty/zero-size/disconnected/cyclic/self-loop graph、incremental translation、Fixed Node、一致性 rejection、取消和错误值；仓库级组合测试通过真实 Runtime Command 验证 Fixed Node 提交结果。
