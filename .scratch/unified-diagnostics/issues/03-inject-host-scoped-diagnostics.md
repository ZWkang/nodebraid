# 03 — 在 Plugin Host seam 注入作用域化 Diagnostics

**What to build:** 扩展 `createPluginHost(options?)` 和 Plugin Context，让每个 Host 拥有隔离的同步 Sink、Fault Reporter、ID、sequence 和 scoped PluginDiagnostics。

**Blocked by:** 01 — 建立 Diagnostics deep module

**Status:** resolved

- [x] 保持 `createPluginHost()` 无参数兼容。
- [x] 为 Host、Installation、Activation 和 Event 生成稳定诊断 ID。
- [x] Plugin Context 只暴露 `emit()` 与 `reportFault()`，不能覆盖 scope。
- [x] 事件在交给 Sink 前复制、校验和冻结。
- [x] 实现无 Sink、默认平台 Reporter、Sink/Reporter failure 与非递归最终上报。
- [x] 通过 Host-scoped in-memory Adapter 证明 Sink、Reporter、ID、scope 和 sequence 隔离。

## Answer

`createPluginHost({ diagnostics })` 现可注入 Host-scoped Sink、Fault Reporter 与可选 hostId；Plugin Context 获得只含 `emit()` / `reportFault()` 的 scoped Interface。事件自动补齐 Installation/Activation/Plugin scope、ID、sequence、timestamp，并在交付前校验、复制和冻结。Sink/Reporter throw、PromiseLike 返回、非法 event/attributes/hostId 都通过公开 seam 显式暴露且不递归。
