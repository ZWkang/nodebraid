---
title: Interactive Example
description: 在本地启动完整的 NodeBraid Basic SVG 开发者参考应用。
---

# Interactive Example

NodeBraid 的私有 Examples Application 使用 React、TanStack Router、shadcn 与 Base UI 展示 Basic Canvas Composition 的真实公共 interface。它不是产品级编辑器，也不会作为 npm package 发布。

## 本地启动

```bash
bun install
bun run example:dev
```

打开终端输出的 `/basic-svg` 地址，即可体验 Selection、Box Selection、Node Drag、Pan、Zoom、Edge Connection、Undo、Redo、Fit View 与完整 Runtime Reset。

示例只依赖 `@nodebraid/core` 和显式选择的 `@nodebraid/renderer-svg` 公共入口。当前示例暂不独立部署；本页始终提供有效的能力说明和本地启动入口。
