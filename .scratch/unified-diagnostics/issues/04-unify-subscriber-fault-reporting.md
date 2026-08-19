# 04 — 统一 Subscriber 与 Observer Fault 上报

**What to build:** 删除 Runtime、Kernel、Session 与 History 中四份 platform error helper，改用 scoped `reportFault()`，同时保持 listener 隔离、原始错误和默认 fail-loud 行为。

**Blocked by:** 03 — 在 Plugin Host seam 注入作用域化 Diagnostics

**Status:** resolved

- [x] 迁移 Installation subscriber、Kernel Observer、Session subscriber 和 History subscriber。
- [x] 使用规范 event name 和 error level，不在调用点拼自由文本。
- [x] 一个 listener Fault 只产生一个 Diagnostic Event 和一个 Fault Report。
- [x] Reporter 成功或失败都不阻塞剩余 listener，不修改已提交状态。
- [x] 源码检查禁止 package-local `globalThis.reportError` helper 回归。

## Answer

四份 platform error helper 已删除。Installation、Kernel、Session 与 History 的外部 listener failure 现在分别使用 package-owned event constant，通过当前 Host/Installation/Activation scope 同时交给 Sink 与 Fault Reporter；默认 Host Reporter 继续提供原 `reportError` / asynchronous throw 行为。现有 listener ordering、state integrity、platform fallback 与 reporter failure 测试全部保留并通过。
