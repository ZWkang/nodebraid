---
title: '@nodebraid/preset-basic'
description: 显式 Renderer、完整 readiness 与统一生命周期的 Basic Canvas Composition。
---

# `@nodebraid/preset-basic`

`@nodebraid/preset-basic` 是后端无关的官方 Basic Canvas Composition。它把已经稳定重复的 Kernel、Command、Session、Renderer、Interaction 与 History 组装收口到一个普通 Plugin，同时保留 Host、Diagnostics、Renderer Provider 与扩展能力的应用所有权。

::: warning Package 尚未公开发布
该名称表示当前源码模块边界，不代表可以从 npm 安装。请按 [Quick Start](/guide/quick-start) 从源码验证。
:::

## 解决的问题

应用不再需要重复写六个标准 Feature Plugin 的安装、等待和释放代码，也不需要自己维护依赖安全的 cleanup 顺序。Composition Installation 只有在全部 Child Installation active 后才 active，任一必需 child 失败都会回滚整棵树。

## 公共入口

- `createBasicCanvasPlugin(rendererFactory, options?)`：返回普通 Plugin，保留 Renderer Factory config 的精确类型；
- `BasicCanvasPluginOptions`：当前只包含可选的 readonly `interaction` policy。

Package 没有默认导出、Runtime Service、Host factory、Renderer Registry 或内部 Child Installation 访问入口。

## 典型组合

```ts
import { createBasicCanvasPlugin, createPluginHost } from '@nodebraid/core';
import { createSvgRenderer } from '@nodebraid/renderer-svg';

const host = createPluginHost();
const basicCanvas = createBasicCanvasPlugin(createSvgRenderer);
const composition = host.install(basicCanvas, { target: svgElement });

try {
  await composition.whenActive();
} finally {
  await host.dispose();
}
```

SVG 只是应用在这个示例中显式选择的 Provider，不是 preset 或 core 的默认依赖。Provider config 由 Factory 自己定义和验证，preset 不建立 universal Target 或配置 schema。

## Readiness、失败与释放

Composition 按 Kernel、Command、Session、Renderer、Interaction、History 的顺序创建 children，再等待全部 active。父 active 是首次完整 readiness，不是 Child Service 的原子发布屏障或永久 health signal。

Renderer Factory、Interaction config 与其他 child setup 失败保留原始错误身份。已有标准 Provider、第二份 preset 或同一 Host 内的第二个 Renderer 继续按现有 Service reservation 显式冲突，preset 不会跳过或替换。释放逆序进行并等待异步 Renderer dispose；多个清理失败通过 AggregateError 保留。

Failed Composition Installation 不会自重试；恢复需要新 Installation。调用方仍应显式 dispose 失败父级，但 child 回滚完成后它不持有额外 preset reservation，因此不会阻止 replacement 进入同一 Host。

## 扩展方式

应用通过 sibling Consumer Plugin 的静态 Required Service Binding 使用基础能力。Layout、Validation、领域规则和其他 Provider 也作为 sibling Plugin 安装。需要替换基础成员或单独控制生命周期时，应用应继续逐项组合，而不是从 preset 取得内部句柄。

## 限制与非目标

- 不创建或隐藏 Plugin Host，也不配置 Diagnostics；
- 不选择默认 Renderer，不依赖 SVG、DOM 或 native event；
- 不安装 Layout、Persistence、Serialization、Collaboration 或产品 UI；
- 不提供 Plugin 数组、optional Service、动态 Registry、hooks 或 Service Locator；
- 同一 Host 只容纳一套标准 Basic Canvas Service；多 Canvas 使用多个 Host。

## 验证依据

- package public-seam tests 使用真实 Host 与真实 Feature Plugins；
- 类型测试锁定 Renderer config 推导、readonly options 与无 Service 表面；
- lifecycle tests 覆盖 readiness、失败身份、回滚、冲突、隔离与异步 cleanup；
- 真实 SVG + Chromium tracer 覆盖投影、Selection、Box Selection、Move、Undo/Redo、Wheel 与 dispose；
- declaration isolation、package-name import、pack preview 与根仓库门禁验证发布边界。
