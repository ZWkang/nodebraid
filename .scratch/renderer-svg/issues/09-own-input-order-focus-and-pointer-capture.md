# 09 — 拥有 Input 顺序、Focus 与 Pointer Capture

**What to build:** 让直接 Provider 与 Runtime 使用者都得到确定的 Input Subscription 顺序，并通过 NodeBraid control methods 安全使用真实 DOM Focus 和 Active Pointer Capture。

**Blocked by:** 08 — 规范化真实浏览器 Input.

**Status:** resolved

- [x] Input listeners 按注册顺序以稳定当前集合接收通知。
- [x] 通知中订阅或取消只影响下一条 Input，重入 Input 以 FIFO 广度优先交付。
- [x] listener 失败不阻断后续 listener 或 Input，drain 后显式抛出原异常或 AggregateError。
- [x] `focus()` 以 preventScroll 获得真实焦点，必要时临时添加 `tabindex="-1"`。
- [x] 只有 Active Pointer 可 capture，重复 capture/release 幂等，up、cancel 自动结束 capture。
- [x] capture 后移出 Target 的 Pointer 仍持续发布，未知或已结束 ID 以 `INVALID_POINTER` 失败。

## Answer

Input Subscription 现在使用稳定 listener snapshot 与 FIFO 队列，所有当前 Input 通知完成后才交付重入 Input，listener 错误不阻断交付并在 drain 后显式暴露。Provider 以 preventScroll 获得真实 Focus，并将 tabindex 限定为 Provider-owned 临时属性；Pointer Capture 使用真实 DOM API，只接受 Active ID、重复操作幂等且在 up/cancel 后自动结束。
