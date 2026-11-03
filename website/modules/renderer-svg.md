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

它提供通用矩形 Node、默认直线 Edge，以及显式启用的正交/贝塞尔路径、方向箭头和应用文本标签；保留稳定 DOM seam，业务 data 的解释由应用映射函数拥有。

## 何时使用

- 你需要一个可直接接入已有 SVG 元素的官方 Renderer Provider；
- 你要验证 Document Commit、Selection、Viewport、Hit Test 与浏览器输入的完整 Renderer 链路；
- 你愿意由应用通过 CSS 和上层 Interaction 定义产品视觉与编辑行为；
- 你要直接使用具名 Factory，或通过 [`@nodebraid/plugin-renderer`](/modules/plugin-renderer) 接入 Runtime。

如果产品需要 HTML/React 组件节点、任意 Port shape/position、避障路由、交互式标签、组件挂载或完整编辑器交互，本 package 不是这些能力的替代品。

## 提供的能力

- 同步 `createSvgRenderer(config)` Factory，一次绑定一个现有 `SVGSVGElement`；
- 通用矩形 Node、默认直线或显式正交/贝塞尔 Edge、方向箭头、应用文本标签、Selection 标记与 Viewport projection；
- Pointer、Wheel、Keyboard、Focus 与 Pointer Capture 的真实 DOM bridge；
- Node Drag、Viewport Pan、Box Selection marquee 与 Connection Preview Projection，以及 Port 或 node-level source/target Anchor Hit Result；
- source/target Port 的规范边界 Geometry、稳定 DOM seam 与 port-qualified Edge 端点；
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
  type SvgNodeContentContext,
  type SvgNodeContentFactory,
  type SvgEdgePath,
  type SvgEdgePresentation,
  type SvgEdgeConfig,
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

[data-nodebraid-edge-path] {
  fill: none;
}

[data-nodebraid-edge-arrow],
[data-nodebraid-edge-label] {
  fill: currentColor;
  stroke: none;
}

.nodebraid-renderer-svg__connection-anchor,
.nodebraid-renderer-svg__port {
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

| Code                        | 适用失败                                             |
| --------------------------- | ---------------------------------------------------- |
| `INVALID_CONFIG`            | 未知 config key、无效 tolerance 或 input policy      |
| `INVALID_NODE_CONTENT`      | 非法、已挂载或重复拥有的 SVG 内容                    |
| `INVALID_EDGE_PRESENTATION` | 应用返回非法路径或非文本标签                         |
| `INVALID_TARGET`            | `target` 不是有效 `SVGSVGElement`                    |
| `TARGET_OCCUPIED`           | Target 已被另一份活跃或仍在 cleanup 的 Instance 占用 |
| `TARGET_UNAVAILABLE`        | Target 未连接、无可用尺寸或 screen-to-SVG 变换不可逆 |

Document revision、Session、Input subscriber、Pointer 与 disposed-state 失败继续使用 `@nodebraid/renderer-api` 的 `RendererError`。Provider 不吞掉异常；结构验证发生在投影变更之前，无法安全回滚时会显式要求下一次 `reset` 重建 Baseline。

## 限制与非目标

- 要求 Node 显式 `Size` 并使用矩形交互边界；未配置时 Edge 仍为有效端点之间的直线；
- 无 Port Node 使用 node-level Connection Anchor；Port 使用规范边界 Geometry；自环、全图避障、手动控制点、HTML/React 标签、组件生命周期和动画不在当前范围；
- 不提供默认主题、theme registry、组件插槽或 framework adapter；
- 不解释 Interaction 行为，也不提供 Command、拖拽状态机、Selection 写入或持久化；它只显示已接受的语义 Projection；
- 不创建 SVG Target，也不接管调用方已有的 Target 子节点；
- 不作为默认 Renderer，不提供 Registry、默认导出或 Plugin wrapper。

## 验证依据

类型测试锁定具名同步 Factory、Config 与错误入口；Bun 测试覆盖 config 和值语义；真实 Chromium 测试覆盖 SVG/Interaction projection、DOM identity、连续 Commit、Session、Hit Test、screen-to-SVG 坐标转换、ResizeObserver、原生输入 policy、Pointer Capture、lost capture、Focus、Runtime Plugin 组合、Target reservation、回滚与释放。声明产物检查同时保证公共入口不泄漏内部实现。

## 可读连线

`edges` 显式启用新投影。应用同步提供每条 Edge 的路径与可选纯文本标签，不向 Kernel 增加业务字段：

```ts
const renderer = createSvgRenderer({
  target,
  edges: {
    previewPath: 'bezier',
    resolve: (edge) => ({
      path: edge.type === 'sequence' ? 'orthogonal' : 'bezier',
      label: edge.type,
    }),
  },
});
```

`previewPath` 必填：拖线时还没有 Edge，预览不会调用 `resolve` 或提前物化实体。应用负责预览选择与最终 Edge 映射的一致性；最终分道位置在 ID 已知后确定。

Document 更新时捕获并验证应用结果；Session、Viewport、拖动与命中复用已接受的值。标签保留原文本，空串合法，不裁剪或解析 HTML。应用异常保留原身份；非法结果显式失败，DOM/几何接受沿用原子更新与回滚规则。

新模式普通 Endpoint 使用 source 右边界、target 左边界；带 Port 的端点使用真实 Port Geometry。同一无向端点对（包含 Port ID）的平行边按 Edge ID 确定性分道，增删同组 Edge 可使路径重新排布。短距离、反向和节点重叠保持可表示，不保证自动避障或消除遮挡；自环仍拒绝。

每条 Edge 使用一个稳定的 `g[data-nodebraid-edge-id]`，其内为 `path[data-nodebraid-edge-path]`、`path[data-nodebraid-edge-arrow]` 与可选 `text[data-nodebraid-edge-label]`。路径属性值为 `orthogonal` 或 `bezier`；连续提交和路径切换保持外层 identity。新预览是一个 `g[data-nodebraid-connection-preview]`，内含路径与箭头，不含标签。

命中选择容差内最近的路径/箭头，等距时保持逆 ID 优先；Port、Anchor 与 Node 优先级不变。标签是显示内容，不新增文字命中区域。绘制、箭头、标签位置与命中共享已接受的几何，容差仍是 CSS pixels。

省略 `edges` 时保留原 `<line>`、普通端点中心位置与命中顺序。应用继续拥有数据编辑与 codec；Renderer 配置不会自动进入文件，也不要求属性面板或新的编辑 Command。

## 自定义 Node 内容

`SvgRendererConfig.createNodeContent` 根据 `nodeId`、`type`、`size`、不透明 `data` 和 Target 所属 `document` 同步构造新、未挂载的 SVG 内容。应用解释自己的数据并使用 Node 局部坐标；Provider 拥有返回子树与稳定外层、位置、Selection、矩形命中和 Port。此入口不提供组件或事件资源生命周期。

不配置时保留原矩形 DOM。reset 重建内容；普通提交只在新增或 type/size/data 变化时重建。拖动、位置、Selection 与 Viewport 改变保留内容。圆形外观仍使用矩形命中，不自动裁剪。

所有候选内容先构造再修改 live DOM，子树替换也参与回滚。非法输出和原始构造失败显式暴露。Renderer 原子性不能撤销 Runtime 已收到的 Kernel Commit；应用的数据校验应发生在提交前。

独立注册或释放 Port Contribution 时，Runtime 会在同一 Document revision 发送 reset，该路径同样重建全部内容。普通增量中的 Port 几何变化与这种 Port-only reset 不同；现有 Renderer 协议保持不变。
