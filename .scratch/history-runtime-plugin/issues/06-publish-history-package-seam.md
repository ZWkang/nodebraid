# 06 — 发布完整 History Package Seam

**What to build:** 将已验证的 History 行为收口为独立发布包与 core facade 公开能力，同时用类型、声明、package-name import 和打包检查锁定依赖方向。

**Blocked by:** 05 — 收口取消与 Activation 生命周期.

**Status:** resolved

- [x] 公开导出包含 History Plugin/Service、Undo/Redo Commands、Snapshot 与结构化错误。
- [x] 类型测试锁定 readonly Snapshot、窄 Service 表面、void-to-CanvasCommit Command 与无配置 Plugin。
- [x] History 包直接依赖 Kernel、Kernel Plugin、Command Plugin 与 Runtime，不依赖 core。
- [x] 生成声明不泄漏 Cordis、RxJS、Renderer 或 core 反向依赖。
- [x] core facade 显式重导出 History 公开 seam，只做 package-name smoke test。
- [x] README、package metadata、changeset 与开发命令与实际能力一致。
- [x] 通过包级与全仓 lint、typecheck、format check、test、build、声明检查与 dry-run pack。

## Answer

`@nodebraid/plugin-history` 已作为独立 workspace 包发布完整 History seam，并由 core facade 显式重导出。类型测试、声明泄漏检查、package-name import、README、changeset 与 workspace 命令均已收口。最终 `bun run check` 以 134 tests、542 assertions 全绿，workspace 依赖构建按拓扑顺序串行执行；History 与 core dry-run pack 都成功，History 发布物包含 27 个预期文件。
