---
title: '@cflow/plugin-interaction'
description: 把 Renderer Input 解释为 Selection、Drag、Pan 与 Wheel Zoom 的 Runtime Plugin。
---

# `@cflow/plugin-interaction`

::: warning Package 尚未公开发布
该名称表示当前源码模块边界，不代表可以从 npm 安装。请按 [Quick Start](/guide/quick-start) 从源码验证。
:::

## 解决的问题

Renderer 只发布输入事实和 Hit Result，不应决定产品行为。该 Plugin 在 Renderer、Session、Command 与 Kernel 之上拥有 Active Gesture 状态机，把原始输入解释为后端中立的选择、拖动和视口操作，同时避免第二条 Document 写路径。

## 提供的能力

- `interactionPlugin`：无 Runtime Service 的 Feature Plugin；
- `InteractionConfig`：`dragThreshold`、`wheelZoomSensitivity`、`minZoom`、`maxZoom`；
- `moveNodesCommand`：ID 为 `interaction.nodes.move`，一次同步 Transaction 更新全部目标 Node；
- `InteractionError`：`INVALID_CONFIG`、`INVALID_MOVE`、`STALE_GESTURE`；
- `interactionDiagnosticEvents`：Pointer/Input rejection、Gesture cancellation 与 Command fault。

首版行为包括普通/加法 Node、Edge、Canvas Selection，Port 到所属 Node 的选择映射，多 Node Drag Preview，Canvas/middle/Space Pan，以及按 Screen Point 锚定的 Wheel Zoom。

## 依赖与写入方向

Plugin 静态要求 Renderer、Session、Command 与 Kernel Service，不提供自己的状态 Service。

```text
RendererService ─▶ Input / Hit / Capture / Projection
SessionService  ◀─ Selection / Viewport
CommandService  ◀─ Move Nodes Command ─▶ KernelService
```

Pointermove 只替换 Interaction Projection。pointerup 先清 Preview 并回到 idle，再把 Viewport 写入 Session，或执行一次 Move Nodes Command。Command 读取当前完整 Node，只替换 position，并用每个 Node 的 base position 拒绝竞争写。

## 生命周期与错误

同一 Activation 只有一个 Gesture Pointer。额外 Pointer 与 Gesture 中的 Wheel 有稳定诊断；pointercancel、lost capture、stale Node/Viewport、Plugin unload 或依赖丢失都不会提交 Preview。复合 cleanup 停止订阅、清 Binding、释放 Capture、清状态并等待 Command Registration；并列失败以 `AggregateError` 完整暴露。依赖恢复创建全新 idle Activation。

## 非目标与验证

首版不包含 box selection、edge connect、delete、snapping、pinch/touch tool、HTML overlay、文本编辑、协作 presence、产品 UI 或通用 Tool Registry。成功行为由真实 Chromium 中的完整 Runtime + SVG seam 验证；Bun 测试覆盖配置、命令、诊断、恢复和 cleanup failure。
