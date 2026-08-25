---
title: 当前状态
description: NodeBraid 当前已经交付、明确缺失和可验证的能力边界。
---

# 当前状态

NodeBraid 处于早期实现阶段，但已经形成一条可运行的 headless Canvas Runtime 主干。本页只描述当前分支已提交能力，不从目标架构推导完成度。

## 已交付

- NodeBraid-owned Plugin Host、Runtime Service、Activation 与资源释放；
- 结构化错误、Diagnostic Event、Sink 与 Fault Reporter contract；
- Renderer-independent Kernel、同步 Transaction、Canvas View、Query 与 Change Set；
- Kernel、Command、Session、History 与 Renderer Runtime Plugin；
- Selection、Viewport 与 backend-neutral Renderer value contract；
- Backend-neutral Interaction Projection，以及 Selection、Box Selection、multi-Node Drag、Pan、Wheel Zoom 与 node-level Edge Connection Runtime；
- 参考级 `@nodebraid/renderer-svg` Provider，以及真实 Chromium 中的 SVG projection、输入、Hit Test 与 lifecycle 验证；
- Layout Input/Engine/Proposal contract 与 Runtime Command integration；
- Dagre full Layout Provider；
- ELK full、incremental 与 Fixed Node Layout Provider；
- 后端无关的 `@nodebraid/preset-basic` Basic Canvas Composition，以及真实 SVG canonical example；
- 私有 `@nodebraid/examples` React/TanStack Router Examples Application，以及真实 UI + Canvas Chromium 验收；
- 通过 `@nodebraid/core` 聚合的公共 facade。

完整清单见 [全部模块](/modules/)。

## 当前缺口

::: warning 尚无产品级编辑器外壳
当前分支已经交付 Basic Canvas Composition、Interaction v2 Box Selection、Node-level Edge Connection、SVG Renderer 闭环与开发者参考 Examples Application，但仍没有公开 framework adapter 或产品级编辑器外壳。当前不包含 Port-aware Connection、Edge/Port 框选、lasso、snapping、pinch/touch 工具、文本编辑、产品节点 UI 或可扩展 Tool Registry。
:::

当前也没有 Persistence、Collaboration、序列化 schema 或远程同步能力。目标架构中出现某个名称，不代表它已经成为公共 package。

## Package 发布状态

本仓库源码声明 `@nodebraid/*` 名称，但这些 package 尚未公开发布。本项目当前不提供 npm 安装命令；请从 [Quick Start](/guide/quick-start) 使用源码 checkout。

首次 npm 发布时，package identity、站点提示和示例必须一起验证并更新。本次更名不执行 package 发布。

## 验证等级

每项能力以当前 public exports、package tests、declaration isolation 与真实 Runtime composition 为证据。仓库总检查覆盖 lint、typecheck、format、Bun tests、真实浏览器 tests、build、Quick Start 与文档生产构建。

站点内容不把 README 计数、链接存在或设计文档当成运行时证明；发现冲突时，以当前实现与测试为准，并单独保留设计意图。
