---
status: accepted
---

# 将 Hit Result 限制为稳定 Canvas 目标

`hitTest(ScreenPoint)` 只返回最上层的 Canvas、Node、Edge 或 Port 语义目标及对应 World Point；可渲染区域内的空白返回 Canvas，Renderer Target 外返回 `null`。首版不返回 Interaction Handle、z-order、局部坐标或开放式 detail：Handle 尚不属于稳定 Renderer 语义，Document 尚未定义 z-order，局部坐标可以由 World Point 与 Node position 推导，而任意 detail 会成为后端对象和 Provider-specific 状态穿透公共 seam 的通道。
