---
title: '@cflow/kernel'
description: CFlow 的 Renderer-independent 图内核、同步 Transaction 与可逆 Change Set。
---

# `@cflow/kernel`

::: warning Package 尚未公开发布
该名称表示当前源码模块边界，不代表可以从 npm 安装。请按 [Quick Start](/guide/quick-start) 从源码验证。
:::

`@cflow/kernel` 是 CFlow 的权威 Document 所有者。它只处理 Node、Edge、Endpoint、关系索引与 revision，不知道 Plugin Host、Session、Renderer 或前端框架。

::: info 当前状态
已实现。纯 Kernel 与 Runtime adapter 已经分离，当前 `@cflow/plugin-kernel` 也已实现；“分离”不表示 Kernel Plugin 仍是未来规划。
:::

## 解决什么问题

画布写入需要同时满足三件事：图结构始终有效、一次操作要么完整提交要么完全回滚、读取者不能把旧 Snapshot 与新 Query 混用。`@cflow/kernel` 把这些规则收敛到一个小而严格的同步事务边界中。

## 适用场景

- 在不启动 Plugin Host 的测试、服务端任务或领域逻辑中直接操作图。
- 需要严格区分 NodeId 与 EdgeId，并查询入边、出边、关联边和直接子 Node。
- 需要从一次提交获得完整 `before` / `after` Canvas View 与 Change Set。
- 需要通过同一 Transaction 写路径正向或反向回放 Change Set。
- 为 Runtime Plugin、History、Layout 或 Renderer adapter 提供稳定的 Document seam。

## 它提供什么

- `createCanvasKernel()`：创建空的 revision-zero Kernel。
- `CanvasKernel`：`read()` 与同步 `transact()` 两个顶层操作。
- `CanvasNode`、`CanvasEdge`、`EdgeEndpoint`、`Point`、`Size`：Renderer-independent 图值。
- `CanvasView`：同一已提交 revision 的不可变 `CanvasSnapshot` 与 `CanvasQuery`。
- `TransactionContext`：严格的 Node/Edge `add`、`replace`、`remove` 与 Change Set replay。
- `CanvasCommit` / `ChangeSet`：一次净变化提交的完整证据，包含相邻 revision 与实体级 before/after。
- `nodeId()` / `edgeId()`：运行时为非空字符串、类型层彼此隔离的 ID 构造入口。
- `KernelError`：带稳定 `domain: 'kernel'` 和结构化 code/details 的失败类型。

## 依赖与组合

`@cflow/kernel` 的唯一 workspace 依赖是叶子包 `@cflow/diagnostics`，用于共享结构性错误契约。它不依赖 `@cflow/core`，也不依赖任何 Runtime 或 Renderer package。

在 Canvas Runtime 中，不要把裸 `CanvasKernel` 当作全局对象传递；由 [`@cflow/plugin-kernel`](/modules/plugin-kernel) 把它封装成窄 `KernelService`，并拥有 Commit Observer 与 Activation 生命周期。

## 公共入口

```ts
import {
  createCanvasKernel,
  edgeId,
  KernelError,
  nodeId,
  type CanvasCommit,
  type CanvasKernel,
  type CanvasView,
  type ChangeSet,
  type TransactionContext,
} from '@cflow/kernel';
```

最小事务：

```ts
const kernel = createCanvasKernel();

const commit = kernel.transact((transaction) => {
  transaction.nodes.add({
    id: nodeId('task'),
    type: 'task',
    position: { x: 0, y: 0 },
    data: null,
  });
});

console.log(commit?.after.snapshot.revision); // 1
```

## 状态与生命周期语义

- 新 Kernel 的 `read()` 返回稳定的 revision 0 Canvas View；在没有净变化提交时，根引用保持不变。
- `transact()` 必须同步完成。async callback、嵌套 Transaction 和 callback 结束后继续使用 Transaction Context 都会显式失败。
- callback 抛错或最终图无效时，Document 与当前 Canvas View 不变；外部 callback error 保持原对象，不被包装。
- Transaction 允许暂时不完整的中间状态，只在 callback 结束时统一验证最终图。
- 无净变化返回 `null`；有净变化时 revision 单调增加 1，并返回同一次提交的 `before`、`after` 与 Change Set。
- `applyChangeSet()` 仍运行在新 Transaction 中。回放会预检当前实体是否匹配来源侧；冲突不会部分覆盖当前状态。
- Snapshot、Query 结果和 CFlow 自有值按规范 ID 顺序且不可变；这个顺序只保证确定性，不代表 z-index。

最终图必须满足：Node position 是有限数值；可选 size 是有限且非负；parent 必须存在且不能成环；每个 Edge Endpoint 必须引用现存 Node。

## 限制与非目标

- 不提供 Plugin Installation、Runtime Service、Commit Observer 或资源释放；这些属于 `@cflow/plugin-kernel`。
- 不提供异步 Transaction、并发合并、持久化 revision 或跨进程一致性。
- 不自动级联删除子 Node 或关联 Edge；调用方必须在同一 Transaction 中显式维护最终图。
- 不解释 Port 语义，也不限制自环；上层领域能力决定这些规则。
- Node/Edge `data` 不会被深复制、深冻结或深比较，净变化按引用语义判断。
- Canvas Snapshot 不是 Serialized Document；本地 revision 也不是持久化 Schema version。

## 验证依据

- [公共导出](https://github.com/ZWkang/cflow/blob/main/packages/kernel/src/index.ts)只包含 Kernel contract、ID helper 与结构性错误。
- [Kernel 行为测试](https://github.com/ZWkang/cflow/blob/main/packages/kernel/tests/index.test.ts)覆盖原子提交、回滚、关系查询、最终图校验、净零事务和 Change Set replay。
- [错误与类型测试](https://github.com/ZWkang/cflow/tree/main/packages/kernel/tests)验证稳定 error identity、readonly View/Commit 与同步 Transaction 边界。
- ADR-0009 至 ADR-0012 固定了纯 Kernel、revision-bound Canvas View、Transaction replay 与不透明领域数据语义。
