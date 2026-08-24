# 03 — 通过真实 Runtime 连接并回放 Edge

**What to build:** 用真实 Plugin Host、Kernel、Command、Session、Renderer、Interaction、History 与 SVG 完成 mouse source down 到 Edge Commit、Undo、Redo 的纵向闭环。

**Blocked by:** 02 — 投影 SVG Anchor、Hit 与 Connection Preview。

**Status:** resolved

- [x] Pan 在 auxiliary/Space 输入上优先，plain primary source Anchor 立即建立 Connection。
- [x] pointermove 更新 none/valid/invalid Preview，pointerup 重命中并至多执行一次 Command。
- [x] materializer 缺失时 Anchor 按 Node Selection 处理；pen/touch 显式拒绝。
- [x] 成功 Connection 只产生一个 Commit 和一个 History Entry，Undo/Redo 恢复完整 Edge。
- [x] 成功路径只由真实 SVG + Chromium public seam 证明。

## Answer

真实 Plugin Host + SVG + Chromium 已完成 source down、Preview、target up、Create Edge Commit、Undo/Redo，并覆盖 Selection/Pan 优先级与 mouse-only 输入策略。
