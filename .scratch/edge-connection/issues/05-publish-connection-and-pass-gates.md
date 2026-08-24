# 05 — 发布 Edge Connection 并通过完整门禁

**What to build:** 将已经真实 SVG/Chromium 验证的 Interaction v1 Connection 准确公布到 core、preset、双语文档与仓库状态，并完成 review 与全量验证。

**Blocked by:** 04 — 完成 Connection 取消、stale 与 recovery。

**Status:** ready

- [ ] core/preset 精确导出与透传 backend-neutral Connection 配置，不引入 SVG 默认依赖。
- [ ] status/roadmap/module docs 区分已实现 node-level Connection 与仍暂缓 Port/validation/routing 能力。
- [ ] 受影响 package 通过 format、typecheck、test、build、declaration isolation 与 `bun pm pack --dry-run`。
- [ ] 真实 browser tests 和 root `bun run check` 通过。
- [ ] Standards/Spec code review 闭环修复后复验，`git diff --check` 和最终 status 只包含本任务。
