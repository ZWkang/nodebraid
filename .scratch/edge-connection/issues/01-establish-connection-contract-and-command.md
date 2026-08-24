# 01 — 建立 Connection 值契约与 Create Edge Command

**What to build:** 通过 backend-neutral 值与 typed Command 建立 Node-level Connection Anchor、Connection Preview、materializer 配置和单 Transaction Edge 创建 seam。

**Blocked by:** None — can start immediately.

**Status:** ready

- [ ] `interaction-api` 公布 Anchor identity 与 `connection-preview` 不可变值，不泄漏 Renderer/Runtime/DOM。
- [ ] `plugin-interaction` 公布可选同步 materializer、Create Edge Command input/result 和 `INVALID_CONNECTION`。
- [ ] Command 以完整 Edge + Anchor evidence 校验 Port、self-loop、Endpoint、Node 存在性与 Edge ID 竞争。
- [ ] parallel Edge 允许，成功只产生一个 Canvas Commit，失败无部分写入。
- [ ] 从 Command/Kernel/History public seam 开始 red-green tracer。
