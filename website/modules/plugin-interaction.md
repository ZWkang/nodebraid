---
title: '@nodebraid/plugin-interaction'
description: 把 Renderer Input 解释为 Selection、Box Selection、Delete、Drag、Pan、Wheel Zoom 与 Edge Connection 的 Runtime Plugin。
---

# `@nodebraid/plugin-interaction`

::: warning Package 尚未公开发布
该名称表示当前源码模块边界，不代表可以从 npm 安装。请按 [Quick Start](/guide/quick-start) 从源码验证。
:::

## 解决的问题

Renderer 只发布输入事实和 Hit Result，不应决定产品行为。该 Plugin 在 Renderer、Session、Command 与 Kernel 之上拥有 Active Gesture 状态机，把原始输入解释为后端中立的选择、拖动和视口操作，同时避免第二条 Document 写路径。

## 提供的能力

- `interactionPlugin`：拥有单一输入 authority，并提供窄 `interactionShortcutService`；
- `InteractionConfig`：Drag/Zoom 策略与可选同步 Connection materializer；
- `moveNodesCommand`：ID 为 `interaction.nodes.move`，一次同步 Transaction 更新全部目标 Node；
- `createEdgeCommand`：ID 为 `interaction.edge.create`，一次同步 Transaction 创建完整 Edge；
- `deleteSelectionCommand`：ID 为 `interaction.selection.delete`，一次同步 Transaction 删除规范目标闭包；
- `InteractionError`：`INVALID_CONFIG`、`INVALID_MOVE`、`INVALID_CONNECTION`、`INVALID_DELETE`、`STALE_GESTURE`、`STALE_SELECTION`；
- `interactionDiagnosticEvents`：Pointer/Input rejection、Gesture cancellation 与 Command fault。

Shortcut consumer Plugin 可以注册不可变 physical-code + modifier alternatives 与无输入 typed Command。Interaction 统一处理 Binding 冲突、repeat、Active Gesture、capability unavailable、execution abort 与 Input Disposition；consumer 不直接订阅 Renderer。

当前行为还包括 mouse-only Port-aware 与 Node-level Edge Connection：Renderer 为带 Port 定义的 Node 提供 Port Hit，为无 Port Node 提供 source/target Anchor；应用 materializer 拥有 Edge ID/type/data，Interaction 验证 source/target role 与当前 Port 定义，并只在 pointerup 提交一次 typed Command。

Primary pointer 从空白 Canvas 拖动超过 threshold 后进入 Box Selection；Preview 只包含 World Rect，pointerup 才按当前 Kernel View 的 Node position/size 相交结果更新 Session。Shift、Control 或 Meta 与既有 Additive Modifier 语义一致，合并已有 Selection；中键和 Space Pan 优先。

Renderer 拥有 Focus 且没有 Active Gesture 时，logical `key` 或 physical `code` 任一为 Delete 都会删除当前 Selection。显式选中 Edge 与选中 Node 的全部 incident Edge 先删，再删 Node；精确 source Snapshot 的目标 identity 证据会拒绝竞争目标变化与同值 ABA replacement，但不拒绝无关 Commit。空 Selection 不建立 revision/History Entry，Backspace 不触发删除，Active Gesture 期间则使用 Input Rejection 且不取消 Gesture。

## 依赖与写入方向

Plugin 静态要求 Renderer、Session、Command、Kernel 与 Port Service，提供 Shortcut contribution Service 与 Node Placement Service，不公开 Active Gesture 状态。

```text
RendererService ─▶ Input / Hit / Capture / Projection
SessionService  ◀─ Selection / Viewport
CommandService  ◀─ Move/Create/Delete Commands ─▶ KernelService
```

Pointermove 只替换 Interaction Projection。pointerup 先清 Preview 并回到 idle，再把 Box Selection/Viewport 写入 Session，或执行一次 Move Nodes Command。Command 读取当前完整 Node，只替换 position，并用每个 Node 的 base position 拒绝竞争写。

## 生命周期与错误

同一 Activation 只有一个 Gesture Pointer。额外 Pointer 与 Gesture 中的 Wheel 有稳定诊断；pointercancel、lost capture、stale Node/Viewport、Plugin unload 或依赖丢失都不会提交 Preview。复合 cleanup 停止订阅、清 Binding、释放 Capture、清状态并等待 Command Registration；并列失败以 `AggregateError` 完整暴露。依赖恢复创建全新 idle Activation。

## 非目标与验证

当前不包含 self-loop、业务 validation、容量/类型规则、Edge/Port 框选、lasso、Backspace、Clipboard、确认弹窗、soft delete、snapping、pinch/touch tool、HTML overlay、文本编辑、协作 presence、产品 UI 或通用 Tool Registry。成功行为由真实 Chromium 中的完整 Runtime + SVG seam 验证。

## 单次 Node Placement

`nodePlacementService.begin(materializeNode)` 开始一次请求。handle 提供 `cancel()` 和 `result` Promise，结果为 `{type: 'created', nodeId, commit}` 或 `{type: 'cancelled'}`；原始失败通过 reject 暴露。应用同步 materializer 接收 `{worldPoint}` 并返回完整 Node。安装 Node Editing 以提供公开 Create Node Command；Basic Composition 已包含它。

Interaction 统一路由放置与普通手势。primary 点击在空白处开始和结束、且未超过现有拖动阈值，才创建一次并选中新 Node。实体点击与拖动不放置，也不同时选择/拖动；Esc 取消。待放置期间保留平移缩放，候选点击不跨 Viewport 变化提交。示例以点击点为 Node 左上角，使用光标与提示反馈。
