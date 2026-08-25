---
status: accepted
---

# 从当前 World Geometry 完成 Box Selection

Interaction v2 在 primary pointer 从空白 Canvas 超过 Drag threshold 后，以 backend-neutral World Rect 发布 Box Selection Preview，并在 pointerup 直接用当前 Kernel View 的 Node position 与 size 做方向无关的闭区间相交；因此不扩展 Renderer region query，也不建立 Preselection。结果只写 Session Selection：无 Additive Modifier 时替换，Shift、Control 或 Meta 时并集合并；中键与 Space Pan 保持优先，Box Selection 不产生 Kernel Transaction、History Entry，也不选择 Edge、Port 或 Connection Anchor。
