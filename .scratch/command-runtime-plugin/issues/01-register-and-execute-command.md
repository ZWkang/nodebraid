# 01 — 注册并执行强类型 Command

**What to build:** 新增 `@nodebraid/plugin-command`，让 Feature Plugin 在真实 Command Service Activation 中注册一个强类型 Command，并让调用方执行同步或异步 handler、收到输入与原始结果/错误。

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] 导出 `defineCommand`、`Command`、`commandService`、`commandPlugin` 与最小执行 interface。
- [x] 每次 Activation 提供空 Service；handler 收到独立 signal 与规范 commandId。
- [x] 同步/异步结果进入同一个 Promise seam，handler 错误保持原值。
- [x] 通过公开 PluginHost/CommandService seam 做 red → green。

## Answer

已通过真实 Plugin Host Activation 提供空 Command Service，并用强类型 token 注册和执行同步/异步 handler。公开 Promise seam 保留原始结果与错误，handler 收到独立 AbortSignal 和规范 commandId；首个测试先因缺失模块红灯，再由最小实现推进为 green。
