# 02 — 只分发成功提交并隔离 Observer 错误

**What to build:** 为 KernelService 增加同步 `observeCommits`，只分发成功且有净变化的 CanvasCommit，并让失败 Observer 不影响提交或其他 Observer，同时显式报告错误。

**Blocked by:** 01 — 提供 revision-zero Kernel Service.

**Status:** resolved

- [x] 净零、callback 抛错和 Kernel 校验失败均不通知 Observer。
- [x] 成功 Commit 在 transact 返回前同步且恰好分发一次。
- [x] Observer 抛错不回滚 Kernel，也不阻断后续 Observer。
- [x] Observer 错误通过平台 `reportError` 或异步抛出显式报告。
- [x] 取消订阅幂等。

## Answer

`observeCommits` 只同步分发 Kernel 返回的非空 CanvasCommit。callback 失败、结构校验失败和净零 Transaction 均无通知；Observer 错误保持在提交之后，通过平台 error channel 显式报告并继续通知其他 Observer。
