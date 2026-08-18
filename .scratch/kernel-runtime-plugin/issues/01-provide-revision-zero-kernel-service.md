# 01 — 提供 revision-zero Kernel Service

**What to build:** 新建可发布的 `@cflow/plugin-kernel`，通过真实 Plugin Host Activation 提供窄 `KernelService`，让 Consumer 可以读取 revision-zero View 并执行同步 Transaction，而不获得裸 `CanvasKernel`。

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] 导出 `kernelService`、`kernelPlugin`、`KernelService` 与最小错误 interface。
- [x] 每次 Activation 创建真实、空的 revision-zero Kernel。
- [x] `read` 与同步 `transact` 保留 Kernel 行为和返回 evidence。
- [x] 包依赖 Kernel 与 runtime-cordis，不依赖 core，Kernel 依赖保持纯净。
- [x] 通过公开 PluginHost/KernelService seam 完成 red → green 测试。

## Answer

已建立独立 `@cflow/plugin-kernel` package。真实 Plugin Host Activation 现在提供窄 `KernelService`，其首个公开 seam 测试从缺失模块红灯推进到 revision-zero 读取与同步 Transaction green，且包级 typecheck 通过。
