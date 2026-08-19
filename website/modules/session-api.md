---
title: '@cflow/session-api'
description: Renderer-independent 的 Selection、Viewport 与 Session Snapshot 值契约。
---

# `@cflow/session-api`

::: warning Package 尚未公开发布
该名称表示当前源码模块边界，不代表可以从 npm 安装。请按 [Quick Start](/guide/quick-start) 从源码验证。
:::

`@cflow/session-api` 只定义 Session 的不可变值形状，让 Runtime Plugin 与 Renderer contract 共享同一种语义，而不把 Plugin Host 或 mutation 能力带进底层 API。

::: info 当前状态
已实现。该 package 提供 TypeScript 值契约，不创建 Session、不验证输入，也不拥有任何 Runtime 生命周期。
:::

## 解决什么问题

Renderer 需要读取 Selection 与 Viewport，但不应该因此依赖 Session Service、Plugin Host 或 Kernel adapter。如果 Renderer API 自己复制一份类型，Selection 与 Viewport 的语义又会逐渐漂移。`@cflow/session-api` 提供双方共同依赖的最小值契约。

## 适用场景

- 编写 Renderer Provider、序列化 adapter 或纯函数，只需要描述当前 Session Snapshot。
- 在 API 边界上传递 Selection 与 Viewport，而不暴露 mutation 或订阅能力。
- 让 Runtime 与 Renderer package 共享同一类型来源。
- 为框架 adapter 建立只读外部 Store snapshot 类型。

## 它提供什么

`@cflow/session-api` 只导出三个类型：

| 类型                | 语义                                                                               |
| ------------------- | ---------------------------------------------------------------------------------- |
| `SelectionSnapshot` | 当前选中的 NodeId 与 EdgeId 集合；数组顺序只用于确定性观察，不表达主选项或选择顺序 |
| `Viewport`          | `{ x, y, zoom }` 逻辑视图变换；浏览器 Provider 将 x/y 解释为 CSS pixel             |
| `SessionSnapshot`   | 由一份 Selection Snapshot 与一份 Viewport 组成的不可变本地视图状态                 |

## 依赖与组合

该 package 只依赖 `@cflow/kernel` 的 `NodeId` 与 `EdgeId` 类型，不依赖 `@cflow/plugin-kernel`、`@cflow/runtime-cordis` 或 `@cflow/core`。

- [`@cflow/plugin-session`](/modules/plugin-session) 使用这些类型提供 mutation、验证、订阅与 Activation 生命周期。
- `@cflow/renderer-api` 使用同一 Session Snapshot 作为 Renderer 输入契约的一部分，不需要依赖 Runtime Plugin。

## 公共入口

```ts
import type { SelectionSnapshot, SessionSnapshot, Viewport } from '@cflow/session-api';

const snapshot: SessionSnapshot = {
  selection: { nodeIds: [], edgeIds: [] },
  viewport: { x: 0, y: 0, zoom: 1 },
};
```

这些是只读 TypeScript interface；仅构造一个结构相同的对象，不会自动冻结或运行时验证它。

## 状态与生命周期语义

- `SessionSnapshot` 不携带 Document revision，也没有 mutation method。
- Selection 的 Node/Edge 数组表达成员集合；确定排序、去重、存在性校验和不可变冻结由 Session 实现负责。
- Viewport 遵循 `screen = world × zoom + offset`；值合法性与负零规范化由 Session 实现负责。
- 值契约自身没有 Activation、Service handle、订阅、清理或重新激活语义。
- 官方 `plugin-session` 产生的 Snapshot 在逻辑值未变化时保持根引用稳定，便于外部 Store adapter 做引用比较；这个行为来自 Runtime Plugin，而不是类型定义本身。

## 限制与非目标

- 不导出 `sessionPlugin`、`sessionService`、setter、subscriber 或结构性错误。
- 不验证 Selection 是否引用当前 Canvas View，也不验证 Viewport 是否有限且 `zoom > 0`。
- 不定义主选项、选择先后、hover、focus、preselection、drag state 或工具状态。
- 不提供 world/screen 坐标转换函数，也不接触 `devicePixelRatio` 或 Renderer backing store。
- Session Snapshot 不是 Document Snapshot、Renderer Snapshot 或可持久化用户会话。

## 验证依据

- [公共导出](https://github.com/ZWkang/cflow/blob/main/packages/session-api/src/index.ts)只重导出三个 Session 值类型。
- [值契约源码](https://github.com/ZWkang/cflow/blob/main/packages/session-api/src/contracts.ts)明确 Selection order、逻辑屏幕单位和无 mutation 能力的边界。
- [package 行为测试](https://github.com/ZWkang/cflow/blob/main/packages/session-api/tests/index.test.ts)通过 Kernel ID 类型构造完整 Session Snapshot，不启动 Runtime。
- ADR-0035 决定在 Runtime Plugin 之外拥有 Session 值契约，ADR-0017 与 ADR-0018 分别固定 Selection 和 Viewport 语义。
