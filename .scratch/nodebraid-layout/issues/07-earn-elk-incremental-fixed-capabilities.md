# 07 — 让 ELK 赢得 incremental 与 Fixed Node capability

**What to build:** 让 ELK Layout Provider 在真实算法行为证明它会利用已有位置且遵守绝对 Fixed Node 约束后，显式提供 incremental 与 Fixed Node 能力。

**Blocked by:** 06 — 通过 ELK 完成真实 full layout

**Status:** completed

- [x] 增量模式在可重复的已知图中将当前位置作为软约束，不退化成 full 结果。
- [x] 多个 Fixed Node 在 Proposal 中保持精确绝对坐标，不支持的算法或配置组合显式失败。
