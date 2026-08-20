# 05 — 介绍 Layout 能力族

**What to build:** 让开发者从自动布局需求出发，理解 Provider-neutral contract、Runtime Command integration 与 Dagre/ELK Provider 的显式组合，并根据已声明能力选择实现。

**Blocked by:** 01 — 交付中文文档站与可运行 Quick Start.

**Status:** completed

- [x] Layout 总览解释 Input、Engine、Proposal、验证、stale revision 防护和单 Transaction 提交链路。
- [x] Layout API 页面说明 full、incremental、Fixed Node、自环 capability 与首版输入限制。
- [x] Layout Plugin 页面说明 Engine-specific typed Command、Required Services、取消和无 Registry 边界。
- [x] Dagre 页面准确说明 deterministic full layout 及不支持 incremental 和 Fixed Node。
- [x] ELK 页面准确说明 full、Stress incremental、Fixed Node 与当前执行限制。
- [x] Provider 对比不指定默认实现，不把共享请求字段和 Provider-specific 配置混在一起。
- [x] 所有新增页面通过文档检查并可由 Layout 导航到达。
