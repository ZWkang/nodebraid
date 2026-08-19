---
title: '@cflow/plugin-session'
description: 管理本地 Selection 与 Viewport，并与当前 Kernel View 保持一致的 Session Runtime Plugin。
---

# `@cflow/plugin-session`

::: warning Package 尚未公开发布
该名称表示当前源码模块边界，不代表可以从 npm 安装。请按 [Quick Start](/guide/quick-start) 从源码验证。
:::

`@cflow/plugin-session` 为一张活动 Canvas Runtime 提供本地 Session：它不修改 Document，只管理当前 Selection 与 Viewport，并在 Kernel Commit 后移除已经不存在的选择。

::: info 当前状态
已实现，并已由 `@cflow/core` facade 重导出。它依赖当前 Kernel Service，不是独立的全局 UI Store。
:::

## 解决什么问题

Selection 与 Viewport 会频繁变化，但它们不应该进入 Document History、Persistence 或 Collaboration。与此同时，Selection 又必须与当前 Document 保持可解析。Session Plugin 在本地视图状态与权威 Kernel View 之间建立了单向协调边界。

## 适用场景

- 为 Renderer、Interaction 或框架 adapter 提供可订阅的 Selection 与 Viewport。
- 需要在删除 Node/Edge 后自动清理失效 Selection，但不产生第二个 Kernel Commit。
- 需要等价输入保持 Snapshot 引用稳定，适配 React 等 external-store consumer。
- 需要可预测地处理 subscriber 中的重入 Session mutation 或 Kernel Transaction。
- 需要让 Session 随 Kernel Provider 生命周期一起停用并重建。

## 它提供什么

- `sessionPlugin`：静态要求 `kernelService`、提供 `sessionService` 的无配置 Runtime Plugin。
- `sessionService`：强类型 Runtime Service Token。
- `SessionService.getSnapshot()`：读取当前不可变 Session Snapshot。
- `SessionService.subscribe()`：订阅状态转换，listener 通过 `getSnapshot()` 读取当前值。
- `setSelection()` / `clearSelection()`：替换或清空 Selection。
- `setViewport()`：替换并验证 Viewport。
- `SelectionInput`：调用方 mutation 输入；Snapshot 值类型从 `@cflow/session-api` 重导出。
- `SessionError`：稳定的 input、entity、subscriber 与 disposed error code。
- `sessionDiagnosticEvents`：公开 `cflow.plugin.session.subscriber.fault` 事件名。

## 依赖与组合

`sessionPlugin` 的 Plugin Graph 关系是显式的：

```text
kernelPlugin ──provides──▶ kernelService
                                  ▲
                                  │ requires
                            sessionPlugin ──provides──▶ sessionService
```

package 直接依赖 `@cflow/session-api`、`@cflow/kernel`、`@cflow/plugin-kernel`、`@cflow/runtime-cordis` 与 `@cflow/diagnostics`；它不依赖 Command、History、Renderer 或 `@cflow/core`。

## 公共入口

```ts
import { kernelPlugin } from '@cflow/plugin-kernel';
import {
  sessionDiagnosticEvents,
  SessionError,
  sessionPlugin,
  sessionService,
  type SelectionInput,
  type SessionService,
} from '@cflow/plugin-session';
import { createPluginHost, definePlugin } from '@cflow/runtime-cordis';

const consumer = definePlugin({
  requires: { session: sessionService },
  setup(context) {
    const stop = context.services.session.subscribe(() => {
      console.log(context.services.session.getSnapshot());
    });
    context.own(stop);
  },
});

const host = createPluginHost();
try {
  const installations = [host.install(kernelPlugin), host.install(sessionPlugin), host.install(consumer)];
  await Promise.all(installations.map((installation) => installation.whenActive()));
} finally {
  await host.dispose();
}
```

## 状态与生命周期语义

- `sessionPlugin` 在 `kernelService` 可用后激活；每次 Activation 从空 Selection 和 `{ x: 0, y: 0, zoom: 1 }` 开始。
- `setSelection()` 先验证输入形状、去重并按规范 ID 排序，再对当前 Canvas View 验证全部 Node/Edge。存在任一未知实体时整次拒绝，Snapshot 不变。
- Kernel Commit 使用该 Commit 自带的 `after` View 清理失效 ID；它不会再次读取可能已经前进的 Kernel，也不会产生新的 Change Set 或 History entry。
- `setViewport()` 要求 x/y 为有限数值、zoom 为有限正数，并把 `-0` 规范化为 `0`；不静默添加缩放上下限。
- 等价 Selection 或 Viewport 不替换 Snapshot，也不通知 subscriber；只改变一部分时，未变化的子 Snapshot 保持原引用。
- 每次转换固定本轮 subscriber 集合。通知期间的重入 mutation 与 Kernel reconciliation 按 FIFO 广度优先排队，让所有 subscriber 先读取同一 Snapshot，再进入下一轮。
- 每次 `subscribe()` 都拥有独立且幂等的取消函数，即使多个订阅使用同一个 listener。
- subscriber 抛错不会破坏 Session 或阻止后续 subscriber；Fault 交给 Host-scoped diagnostics。
- Kernel Provider 消失时 Session Activation 结束，旧 Service handle 以 `SessionError/SERVICE_DISPOSED` 失败；Kernel 恢复后创建全新的默认 Session。

## 限制与非目标

- Session 不是 Document，不拥有 Node/Edge，也不能绕过 Kernel Transaction 写图。
- Session 状态不进入 History、Persistence 或 Collaboration；新 Activation 不恢复旧 Selection/Viewport。
- 首版 Selection 没有 primary item、选择顺序、preselection、hover 或跨 Document 预选。
- Viewport 不设置产品级 min/max zoom，也不负责设备像素比、Renderer backing store 或坐标转换 helper。
- Service 没有通用 patch/batch update、异步 listener 或生命周期 dispose method；生命周期归 Plugin Host 所有。
- 不包含 Renderer、Interaction、Command、快捷键或工具状态。

## 验证依据

- [公共导出](https://github.com/ZWkang/cflow/blob/main/packages/plugin-session/src/index.ts)确认 Plugin、Service Token、Snapshot type、错误和诊断事件均已发布。
- [Session Runtime 实现](https://github.com/ZWkang/cflow/blob/main/packages/plugin-session/src/session-plugin.ts)包含输入校验、Kernel Commit reconciliation、引用稳定性与广度优先 transition queue。
- [公开 seam 行为测试](https://github.com/ZWkang/cflow/blob/main/packages/plugin-session/tests/index.test.ts)覆盖默认 Session、canonical Selection、Viewport、重入顺序、subscriber fault 与 Provider 恢复。
- ADR-0017、0018、0022 与 0035 固定了 Selection 与 Kernel View 绑定、逻辑屏幕单位、广度优先通知和独立值契约。
