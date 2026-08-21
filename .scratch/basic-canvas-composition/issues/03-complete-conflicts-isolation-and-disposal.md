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

真实 Plugin Host 已验证已有 Kernel Provider、后置 Renderer Provider 和第二份 Basic Canvas Composition 都通过标准 `PROVIDER_CONFLICT` 失败且不破坏现有 Runtime；后置冲突会回滚已经创建的 Kernel、Command 与 Session reservations。真实 SVG Chromium 场景证明两个独立 Host 获得不同 Projection、Kernel revision 与 Session Snapshot。Host Diagnostics 锁定 History、Interaction、Renderer、Session、Command、Kernel 的完整逆序 Activation 释放；异步 Renderer dispose 会被等待，Binding、Input 与 Renderer cleanup 的多个失败也均被尝试并保留在最终 AggregateError 中。
