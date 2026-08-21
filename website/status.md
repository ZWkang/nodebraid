---
title: 当前状态
description: CFlow 当前已经交付、明确缺失和可验证的能力边界。
---

# 当前状态

CFlow 处于早期实现阶段，但已经形成一条可运行的 headless Canvas Runtime 主干。本页只描述当前分支已提交能力，不从目标架构推导完成度。

## 已交付

- CFlow-owned Plugin Host、Runtime Service、Activation 与资源释放；
- 结构化错误、Diagnostic Event、Sink 与 Fault Reporter contract；
- Renderer-independent Kernel、同步 Transaction、Canvas View、Query 与 Change Set；
- Kernel、Command、Session、History 与 Renderer Runtime Plugin；
- Selection、Viewport 与 backend-neutral Renderer value contract；
- Backend-neutral Interaction Projection，以及 Selection、multi-Node Drag、Pan 与 Wheel Zoom Runtime；
- 参考级 `@cflow/renderer-svg` Provider，以及真实 Chromium 中的 SVG projection、输入、Hit Test 与 lifecycle 验证；
- Layout Input/Engine/Proposal contract 与 Runtime Command integration；
- Dagre full Layout Provider；
- ELK full、incremental 与 Fixed Node Layout Provider；
- 后端无关的 `@cflow/preset-basic` Basic Canvas Composition，以及真实 SVG canonical example；
- 通过 `@cflow/core` 聚合的公共 facade。

完整清单见 [全部模块](/modules/)。

## 当前缺口

::: warning 尚无产品级编辑器外壳
当前分支已经交付 Basic Canvas Composition、Interaction v0 与 SVG Renderer 闭环，但仍没有 framework adapter 或产品级编辑器外壳。首版不包含 box selection、edge connect、snapping、pinch/touch 工具、文本编辑、产品节点 UI 或可扩展 Tool Registry。
:::

当前也没有 Persistence、Collaboration、序列化 schema 或远程同步能力。目标架构中出现某个名称，不代表它已经成为公共 package。

## Package 发布状态

本仓库源码声明 `@cflow/*` 名称，但公开 npm registry 中的 `@cflow/core` 属于另一个项目。本项目当前不能提供安全的 npm 安装命令；请从 [Quick Start](/guide/quick-start) 使用源码 checkout。

未来迁移 npm scope 时，package identity、站点提示和示例会一起更新。本次文档站不执行 package rename 或发布。

## 验证等级

每项能力以当前 public exports、package tests、declaration isolation 与真实 Runtime composition 为证据。仓库总检查覆盖 lint、typecheck、format、Bun tests、真实浏览器 tests、build、Quick Start 与文档生产构建。

站点内容不把 README 计数、链接存在或设计文档当成运行时证明；发现冲突时，以当前实现与测试为准，并单独保留设计意图。
