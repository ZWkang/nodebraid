# 02 — 实现完整 Selection 交互

**What to build:** 让用户在真实 SVG Canvas 中通过 Pointer Input 与 Hit Result 完成 Node、Edge 和 Canvas 的 plain/additive Selection，并建立可供后续 Drag、Pan 与 Wheel 扩展的官方 Interaction Activation。

**Blocked by:** 01 — 建立 Interaction Projection Runtime 闭环。

**Status:** resolved

- [x] Interaction Plugin 以已确认的默认配置激活，静态依赖 Renderer、Session、Command 与 Kernel，且不提供 Interaction Service。
- [x] eligible pointerdown 按 Hit Test、Focus、Capture、Active Gesture、Selection transition 顺序执行，任一失败先 cleanup 再暴露。
- [x] 真实 Chromium 验证 plain Node、Edge、Canvas Selection 和 Target 外无状态变化。
- [x] Shift、Meta 或 Control 共享 Additive Modifier 切换语义，Alt 不属于该语义，additive Canvas click 保留 Selection。
- [x] 已选 Node 在多选中的 plain click 最终折叠为单 Node；Port Hit Result 只在纯状态转换中映射为所属 Node 且不伪造 SVG Port 能力。
- [x] Session Snapshot identity、规范顺序、等价输入 no-op 和 Input BFS 重入通过公共 seam 保持。

## Answer

`@nodebraid/plugin-interaction` 现以四个 Required Service 组合一份无状态 Service 的 Interaction Activation，在真实 Chromium 中按 Hit Test、Focus、Capture 顺序完成 Node、Edge 与 Canvas 的 plain/additive Selection。多选中已选 Node 在 pointerdown 保持集合，只在 click pointerup 折叠；Port 通过纯状态 seam 映射到所属 Node。Selection 失败会先释放 Capture 再通过现有 Input Fault 边界报告，包级声明隔离、类型检查、Bun 测试与真实浏览器链路均已通过。
