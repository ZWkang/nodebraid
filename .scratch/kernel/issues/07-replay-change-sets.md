# 07 — 正反向回放 Change Set

**What to build:** 让 History 可以在同一个 Transaction seam 内正向或反向应用 Kernel Change Set，安全完成 Undo/Redo 的实体恢复，而不会绕过最终图校验、倒退 revision 或覆盖后来修改。

**Blocked by:** 06 — 校验父子图与几何最终态.

**Status:** resolved

- [x] Transaction Context 提供 forward 与 reverse Change Set 应用，不增加顶层 restore 写入口。
- [x] forward 在任何修改前验证受影响实体匹配 `before`，reverse 验证匹配 `after`。
- [x] source matching 使用与净变化一致的 Kernel-owned 值比较和 `data` 引用比较，只检查受影响实体。
- [x] 任一 source mismatch 以 `CHANGE_SET_CONFLICT` 失败，且本次 apply 不留下部分 Draft 修改。
- [x] malformed Change Set 以 `INVALID_CHANGE_SET` 与 readonly details 失败，并与有效但 stale 的冲突区分。
- [x] replay 后仍执行完整最终图校验，并产生新的单调 revision、新的 before/after Canvas View 与新的 Change Set。
- [x] replay 使用外层 Transaction metadata，不复制来源 Change Set 的 origin 或 command ID。
- [x] 原 Change Set revision 只用于结构校验和诊断，不要求等于当前 Kernel revision。
- [x] 两个 Node、一条 Edge、Node replace、reverse 和 forward 形成公开 seam 下的完整可逆闭环。

## Answer

已在 Transaction Context 内实现 Change Set forward/reverse。回放先验证完整结构和所有 affected source values，再按方向应用并接受普通最终图校验；malformed input 与 stale conflict 使用不同 KernelError，失败不留下部分 Draft。当前 24 个公开行为测试、107 个断言、包级 typecheck 与 build 通过。
