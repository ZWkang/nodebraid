---
status: accepted
---

# 由 Renderer Runtime Plugin 拥有状态同步

独立的 `@nodebraid/plugin-renderer` 通过 `createRendererPlugin(factory)` 把一个 Renderer Factory 绑定为普通 Runtime Plugin：它静态依赖 Kernel Service 与 Session Service、为每次 Activation 创建并拥有一份 Renderer Instance、先发送当前 Document reset 再发送当前 Session Snapshot、串行协调后续更新与失步重置，并在释放 Renderer 前取消全部观察关系。该 Plugin 提供唯一 `rendererService`，只向 Interaction 暴露输入订阅、Hit Test、Pointer Capture 与 Focus，不暴露 CanvasRenderer 的 `updateDocument`、`updateSession` 或 `dispose`；同一个 Host 中第二个 Renderer Service Provider 按现有单 Provider 规则显式冲突。具体 Provider package 只提供 Factory 且不依赖 Runtime，状态同步、Session reconciliation、诊断和 Host lifecycle 全部集中在这个深 adapter implementation。
