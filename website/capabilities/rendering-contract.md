---
title: Rendering Contract
description: 用 backend-neutral Renderer 协议连接 Document、Session 与 Interaction，而不把后端对象带入 CFlow 核心。
---

# Rendering Contract

Rendering Contract 能力族定义“怎样把 CFlow Canvas 语义交给渲染后端”，以及“怎样把后端输入还原为 CFlow 值”。它刻意不选择 SVG、Canvas2D、Konva、Pixi 或任何默认实现：应用持有 concrete Renderer Factory，Runtime adapter 只负责状态同步和生命周期。

::: info SVG Renderer Provider 已交付
`@cflow/renderer-svg` 是当前首个参考级官方 Provider：它把通用矩形 Node、直线 Edge、Selection、Viewport 与标准化输入投影到调用方已有的 SVG Target。它不是默认 Renderer，也不解释产品 Node type 或 data。
:::

## 解决的问题

- 避免 Kernel、Session 与 Interaction 依赖 DOM、原生事件或某个绘图库；
- 让具体 Provider 接收完整 Canvas 语义，而不是泄漏通用绘图指令；
- 让 Document reset/commit、Session Snapshot 和输入事件保持清晰的独立契约；
- 把 Renderer Instance、订阅和 Target cleanup 归入 Plugin Activation；
- 在 revision 失步时显式诊断，并从权威 Kernel 状态恢复基线。

## 何时使用

- 你正在实现 CFlow 的 Renderer Provider；
- 你需要使用当前官方 SVG Provider 投影通用 Canvas 语义；
- 你要把一个已有 Renderer Factory 接入 Canvas Runtime；
- 你的 Interaction Plugin 需要订阅标准化输入、Hit Test、Pointer Capture 或 Focus；
- 你在评估 CFlow 与具体渲染后端之间的责任边界。

如果 SVG 的通用 Geometry 与 DOM seam 满足需求，可以直接选择 `@cflow/renderer-svg`；产品节点视觉、Interaction 与 framework adapter 仍由应用显式提供。

## 提供的能力

| 角色                | Package                                              | 交付内容                                                                               |
| ------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Provider contract   | [`@cflow/renderer-api`](/modules/renderer-api)       | `CanvasRenderer`、Factory、Document/Session 更新、标准化输入、Hit Result 与结构化错误  |
| Runtime integration | [`@cflow/plugin-renderer`](/modules/plugin-renderer) | 将 Factory 绑定为 Plugin，协调 Kernel/Session，向 Interaction 暴露窄 `RendererService` |
| SVG Provider        | [`@cflow/renderer-svg`](/modules/renderer-svg)       | 将通用 Canvas Geometry、Session 与浏览器输入投影到现有 `SVGSVGElement`                 |

```text
Kernel Commit ───────────────┐
                             │ ordered + resolvable delivery
Session Snapshot ────────────┼────────▶ CanvasRenderer ─────▶ concrete Target
                             │                 │
Interaction ◀── RendererService ◀── normalized Input / Hit Result
```

Renderer 没有 Document、Session 或 Command 写权。它只投影状态并报告输入事实；真正的行为解释和状态变化属于 Interaction 或其他 Feature Plugin。

## 依赖与组合

`@cflow/renderer-api` 只依赖 CFlow 的 Kernel、Session value contract 与 Diagnostics，不依赖 Plugin Host、具体后端或框架。

`@cflow/plugin-renderer` 静态要求 `KernelService` 与 `SessionService`。应用从 concrete Provider 获得 `RendererFactory<Config>`，调用 `createRendererPlugin(factory)` 生成一个普通 Runtime Plugin，再用 Provider-specific config 安装。CFlow 不提供 Factory Registry 或默认 Provider。

`@cflow/renderer-svg` 只依赖 Renderer API 及其值契约，不依赖 Plugin Host；应用可以直接使用 Factory，也可以通过 Renderer Plugin 接入 Runtime。

## 公共入口

- [`@cflow/renderer-api`](/modules/renderer-api)：Provider 作者与 Runtime adapter 共享的 backend-neutral contract；
- [`@cflow/plugin-renderer`](/modules/plugin-renderer)：把已选择的 Factory 接入 Plugin Host；
- [`@cflow/renderer-svg`](/modules/renderer-svg)：当前官方 SVG Factory、Config 与 Provider-specific error；
- `@cflow/core`：重导出两者，但不会带入任何 concrete Provider。

当前 package 尚未以 CFlow 项目身份公开发布；请从源码验证，不要使用 npm 上同名的其他项目 package。

## 生命周期与错误语义

- Renderer Factory 为一个固定 Target 创建一份 Renderer Instance；公共 interface 没有 mount、unmount 或 remount；
- Renderer Plugin 在 Required Services 出现前保持 pending，并等待异步 Factory、初始 Document reset 与 Session delivery 后才完成 Activation；
- 后续 Commit 必须与 Renderer Baseline 连续。失步进入 Host diagnostics，并由 Runtime adapter 读取当前 Kernel View 执行明确 reset；
- Session 与 Document 虽通过两条通道变化，Runtime adapter 保证每次交付的 Selection 都能被当时 Renderer Document 解析；
- Activation 结束时先停止 Kernel、Session 与 Input 订阅，再异步等待 Renderer `dispose()`；旧 `RendererService` 明确失败；
- Factory、投影和 dispose 的原始失败不会被改写成成功。Host cleanup 会继续释放其他 Owned Resource，并显式聚合 cleanup failure。

## 限制与非目标

- 当前 concrete Provider 只有参考级 SVG 实现；没有 Canvas2D、WebGL、Konva、Pixi 或 framework adapter；
- 不提供默认 Provider、动态 Registry 或 universal `HTMLElement` mount；
- Renderer 不修改 Document、Session，也不直接执行 Command；
- 首版输入只包含 Pointer、Wheel 与 Keyboard，不包含原生事件或 backend target；
- Hit Result 只描述 Canvas、Node、Edge 或 Port，不暴露 scene object、z-order 或任意 detail；
- 不定义 Node 业务视觉、Interaction 行为、动画、文本编辑或完整画布产品。

## 验证依据

Renderer API tests 锁定 backend-neutral 类型、Factory config、Document/Session update authority 与结构化错误。Renderer Plugin tests 通过 recording Provider 验证初始 reset、Session 可解析顺序、输入与控制委托、listener fault 隔离、失步 reset、窄 Service surface 与 dispose。SVG Provider 进一步通过真实 Chromium 验证 SVG projection、坐标映射、原生输入、Hit Test、Pointer Capture、Focus、回滚与 terminal disposal。
