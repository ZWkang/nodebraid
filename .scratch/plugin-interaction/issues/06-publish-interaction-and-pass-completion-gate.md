# 06 — 发布 Interaction 并通过完整门禁

**What to build:** 将已通过真实行为验证的 Interaction API 与 Runtime Plugin 发布为可独立安装的包，通过 core 聚合 backend-neutral 能力，并用声明隔离、package 预览、真实 Chromium 和根仓库检查证明首版闭环可发布。

**Blocked by:** 05 — 完成取消、恢复与生命周期。

**Status:** resolved

- [x] Interaction API 与 Plugin Interaction 包具有准确 metadata、构建依赖、类型检查、测试、声明检查和发布内容。
- [x] Interaction API 声明不泄漏 Runtime、Renderer、DOM 或具体 Provider；Plugin Interaction 不泄漏 DOM、SVG、具体 Provider 或 core 反向依赖。
- [x] Renderer API 继续只包含 NodeBraid-owned 值且不泄漏 native events，SVG-specific 类型只存在具体 Provider。
- [x] core 精确重导出 Interaction API 与 Plugin Interaction，不将 SVG 变成默认依赖。
- [x] 所有受影响包的 package-name import probe 与 `bun pm pack --dry-run` 通过，发布内容不包含缓存、临时资源或测试工具。
- [x] 根验证包含真实 Chromium Interaction 闭环并通过 lint、typecheck、format check、Bun tests、browser tests 与 build。
- [x] AGENTS、README 与阶段架构文档只描述真实已实现能力和准确命令，最终 diff check 与 status 只包含本任务范围。
