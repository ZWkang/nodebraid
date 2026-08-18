---
status: accepted
---

# 只通过 Transaction 回放 Change Set

Kernel 在 Transaction Context 内提供 Change Set 的正向与反向应用能力，不增加绕过 Transaction 的顶层 restore 写入口，也不要求 History 重复实现实体恢复、应用顺序和当前状态匹配。回放仍然只校验最终图并产生一个 revision 单调递增的新 commit；当当前实体状态与 Change Set 的来源侧不匹配时显式失败，不能覆盖后续修改或静默降级。
