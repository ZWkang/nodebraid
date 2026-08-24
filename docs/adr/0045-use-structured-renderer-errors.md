---
status: accepted
---

# 使用结构化 Renderer 错误并保持失败身份

`@nodebraid/renderer-api` 定义 domain 为 `renderer` 的 RendererError，首版 code 只包括 `INVALID_DOCUMENT_UPDATE`、`DOCUMENT_OUT_OF_SYNC`、`INVALID_SESSION_SNAPSHOT`、`INVALID_SCREEN_POINT`、`INVALID_INPUT_SUBSCRIBER`、`INVALID_POINTER` 与 `RENDERER_DISPOSED`；`@nodebraid/plugin-renderer` 另以 domain `plugin.renderer` 和 `SERVICE_DISPOSED` 表达失效的 Runtime Service。结构校验在修改 Renderer Baseline 或逻辑状态前完成，Document 与 Session 更新保持 all-or-throw；安全 details 只携带 revision、field、receivedType 或 pointerId，不复制画布状态、配置或原生对象。Provider Factory、后端投影和 dispose 的原始失败保持身份；直接调用者能够接收的失败只 throw/reject，Input listener 与状态同步等无法返回原调用者的 Fault 才由 Host-scoped diagnostics 恰好报告一次，除已确认的失步 reset 外不静默重试。
