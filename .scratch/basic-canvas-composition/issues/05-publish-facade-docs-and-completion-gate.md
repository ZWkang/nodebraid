# 05 — 发布 facade、文档与完整门禁

**What to build:** 将已经通过真实行为验证的 Basic Canvas Composition 发布到 core facade、模块目录和双语文档，并以声明隔离、package 预览、clean build、真实 Chromium 与根仓库检查证明交付完整。

**Blocked by:** 02 — 完成 readiness、配置与失败回滚；03 — 完成冲突、隔离与异步释放；04 — 用真实 SVG 验证 Composition。

**Status:** ready-for-agent

- [ ] `@cflow/core` 重导出 backend-neutral Composition，但仍不重导出 SVG 或其他 concrete Provider。
- [ ] preset 声明不泄漏 core、Cordis、DOM、native event 或 concrete Provider 类型。
- [ ] package-name import、声明隔离、clean dependency build 与 `bun pm pack --dry-run` 通过。
- [ ] 根 typecheck、build、Bun tests、真实 browser tests、docs check 与 `bun run check` 纳入新 package。
- [ ] Quick Start、真实示例、模块目录、status、roadmap 与中英文页面准确区分已交付能力和 non-goals。
- [ ] 最终 review、格式、diff check 与 Git 状态只包含本任务范围。
