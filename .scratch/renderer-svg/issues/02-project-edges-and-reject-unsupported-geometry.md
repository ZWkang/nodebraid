# 02 — 投影直线 Edge 并拒绝不完整 Geometry

**What to build:** 在首个 Node Projection 上加入通用直线 Edge，让支持的图以确定层级显示，并让缺少 Size、需要 Port Geometry 或无法形成直线的图在改变 Projection 前显式失败。

**Blocked by:** 01 — 创建 SVG Provider 并投影首个 Node.

**Status:** resolved

- [x] 无 Port Edge 以两个矩形 Node 中心之间的 SVG 直线投影。
- [x] Edge layer 始终位于 Node layer 之前，同层实体按规范 ID 顺序排列。
- [x] 缺少 Node Size 以结构化 `MISSING_NODE_SIZE` issue 拒绝整次更新。
- [x] port-qualified Edge 以 `UNSUPPORTED_PORT_GEOMETRY` issue 拒绝，不静默连到 Node 中心。
- [x] 自环 Edge 以 `UNSUPPORTED_SELF_LOOP` issue 拒绝，不伪造零长度成功。
- [x] 失败后原 Projection 与 Renderer Baseline 仍可继续接受合法更新。

## Answer

SVG Projection 现在以稳定 Edge layer 中的 `<line>` 连接两个已定尺 Node 中心，Edge 与 Node 都遵循 Kernel Snapshot 的规范 ID 顺序。缺少 Size、Port-qualified Endpoint 和自环都在 detached Projection 应用前以结构化 RendererError 拒绝，每条真实 Chromium 回归用例均证明原 DOM 保持不变。
