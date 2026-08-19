# 05 — 通过 Dagre 完成真实 full layout

**What to build:** 让调用方可以使用 Dagre Layout Provider 的类型化配置，直接计算 Proposal 或通过 Runtime Command 原子提交真实 full layout。

**Blocked by:** 03 — 在 Provider 执行前拒绝无效 Layout Request; 04 — 阻止无效、取消或过期 Proposal 提交

**Status:** completed

- [x] 相同输入和 effective config 产生确定的绝对世界坐标。
- [x] 空图、单 Node、零尺寸、断连分量、平行 Edge 和有向环通过真实 Dagre 行为验证。
