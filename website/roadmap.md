---
title: Roadmap
description: 与当前能力严格分离的 NodeBraid 后续方向。
---

# Roadmap

Roadmap 记录尚未交付的方向，不承诺日期、package 名或最终 API。任何方向只有在进入当前实现、公共导出和验证门禁后，才会出现在 [当前状态](/status) 与 [全部模块](/modules/) 中。

## 发布身份

在面向外部应用发布 package 前，需要迁移到本项目拥有的 npm scope，并同步更新 manifests、依赖、文档与 release workflow。这是公开安装体验的前置条件，但不在当前文档站实现范围内。

## Renderer 生态

SVG Renderer Provider 已经通过真实 Target、Document/Session 同步、输入、Hit Test 与 lifecycle 验证。后续 Canvas2D、WebGL、Konva、Pixi 或其他 Provider 仍应通过同一个 contract 独立交付，而不是在核心中增加默认 Renderer 或动态 Registry。

## Interaction 扩展与框架接入

Interaction v1 已经在标准化 Renderer Input 之上交付选择、多 Node 拖动、Pan、Wheel Zoom 与 node-level Edge Connection，并通过 Command/Session/Kernel 的既有写入边界工作。后续仍可独立设计 Port-aware Connection、box selection、snapping、pinch/touch、文本编辑或可扩展 Tool Registry。React、Vue 或其他 framework adapter 应保持在 Runtime 与 UI 框架之间，不取得第二份 Document authority。

## Composition 与示例

后端无关的 Basic Canvas Composition 与真实 SVG canonical example 已经交付，并通过 Chromium 验证 Selection、Move、History、Wheel 与 dispose。后续 framework adapter 或产品示例仍保持显式应用层能力；Plugin Host 不会隐式安装 preset，preset 也不会选择默认 Renderer。

## 更后面的探索

Persistence、Collaboration、序列化 schema、远程同步和更多 Layout/Renderer Provider 都需要独立场景、契约与验证。它们目前是探索方向，不是已承诺模块。
