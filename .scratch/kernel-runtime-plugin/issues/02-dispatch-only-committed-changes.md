# 02 — 只分发成功提交并隔离 Observer 错误

**What to build:** 为 KernelService 增加同步 `observeCommits`，只分发成功且有净变化的 CanvasCommit，并让失败 Observer 不影响提交或其他 Observer，同时显式报告错误。

**Blocked by:** 01 — 提供 revision-zero Kernel Service.

**Status:** open

- [ ] 净零、callback 抛错和 Kernel 校验失败均不通知 Observer。
- [ ] 成功 Commit 在 transact 返回前同步且恰好分发一次。
- [ ] Observer 抛错不回滚 Kernel，也不阻断后续 Observer。
- [ ] Observer 错误通过平台 `reportError` 或异步抛出显式报告。
- [ ] 取消订阅幂等。
