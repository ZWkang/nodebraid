---
status: accepted
---

# 通过原子 Transaction 建立新的 History Baseline

History Plugin 增加 `establishHistoryBaselineCommand`，接受一个同步
`TransactionContext` callback，返回实际 `CanvasCommit | null`。
History Service 仍只提供稳定 Snapshot 与订阅；文件读取、Document 解码与图写入意图
由应用拥有，History 只拥有事务成功后的 Baseline 与记录边界。

callback 与 Kernel 最终校验成功后，旧 Undo/Redo 被清空，该 Baseline Commit 不形成
History Entry；后续普通 Commit，包括观察者重入产生的 Commit，继续正常记录。
净零事务同样建立新的 Baseline。失败保留原 Document 与历史，不能先清 History 再写图，
也不能在已经提交后异步补做清空。

Baseline 与 Undo/Redo 共用已有 single-flight、caught-up、取消与生命周期契约。
识别依赖实际操作和 Commit identity，不依赖可伪造的 origin/commandId 或 skip-next 标志。
直接保留 Kernel 对异步 callback 的拒绝。已经成功提交的操作不因迟到的取消或
Activation 结束而伪报未提交。

此决定扩展原先只在 Activation 开始建立 Baseline 的契约，并保留 ADR-0015/0016 的
重入与 Snapshot 发布语义。恢复整图时继续使用已有 Runtime；切换 React Runtime Factory
会按 ADR-0083 先释放旧 Runtime，不能保证后继初始化失败时保留原图。
