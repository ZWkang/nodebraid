---
status: accepted
---

# 发布渲染后端无关的 Basic Canvas Composition

CFlow 将 `@cflow/preset-basic` 发布为普通 Canvas Composition Plugin：应用继续显式创建并拥有 Plugin Host 与 Diagnostics，Composition 接受应用选择的 Renderer Factory，使用 Child Installation 组合 Kernel、Command、Session、Renderer、Interaction 与 History，并等待全部成员 active 后才进入 active。它不选择默认 Renderer、不包含 Layout、不提供聚合 Service 或内部 Installation 句柄；额外能力作为 sibling Plugin 安装。`@cflow/core` 重导出这一后端无关的 Composition，但仍不重导出 SVG 等具体 Provider。
