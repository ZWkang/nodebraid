---
status: accepted
---

# 通过现有 SVG 语义几何投影 Interaction

`@cflow/renderer-svg` 将 Node Drag 的候选 position 临时覆盖到现有 keyed Node 元素并重算 incident Edge，将 Viewport Pan 的候选 Viewport 应用到现有 Projection root transform；清除 Interaction Projection 时恢复已提交 Document 与 Session 几何。Provider 不为 Preview 复制 Node、建立第二套场景树或新增专用 overlay layer，也不在首版增加 dragging class 或 styling marker；DOM identity、规范顺序、Selection 标记和调用方样式保持不变。这让显示、Hit Test 与 Input 坐标共用一份 Effective Renderer State，并避免临时 DOM 在层级、命中和清理上成为第二个渲染协议。
