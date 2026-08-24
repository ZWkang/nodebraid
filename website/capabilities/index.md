---
title: 能力地图
description: 从开发者问题出发，理解 NodeBraid 当前七个能力族及其 package 组合。
---

# 能力地图

NodeBraid 的 package 边界用于保持依赖清晰，但评估一个系统时，首先需要回答的是“它能帮我完成什么”。当前 workspace packages 组成七个能力族；每个能力族都连接契约、Runtime integration 与可选 Provider，而不是把单个基础 package 当成孤立卖点。

| 能力族                                                 | 回答的问题                                        | 当前交付                                             |
| ------------------------------------------------------ | ------------------------------------------------- | ---------------------------------------------------- |
| [Foundations](/capabilities/foundations)               | 能力怎样组合、激活、释放并报告结构化诊断？        | core facade、Plugin Host、Diagnostics                |
| [Composition](/capabilities/composition)               | 如何显式选择 Renderer 并获得完整基础 Runtime？    | Basic Canvas Composition                             |
| [Graph State](/capabilities/graph-state)               | 谁拥有 Document，Selection 与 Viewport 放在哪里？ | Kernel、Kernel Plugin、Session API、Session Plugin   |
| [Execution & History](/capabilities/execution-history) | 行为怎样执行，Document Commit 怎样 Undo/Redo？    | Command Plugin、History Plugin                       |
| [Layout](/capabilities/layout)                         | 如何异步计算布局，并安全提交到当前 revision？     | Layout API、Runtime integration、Dagre、ELK          |
| [Interaction](/capabilities/interaction)               | 如何把标准输入解释为选择、拖动与视口操作？        | Interaction API、Interaction Runtime Plugin          |
| [Rendering Contract](/capabilities/rendering-contract) | 如何接入渲染后端而不污染核心状态？                | Renderer API、Renderer Plugin、SVG Renderer Provider |

## 一条典型组合链

```text
Application
    │ installs
    ▼
Plugin Host
    ├── Kernel Plugin ──▶ authoritative Document
    ├── Session Plugin ─▶ Selection + Viewport
    ├── Command Plugin ─▶ typed behaviors
    ├── History Plugin ─▶ Undo / Redo
    ├── Layout Plugin ──▶ explicit Layout Engine
    ├── Interaction Plugin ▶ Selection / Drag / Pan / Zoom
    └── Renderer Plugin ▶ application-provided Renderer Factory
```

Plugin Host 不隐式安装这些能力，`@nodebraid/core` 也只是公共 facade。应用可以显式逐项安装，或显式安装 Basic Canvas Composition；Renderer 与其他 Provider 仍由应用选择。

## 下一步

- 从 [Quick Start](/guide/quick-start) 运行最小 Kernel Runtime；
- 在 [全部模块](/modules/) 中查看当前全部 package；
- 阅读 [当前状态](/status)，了解发布身份与尚未交付的边界。
