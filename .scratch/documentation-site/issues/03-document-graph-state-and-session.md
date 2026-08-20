# 03 — 介绍 Graph State 与 Session

**What to build:** 让采用者理解权威 Document、同步 Transaction、Runtime Kernel Service 以及与 Document 分离的 Selection 和 Viewport，并能为自己的 Canvas Runtime 选择正确的四个 package。

**Blocked by:** 01 — 交付中文文档站与可运行 Quick Start.

**Status:** completed

- [x] Graph State 总览解释 Document 与 Session 的状态归属，以及纯值契约和 Runtime Plugin 的差异。
- [x] kernel 页面准确说明原子 Transaction、revision-bound View、Query、Change Set、结构不变量和不透明领域数据。
- [x] Kernel Plugin 页面说明每次 Activation 的 Kernel Service、Commit 顺序、重入投递与 observer fault 边界。
- [x] Session API 页面说明 Selection、Viewport 与 Snapshot 值契约，不把它描述为可写 Runtime Service。
- [x] Session Plugin 页面说明 Kernel 依赖、失效 Selection 协调、等价更新和 breadth-first 通知。
- [x] 修正文档中把已交付 Kernel Plugin 称为未来能力的漂移，不改动产品行为。
- [x] 所有新增页面通过文档检查并可由 Graph State 导航到达。
