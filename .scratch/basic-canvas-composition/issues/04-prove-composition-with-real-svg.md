# 04 — 用真实 SVG 验证 Composition

**What to build:** 让评估 NodeBraid 的开发者可以运行一个显式 Host、Basic Canvas Composition 与真实 SVG Provider 的 canonical 示例，并在 Chromium 中看到基础编辑、历史与释放闭环。

**Blocked by:** 01 — 建立首个 Basic Canvas Composition 闭环。

**Status:** resolved

- [x] 示例显式创建 Host、选择 SVG Renderer Factory、传递 SVG Target config 并安装 sibling Consumer。
- [x] preset package 不依赖 SVG、DOM 或 native event 类型；具体 Provider 只存在于示例与浏览器验收层。
- [x] 真实 Chromium 通过 preset 验证 Document 投影与 Selection 或 Node Drag。
- [x] 同一真实链路验证一个稳定 Commit、History Undo/Redo，以及 Pan 或 Wheel Zoom。
- [x] Host dispose 后 SVG Projection、监听器、Pointer Capture 与 Target reservation 都完成释放。

## Answer

canonical browser example 现显式创建 Plugin Host、选择 `createSvgRenderer`、安装 Basic Canvas Composition 与静态 Service Consumer，并建立两个 Node 和一条 Edge。真实 Chromium 已通过 package-name preset seam 验证 SVG 投影、Selection、Move Nodes Commit、History Undo/Redo、由真实 Wheel Input 驱动的 zoom=2、Host dispose 后 Projection 移除，以及同一 SVG Target reservation 可重新获取。browser gate 也会先构建 Renderer SVG 自身，避免 package-name example 读取 stale dist。
