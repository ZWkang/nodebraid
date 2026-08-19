# 05 — 发布首版 Runtime 事件目录

**What to build:** 按 spec 的固定目录记录 Host、Installation 与 Activation 生命周期，并锁定状态更新、Sink 和 subscriber 之间的顺序与去重规则。

**Blocked by:** 03 — 在 Plugin Host seam 注入作用域化 Diagnostics; 04 — 统一 Subscriber 与 Observer Fault 上报

**Status:** resolved

- [x] 每个 emitting package 在单一 `diagnostic-events.ts` 声明 event constants。
- [x] 实现 Host created/disposing/disposed 事件。
- [x] 实现 Installation status changed/dispose failed 事件。
- [x] 实现 Activation started/ended 事件与有限 reason。
- [x] failed Snapshot 先替换状态、再发事件、最后通知 subscriber。
- [x] 证明 throw/rethrow、Command、Transaction 和 Provider failure 不被重复自动记录。

## Answer

Diagnostics、Runtime、Kernel Plugin、Session 与 History 均在单一文件拥有并公开稳定 event catalog。Host、Installation 与 Activation lifecycle 已实现固定 level、scope、sequence 与 ordering；failed Snapshot 保留原错误并在 subscriber 前发 error status，terminal cleanup 只发一次 dispose-failed。现有 Handler/Transaction/Provider identity 测试继续通过，未加入高频成功 tracing。
