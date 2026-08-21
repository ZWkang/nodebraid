# 03 — 完成冲突、隔离与异步释放

**What to build:** 让已有 Provider、重复 Composition、多 Canvas 和终态清理都遵循 Plugin Host 的严格冲突、隔离与异步资源所有权语义，不出现 silent skip、共享状态或假成功。

**Blocked by:** 01 — 建立首个 Basic Canvas Composition 闭环。

**Status:** resolved

- [x] 已有标准 Service Provider 与重复 Basic Canvas Composition 通过现有 Provider reservation 显式失败。
- [x] 冲突或失败回滚后不残留 Child Service reservation，显式 dispose 后允许新的 Composition 安装。
- [x] 两个 Plugin Host 可以分别激活 Composition，并拥有彼此隔离的 Kernel、Session 与 Renderer 实例。
- [x] Composition dispose 等待 Renderer async dispose，并按 History、Interaction、Renderer、Session、Command、Kernel 顺序结束依赖。
- [x] 多个 cleanup failure 继续完成其余释放，并通过现有 AggregateError 层级显式返回。

## Answer

真实 Plugin Host 已验证已有 Kernel Provider 和第二份 Basic Canvas Composition 都通过标准 `PROVIDER_CONFLICT` 失败且不破坏现有 Runtime。两个独立 Host 获得不同 Renderer、Kernel revision 与 Session Snapshot。父 Composition 的 LIFO ownership 会先移除 History/Interaction Commands，再进入 Renderer cleanup，并等待异步 dispose；Binding、Input 与 Renderer dispose 的多个失败均被尝试并保留在最终 AggregateError 中。
