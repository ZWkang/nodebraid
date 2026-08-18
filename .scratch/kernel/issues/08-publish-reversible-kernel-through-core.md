# 08 — 通过 core 发布可逆 Kernel 闭环

**What to build:** 让普通 CFlow 消费者可以从公共 core facade 导入完整 Kernel interface，并通过 package-name import 运行创建、连接、编辑、反向回放和正向回放闭环，同时保持纯 Kernel 声明和发布物不泄漏任何 Runtime implementation。

**Blocked by:** 07 — 正反向回放 Change Set.

**Status:** resolved

- [x] `@cflow/core` 重导出 Kernel 的完整公开 interface 和创建入口，但 `@cflow/kernel` 不反向依赖 core。
- [x] 通过公共 core package-name import 完成空 Kernel、两个 Node、一条 Edge、Node replace、reverse 与 forward 的真实消费闭环。
- [x] core facade 只做导出烟测，不复制 Kernel package 的行为测试。
- [x] Kernel 生成声明不包含 core、Cordis、RxJS、Renderer、DOM 或框架类型。
- [x] Kernel package metadata、README、license、exports 与 publish 内容符合现有 workspace 约定。
- [x] root 文档准确区分已实现 Kernel、既有 Plugin Host 和仍然暂缓的 Kernel Plugin adapter。
- [x] Kernel 与 core 的 package-name import probe、声明检查和 dry-run pack 通过。
- [x] repository lint、typecheck、format check、tests、build 与 diff whitespace 检查全部通过。

## Answer

已通过 `@cflow/core` 重导出完整 Kernel seam，并从 core package-name import 验证创建、连接、replace、reverse 与 forward 闭环。Kernel/core import probe、声明泄漏检查、README/LICENSE 发布内容与 dry-run pack 均通过；review 修复后全仓 `bun run check` 最终为 91 tests、375 assertions 全部通过，lint、typecheck、Prettier、build 与 `git diff --check` 同时通过。Standards 与 Spec follow-up review 均为 pass、无剩余 finding。
