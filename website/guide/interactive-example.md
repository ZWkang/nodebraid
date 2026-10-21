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

打开终端输出的 `/basic-svg` 地址，即可体验 Selection、Box Selection、真实 Clipboard Ctrl/Cmd+C / Ctrl/Cmd+V、Ctrl/Cmd+D Duplicate、Node Drag、Pan、Zoom、Port-aware Edge Connection、手动自动布局、Undo、Redo、Fit View 与完整 Runtime Reset。

示例只依赖 `@nodebraid/adapter-react`、`@nodebraid/core` 和显式选择的 `@nodebraid/renderer-svg`、`@nodebraid/layout-dagre` 公共入口。React Adapter 拥有 Runtime mount/remount 与稳定 Snapshot projection；应用继续拥有 Runtime Factory、Toolbar 和 Clipboard 状态。当前示例暂不独立部署；本页始终提供有效的能力说明和本地启动入口。

## 手动自动布局

工具栏提供一个“自动布局”（Auto layout）按钮。应用显式选择 Dagre，以 `full` 模式、`LR` 方向和空 Fixed Node 集合排列整张 Canvas，其余参数使用 Provider 的公开默认值。框架同时支持 Dagre 与 ELK 的带 Port 图节点拓扑布局；此示例只选择 Dagre，没有算法或方向选择器。

可以先选择 Node，并通过 Pan、Zoom 调整视野，再点击按钮。布局只改变 Node position，保留 Selection、Viewport、原 Edge 与 Endpoint `portId`；Port 跟随 Node 移动，连线仍连接原 Port，移动后的 Port 仍可用于新建连线。布局不会自动 Fit View，需要时可单独点击 Fit View。

![Basic SVG 手动布局后的 Node、Port 与原有连线](/examples/basic-svg-layout.png)

截图在手动布局后额外点击了独立的 Fit View 按钮，以展示完整图形；布局本身保持 Viewport。图中展示 Node 排列及仍连接原 Port 的 Edge。算法只处理 Node 拓扑；Port Geometry 继续由 SVG Renderer 投影，不提供 Port 方位、顺序或几何参与算法的 Port-aware Layout。

一次有净变化的布局对应一次 History Entry：先用一次 Undo 恢复布局前位置，再用一次 Redo 恢复布局后位置。再次执行相同确定性布局时，无净变化不会增加 revision 或历史；后续新建连线会产生自己的 History Entry。

页面初始化和拖动、连线、复制粘贴等普通编辑都不会自动重排。按钮沿用已有 Command 执行和错误卡片；失败会明确显示，不自动排队或重试，由使用者决定是否重新触发。
