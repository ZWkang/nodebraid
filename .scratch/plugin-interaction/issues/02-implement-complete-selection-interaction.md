# 02 — 实现完整 Selection 交互

**What to build:** 让用户在真实 SVG Canvas 中通过 Pointer Input 与 Hit Result 完成 Node、Edge 和 Canvas 的 plain/additive Selection，并建立可供后续 Drag、Pan 与 Wheel 扩展的官方 Interaction Activation。

**Blocked by:** 01 — 建立 Interaction Projection Runtime 闭环。

**Status:** ready-for-agent

- [ ] Interaction Plugin 以已确认的默认配置激活，静态依赖 Renderer、Session、Command 与 Kernel，且不提供 Interaction Service。
- [ ] eligible pointerdown 按 Hit Test、Focus、Capture、Active Gesture、Selection transition 顺序执行，任一失败先 cleanup 再暴露。
- [ ] 真实 Chromium 验证 plain Node、Edge、Canvas Selection 和 Target 外无状态变化。
- [ ] Shift、Meta 或 Control 共享 Additive Modifier 切换语义，Alt 不属于该语义，additive Canvas click 保留 Selection。
- [ ] 已选 Node 在多选中的 plain click 最终折叠为单 Node；Port Hit Result 只在纯状态转换中映射为所属 Node 且不伪造 SVG Port 能力。
- [ ] Session Snapshot identity、规范顺序、等价输入 no-op 和 Input BFS 重入通过公共 seam 保持。
