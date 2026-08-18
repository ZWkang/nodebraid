# 03 — 由注册与 Activation 拥有进行中执行

**What to build:** 让调用方、Command Registration 与 Command Service 可以通过同一 execution signal 协作取消，并让注销/释放等待真实 handler 收尾后才完成。

**Blocked by:** 02 — 强制 Command 身份与注册唯一性.

**Status:** resolved

- [x] 调用方 AbortSignal 只取消一次执行，各执行 signal 相互隔离。
- [x] Registration dispose 先注销，再 Abort 并等待全部进行中执行，且异步幂等。
- [x] handler 忽略 signal 时 dispose 保持未完成，不增加 timeout 或假成功。
- [x] Service dispose 清理残留注册，旧 Service 显式失败，重装得到空 Service。

## Answer

每次 Command execution 现在由独立 AbortController 与 settlement 记录表示。调用方取消只影响本次执行；Registration 与 Service 释放会同步撤销可见性、Abort 所有仍在执行的 handler，并等待真实 settlement。旧 Service 显式关闭，Provider 重装后提供没有继承注册的新 Service。
