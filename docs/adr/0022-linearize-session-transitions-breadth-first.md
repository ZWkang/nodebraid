---
status: accepted
---

# 以广度优先队列线性化 Session 状态转换

Session 的每次状态转换固定本轮 subscriber 集合，并让它们通过 `getSnapshot()` 观察同一个当前 Snapshot；通知期间重入的外部 mutation 与基于 `commit.after` 的 Kernel reconciliation 在调用时校验后按顺序入队，等本轮通知结束再逐项应用，且在最外层转换返回前排空。重入调用自身会在排队项应用前返回，订阅变更也只影响后续轮次。相比立即递归导致同轮 subscriber 读取不同状态，或拒绝重入导致合法 reconciliation 失败，广度优先顺序提供了一致且可组合的观察语义。
