---
status: accepted
---

# 将 SVG Provider 保持为参考级通用语义投影

`@nodebraid/renderer-svg` 首版只把通用矩形 Node、无 Port 直线 Edge、Selection 与 Viewport 投影到 SVG，不解释 `node.type`、`node.data` 或产品节点协议，也不把 `parentId` 解释为 Renderer scene 嵌套。它作为参考级官方 Provider 证明 Renderer seam 的完整性，但不是默认 Renderer；SVG、Canvas2D、Konva 与 Pixi Provider 未来仍保持平级。
