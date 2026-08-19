---
status: accepted
---

# 保持 Renderer Session 可由当前 Document 解析

Renderer Runtime adapter 串行交付独立的 Document 与 Session 更新，并保证每次送达的 Selection 都能在 Renderer 当时已接受的 Document 中解析。Commit 删除已选实体时，adapter 先送达协调后的 Session Snapshot，再送达该 Document Commit；新实体提交后产生的 Selection 则在对应 Commit 之后送达。这个顺序不能依赖 Kernel 与 Session subscriber 的注册顺序，因为 Session 广度优先重入会改变两条回调链的相对时机；协调复杂度留在深 Runtime implementation，具体 Renderer Provider 不需要处理悬空 Selection 或复制 Session reconciliation。
