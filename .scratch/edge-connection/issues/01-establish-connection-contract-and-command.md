# 01 — 建立 Connection 值契约与 Create Edge Command

**What to build:** 通过 backend-neutral 值与 typed Command 建立 Node-level Connection Anchor、Connection Preview、materializer 配置和单 Transaction Edge 创建 seam。

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] `interaction-api` 公布 Anchor identity 与 `connection-preview` 不可变值，不泄漏 Renderer/Runtime/DOM。
- [x] `plugin-interaction` 公布可选同步 materializer、Create Edge Command input/result 和 `INVALID_CONNECTION`。
- [x] Command 以完整 Edge + Anchor evidence 校验 Port、self-loop、Endpoint、Node 存在性与 Edge ID 竞争。
- [x] parallel Edge 允许，成功只产生一个 Canvas Commit，失败无部分写入。
- [x] 从 Command/Kernel/History public seam 开始 red-green tracer。

## Answer

Connection 纯值、同步 materializer 与 `interaction.edge.create` 已通过真实 Runtime Command seam 完成；结构错误、stale、parallel Edge 与单 Commit 均有自动化证据。
