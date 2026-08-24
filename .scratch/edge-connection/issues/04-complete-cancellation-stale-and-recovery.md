# 04 — 完成 Connection 取消、stale 与 recovery

**What to build:** 让 Connection 在删除、竞争 Commit、Escape、pointer cancel/lost capture、清理失败、dependency loss 与 Renderer recovery 中显式、可恢复且无残留状态。

**Blocked by:** 03 — 通过真实 Runtime 连接并回放 Edge。

**Status:** resolved

- [x] source 删除取消，target 删除只清 candidate，Geometry/无关 Commit 保持并重投 Preview。
- [x] Edge ID 与 Node 竞争以 `STALE_GESTURE` 拒绝整次 Transaction。
- [x] Escape、pointercancel、lost capture 不提交，Preview/Capture 终止顺序确定。
- [x] 清理继续执行并聚合全部错误，任一终止清理失败都禁止 Commit。
- [x] dependency reactivation 为全新 idle Activation；reset 恢复与终态 `SYNC_FAILED` 沿用现有 Renderer contract。
- [x] materializer/command Fault 只报告一次且保留原始失败身份。

## Answer

Connection 终止已统一为 idle-first、Preview/Capture failure-preserving cleanup；删除、竞争、Hit Test fault、materializer fault、dependency recovery 和 Renderer rollback 都由 public seam 回归测试锁定。
