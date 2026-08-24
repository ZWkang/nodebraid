# 02 — 投影 SVG Anchor、Hit 与 Connection Preview

**What to build:** 让真实 SVG Renderer 在同一 Projection subtree 内拥有稳定 Anchor/Preview DOM，并以语义 Geometry 命中 source/target Anchor。

**Blocked by:** 01 — 建立 Connection 值契约与 Create Edge Command。

**Status:** ready

- [ ] SVG 为正尺寸 Node 派生左/target、右/source Anchor，零尺寸 Node 不伪造 Anchor。
- [ ] `connectionAnchorHitTolerance` 以 CSS px 校验并默认为 8，Anchor hit 优先于 Node。
- [ ] Interaction layer 与 Preview 的 none/valid/invalid 状态通过稳定 DOM seam 可观察。
- [ ] Projection 接受保持 all-or-throw、defensive copy、baseline 与 rollback 语义。
- [ ] 直接 CanvasRenderer 与真实 Chromium 逐条 red-green 验证 DOM、Hit、Viewport/viewBox 坐标。
