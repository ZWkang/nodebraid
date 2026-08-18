# 02 — 提交第一笔 Node Transaction

**What to build:** 让 Command 作者可以在一个同步、原子的 Transaction 中添加 Node，并从公开 Kernel seam 得到匹配的 before View、after View 与 before/after Change Set；失败时不暴露部分 Document。

**Blocked by:** 01 — 创建可读取的空 Kernel.

**Status:** resolved

- [x] `transact()` 接受同步 callback 和可选 origin、command ID metadata，并只在 callback 完成后提交最终 Draft。
- [x] Transaction Context 通过分组 Node writer 提供严格 add，并通过 Canvas Query 读取此前暂存的 Node。
- [x] 第一次有效 Node commit 将 revision 从 0 增加到 1，并返回 exact before/after Canvas View 引用和匹配 Change Set。
- [x] Node Change 保存完整 `before: null` 与冻结后的 `after` Node，metadata 进入本次 Change Set。
- [x] Node position 只接受有限数；最终几何无效时整体回滚并返回结构化 `INVALID_GRAPH`。
- [x] callback 抛出的原始错误保持身份、不被 KernelError 包装，并完整回滚。
- [x] Transaction 期间普通 `read()` 仍返回提交前 View，只有 Transaction Query 能看到 Draft。
- [x] Kernel 防御性复制并冻结 Node、Point 与 Snapshot 容器，但不冻结任意 `data`。
- [x] Node 与 Change Set 按确定的 ID 规则观察，不依赖写入顺序。

## Answer

已通过公开 `transact()` seam 跑通首个 Node commit：Draft Query 可见暂存 Node，committed read 在 callback 内仍保持旧 View，成功后返回对齐的 before/after View、revision、metadata 和 before/after Change Set。callback 与 invalid-position 失败均完整回滚。当前 5 个行为测试、34 个断言、包级 typecheck 与 build 通过。
