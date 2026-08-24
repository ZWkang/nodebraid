---
title: '@nodebraid/renderer-svg'
description: 将 NodeBraid Canvas 语义投影到现有 SVG Target 的参考级 Renderer Provider。
---

# `@nodebraid/renderer-svg`

::: warning Package 尚未公开发布
该名称表示当前源码模块边界，不代表可以从 npm 安装。请按 [Quick Start](/guide/quick-start) 从源码验证。
:::

## 解决的问题

`@nodebraid/renderer-svg` 是 `@nodebraid/renderer-api` 的首个官方 concrete Provider。它把 Document、Session、Hit Test 与标准化浏览器输入投影到调用方已有的 `SVGSVGElement`，用真实 DOM 验证 Renderer contract，而不让 SVG 类型进入 Kernel、Session 或公共 Renderer API。

它提供通用矩形 Node、直线 Edge 与稳定 DOM seam，但不解释产品 Node type、业务 data 或组件框架。

## 何时使用

- 你需要一个可直接接入已有 SVG 元素的官方 Renderer Provider；
- 你要验证 Document Commit、Selection、Viewport、Hit Test 与浏览器输入的完整 Renderer 链路；
- 你愿意由应用通过 CSS 和上层 Interaction 定义产品视觉与编辑行为；
- 你要直接使用具名 Factory，或通过 [`@nodebraid/plugin-renderer`](/modules/plugin-renderer) 接入 Runtime。

如果产品需要自定义 Node DOM、Port、复杂 Edge、组件挂载或完整编辑器交互，本 package 不是这些能力的替代品。

## 提供的能力

- 同步 `createSvgRenderer(config)` Factory，一次绑定一个现有 `SVGSVGElement`；
- 通用矩形 Node、直线 Edge、Selection 标记与 Viewport projection；
- Pointer、Wheel、Keyboard、Focus 与 Pointer Capture 的真实 DOM bridge；
- Node Drag、Viewport Pan 与 Connection Preview Projection，以及 node-level source/target Anchor Hit Result；
- 从 CSS screen pixel 到 SVG user space 的坐标转换与语义 Hit Test；
- 稳定 class、`data-nodebraid-*` 属性、canonical layer order 与 keyed DOM identity；
- 原子 Document/Session 更新、连续 revision 校验、失败回滚与 reset 恢复；
- Provider-specific 的 `SvgRendererError`，以及完整 Renderer contract 的结构化错误。

Provider 只管理自己在 Target 下创建的 projection subtree。调用方原有 SVG 内容由调用方继续拥有；释放 Renderer 时只移除 Provider-owned 内容。

## 依赖与组合

该 package 依赖 [`@nodebraid/renderer-api`](/modules/renderer-api) 的 backend-neutral contract，以及其使用的 Kernel、Session、Interaction Projection 与 Diagnostics 值契约。它不依赖 Plugin Host、framework adapter、Interaction 状态机或 `@nodebraid/core`。

应用可以直接创建 Renderer；需要 Runtime 生命周期与 Kernel/Session 同步时，把 `createSvgRenderer` 交给 [`@nodebraid/plugin-renderer`](/modules/plugin-renderer)。NodeBraid 不会默认选择该 Provider，`@nodebraid/core` 也不会重导出它。

## 公共入口

```ts
import {
  createSvgRenderer,
  SvgRendererError,
  type SvgDomEventPolicy,
  type SvgInputPolicies,
  type SvgRendererConfig,
  type SvgRendererErrorCode,
} from '@nodebraid/renderer-svg';

const target = document.querySelector<SVGSVGElement>('#canvas');
if (!target) throw new Error('Missing SVG target.');

const renderer = createSvgRenderer({
  target,
  edgeHitTolerance: 4,
  connectionAnchorHitTolerance: 8,
  input: {
    wheel: { preventDefault: true },
  },
});

try {
  // 通过 Renderer contract 交付 Document 与 Session projection。
} finally {
  await renderer.dispose();
}
```

Factory config 是不可变的 Provider-specific 值：`target` 必填；`edgeHitTolerance` 与 `connectionAnchorHitTolerance` 是非负 CSS pixel；`input` 分别控制 Pointer、Wheel、Keyboard 与 Context Menu policy。

## DOM 与样式 seam

Provider 写入 geometry、稳定 class 与 `data-nodebraid-*` 属性，但不注入 runtime theme。应用可以从最小样式开始：

```css
.nodebraid-renderer-svg__node {
  fill: white;
  stroke: currentColor;
}

.nodebraid-renderer-svg__edge {
  stroke: currentColor;
}

.nodebraid-renderer-svg__connection-anchor {
  r: 4px;
  fill: currentColor;
}

.nodebraid-renderer-svg__connection-preview {
  stroke: currentColor;
}

[data-nodebraid-selected='true'] {
  stroke-width: 2;
}
```

这些属性是 CSS、测试与轻量 DOM integration 的稳定 seam，不是业务组件 API。Node 与 Edge 的语义命中由 Provider 的 Geometry 模型决定，而不是依赖浏览器 paint target。

## 生命周期与错误语义

一个可用 Target 同时只允许一份 SVG Renderer Instance。Factory 会同步校验 config、Target 类型、连接状态、尺寸、坐标变换与占用状态；Target 从创建开始到异步 cleanup 完成前都保持 reservation，避免两个实例交错拥有同一 projection。

| Code                 | 适用失败                                             |
| -------------------- | ---------------------------------------------------- |
| `INVALID_CONFIG`     | 未知 config key、无效 tolerance 或 input policy      |
| `INVALID_TARGET`     | `target` 不是有效 `SVGSVGElement`                    |
| `TARGET_OCCUPIED`    | Target 已被另一份活跃或仍在 cleanup 的 Instance 占用 |
| `TARGET_UNAVAILABLE` | Target 未连接、无可用尺寸或 screen-to-SVG 变换不可逆 |

Document revision、Session、Input subscriber、Pointer 与 disposed-state 失败继续使用 `@nodebraid/renderer-api` 的 `RendererError`。Provider 不吞掉异常；结构验证发生在投影变更之前，无法安全回滚时会显式要求下一次 `reset` 重建 Baseline。

## 限制与非目标

- 仅渲染显式 `Size` 的矩形 Node 与有效端点之间的直线 Edge；
- Connection Anchor 仅是 node-level 语义；不支持 Port、自环、曲线、marker、label、富文本、动画或业务 Node 外观；
- 不提供默认主题、theme registry、组件插槽或 framework adapter；
- 不解释 Interaction 行为，也不提供 Command、拖拽状态机、Selection 写入或持久化；它只显示已接受的语义 Projection；
- 不创建 SVG Target，也不接管调用方已有的 Target 子节点；
- 不作为默认 Renderer，不提供 Registry、默认导出或 Plugin wrapper。

## 验证依据

类型测试锁定具名同步 Factory、Config 与错误入口；Bun 测试覆盖 config 和值语义；真实 Chromium 测试覆盖 SVG/Interaction projection、DOM identity、连续 Commit、Session、Hit Test、screen-to-SVG 坐标转换、ResizeObserver、原生输入 policy、Pointer Capture、lost capture、Focus、Runtime Plugin 组合、Target reservation、回滚与释放。声明产物检查同时保证公共入口不泄漏内部实现。
