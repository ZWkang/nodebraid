---
title: Execution & History
description: 用强类型 Command 表达行为，并把已提交的 Document 变化接入可撤销 History。
---

# Execution & History

Execution & History 能力族把“发起一个行为”和“记录已经提交的 Document 变化”分开。Command 提供强类型、可取消且受 Activation 生命周期约束的执行入口；History 只观察 Kernel 已经接受的 Canvas Commit，再通过同一条 Command seam 提供 Undo 与 Redo。

这条分层避免了两种常见问题：Command Service 不会变成隐藏的 Service locator，History 也不会绕开 Kernel 维护第二份可写 Document。

## 解决的问题

- 为同步和异步行为提供同一条 Promise-returning 执行 seam；
- 让 Command token 同时携带输入、输出类型和 runtime identity；
- 让 Feature Plugin 显式声明 Kernel、Session 或外部依赖；
- 从真实 Canvas Commit 建立可逆 History Entry，而不是记录按钮点击或 Command 名称；
- 在取消、重入、依赖消失和 Host 清理时保留明确的生命周期结果。

## 何时使用

- 你要把一个应用行为发布为可复用、可取消的强类型 Command；
- 你要让 UI、快捷键或 Interaction 通过同一入口执行行为；
- 你要为 Document Commit 提供 Undo/Redo，并读取稳定的可用性 Snapshot；
- 你需要让 History 自然覆盖直接 Transaction 与 Command-originated Transaction。

如果一次修改只在局部代码内发生、不需要独立行为身份，可以直接使用 Kernel Transaction。Session、Viewport、Renderer 状态和外部副作用不属于当前 History 范围。

## 提供的能力

| 角色             | Package                                            | 交付内容                                                                  |
| ---------------- | -------------------------------------------------- | ------------------------------------------------------------------------- |
| 行为执行         | [`@cflow/plugin-command`](/modules/plugin-command) | Command 定义、Activation-scoped 注册与执行、协作式取消、in-flight cleanup |
| Document History | [`@cflow/plugin-history`](/modules/plugin-history) | Commit 记录、Undo/Redo Command、稳定 History Snapshot、单飞 Replay        |

典型链路如下：

```text
Feature Plugin ──register──▶ Command Service
      │                         │ execute
      │ declared services       ▼
      └────────────────────▶ handler ──Transaction──▶ Kernel Commit
                                                       │ observe
                                                       ▼
                                                  History Entry
                                                       │ undo / redo
                                                       └──Transaction──▶ new Kernel Commit
```

History 记录的是 Change Set，不是 Command。没有 Command metadata 的 Commit 仍可记录；带有 `origin: 'history'` 等诊断 metadata 的普通 Commit 也不会因此被误判为 Replay。

## 依赖与组合

`commandPlugin` 的 Runtime 组合只依赖 CFlow Plugin Host seam，结构化错误使用 Diagnostics；它提供 `CommandService`，不依赖 Kernel、Session、History 或 `@cflow/core`。

`historyPlugin` 静态要求 `KernelService` 与 `CommandService`，并提供 `HistoryService`。缺少任一 Required Service 时，它的 Plugin Installation 保持 pending；`whenActive()` 只有在依赖齐备、Command 注册完成后才结束等待。

应用自己的 Feature Plugin 通过 `requires` 取得所需 Runtime Service，在 Command handler 的闭包中使用它们。Command Service 本身不会动态查找依赖。

## 公共入口

- [`@cflow/plugin-command`](/modules/plugin-command)：定义和托管任意强类型行为；
- [`@cflow/plugin-history`](/modules/plugin-history)：为 Kernel Commit 提供 Document Undo/Redo；
- `@cflow/core`：重导出两者的公共 seam，但内部 package 仍直接依赖所属能力。

当前 package 尚未以 CFlow 项目身份公开发布；请按 [Quick Start](/guide/quick-start) 从源码验证，不要使用 npm 上同名的其他项目 package。

## 生命周期与错误语义

- 每次 Command Activation 都从空注册表开始；每次 History Activation 都从当时的 Kernel revision 建立空 History Baseline；
- caller cancellation 只中止该次 handler 的 signal，最终结果仍由 handler 明确决定；
- Command Registration 释放后立即不可查找，但会取消并等待已经开始的 handler；token 与诊断 ID 在等待期间继续保留；
- History Replay 不继承 Command Service 的并发能力：重叠 Replay 和尚未追平 Kernel 的调用显式失败，不排队到未来状态；
- Required Service 消失会结束相关 Activation。旧 Service handle 显式报错，依赖恢复后建立全新 Activation；
- `host.dispose()` 会等待这些 Owned Resource 完成清理。若 handler 忽略取消且永不结束，清理 Promise 也不会伪造成功或用隐藏超时跳过它。

## 限制与非目标

- 不提供 middleware、权限、Command queue、重试、去重或全局 Command Registry；
- 不提供 History grouping、时间合并、选择性撤销、分支树或旧 revision 回退；
- 不持久化或同步 History，不处理 CRDT 与协作式 Undo；
- 不撤销 Session、Selection、Viewport、Renderer 状态或外部副作用；
- 不提供完整编辑器、默认 Canvas Composition 或 UI adapter。

## 验证依据

Command tests 通过真实 Plugin Host 验证 token identity、输入输出类型、异步结果、handler 原始错误、caller cancellation、Registration disposal、Activation waiting、Provider 重装与 Host cleanup。History tests 通过真实 Kernel、Command 与 History Plugin 组合验证 Baseline、Undo/Redo、分支失效、Snapshot publication、subscriber fault、reentrant Commit、单飞 Replay、取消、Required Service 消失和重新 Activation。
