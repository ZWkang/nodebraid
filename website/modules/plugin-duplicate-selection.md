---
title: '@nodebraid/plugin-duplicate-selection'
description: 独立、可撤销的 Duplicate Selection Behavior 与 Shortcut Binding Plugin。
---

# `@nodebraid/plugin-duplicate-selection`

::: warning Package 尚未公开发布
该名称表示当前源码模块边界，不代表可以从 npm 安装。
:::

## 解决的问题

Duplicate Selection 不应让应用复制 Kernel 实体、猜测 Edge 闭包或维护第二套 Selection 状态。该 package 把完整稳定行为收进一个深 Module，同时让应用继续拥有新 NodeId 与 EdgeId。

## 公共 Interface

- `duplicateSelectionCommand`：无输入 `selection.duplicate` Command，返回 `CanvasCommit | null`；
- `createDuplicateSelectionPlugin()`：安装独立 Behavior Plugin；
- `createDuplicateSelectionShortcutPlugin()`：独立贡献 focused Ctrl/Cmd+D；
- `DuplicateIdMaterializer`：一次同步返回完整 Node/Edge ID mapping；
- `DuplicateSelectionError`：`INVALID_CONFIG | INVALID_MATERIALIZATION | STALE_DUPLICATE | SELECTION_UPDATE_FAILED`。

Behavior 复制精确选中的 Node 与其内部 Edge。Node 保留 type、size 与 opaque data 引用，默认增加 `{ x: 24, y: 24 }` world offset；selected parent、port-qualified Endpoint、self-loop 与 parallel Edge都一一重映射。跨边界 Edge、edge-only Selection 与未选择 descendants 不会扩张复制范围。

应用只负责 ID。NodeBraid 验证完整一一映射、exact-root/ABA evidence 和内部 Edge 闭包，在一个同步 Transaction 中创建全部副本，再把原 Selection 成员映射到副本。Undo 删除副本并清空失效 Selection；Redo 恢复 Document 但不重选。

Shortcut Plugin 不订阅 Renderer。它通过 [`@nodebraid/plugin-interaction`](/modules/plugin-interaction) 的单一 authority 注册 Binding；Behavior 缺失时 Mod+D 形成明确 capability-unavailable Input Rejection。

## 非目标

不包含 Clipboard、Copy/Paste、Serialization、Persistence、deep clone、业务实体 factory、跨 Canvas、async Transaction、协同 Duplicate、Canvas Fragment 或 Tool Registry。
