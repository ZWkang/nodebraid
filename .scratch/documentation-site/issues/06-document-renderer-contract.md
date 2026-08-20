# 06 — 介绍 Renderer 接入契约

**What to build:** 让开发者准确理解当前已交付的是 backend-neutral Renderer protocol 与 Runtime synchronization adapter，而不是已经能够显示画布的 concrete Renderer Provider。

**Blocked by:** 01 — 交付中文文档站与可运行 Quick Start.

**Status:** completed

- [x] Rendering Contract 总览明确 Renderer 不拥有 Document、Session 或 Command 写权。
- [x] Renderer API 页面说明 reset-or-commit Document update、Session update、normalized input、Hit Result、Factory、Target 与结构化错误。
- [x] Renderer Plugin 页面说明 Kernel/Session Required Services、每次 Activation 一份 Renderer Instance、同步顺序、resync 与窄 Renderer Service。
- [x] 页面显著说明当前已提交仓库没有 concrete Renderer Provider，不展示可视化完成态或虚假演示。
- [x] 页面不把并行设计材料或目标架构中的 Renderer 候选写成可安装能力。
- [x] 所有新增页面通过文档检查并可由 Rendering Contract 导航到达。
