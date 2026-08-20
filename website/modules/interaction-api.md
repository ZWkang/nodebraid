---
title: '@cflow/interaction-api'
description: Backend-neutral Interaction Projection 纯值契约。
---

# `@cflow/interaction-api`

::: warning Package 尚未公开发布
该名称表示当前源码模块边界，不代表可以从 npm 安装。请按 [Quick Start](/guide/quick-start) 从源码验证。
:::

## 解决的问题

瞬态 Drag/Pan Preview 需要进入 Renderer，但不应把 Runtime 状态机、DOM Event 或具体后端对象写进 Renderer API。该 package 只拥有 CFlow 的不可变 Projection 值，让 Interaction 行为与 Renderer Provider 通过一条稳定值 seam 对接。

## 提供的能力

- `InteractionProjection`：`node-drag | viewport-pan` discriminated union；
- `NodeDragInteractionProjection`：规范 Node ID、base position 与绝对 candidate position；
- `ViewportPanInteractionProjection`：base Viewport 与绝对 candidate Viewport；
- `NodeDragProjectionNode`：单个拖动 Node 的局部 evidence 与候选位置。

```ts
import type { InteractionProjection } from '@cflow/interaction-api';

const preview: InteractionProjection = {
  type: 'viewport-pan',
  baseViewport: { x: 0, y: 0, zoom: 1 },
  viewport: { x: 24, y: 12, zoom: 1 },
};
```

## 依赖与边界

Package 只依赖 `@cflow/kernel` 的 Node ID/Point 与 `@cflow/session-api` 的 Viewport。它不依赖 Renderer、Runtime、Plugin Host、DOM、具体 Provider 或 `@cflow/core`，也不拥有 Active Gesture、Command、Selection 或 lifecycle。

`@cflow/renderer-api` 消费这些值作为 Provider update contract，`@cflow/plugin-interaction` 创建它们，`@cflow/plugin-renderer` 中介唯一写入者。

## 限制与验证

首版只有 Node Drag 与 Viewport Pan，不提供 hover、box selection、edge connection、snapping、Tool Registry 或任意后端 handle。类型/声明检查拒绝 Runtime、Renderer、DOM 与具体 Provider 泄漏；真实 Provider 接受与复制规则由 Renderer/SVG 测试验证。
