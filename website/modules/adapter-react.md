---
title: '@nodebraid/adapter-react'
description: 将应用 Runtime Factory 绑定到 React Target 生命周期，并投影稳定 Snapshot。
---

# `@nodebraid/adapter-react`

::: warning Package 尚未公开发布
该名称表示当前源码模块边界，不代表可以从 npm 安装。请按 [Quick Start](/guide/quick-start) 从源码验证。
:::

## 解决的问题

`@nodebraid/adapter-react` 把应用提供的 target-specific async Runtime Factory 绑定到 React
callback ref，并用不可变 `pending`、`ready`、`failed` Snapshot 暴露挂载状态。它隐藏
Strict Mode 重放、过期 generation、迟到 Runtime 清理、串行 create/dispose 与最终 cleanup
Failure reporting。

它还提供 `useKernelView()`、`useSessionSnapshot()` 和 `useHistorySnapshot()`，把现有稳定
Runtime Service 通过 `useSyncExternalStore` 投影到 React。Adapter 不选择 Renderer、不创建
Plugin Host、不复制 Document 写入，也不提供产品 UI。

## 公共入口

```tsx
import {
  useHistorySnapshot,
  useKernelView,
  useRuntimeMount,
  useSessionSnapshot,
  type RuntimeMountFailureReporter,
} from '@nodebraid/adapter-react';

const reportFailure: RuntimeMountFailureReporter = ({ error }) => {
  queueMicrotask(() => {
    throw error;
  });
};

function Canvas() {
  const mount = useRuntimeMount(createApplicationRuntime, reportFailure);

  return (
    <>
      <svg ref={mount.ref} />
      {mount.snapshot.status === 'ready' ? <RuntimeView runtime={mount.snapshot.runtime} /> : null}
    </>
  );
}

function RuntimeView({ runtime }: { runtime: ApplicationRuntime }) {
  const view = useKernelView(runtime.kernel);
  const session = useSessionSnapshot(runtime.session);
  const history = useHistorySnapshot(runtime.history);
  return <output>{`${view.snapshot.revision}:${session.viewport.zoom}:${history.canUndo}`}</output>;
}
```

Runtime Factory identity 必须稳定；改变 Factory 或 Target identity 表示显式 remount/retry。
`ready.runtime` 的生命周期归 Adapter 所有，consumer 不应自行调用 `dispose()`。
`mount.ref` 同时只能绑定一个 live Target；第二个 Target 会显式失败。

## 生命周期与失败

- 后继 Factory 必须等待前一 Factory 与返回 Runtime 的异步 dispose 收口；
- 过期 Factory 返回的 Runtime 不会发布，并会释放一次；
- 当前 Factory reject 发布 `failed`，保留原始 error identity，并交给必填 Reporter；
- dispose reject 同样保留 identity，并终止该 Hook instance 的后续资源获取；
- React 不会等待 effect cleanup，所以确定性表示 exactly-once ownership 与严格顺序，不表示 component unmount 返回 Promise；
- Factory reject 前的部分初始化资源仍由 Factory 自己回滚。

v0 只验证 React 19 client rendering。Snapshot Hooks 不提供 `getServerSnapshot`；SSR 会
显式失败，不会把 live getter 猜成 hydration Snapshot。

## 限制与非目标

- 不提供 Provider、Context、selector 或 optional Snapshot；
- 不提供 React Node Component、Renderer JSX、Toolbar、Panel、Minimap 或产品 UI；
- 不提供 controlled Document、写入代理、Tool Registry、Serialization 或 Persistence；
- 不依赖 DOM、具体 Renderer Provider、Cordis implementation 或 `@nodebraid/core` facade；
- 不预先抽取 React/Vue 公共 Interface，Vue Adapter 仍未实现。

## 验证依据

Package 类型与声明检查锁定公共入口和依赖方向。真实 Chromium public-seam 测试覆盖 Strict
Mode、pending Factory 竞态取消、迟到 Runtime dispose、ready remount 顺序、create/dispose
Failure identity、cleanup 后阻断，以及 Kernel、Session、History Snapshot 更新与退订。Basic
SVG Example 通过本 package 工作，并验证同一 SVG Target 上旧 projection 清理后才建立新
Runtime，以及 Factory failure 同时进入 UI 与 Reporter。
