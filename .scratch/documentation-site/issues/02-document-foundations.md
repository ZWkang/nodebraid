# 02 — 介绍 CFlow 基础运行能力

**What to build:** 让评估者从 Foundations 能力族理解公共 facade、Plugin Host 与 Diagnostics 如何共同构成 CFlow 的运行基础，并能进入三个 package 的准确详情页。

**Blocked by:** 01 — 交付中文文档站与可运行 Quick Start.

**Status:** completed

- [x] Foundations 总览从开发者问题出发解释公共入口、显式 Plugin 生命周期与结构化诊断的关系。
- [x] core 页面说明 facade 聚合边界、常见使用入口和不包含具体 Provider 的约束。
- [x] runtime 页面说明 Required Service、Activation、Owned Resource、Child Installation 与显式释放语义，不泄露 Cordis 实现类型。
- [x] diagnostics 页面说明稳定错误身份、Diagnostic Event、Sink 与 Fault Reporter 边界，不宣传日志或持久化能力。
- [x] 三个页面使用统一模块模板，并通过真实公共导出、实现和测试证据校对。
- [x] 所有新增页面通过文档检查并可由 Foundations 导航到达。
