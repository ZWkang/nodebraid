# 11 — 接入真实 Renderer Runtime 并发布 Provider

**What to build:** 用真实 Plugin Host、Kernel Plugin、Session Plugin 与 Renderer Plugin 驱动 SVG Provider，证明初始同步、增量更新、失步重置、Input 转发和 Activation 清理的完整路径，并把包作为窄且可验证的官方 Provider 发布。

**Blocked by:** 05 — 回滚失败的 DOM patch; 07 — 提供语义 Hit Test; 09 — 拥有 Input 顺序、Focus 与 Pointer Capture; 10 — 拥有 Target Reservation 与终态 Dispose.

**Status:** claimed

- [x] 真实 Runtime Activation 先交付 Document reset 再交付可解析 Session。
- [x] Kernel Commit、Selection 协调与 Viewport 更新通过真实 Runtime 同步到 SVG Projection。
- [x] `DOCUMENT_OUT_OF_SYNC` 由现有 Renderer Runtime 使用权威 Kernel View reset 恢复。
- [x] Renderer Service 通过真实 Provider 完成 Input forwarding、Hit Test、Focus 与 Pointer Capture control。
- [x] Activation 释放停止观察与 Input，并终态释放 Renderer Instance。
- [x] 公共类型、包名 import、声明隔离、独立 build/typecheck/test 和 package dry-run 验证全部通过。
- [ ] 根文档与工具链命令准确，完整仓库 check 通过，具体 Provider 不被 core 重导出或设为默认。

## Answer

真实 Chromium 中的 Plugin Host 现在以官方 Kernel、Session 与 Renderer Runtime Plugins 驱动 `@nodebraid/renderer-svg`，完成初始 reset/Session、Kernel Commit、Selection/Viewport、Hit Test、Focus、Input forwarding、人为失步后的诊断+reset 恢复与 Host 终态清理。新包保持独立依赖与声明隔离，不经 core 重导出；238 个 Bun tests、root build/typecheck/lint、Chromium gate、package dry-run、本任务格式检查与 Standards/Spec 双轴 review 全部通过。完整 `bun run check` 的唯一阻断是并发 `.scratch/documentation-site/` 的 8 个未格式化文件，本任务未越权修改。
