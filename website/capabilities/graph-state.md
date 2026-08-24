---
title: Graph State
description: 用纯 Kernel 与本地 Session 组合一份权威 Document 和可观察的视图状态。
---

# Graph State

NodeBraid 把“图里有什么”与“当前用户怎么看这张图”分成两套边界清晰的状态：Kernel 维护权威 Document，Session 维护 Selection 与 Viewport。两者通过 Runtime Service 显式组合，但不会混成一个全局 Store。

::: info 当前状态
Graph State 能力族的四个 package 均已实现并接入公共 facade；当前请从仓库源码使用，尚未以本项目身份发布到 npm。
:::

## 解决什么问题

流程画布通常同时包含可持久化的图数据与只属于当前视图的交互状态。如果把 Node、Edge、Selection、Viewport 和 Renderer 状态塞进同一对象，事务一致性、撤销边界、多人协作语义和组件生命周期都会互相污染。

Graph State 能力族用两个所有权边界解决这个问题：

- **Document**：由 Kernel 独占，只有同步 Transaction 可以原子修改。
- **Session**：与 Document 分离，只保存当前 Canvas Runtime 的 Selection 与 Viewport。

## 适用场景

- 构建不绑定 DOM、Canvas 或前端框架的 headless 流程画布。
- 希望在业务 Command、History、Layout 与 Renderer 之间共享同一份权威 Document。
- 需要让 Selection 始终引用当前 Document 中真实存在的 Node 与 Edge。
- 需要多个 Canvas Runtime 彼此隔离，各自拥有图状态和本地视图状态。
- 只想使用纯图内核，或希望通过 Plugin Host 获得完整生命周期管理。

## 它提供什么

| 模块                                                   | 角色                   | 关键能力                                                                              |
| ------------------------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------- |
| [`@nodebraid/kernel`](/modules/kernel)                 | 纯图内核               | Document、同步 Transaction、revision-bound Canvas View、Canvas Query、可逆 Change Set |
| [`@nodebraid/plugin-kernel`](/modules/plugin-kernel)   | Kernel Runtime adapter | 每次 Activation 一份新 Kernel、窄 `KernelService`、有序 Canvas Commit 观察            |
| [`@nodebraid/session-api`](/modules/session-api)       | Session 值契约         | Renderer-independent 的 `SelectionSnapshot`、`Viewport`、`SessionSnapshot`            |
| [`@nodebraid/plugin-session`](/modules/plugin-session) | Session Runtime Plugin | Selection/Viewport mutation、订阅、Selection 与 Kernel View 协调                      |

四个模块允许调用方按层级选择：纯算法代码可以只使用 Kernel；Renderer Provider 可以只依赖 Session 值契约；Canvas Runtime 则安装两个 Runtime Plugin，获得完整的 Document 与 Session 生命周期。

## 依赖与组合

```text
@nodebraid/plugin-session ──requires──▶ Kernel Service
        │                               ▲
        ├──▶ @nodebraid/session-api         │ provides
        ├──▶ @nodebraid/kernel              │
        └──▶ @nodebraid/runtime-cordis   @nodebraid/plugin-kernel
                                            │
                                            ├──▶ @nodebraid/kernel
                                            └──▶ @nodebraid/runtime-cordis
```

`@nodebraid/kernel` 保持纯净；Plugin Host 生命周期只存在于 `plugin-kernel` 和 `plugin-session`。`@nodebraid/session-api` 把无副作用的 Session 值契约放在 Runtime Plugin 之外，让 Renderer contract 不必传递依赖 Session Service。

## 公共入口

Graph State 的公共能力可以从各自的窄 package 导入；应用层也可以通过 `@nodebraid/core` facade 使用同名导出。

```ts
import { createCanvasKernel, edgeId, nodeId } from '@nodebraid/kernel';
import { kernelPlugin, kernelService } from '@nodebraid/plugin-kernel';
import type { SessionSnapshot, Viewport } from '@nodebraid/session-api';
import { sessionPlugin, sessionService } from '@nodebraid/plugin-session';
```

这些 import 展示的是仓库当前公共导出，不代表 package 已在 npm 可安装。请先按 [Quick Start](/guide/quick-start) 从源码验证。

## 状态与生命周期语义

1. `createCanvasKernel()` 创建一份 revision 0 的空 Document；纯 Kernel 没有 Plugin 生命周期。
2. `kernelPlugin` 每次 Activation 创建一份新的 revision 0 Kernel，并通过 `kernelService` 提供读取、同步事务和 Commit 观察。
3. `sessionPlugin` 静态要求 `kernelService`；Kernel 不可用时，Session Installation 保持 pending。
4. Session Activation 从空 Selection 和 `{ x: 0, y: 0, zoom: 1 }` Viewport 开始。
5. 成功 Kernel Commit 会携带同一 revision 的 `before`、`after` 与 Change Set；Session 使用该 Commit 的 `after` View 移除已失效选择。
6. Kernel Provider 消失时，依赖它的 Session 与 Consumer 先结束当前 Activation；旧 Service handle 显式关闭。新的 Kernel Provider 出现后会创建全新的 Kernel 与默认 Session，不继承旧状态。

## 限制与非目标

- Session 不是 Document、History、Persistence 或 Collaboration 状态。
- Kernel 不负责 Selection、Viewport、Renderer、Command 或 Plugin 生命周期。
- Graph State 不提供数据库序列化、远程同步、CRDT、Schema migration 或业务数据解释。
- Selection 不表达主选项或选择先后；Viewport 不包含产品级缩放上下限。
- Node/Edge `data` 对 Kernel 是不透明值；领域层必须自行保持不可变使用方式。
- 当前已交付 Renderer contract、Runtime adapter 与 SVG Provider；Graph State 本身仍不拥有或绘制可见画布。

## 验证依据

- 公共导出：[`kernel`](https://github.com/ZWkang/nodebraid/blob/main/packages/kernel/src/index.ts)、[`plugin-kernel`](https://github.com/ZWkang/nodebraid/blob/main/packages/plugin-kernel/src/index.ts)、[`session-api`](https://github.com/ZWkang/nodebraid/blob/main/packages/session-api/src/index.ts)、[`plugin-session`](https://github.com/ZWkang/nodebraid/blob/main/packages/plugin-session/src/index.ts)。
- 行为测试：Kernel Transaction 与 Change Set、Kernel Plugin Commit ordering、Session canonical values 与 Session reconciliation 均通过各 package 的公开 seam 验证。
- 领域边界：仓库 `CONTEXT.md` 对 Document、Canvas Runtime、Kernel Service、Session、Selection 与 Viewport 有规范定义。
- 架构决策：ADR-0009、0010、0013、0017、0018、0022 与 0035 固定了纯 Kernel、revision-bound View、窄 Runtime Service、Session 协调和独立值契约。
