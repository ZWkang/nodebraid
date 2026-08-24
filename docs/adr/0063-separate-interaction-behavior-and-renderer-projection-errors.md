---
status: accepted
---

# 分离 Interaction 行为与 Renderer Projection 错误

`@nodebraid/plugin-interaction` 以 domain `interaction` 的 `InteractionError` 和 `INVALID_CONFIG`、`INVALID_MOVE`、`STALE_GESTURE` 表达行为输入、移动前置条件与用户 Gesture 冲突；接受 Effective Renderer State 的 `@nodebraid/renderer-api` 则以 `RendererError` 的 `INVALID_INTERACTION_PROJECTION` 与 `INTERACTION_OUT_OF_SYNC` 表达投影结构或 Projection Baseline 失配。`@nodebraid/interaction-api` 保持纯值契约，不为错误引入 Renderer 状态机；旧 Renderer Service handle 继续使用 `plugin.renderer/SERVICE_DISPOSED`，Provider 或外部未知失败保留原始身份。这使直接调用者能区分行为冲突与 Renderer 状态证据失配，也避免两个包复制同一组错误语义。
