---
status: accepted
---

# 用源实体 identity 与内部 Edge 闭包保护 Duplicate

Duplicate Selection Command 捕获当前 Selection 与精确 Canvas View，在 materializer 返回后、Transaction 写入前，要求每个源 Node、每条内部 Edge 仍是捕获时的同一 committed root，并要求选中 Node 之间的内部 Edge ID 闭包完全相同；任意 replace、删除、新内部 Edge 或 same-value ABA 都以 Stale Duplicate 拒绝整次提交。外部 incident Edge 与无关 Commit 不阻断复制，Command 不绑定全局 revision，也不建立通用 optimistic-lock 系统。
