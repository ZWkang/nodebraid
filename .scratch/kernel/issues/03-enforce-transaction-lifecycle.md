# 03 — 封闭 Transaction 生命周期与失败原子性

**What to build:** 让 Kernel 调用者在误用异步 callback、嵌套 Transaction 或已经结束的 Transaction Context 时立即得到明确错误，同时保证每条失败路径都不改变已提交 Document、revision 或 Canvas View。

**Blocked by:** 02 — 提交第一笔 Node Transaction.

**Status:** resolved

- [x] callback 返回 Promise 或任意 thenable 时以 `ASYNC_TRANSACTION` 失败并回滚 callback 在返回前暂存的全部写入。
- [x] 同一 Kernel 上的嵌套 `transact()` 以 `TRANSACTION_REENTRANT` 失败；错误逃出外层 callback 时外层也回滚。
- [x] 外层 callback 可以捕获 reentrant 或即时 writer 错误，并从未被失败操作部分修改的 Draft 继续。
- [x] callback 结束后，泄漏的 Transaction Context、Query 与当前已公开 writer 均以 `TRANSACTION_CLOSED` 失败；后续 writer 必须复用同一 guard。
- [x] Context 在成功、无净变化、callback 错误和最终校验错误之后都进入 closed 状态。
- [x] 所有 Kernel 结构错误通过稳定 `KernelError` code 与 readonly details 暴露；用户 callback 错误仍保持原值。
- [x] 所有失败路径保持 revision、当前 Canvas View 根引用和已提交 Query 结果不变。
- [x] 不引入隐藏 retry、timeout、fallback 或 fake success。

## Answer

已封闭 Transaction 动态生命周期：thenable callback、同 Kernel 重入和 callback 结束后的 Context/Query/writer 使用均通过稳定 KernelError 显式失败，所有未捕获失败完整回滚；即时 writer 或重入错误也可被外层 callback 捕获后继续。当前 9 个公开行为测试、45 个断言、包级 typecheck 与 build 通过。
