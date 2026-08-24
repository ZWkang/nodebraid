# 06 — 通过 ELK 完成真实 full layout

**What to build:** 让调用方可以使用 ELK Layout Provider 的类型化配置，直接计算 Proposal 或通过 Runtime Command 原子提交第二个真实 full layout Adapter。

**Blocked by:** 03 — 在 Provider 执行前拒绝无效 Layout Request; 04 — 阻止无效、取消或过期 Proposal 提交

**Status:** completed

- [x] ELK 通过与 Dagre 相同的 Layout Engine seam 产生完整、确定的 Node positions。
- [x] full 模式的基础图形状与自环 capability 均由真实 `elkjs` 行为验证。
