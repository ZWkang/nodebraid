---
status: accepted
---

# 要求 SVG 投影使用显式 Geometry

`@cflow/renderer-svg` 只投影具有显式 Size 的 Node 和不带 `portId` 的 Edge，普通 Edge 以直线连接两个 Node 中心。Node 缺少 Size、Edge 需要尚未存在的 Port Geometry，或自环 Edge 无法形成有效直线时，Provider 会在改变已接受的投影前以结构化 `RendererError` 拒绝整次 Document 更新，不猜测默认尺寸、不从 DOM 反向测量 Document Geometry、不把 port-qualified Endpoint 静默连到 Node 中心，也不暗中实现 Edge Routing。
