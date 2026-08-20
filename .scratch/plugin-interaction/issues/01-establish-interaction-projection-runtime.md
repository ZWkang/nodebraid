# 01 — 建立 Interaction Projection Runtime 闭环

**What to build:** 让直接 Renderer 调用者和真实 Plugin Host Consumer 都能通过后端无关、排他的 Interaction Projection Binding，把 Node Drag 或 Viewport Pan 候选几何交付给真实 SVG Renderer，并使显示、Hit Test 与 Input 坐标使用同一 Effective Renderer State。

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] 独立 Interaction API 发布不可变 Node Drag 与 Viewport Pan Projection 值，不依赖 Runtime、Renderer、DOM 或具体 Provider。
- [x] CanvasRenderer 通过同步 all-or-throw 公共 seam 完整替换或清除 Projection，并以结构化 Renderer 错误拒绝非法或失步值。
- [x] Renderer Service 通过一份排他 Binding 中介 Projection，显式拒绝第二份 live Binding 和 disposed Binding 更新。
- [x] SVG Provider 在现有 keyed 几何上投影 Node position 与 Viewport 候选值，clear 恢复稳定状态并保持 DOM identity、Selection 与调用方样式。
- [x] 真实 Chromium 通过直接 CanvasRenderer 与真实 Runtime Binding 两个公共 seam 观察候选几何、incident Edge、Hit Test 与 World Point。
- [x] 公共类型、声明隔离、package-name import 与受影响的现有 Renderer 契约测试保持通过。

## Answer

`@cflow/interaction-api` 现已定义纯值 Node Drag 与 Viewport Pan Projection；CanvasRenderer 以同步、可清除且受 Baseline 保护的 seam 接受它们，Renderer Runtime 则用排他 Binding 授予唯一 writer。SVG 在现有 keyed Node、Edge 和 Viewport transform 上投影候选几何，显示、Hit Test 与真实 Pointer World Point 均使用 Effective Renderer State。真实 Chromium、Runtime、包级声明隔离、类型检查与受影响构建均已验证通过。
