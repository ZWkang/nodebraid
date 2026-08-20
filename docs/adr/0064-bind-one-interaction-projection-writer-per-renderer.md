---
status: accepted
---

# 为每个 Renderer 绑定一个 Interaction Projection writer

`RendererService` 不向所有 Consumer 直接暴露共享 `updateInteraction`，而是通过 `bindInteractionProjection()` 产生一份排他的 Activation-scoped Interaction Projection Binding。同一 Renderer Activation 同时只允许一份 live Binding；第二份显式失败，Binding 终止后的更新也显式失败。Binding dispose 清除 Projection 并终止写权；若清理失败，仍保留 Reservation 到 Renderer Activation 结束，避免新 writer 与残留 Preview 重叠。这不是 Tool 或 Provider Registry，而是对“一个 Active Gesture 只有一个 Interaction owner”的 Runtime 所有权校验。
