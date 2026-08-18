# CFlow Kernel Runtime Plugin

**Status:** ready-for-agent

## Problem Statement

`@cflow/kernel` 已经提供纯进程内、可逆的 Document 与 Transaction seam，`@cflow/runtime-cordis` 已经提供 CFlow-owned Plugin Host seam，但两者尚未组合成 Canvas Runtime 能力。若 Consumer 直接获得裸 `CanvasKernel`，提交传播、Observer 错误隔离、重入顺序与生命周期释放都会扩散到每个调用方，并可能反向污染纯 Kernel。

## Solution

新增独立发布包 `@cflow/plugin-kernel`。它导出一个 `kernelService` Service Token、一个 `kernelPlugin` 官方 Plugin，以及窄 `KernelService` interface。每次 Plugin Activation 创建一份新的空 revision-zero Kernel；Service 只提供 `read`、同步 `transact` 和 `observeCommits`，不公开裸 `CanvasKernel`、Document、Cordis 类型或内部 Dispatcher。

`transact` 先通过真实 Kernel 同步完成提交。只有返回非空 `CanvasCommit` 时才进入同步分发队列。Dispatcher 按 revision 与 Transaction 完成顺序逐个通知当前 Observer；Observer 内再次 `transact` 产生的后续 Commit 只入队，等所有 Observer 看完当前 revision 后再分发。一个 Observer 抛错不回滚已提交状态，也不阻断其他 Observer；错误沿用 Runtime 既有平台报告语义，通过 `globalThis.reportError` 报告，平台 reporter 自身失败或不存在时在 microtask 中显式抛出。

Plugin Activation 结束时，Plugin Host 先停用依赖该 Service 的 Consumer，再运行 Kernel Plugin 的 Owned Resource disposer。disposer 关闭旧 Service 并清空全部 Observer；旧 Service 后续调用显式失败。同一 Plugin 在释放后重新安装会创建没有继承状态或 Observer 的全新 revision-zero Kernel。

## Interface Decisions

- `KernelService.read(): CanvasView` 返回底层 Kernel 当前 revision-bound View。
- `KernelService.transact(callback, metadata?): CanvasCommit | null` 只接受同步 Transaction，并保留 Kernel 的错误与返回语义。
- `KernelService.observeCommits(observer): () => void` 注册当前 Activation 的 Commit Observer，并返回幂等取消函数。
- `kernelService` 是 `defineService<KernelService>()` 创建的唯一官方 Service Token。
- `kernelPlugin` 无配置、无 Required Service，只提供绑定名 `kernel` 的 `kernelService`。
- Service dispose 后，`read`、`transact` 与 `observeCommits` 抛出带稳定 code 的 `KernelPluginError`。
- Observer 集合、Commit 队列、分发标志和底层 CanvasKernel 都属于 adapter implementation，不进入 interface。
- `@cflow/plugin-kernel` 依赖 `@cflow/kernel` 和 `@cflow/runtime-cordis`，不依赖 `@cflow/core`；`@cflow/kernel` 的依赖方向不变。
- `@cflow/core` 重导出 Plugin 的公共 interface，但内部包不通过 core 相互调用。

## Behavioral Requirements

1. 每次 Activation 提供一份新的空 revision-zero Kernel Service。
2. Consumer 只能通过公开 KernelService/PluginHost seam 读取和提交。
3. Transaction 抛错、Kernel 校验失败与净零 Transaction 均不通知 Observer。
4. 成功且有净变化的 Transaction 恰好分发其返回的 CanvasCommit。
5. Commit 在 `transact` 返回前同步完成分发。
6. Observer 按注册顺序接收同一 Commit；Observer 抛错不阻断后续 Observer。
7. Observer 错误在提交完成后显式报告，不改变 revision 或 transact 的 commit 结果。
8. Observer 重入产生的 Commit 排在当前 Commit 之后；所有 Observer 先看到 N，再看到 N+1。
9. 取消订阅幂等，Plugin dispose 清空仍存在的 Observer。
10. Provider dispose 时 Required Service Consumer 先停用；重新安装产生全新 revision-zero Service。
11. 生成声明不得泄漏 Cordis 类型，也不得让 Kernel 反向依赖 Runtime、Plugin 或 core。

## Testing Decisions

- 行为测试只通过 `createPluginHost()`、`kernelPlugin`、`kernelService` 与 Consumer Plugin 使用 `KernelService`。
- 使用真实 `@cflow/kernel` 与真实 `@cflow/runtime-cordis`，不 mock 内部 Dispatcher、Kernel 或 Cordis。
- 每个 vertical slice 遵循 red → green；core 只保留 package-name import 与重导出 smoke test。
- 类型测试覆盖 Service Token 的 KernelService 类型、同步 transact 参数和只读 Kernel 类型。
- 声明检查覆盖 Cordis/core 泄漏，包级与全仓验证覆盖 test、typecheck、build、pack 和 diff check。

## Out of Scope

- Command、Command Registry、Session、Renderer、History、Persistence 与 Canvas Composition。
- 初始 Document、Snapshot hydration、Serialized Document、导入或恢复 revision。
- 异步 Transaction、异步 Observer、RxJS Observable、Commit replay orchestration。
- 多 Kernel Service、Service Token 配置、可选 Runtime、plugin-api 包。
- Observer 重试、错误吞没、自动移除失败 Observer、事务回滚或补偿。
