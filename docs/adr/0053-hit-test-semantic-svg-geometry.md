---
status: accepted
---

# 使用语义 SVG Geometry 进行命中测试

`@nodebraid/renderer-svg` 的 `hitTest` 根据 Provider 已接受的语义 Geometry 计算结果，不依赖浏览器 DOM hit testing、调用方 CSS 或 Target 中的其他内容。非有限 Screen Point 显式失败，Target 可视区域外返回 `null`；区域内先按逆规范 ID 顺序命中 Node 矩形，再以同样顺序和 Target-local CSS pixel 容差命中 Edge 线段，其余返回 Canvas。`edgeHitTolerance` 为非负有限 Factory 配置，默认值是 `4 CSS px`；首版没有 Port Geometry，因此不会伪造 Port Hit Result。
