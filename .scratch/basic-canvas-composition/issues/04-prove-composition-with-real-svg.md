# 04 — 用真实 SVG 验证 Composition

**What to build:** 让评估 CFlow 的开发者可以运行一个显式 Host、Basic Canvas Composition 与真实 SVG Provider 的 canonical 示例，并在 Chromium 中看到基础编辑、历史与释放闭环。

**Blocked by:** 01 — 建立首个 Basic Canvas Composition 闭环。

**Status:** ready-for-agent

- [ ] 示例显式创建 Host、选择 SVG Renderer Factory、传递 SVG Target config 并安装 sibling Consumer。
- [ ] preset package 不依赖 SVG、DOM 或 native event 类型；具体 Provider 只存在于示例与浏览器验收层。
- [ ] 真实 Chromium 通过 preset 验证 Document 投影与 Selection 或 Node Drag。
- [ ] 同一真实链路验证一个稳定 Commit、History Undo/Redo，以及 Pan 或 Wheel Zoom。
- [ ] Host dispose 后 SVG Projection、监听器、Pointer Capture 与 Target reservation 都完成释放。
