---
title: '@nodebraid/plugin-renderer'
description: 将 Renderer Factory 接入 Kernel 与 Session，并只向 Interaction 暴露窄 Runtime Service。
---

# `@nodebraid/plugin-renderer`

::: warning Package 尚未公开发布
该名称表示当前源码模块边界，不代表可以从 npm 安装。请按 [Quick Start](/guide/quick-start) 从源码验证。
:::

## 解决的问题

Renderer Provider 不应了解 Plugin Host，也不应自行订阅 Kernel、协调 Session 或管理 Runtime cleanup。`@nodebraid/plugin-renderer` 是这两层之间的深 adapter：它为每次 Activation 创建一份 Renderer Instance，建立初始状态，串行协调更新，并把 Interaction 真正需要的能力收口成 `RendererService`。

Document/Session 投影方法和 dispose authority 保持私有。Interaction 只能通过一份排他的 `InteractionProjectionBinding` 更新瞬态语义 Projection。

## 何时使用

- 你已经有一个满足 `RendererFactory<Config>` 的 concrete Provider；
- 你要让 Renderer 跟随 Kernel Commit 与 Session Snapshot；
- Interaction Plugin 需要订阅输入、Hit Test、Pointer Capture、Focus 或发布瞬态 Projection；
- 你需要让 Renderer、订阅与 Target 资源随 Canvas Runtime Activation 清理。

当前官方 concrete Provider 是 [`@nodebraid/renderer-svg`](/modules/renderer-svg)；本模块自身仍只负责 Runtime integration，不绘制可见画布。

## 提供的能力

- `createRendererPlugin(factory)`：把一个显式选择的 Factory 绑定为 Runtime Plugin；
- `rendererService`：Interaction Plugin 的强类型 Required Service token；
- `RendererService`：暴露一份排他的 Interaction Projection Binding，以及 Input、Hit Test、Pointer Capture 与 Focus；
- 初始 Document reset 后再交付当前 Session Snapshot；
- Kernel Commit 与 Session update 的串行、可解析协调；
- 任意内部同步失败的一次当前权威状态 reset+Session recovery；恢复再失败进入 terminal `SYNC_FAILED`；
- Input listener fault 隔离和 Host-scoped diagnostics；
- Activation-owned subscription 与 Renderer Instance cleanup。

## 依赖与组合

生成的 Renderer Runtime Plugin 静态要求 [`KernelService`](/modules/plugin-kernel) 与 [`SessionService`](/modules/plugin-session)，并提供唯一 `rendererService`。它直接依赖 `@nodebraid/renderer-api`、Kernel Plugin、Session Plugin、Diagnostics 与 Plugin Host seam，不依赖 `@nodebraid/core`。

```ts
import { kernelPlugin } from '@nodebraid/plugin-kernel';
import { createRendererPlugin } from '@nodebraid/plugin-renderer';
import { sessionPlugin } from '@nodebraid/plugin-session';
import { createPluginHost } from '@nodebraid/runtime-cordis';

// providerFactory 与 providerConfig 来自应用显式选择的 concrete Provider。
const rendererPlugin = createRendererPlugin(providerFactory);
const host = createPluginHost();
const installations = [
  host.install(kernelPlugin),
  host.install(sessionPlugin),
  host.install(rendererPlugin, providerConfig),
];

await Promise.all(installations.map((installation) => installation.whenActive()));

try {
  // Interaction Plugin 通过 rendererService 使用输入和命中能力。
} finally {
  await host.dispose();
}
```

当前可将 `@nodebraid/renderer-svg` 的 `createSvgRenderer` 作为 `providerFactory`；其他后端仍由应用显式选择并提供。

## 公共入口

```ts
import {
  createRendererPlugin,
  rendererDiagnosticEvents,
  rendererService,
  RendererPluginError,
  type InteractionProjectionBinding,
  type RendererPluginErrorCode,
  type RendererService,
} from '@nodebraid/plugin-renderer';
```

这些入口也由 `@nodebraid/core` 重导出。

## 生命周期与错误语义

Renderer Installation 在 Kernel 或 Session Service 缺失时保持 pending。Activation 会等待 async Factory 返回，立即把 Renderer 登记为 Owned Resource，再建立当前 Document reset 与 Session Snapshot；`whenActive()` 不会在 Renderer 尚未准备好时提前成功。

后续更新经过单一 drain 协调：

- 删除已选实体时，先交付已经协调好的 Session，再交付删除 Commit；
- 选中新实体时，先交付创建它的 Commit，再交付 Session；
- 任意同步 fault 通过 `nodebraid.plugin.renderer.sync.fault` 报告，并且只尝试一次当前 Kernel View reset 加 Session recovery；
- recovery 也失败时保留两条原始错误并进入 `SYNC_FAILED`，停止 Input forwarding，Hit/Focus/Capture/Projection update 都显式拒绝，不循环重试。

`RendererService.subscribeInput()` 隔离 Consumer listener error，并通过 `nodebraid.plugin.renderer.input-listener.fault` 报告；一个 listener 失败不会阻断后续 listener。Service 不公开 `updateDocument`、`updateSession` 或 `dispose`，只有 Binding 拥有瞬态 `updateInteraction` 权限。

Activation 结束时，Runtime 先标记 Service disposed、清空待交付更新，停止 Session、Kernel 与 Input subscriptions，再异步等待 Renderer `dispose()`。旧 Service 调用以 `RendererPluginError` 的 `SERVICE_DISPOSED` 失败。Factory 与 dispose 原始错误保留身份，并参与 Plugin Host 的显式 cleanup failure 聚合。

## 限制与非目标

- 本 package 不实现 concrete Provider；官方 SVG 实现在独立 `@nodebraid/renderer-svg` package 中；
- 不选择默认 Provider，也不提供动态 Factory Registry；
- 不允许 Consumer 更新 Document/Session Renderer 状态或释放实例；只有唯一 Interaction Binding 可更新瞬态 Projection；
- 不解释输入、不修改 Selection、不执行 Command；这些属于 Interaction；
- 不提供 framework component、mount lifecycle、动画或业务视觉；
- 不对非失步的 Provider fault 静默重试或切换后端。

## 验证依据

package tests 使用 contract-compliant recording Renderer 和真实 Plugin Host、Kernel Plugin、Session Plugin，验证每次 Activation 只创建一份实例、初始 reset/session 顺序、删除与重入时的 Session resolvability、输入/Hit Test/Pointer/Focus 委托、listener fault 隔离、失步 reset、queued Commit 吸收、窄 Service surface、Host dispose 与旧 Service 失效。类型测试证明 Runtime Consumer 无法获得 CanvasRenderer 的 update 或 dispose authority。
