---
title: '@nodebraid/plugin-kernel'
description: 把纯 Kernel 作为窄 Runtime Service 提供，并按 revision 有序传播 Canvas Commit。
---

# `@nodebraid/plugin-kernel`

::: warning Package 尚未公开发布
该名称表示当前源码模块边界，不代表可以从 npm 安装。请按 [Quick Start](/guide/quick-start) 从源码验证。
:::

`@nodebraid/plugin-kernel` 是已经交付的 Kernel Runtime adapter。它为每次 Plugin Activation 创建一份独立 Kernel，并让其他 Plugin 只通过 `KernelService` 使用权威 Document。

::: info 当前状态
已实现，并已由 `@nodebraid/core` facade 重导出。它不是未来占位模块，也不会把裸 `CanvasKernel` 暴露给 Runtime Consumer。
:::

## 解决什么问题

纯 Kernel 不应该知道 Plugin Host，但 Canvas Runtime 又需要管理 Kernel 的创建、服务发布、依赖撤销与 Commit propagation。这个 adapter 把生命周期和观察职责放在 Kernel 之外，同时保持 Runtime Consumer 的接口足够窄。

## 适用场景

- 创建一张由 Plugin Host 隔离的活动画布。
- 让 Feature Plugin 通过静态 Required Service 读取或修改 Document。
- 让 Session、History、Layout 或 Renderer Runtime Plugin 按 revision 接收完整 Canvas Commit。
- 在 Kernel Provider 消失时先停用 Consumer，再关闭旧 Service handle。
- 需要隔离 Observer failure，而不回滚已经成功的 Kernel Transaction。

## 它提供什么

- `kernelPlugin`：无配置的官方 Runtime Plugin，提供 `kernelService`。
- `kernelService`：强类型 Service Token，供 Consumer 在 `requires` 中声明依赖。
- `KernelService.read()`：读取当前 revision-bound Canvas View。
- `KernelService.transact()`：执行同步 Transaction，返回 `CanvasCommit | null`。
- `KernelService.observeCommits()`：同步观察成功且有净变化的 Commit，返回取消函数。
- `KernelPluginError`：旧 Service handle 的稳定 `SERVICE_DISPOSED` 错误。
- `kernelPluginDiagnosticEvents`：公开稳定的 `nodebraid.plugin.kernel.observer.fault` 事件名。

## 依赖与组合

`@nodebraid/plugin-kernel` 直接依赖：

- `@nodebraid/kernel`：创建并操作纯 Kernel。
- `@nodebraid/runtime-cordis`：NodeBraid-owned Plugin Host、Service Token 与 Activation seam。
- `@nodebraid/diagnostics`：Observer fault 的共享诊断契约。

它不依赖 `@nodebraid/core`。Consumer 通过局部 Service Binding 获取 `KernelService`；[`@nodebraid/plugin-session`](/modules/plugin-session) 就是一个静态依赖 `kernelService` 的官方 Consumer。

## 公共入口

```ts
import {
  kernelPlugin,
  kernelPluginDiagnosticEvents,
  KernelPluginError,
  kernelService,
  type CommitObserver,
  type KernelService,
} from '@nodebraid/plugin-kernel';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

const consumer = definePlugin({
  requires: { kernel: kernelService },
  setup(context) {
    const stop = context.services.kernel.observeCommits((commit) => {
      console.log(commit.changeSet.revision);
    });
    context.own(stop);
  },
});

const host = createPluginHost();
try {
  const installations = [host.install(kernelPlugin), host.install(consumer)];
  await Promise.all(installations.map((installation) => installation.whenActive()));
} finally {
  await host.dispose();
}
```

## 状态与生命周期语义

- `kernelPlugin` 没有 Required Service，也不接受配置；每次 Activation 创建新的 revision 0 Kernel。
- `KernelService` 的生命周期等于当前 Activation，生命周期释放权属于 Plugin Host，不属于 Service Consumer。
- 只有成功且有净变化的 Transaction 才会进入 Observer；失败与净零 Transaction 不发布 Commit。
- Commit 按本地 revision 同步有序交付。Observer 在处理 revision N 时触发的新 Transaction 会先排队，确保所有当前 Observer 先看到 N，再看到 N+1。
- 一个 Observer 抛错不会回滚 Kernel、阻止后续 Observer 或截断 Commit queue；Fault 会交给 Host-scoped diagnostics，并携带 commit revision。
- Activation 结束时 Observer 被清空，旧 Service 的 `read()`、`transact()` 与 `observeCommits()` 都以 `KernelPluginError/SERVICE_DISPOSED` 失败。
- 新 Kernel Installation 会产生新 Service 与全新 revision 0 Document，不继承旧 Activation 的图状态。

## 限制与非目标

- 不暴露底层 `CanvasKernel`，也没有动态 Service lookup。
- 不提供异步 Transaction、Commit buffer replay、事件持久化或跨 Runtime 广播。
- Observer 不是 History、领域事件总线或远程同步协议；它传播的是本地完整 Canvas Commit evidence。
- Observer failure 只做诊断与 Fault reporting，不会被吞掉为“成功”，也不会改变已提交状态。
- 不安装 Session、Command、History、Layout 或 Renderer；Canvas Composition 必须显式选择这些 Plugin。

## 验证依据

- [公共导出](https://github.com/ZWkang/nodebraid/blob/main/packages/plugin-kernel/src/index.ts)确认当前模块已真实提供 Plugin、Service Token、错误与诊断事件。
- [Runtime 实现](https://github.com/ZWkang/nodebraid/blob/main/packages/plugin-kernel/src/kernel-plugin.ts)显示每次 Activation 创建纯 Kernel，并在 adapter 内拥有 Commit queue 与 Observer。
- [公开 seam 行为测试](https://github.com/ZWkang/nodebraid/blob/main/packages/plugin-kernel/tests/index.test.ts)覆盖 revision-zero Service、净变化过滤、重入顺序、Observer fault 与依赖恢复后的新 Kernel。
- ADR-0013 明确 `@nodebraid/plugin-kernel` 是已经选定的窄 Kernel Runtime Service seam。
