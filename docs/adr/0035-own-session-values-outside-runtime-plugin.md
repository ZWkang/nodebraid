---
status: accepted
---

# 在 Runtime Plugin 之外拥有 Session 值契约

CFlow 将 Selection Snapshot、Viewport 与 Session Snapshot 等无副作用值契约放入独立的 `@cflow/session-api`，由 `@cflow/plugin-session` 与 `@cflow/renderer-api` 分别向下依赖；Session Service、mutation、Service Token 和 Plugin lifecycle 仍留在 `plugin-session`。这避免 Renderer Provider 因一个快照类型传递依赖 Runtime、Plugin Host 与 Kernel adapter，也避免 Renderer API 复制一份会与 Session 领域语义漂移的结构；`@cflow/core` 只负责向外重导出，内部包不通过 facade 相互依赖。
