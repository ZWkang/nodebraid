---
title: Interaction
description: 把 Renderer Input 与 Hit Result 解释为 Selection、Drag、Pan、Zoom 和 Edge Connection，同时保持稳定写入边界。
---

# Interaction

Interaction 能力回答“用户输入怎样变成画布语义行为”。它位于 Renderer Runtime 之上，消费后端中立的 Input 与 Hit Result；稳定 Document 变化仍通过 Command/Kernel，稳定 Selection 与 Viewport 仍通过 Session。

## 当前交付

| 层次         | Package                                                    | 职责                                                               |
| ------------ | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| 值契约       | [`@cflow/interaction-api`](/modules/interaction-api)       | Node Drag、Viewport Pan 与 Connection Preview 不可变 Projection    |
| Runtime 行为 | [`@cflow/plugin-interaction`](/modules/plugin-interaction) | Selection、multi-Node Drag、Pan、Wheel Zoom、Connection 与生命周期 |
| 投影中介     | [`@cflow/plugin-renderer`](/modules/plugin-renderer)       | 排他的 Interaction Projection Binding 与 Renderer 同步             |
| 参考后端     | [`@cflow/renderer-svg`](/modules/renderer-svg)             | 在真实 SVG Geometry 上显示 Preview，并统一 Hit/Input 坐标          |

```text
Renderer Input + Hit Result
            │
            ▼
Interaction Runtime
    ├── Preview ─────────▶ Interaction Projection Binding
    ├── Selection/Viewport ▶ Session Service
    └── stable Document result ─▶ typed Command ─▶ Kernel
```

## 行为边界

- Pointermove 只更新 Projection，不持续写 Kernel 或 Session。
- Node Drag 在 pointerup 执行一次 `interaction.nodes.move`，一次 Transaction 自然形成至多一个 History Entry。
- mouse 可从 Node-level source Anchor 建立 Connection Preview，应用 materializer 提供完整 Edge，`interaction.edge.create` 以一次 Transaction 提交。
- Canvas primary、middle button 或 Space+primary 可建立 Pan；Wheel Zoom 按 Screen Point 锚定并受显式配置约束。
- 同一 Activation 只有一个 Gesture Pointer；额外 Pointer、Gesture 中的 Wheel、pointercancel、lost capture 与 stale evidence 都有明确语义和诊断。
- 依赖消失或 Plugin unload 会停止输入、清 Preview、释放 Capture、清本地状态并注销 Command；恢复后创建全新 idle Activation。

## 非目标

首版 Connection 不包含 Port、self-loop、业务 validation 或 Edge Routing；也不包含 box selection、delete shortcut、snapping、pinch/touch 工具、HTML overlay、文本编辑、协作 presence、产品 UI 或通用 Tool Registry。

## 验证

成功链路由真实 Plugin Host、Kernel、Command、Session、Renderer、History 与 SVG Provider 在 Chromium 中组合验证。结构、恢复和 cleanup fault 只通过公开 seam 注入；fake Renderer 不作为 Selection、Drag、Pan、Zoom 或 Capture 成功的证明。
