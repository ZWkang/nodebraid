# 03 — 随 Required Service 可用性重新激活 Consumer

**What to build:** 让 active Consumer 始终只使用当前可用的 Required Service。Provider 消失时 Consumer 会先取消并清理当前 Activation、回到 pending；替代 Provider 出现后，Consumer 使用固定配置和全新的 Activation 状态重新工作。

**Blocked by:** 02 — 通过强类型 Runtime Service 连接 Provider 与 Consumer.

**Status:** resolved

- [x] Provider 开始停用时，直接和间接 Consumer 在 Provider Service 撤销前按反向依赖顺序收到 AbortSignal 并完成清理。
- [x] 正常依赖消失使 Consumer 从 active 回到 pending，而不是 failed；Snapshot 重新列出缺失 Required Service。
- [x] 新 Provider 激活后，pending Consumer 自动创建新的 Activation，并收到新 Service 引用、新 AbortSignal 和新 Owned Resource 栈。
- [x] Plugin Installation 配置在多次 Activation 中保持同一固定值，不被 Host 深拷贝、合并或替换。
- [x] `whenActive()` 在 active 时立即完成、pending 时等待下一次 active，并在 failed 或 disposed 时拒绝。
- [x] `whenActive()` 的 AbortSignal 只取消当前 waiter，不会停用或 dispose Plugin Installation。
- [x] dispose 或依赖消失可以中止进行中的异步 setup；Host 等待 setup 收尾并回滚资源，不能错误发布 Service 或报告 active。
- [x] 忽略 AbortSignal 且永不结束的 setup 会明确拖住相关 dispose，不增加隐藏超时或假成功路径。
- [x] setup 或非取消 Activation 错误进入 failed，failed 不会因无关 Service 变化自动重试，恢复必须 dispose 后重新 install。
- [x] 同一个 Installation 的生命周期转换保持串行；无依赖关系的 Installation 可以并发 Activation，测试以可控 Promise 验证两项语义。

## Answer

已将一个 NodeBraid Plugin Installation 映射为一个 Cordis Fiber，并在 Cordis 每次 inject/reload 时创建新的 NodeBraid Activation。Provider 消失会驱动直接与间接 Consumer 先 Abort、逆依赖清理并回到 pending；替代 Provider 会以固定配置和全新 Service、Signal、资源栈重新激活。公开 seam 的 35 个测试、124 个断言和全部 package checks 均通过，未实现 Child Installation。
