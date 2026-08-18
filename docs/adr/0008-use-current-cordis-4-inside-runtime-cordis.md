---
status: accepted
---

# 在 runtime-cordis 内使用当前 Cordis 4

CFlow 首版使用决策时 npm latest 的 Cordis 4 版本，并在预发布阶段精确锁定依赖；2026-08-17 对应 `cordis@4.0.0-rc.8`。Cordis 只作为 `@cflow/runtime-cordis` 的进程内生命周期实现，Plugin Host 优先映射到 Cordis 的 Context、Fiber、inject、effect、provide 与异步 dispose，而不自行重复实现第二套调度器。`@cflow/core` 重新导出 CFlow Plugin Host interface，但不暴露任何 Cordis 类型；未来升级 Cordis 只允许影响 `runtime-cordis` 的 implementation。
