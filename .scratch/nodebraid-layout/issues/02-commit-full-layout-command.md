# 02 — 通过 typed Command 原子提交 full layout

**What to build:** 让应用可以把一个 Layout Engine 与 typed Command 静态绑定，在真实 Canvas Runtime 中计算并一次性提交所有 Node 位置。

**Blocked by:** 01 — 让自定义 Layout Engine 计算 full Proposal

**Status:** completed

- [x] Command 从执行起点 Canvas View 建立 Layout Input，并返回 `CanvasCommit | null`。
- [x] 多个 Node 的位置变化只产生一次 Commit，并携带 `origin: layout` 与具体 Command ID。
