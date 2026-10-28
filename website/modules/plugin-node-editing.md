---
title: '@nodebraid/plugin-node-editing'
description: 通用 Node 创建与按精确源值保护的数据编辑。
---

# `@nodebraid/plugin-node-editing`

::: warning Package 尚未公开发布
该名称表示源码模块边界，不代表可以从 npm 安装。按 [Quick Start](/guide/quick-start) 使用源码。
:::

`nodeEditingPlugin` 在既有 Kernel 和 Command 上注册两个公开 Command，Basic Canvas Composition 已包含它。应用拥有节点类型、ID、初始几何和不透明 data；本模块不规定名称、字段 schema 或编辑面板。

```ts
await commands.execute(createNodeCommand, { node });
const expectedNode = kernel.read().query.getNode(node.id);
if (!expectedNode) throw new Error('Node disappeared.');
await commands.execute(updateNodeDataCommand, { expectedNode, data: nextData });
```

Create Node 原子新增完整值，返回 `CanvasCommit`，不修改 Selection。Update Node Data 只替换 data，返回 `CanvasCommit | null`。实际变化通过原有 History 单步撤销重做；相同 data 引用不产生提交。

编辑起点必须是从当前 Kernel 读取的精确 Node 引用。该 Node 被移动、更新、Undo/Redo 或跨提交删除重建后，旧编辑以 `NodeEditingError / STALE_NODE` 失败；其他 Node 的变化不影响它。应用保留草稿、说明冲突并提供显式重新载入，不自动覆盖或深合并。

应用拥有字段校验与 Apply/Cancel。Kernel 继续验证图结构；输入访问异常和取消原因保留原值。已完成提交后的 Renderer 或观察者故障不撤销 Document。

Node Placement 由 [Interaction](/modules/plugin-interaction) 统一处理，SVG 内容由 [SVG Renderer](/modules/renderer-svg) 提供。纯命令可以在没有 Renderer、Session 或 React 的 Host 中使用。

公共 Host/Kernel/Command/History 测试覆盖创建、data-only 更新、严格冲突、无关提交、净零、取消和释放。运行：

```sh
bun run --filter '@nodebraid/plugin-node-editing' test
```
