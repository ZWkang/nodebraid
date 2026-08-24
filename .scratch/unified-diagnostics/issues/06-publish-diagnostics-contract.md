# 06 — 发布 Diagnostics 公共契约并完成全仓验证

**What to build:** 从 core facade 发布完整 Diagnostics Interface，补齐 workspace dependency tooling、README、目标架构和 package artifact 验证，使下一位 Agent 可以只按公开 seam 使用和测试。

**Blocked by:** 02 — 迁移结构性错误与因果树; 05 — 发布首版 Runtime 事件目录

**Status:** resolved

- [x] Core 重导出 diagnostics；内部包仍直接依赖窄包。
- [x] 更新 build/typecheck dependency scripts 和准确开发命令。
- [x] 增加 diagnostics README、event/error identity 表和 Adapter 最小示例。
- [x] 检查声明不泄漏 Cordis、上层包或内部实现类型。
- [x] 完成 package-name import、全仓 check、pack dry-run 和 diff whitespace 验证。
- [x] 确认 spec、ADR、ARCHITECTURE 与最终 Interface 一致。

## Answer

`@nodebraid/diagnostics` 已通过 `@nodebraid/core` facade 发布，所有内部 workspace 继续依赖窄包。Root/Core build 与 typecheck 顺序、README/AGENTS、声明检查和 package artifacts 已同步。最终 `bun run check` 通过 223 tests、743 assertions、lint、typecheck、format check 与全 workspace build；`bun pm pack --dry-run` 验证 31 个发布文件、31.86KB unpacked size，`git diff --check` 通过。
