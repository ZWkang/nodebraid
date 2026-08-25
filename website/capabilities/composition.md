---
title: Canvas Composition
description: 用显式 Renderer Factory 组装可立即使用的基础 Canvas Runtime。
---

# Canvas Composition

NodeBraid 的 Plugin Host 保持空基座，应用可以逐项安装 Feature Plugin，也可以用 `@nodebraid/preset-basic` 复用官方 Basic Canvas Composition。两条路径共享同一个 Plugin Graph、Service Token、Activation 与资源释放语义。

## 当前交付

Basic Canvas Composition 固定组合：

```text
Kernel → Command → Session → Renderer → Interaction → History
```

它接收应用显式选择的 Renderer Factory，并把 Installation config 原样交给该 Provider。Composition 不依赖 SVG、DOM 或其他具体后端；真实 SVG 示例由应用另外依赖 `@nodebraid/renderer-svg`。

## Readiness 与生命周期

Composition 是普通 Plugin。父 setup 创建全部 Child Installation，并等待每个 child active 后才完成，因此 `composition.whenActive()` 是完整基础 Runtime 的等待点。

Child Service 仍按 Plugin Graph 逐项发布，不是原子隐藏到父 active。释放沿相反顺序完成：History、Interaction、Renderer、Session、Command、Kernel；异步 Renderer cleanup 会被完整等待，失败继续按现有 AggregateError 语义暴露。

## 应用仍然拥有的选择

- 应用创建并释放 Plugin Host；
- Diagnostics 由 Host options 配置；
- Renderer Factory 与 Provider config 必须显式提供；
- Layout、领域规则和其他能力作为 sibling Plugin 安装；
- 需要自定义基础成员时，应用可以继续逐项安装而不使用 preset。

Composition 不提供聚合 Service、动态 `getService()`、内部 Child Installation 句柄、默认 Renderer 或 Plugin 数组。应用通过静态 Required Service Binding 使用 Kernel、Command、Session、Renderer 与 History。

## 真实验证

package tests 使用真实 Plugin Host 与六个真实 Feature Plugins 验证 readiness、Command/History、冲突、失败回滚、Host 隔离和异步清理。完整成功路径由真实 SVG Provider 与 Chromium 验证，包括投影、Selection、Box Selection、Move Commit、Undo/Redo、Wheel Zoom、Host dispose 和 Target reservation 释放。

继续阅读 [`@nodebraid/preset-basic`](/modules/preset-basic)，或从 [Quick Start](/guide/quick-start) 查看 headless 与真实 SVG 两层示例。
