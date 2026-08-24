---
title: '@nodebraid/plugin-history'
description: 从 Kernel Commit 建立 Activation-scoped Document History，并通过 Command 执行 Undo/Redo。
---

# `@nodebraid/plugin-history`

::: warning Package 尚未公开发布
该名称表示当前源码模块边界，不代表可以从 npm 安装。请按 [Quick Start](/guide/quick-start) 从源码验证。
:::

## 解决的问题

Kernel 已能原子提交和反向应用 Change Set，但它不决定哪些变化进入 History、Redo 何时失效，也不提供 UI 可读取的 Undo/Redo 可用性。`@nodebraid/plugin-history` 在 Runtime 层观察 Canvas Commit，为当前 Activation 建立 History Entry，并通过现有 Command Service 执行 Replay。

History 不复制 Document，也不恢复旧 revision。Undo 和 Redo 都是新的 Kernel Transaction，因此 revision 继续单调递增，所有 Kernel 校验与 Commit observer 仍然生效。

## 何时使用

- 你要为 Document Node/Edge 变化提供标准 Undo/Redo；
- 你希望直接 Transaction 与 Command-originated Transaction 采用相同记录规则；
- UI adapter 需要订阅稳定的 `{ canUndo, canRedo }`；
- 你需要在重入 Commit、并发 Replay 或 Required Service 变化时保持明确结果。

如果你要撤销 Selection、Viewport、Renderer 状态、外部网络请求或协作式 CRDT 操作，当前模块不适用。

## 提供的能力

- `historyPlugin`：观察 Kernel Commit，并为每次 Activation 拥有独立 undo/redo entries；
- `historyService`：提供稳定 `HistorySnapshot` 与 future-change subscription；
- `undoCommand` / `redoCommand`：输入为 `void`、输出为实际 Replay `CanvasCommit`；
- 新 Recordable Commit 自动清空 redo；
- Replay Commit 不增生新的 History Entry；
- 单飞 Replay 与 Kernel catch-up 防护；
- `HistoryError` 与 subscriber fault diagnostics。

History Entry 只保存源 Commit 的 Change Set。`origin` 和 `commandId` 是诊断 metadata，不决定一个普通 Commit 是否可记录。

## 依赖与组合

`historyPlugin` 静态要求 [`KernelService`](/modules/plugin-kernel) 与 [`CommandService`](/modules/plugin-command)，并提供一份 `HistoryService`。典型 Canvas Runtime 显式安装三个 Provider：

```ts
import { commandPlugin } from '@nodebraid/plugin-command';
import { historyPlugin } from '@nodebraid/plugin-history';
import { kernelPlugin } from '@nodebraid/plugin-kernel';
import { createPluginHost } from '@nodebraid/runtime-cordis';

const host = createPluginHost();
const installations = [host.install(kernelPlugin), host.install(commandPlugin), host.install(historyPlugin)];

await Promise.all(installations.map((installation) => installation.whenActive()));

try {
  // Consumer Plugin 通过 Required Services 读取 Snapshot，并执行 undoCommand / redoCommand。
} finally {
  await host.dispose();
}
```

History Installation 在 Kernel 或 Command Service 缺失时保持 pending。它不会偷偷创建缺失依赖，也没有默认 Canvas Composition。

## 公共入口

```ts
import {
  historyDiagnosticEvents,
  historyPlugin,
  historyService,
  redoCommand,
  undoCommand,
  HistoryError,
  type HistoryErrorCode,
  type HistoryService,
  type HistorySnapshot,
} from '@nodebraid/plugin-history';
```

这些入口也由 `@nodebraid/core` 重导出。

## 生命周期与错误语义

Activation 建立时，History 读取一次当前 Kernel revision 作为 Baseline；Baseline 以前的 Commit 不会被猜测或补录。公开 Snapshot 只在 History 已观察到 Kernel 当前 revision 时替换并通知，因此 subscriber 不会看到已知过期的 Undo/Redo 可用性。

Replay 只在 History 已追平 Kernel 且没有其他 Replay 时开始。请求不会排队：延后执行可能作用于另一个栈顶，模块选择显式失败。调用方 signal 在 Transaction 前检查；一旦 Replay 已真实提交，晚到取消不会伪造失败或补偿已经发生的 Commit。

失去 Kernel 或 Command Service 会立即结束当前 Activation：旧 Service 失效、Command 被注销、Kernel observer 与 subscriber 被释放、Entry 引用被清空。依赖恢复后，新 Activation 从当时 Kernel revision 建立全新空 Baseline，不继承旧栈。`host.dispose()` 会等待 Command registration 与其他 Owned Resource 清理完成。

| Code                    | 触发条件                                  |
| ----------------------- | ----------------------------------------- |
| `UNDO_EMPTY`            | 当前没有可撤销 History Entry              |
| `REDO_EMPTY`            | 当前没有可重做 History Entry              |
| `HISTORY_BUSY`          | 另一个 Replay 尚未完成                    |
| `HISTORY_NOT_CAUGHT_UP` | History 尚未观察到 Kernel 当前 revision   |
| `SERVICE_DISPOSED`      | 旧 History Service 所属 Activation 已结束 |

Kernel replay error 保持原始身份，不会被包装为 History 成功。subscriber 抛错通过 `nodebraid.plugin.history.subscriber.fault` 进入 Host-scoped diagnostics，不阻断后续 subscriber，也不改变 Snapshot。

## 限制与非目标

- 不公开 History Entry、栈深度、标签、时间戳或跳转接口；
- 不支持 grouping、merge window、选择性撤销或 branching timeline；
- 不持久化、序列化、水合或跨 Activation 迁移 History；
- 不处理协作式 Undo、CRDT 或远端 Commit authority；
- 不记录 net-zero 或失败 Transaction，因为它们没有 Canvas Commit；
- 不撤销 Session、Selection、Viewport、Renderer 或外部副作用。

## 验证依据

package tests 通过真实 Plugin Host、Kernel Plugin 与 Command Plugin 验证非零 Baseline、首个 Recordable Commit、Undo/Redo 返回值、revision metadata、Redo 分支失效、空栈错误、Snapshot identity、subscriber fault、observer 重入、catch-up publication、单飞 Replay、取消、已提交 Replay 的收口、Kernel/Command Provider 消失与全新 Activation。类型测试锁定只读 Snapshot、窄 Service surface 与 `void -> CanvasCommit` Command 类型。
