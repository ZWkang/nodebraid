# 02 — 强制 Command 身份与注册唯一性

**What to build:** 让 Command token 的运行时身份和类型契约不可伪造，并让同一 token 或相同诊断 ID 的并发注册显式冲突；未注册 Command 执行不得静默忽略。

**Blocked by:** 01 — 注册并执行强类型 Command.

**Status:** resolved

- [x] 拒绝空 ID、伪造 token、重复 token、重复 ID 与未注册执行。
- [x] 结构错误使用稳定 `CommandError` code 与 readonly details。
- [x] 冲突失败不改变已有注册。
- [x] 类型测试保持输入与输出不变，不能借 widening 破坏 handler 类型。

## Answer

Command token 由不可伪造的运行时身份和不变输入/输出类型共同约束；空 ID、伪造 token、未注册执行以及 token/诊断 ID 冲突均通过稳定 CommandError 显式失败。注销后同一 ID 可安全重新注册，失败注册不会覆盖既有 handler。
