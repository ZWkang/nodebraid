# 10 — 拥有 Target Reservation 与终态 Dispose

**What to build:** 让同一 SVG Target 在任何时刻只属于一份活跃或正在清理的 Renderer Instance，并在终态 dispose 中完整释放 Provider-owned 资源而不破坏调用方 DOM。

**Blocked by:** 05 — 回滚失败的 DOM patch; 06 — 投影 Session 与 SVG 坐标系统; 09 — 拥有 Input 顺序、Focus 与 Pointer Capture.

**Status:** resolved

- [x] 进程内 Reservation 或稳定 DOM marker 任一存在都以 `TARGET_OCCUPIED` 拒绝第二份 Factory。
- [x] dispose 调用后 Renderer 立即进入终态，所有调用复用同一 Promise。
- [x] 清理取消 Input 与 Pointer Capture、断开 ResizeObserver、移除 Projection 并恢复 Provider-added Target attributes。
- [x] 调用方 SVG 内容与 Target 本身在 dispose 后保留。
- [x] 成功清理后 Target 可创建新 Renderer；清理期间或失败后仍保留 Reservation。
- [x] 清理失败聚合并显式拒绝，全部过期公共调用以 `RENDERER_DISPOSED` 失败。

## Answer

SVG Target 现在从 Factory 接受到成功 cleanup 一直保持进程内与 DOM marker 双重 Reservation。`dispose()` 调用后同步停止 Input、使全部旧方法终态失败，并以同一 Promise 完整尝试 capture/listener/observer/Projection/attribute 清理。零错误时释放 Reservation 并允许重新创建；任一清理错误都聚合暴露并保留占用。
