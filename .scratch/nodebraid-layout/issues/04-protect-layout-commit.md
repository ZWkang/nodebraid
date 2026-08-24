# 04 — 阻止无效、取消或过期 Proposal 提交

**What to build:** 让 Layout Command 只在 Provider 返回完整、合法且仍基于当前 revision 的 Proposal 时写入 Document，其他情况保持零部分提交。

**Blocked by:** 02 — 通过 typed Command 原子提交 full layout

**Status:** completed

- [x] 重复、缺失、额外 ID，非有限坐标与 Fixed Node 移动均以 `INVALID_PROPOSAL` 失败。
- [x] 取消保留原因，并发计算遵循 first-commit-wins，过期结果以 `STALE_PROPOSAL` 失败。
