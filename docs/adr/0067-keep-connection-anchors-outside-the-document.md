---
status: accepted
---

# 将 Connection Anchor 保持在 Document 之外

Interaction v1 使用由 Renderer 从正尺寸 Node Geometry 派生的 node-level source/target Connection Anchor，并将结果 Edge 提交为不带 `portId` 的 Endpoint。Connection Anchor 是 CFlow-owned Renderer 语义命中目标，但不是 Node、Edge、Endpoint 或 Port；首版不增加 Port 顶级实体、Port Registry 或从不透明 Node data 推测 Port Geometry。这让真实 SVG Connection 闭环能够成立，同时保留现有 Endpoint 对未来上层 Port 语义的容纳能力。
