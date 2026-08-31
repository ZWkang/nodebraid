---
title: '@nodebraid/canvas-fragment'
description: Duplicate 与 Clipboard 共用的纯内存 Canvas Fragment 值契约。
---

# `@nodebraid/canvas-fragment`

::: warning Package 尚未公开发布
该名称表示当前源码模块边界，不代表可以从 npm 安装。
:::

Canvas Fragment 是一份不可变、规范排序的 selected-Node induced subgraph：包含全部选中 Node、这些 Node 之间的 Edge 闭包，以及原 Selection 中显式 Edge 成员。它保留 nested parent、port-qualified Endpoint、self-loop、parallel Edge 与 opaque `data` 引用。

公共 interface 只包含 `captureCanvasFragment()`、`acceptCanvasFragment()`、`materializeCanvasFragment()`、值类型与结构化错误。该 package 不依赖 Runtime、Renderer、React、浏览器或 Cordis。

Canvas Fragment 不是 Serialized Document。它没有持久化 schema version、文本 envelope、deep clone、通用 JSON codec 或跨版本兼容承诺；具体文本表示由应用拥有。
