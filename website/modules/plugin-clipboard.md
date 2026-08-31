---
title: '@nodebraid/plugin-clipboard'
description: 显式 Clipboard Copy/Paste Behavior 与 Shortcut Plugin。
---

# `@nodebraid/plugin-clipboard`

::: warning Package 尚未公开发布
该名称表示当前源码模块边界，不代表可以从 npm 安装。
:::

## 公共 interface

- `copySelectionToClipboardCommand` / `pasteClipboardCommand`；
- `createClipboardPlugin()` / `createClipboardShortcutPlugin()`；
- abort-aware `ClipboardTextTransport`；
- 应用拥有的 `CanvasFragmentTextCodec` 与 fresh-ID materializer；
- `ClipboardError` 稳定区分 transport、codec、Fragment、mapping、target、commit 与 post-Commit Selection failure。

Copy 在 Command 开始时捕获一份 committed Canvas Fragment；edge-only 与空 Selection 不触碰 Clipboard。Paste 异步读取和解码，在提交前验证 Fragment、fresh ID、外部 parent 与当前 Selection，在一个同步 Transaction 中创建全部实体，再选择映射后的原成员。Undo 删除 Paste；Redo 只恢复 Document。

Plugin 不直接访问 `navigator.clipboard`，没有静默内存 fallback，也不提供任意 `unknown` 的通用 JSON codec。Examples Application 的真实浏览器 Adapter 与只接受 `data: null` 的 NodeBraid 专用 envelope 是应用代码，不是框架序列化格式。
