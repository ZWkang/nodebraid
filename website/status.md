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
- Backend-neutral Interaction Projection，以及 Selection、Box Selection、Delete Selection、独立 Duplicate Selection、multi-Node Drag、Pan、Wheel Zoom 与 Port-aware/node-level Edge Connection Runtime；
- 纯内存 `@nodebraid/canvas-fragment`，以及应用拥有 codec/transport 的显式 Clipboard Copy/Paste Behavior；
- 参考级 `@nodebraid/renderer-svg` Provider，以及真实 Chromium 中的 SVG projection、输入、Hit Test 与 lifecycle 验证；
- Layout Input/Engine/Proposal contract 与 Runtime Command integration；Dagre、ELK 均接受普通与 Port-qualified Edge 混合的 Node 拓扑，保留端口连接并支持单步 History，无需 Port Plugin；
- Dagre full Layout Provider；
- ELK full、incremental 与 Fixed Node Layout Provider；
- 后端无关的 `@nodebraid/preset-basic` Basic Canvas Composition，以及真实 SVG canonical example；
- 公开 `@nodebraid/adapter-react` Runtime Mount 与稳定 Snapshot Hooks，以及真实 Chromium lifecycle 验证；
- 私有 `@nodebraid/examples` React/TanStack Router Examples Application；Basic SVG 提供手动 Dagre/full/LR 整图布局，保留 Selection、Viewport 与原 Port 连接，并通过真实 UI + Canvas Chromium 验收；
- 纯 `@nodebraid/document` 完整图文本格式与应用 Data Codec、原子 History Baseline，以及 Example 手动文件导出/导入；
- 通过 `@nodebraid/core` 聚合的公共 facade。

完整清单见 [全部模块](/modules/)。

## 当前缺口

::: warning 尚无产品级编辑器外壳
当前分支已经交付 Basic Canvas Composition、Duplicate/Delete Selection、显式 Clipboard Copy/Paste、Port Capability、Port-aware/Node-level Edge Connection、SVG Renderer 闭环、React Adapter 与开发者参考 Examples Application，但仍没有 Vue 或其他 framework adapter，也没有产品级编辑器外壳。当前不包含自动/云端 Persistence、跨版本 Clipboard 格式、Edge/Port 框选、lasso、snapping、pinch/touch 工具、任意 HTML/React 组件节点与画布内文本编辑 或可扩展 Tool Registry。
:::

完整 Document 的版本化序列化与 Example 手动文件导出/导入已提供；当前没有自动/云端 Persistence、Collaboration 或远程同步能力。目标架构中出现某个名称，不代表它已经成为公共 package。

带 Port 图的 Layout 仅排列 Node；Port 方位、顺序和 Geometry 参与算法的 Port-aware Layout 仍未实现，Renderer 继续拥有 Port Geometry。

## Package 发布状态

本仓库源码声明 `@nodebraid/*` 名称，但这些 package 尚未公开发布。本项目当前不提供 npm 安装命令；请从 [Quick Start](/guide/quick-start) 使用源码 checkout。

首次 npm 发布时，package identity、站点提示和示例必须一起验证并更新。本次更名不执行 package 发布。

## 验证等级

每项能力以当前 public exports、package tests、declaration isolation 与真实 Runtime composition 为证据。仓库总检查覆盖 lint、typecheck、format、Bun tests、真实浏览器 tests、build、Quick Start 与文档生产构建。

站点内容不把 README 计数、链接存在或设计文档当成运行时证明；发现冲突时，以当前实现与测试为准，并单独保留设计意图。

通用节点创建、严格起点 data 编辑与单次放置已提供。SVG 自定义内容沿用矩形交互边界，示例拥有应用/取消属性表单。见 [Node Editing](/modules/plugin-node-editing)。
