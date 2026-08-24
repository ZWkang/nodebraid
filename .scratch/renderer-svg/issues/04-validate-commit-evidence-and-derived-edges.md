# 04 — 验证完整 Commit evidence 与派生 Edge

**What to build:** 让增量投影只接受 before、after 与 Change Set 彼此一致且与本地 Renderer Baseline 匹配的完整 evidence，并在 Node Geometry 改变时同步更新未直接出现在 Change Set 中的关联 Edge。

**Blocked by:** 02 — 投影直线 Edge 并拒绝不完整 Geometry; 03 — 应用 keyed 连续 Commit.

**Status:** resolved

- [x] Snapshot 实体壳、图引用、唯一 ID 与规范顺序在 DOM 修改前完整验证。
- [x] Commit before/after/Change Set 的 revision、实体内容与变化列表完全一致。
- [x] Commit before 的内容而不只是 revision 与本地 Baseline 匹配。
- [x] 外部在更新后修改输入壳对象不会篡改已接受 Baseline。
- [x] data-only Commit 推进 Baseline 但不创造通用 SVG 语义，opaque data 仅保留原引用。
- [x] Node 位置或 Size 变化时，所有关联 Edge 保留 identity 并刷新 Geometry。

## Answer

Renderer 现在于任何 DOM 修改前验证 Canvas View 壳、实体顺序/唯一性、父子与 Endpoint 图引用、Commit revision、完整 before 内容与独立推导的 Change Set。Baseline 保留私有 NodeBraid-owned shell/Geometry 副本和 opaque data 原引用，因此外部后续篡改无效；data-only Commit 可连续推进，Node Geometry 变化则原位更新所有派生 Edge。
