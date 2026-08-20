---
status: accepted
---

# 在 Runtime Plugin 之外拥有 Interaction 值契约

CFlow 将不可变、渲染后端无关的 Interaction Projection 值契约放入独立的 `@cflow/interaction-api`，由 `@cflow/plugin-interaction` 与 `@cflow/renderer-api` 分别向下依赖；Active Gesture、Command 执行、Session 更新和 Plugin lifecycle 仍留在 `plugin-interaction`。`interaction-api` 不依赖 Renderer、Runtime、Plugin Host、DOM 或具体 Provider，`@cflow/plugin-renderer` 中介 Projection 交付而不把裸 `CanvasRenderer` 暴露给 Interaction；`@cflow/core` 重导出两个 backend-neutral Interaction 包。这避免 Renderer 领域拥有 Interaction 语义、Runtime 类型进入 Provider seam，也防止 `interaction-api` 反向依赖 `renderer-api` 形成包环。
