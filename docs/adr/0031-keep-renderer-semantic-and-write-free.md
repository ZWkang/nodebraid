---
status: accepted
---

# 将 Renderer 保持为无写权的 Canvas 语义投影

`@nodebraid/renderer-api` 定义小而完整的 Canvas 语义 interface，Renderer 接收 Document 与 Session 投影，而不是 `drawRect`、`drawLine` 等通用绘图指令；具体 Provider 将这些语义隐藏在自己的深 implementation 中。Renderer 只把后端输入标准化为 NodeBraid-owned Renderer Input，并通过 Hit Result 报告命中事实，不暴露原生事件、DOM、Canvas Context、Konva/Pixi 对象或逃生句柄，也不持有 Kernel、Session 或 Command 写权；Interaction 负责解释事实并执行状态变化。这个 seam 使 SVG、Canvas2D、Konva、Pixi 与未来后端能够平级实现，而不会把后端模型或第二条写入路径扩散到 NodeBraid 调用方。
