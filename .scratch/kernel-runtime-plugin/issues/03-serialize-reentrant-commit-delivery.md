# 03 — 串行化重入 Commit 分发

**What to build:** 当 Commit Observer 内再次调用同步 `transact` 时，把后续 Commit 排到当前分发之后，使所有 Observer 严格先看到 revision N，再看到 N+1。

**Blocked by:** 02 — 只分发成功提交并隔离 Observer 错误.

**Status:** open

- [ ] Commit 按 revision 与 Transaction 完成顺序进入 activation-local 队列。
- [ ] 重入 transact 不启动嵌套分发循环。
- [ ] 所有 Observer 先完成 N 的通知，再开始 N+1。
- [ ] 多次重入仍保持单调且无重复的 Commit 序列。
