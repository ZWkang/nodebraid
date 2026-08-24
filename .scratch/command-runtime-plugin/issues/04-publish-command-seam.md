# 04 — 发布 Command Runtime Plugin seam

**What to build:** 通过 core facade 与发布物提供完整 Command seam，并用真实 Kernel Feature Plugin 验证异步准备到同步 Transaction 的组合链路，同时保持包依赖方向和声明纯净。

**Blocked by:** 03 — 由注册与 Activation 拥有进行中执行.

**Status:** resolved

- [x] Command package 只依赖 runtime-cordis，不依赖 kernel、plugin-kernel 或 core。
- [x] core 重导出 Command 公开 interface，并完成 package-name import probe。
- [x] 真实 Consumer 同时依赖 Command 与 Kernel Service，异步准备后提交带 commandId 的 Transaction。
- [x] 完成 metadata、README、changeset、声明检查、clean-check 与 dry-run pack。

## Answer

`@nodebraid/plugin-command` 已作为独立发布包接入 core facade，只依赖 `@nodebraid/runtime-cordis`。core 组合测试通过 Feature Plugin 的静态 bindings 同时使用 Command 与 Kernel Service，异步准备后同步提交 revision 1，并保留 `node.add-prepared` commandId。删除全部 workspace `dist` 后的 `bun run check` 以 110 tests、447 assertions 全绿；Command/core package-name 声明探针与 dry-run pack 均通过。双轴 review follow-up 最终为 Standards/Spec 同时 PASS，无剩余 finding。
