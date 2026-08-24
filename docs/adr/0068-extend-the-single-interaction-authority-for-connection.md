---
status: accepted
---

# 扩展单一 Interaction authority 实现 Connection

Edge Connection 扩展现有 `@nodebraid/interaction-api` Projection 与 `@nodebraid/plugin-interaction` Active Gesture 状态机，不新建独立 Connection Plugin。它继续使用同一 Renderer Input consumer、同一 Gesture Pointer 与排他 Interaction Projection Binding；SVG Provider 在同一 Projection subtree 内增加受控 Interaction layer 以承载 Anchor 与 Preview。独立 Plugin 会在没有真实可替换 adapter 的情况下引入第二 writer、竞争 Gesture authority 或提前建立 Tool Registry。
