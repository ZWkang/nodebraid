---
status: accepted
---

# 将 Interaction Projection 视为 Renderer 有效状态

`CanvasRenderer` 必须同步、all-or-throw 地接受完整 Interaction Projection 替换或清除，`@nodebraid/plugin-renderer` 通过窄 `RendererService` 中介该通道，并在 Document 或 Session 更新使 Projection Baseline 失效时先清除 Projection。Renderer 以已接受的 Document、Session 与最新 Projection 合成 Effective Renderer State，因此显示、Hit Test 与后续 Input 的 World Point 使用同一候选 Geometry 与 Viewport。该决定修订 ADR 0044 中 Renderer Service 不向 Interaction 暴露任何渲染状态更新的窄化描述：Interaction 仍无 Document、Session 或 Renderer 释放权，但拥有唯一的瞬态语义投影写入权。所有 Renderer Provider 都必须实现该契约，不使用 optional capability 或 silent fallback。
