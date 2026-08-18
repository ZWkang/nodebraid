# 04 — 严格编辑 Node 并折叠净零变化

**What to build:** 让 Command 作者可以通过严格 replace/remove 编辑已有 Node，并让一次 Transaction 中对同一 Node 的多次写入折叠成最初 before 与最终 after；恢复原值的工作不产生 commit。

**Blocked by:** 02 — 提交第一笔 Node Transaction.

**Status:** resolved

- [x] Node writer 的 replace/remove 对缺失实体显式失败，replace 的目标 ID 与实体 ID 不一致时显式失败。
- [x] add 已存在 Node 时显式失败，失败操作不修改当前 Draft。
- [x] add→replace、replace→remove 与 remove→add 分别折叠为 null→final、original→null 与 original→final。
- [x] add→remove、replace→original 与 remove→identical add 被识别为无净变化并从 Change Set 省略。
- [x] 整个 Transaction 无净变化时返回 `null`，不增加 revision，并保持 Canvas View、Snapshot 与 Query 根引用。
- [x] Kernel-owned Node 字段按值比较；任意 `data` 使用 `Object.is`，新建的深度相等对象仍是变化。
- [x] 未变化实体可以复用旧引用，旧 Canvas View 在后续 replace/remove 后仍保持稳定。
- [x] Node Snapshot 与 Node Change 使用规范 ID ordering，不把插入历史当作公开顺序。

## Answer

已实现严格 Node replace/remove、ID mismatch、完整 operation coalescing 和净零 Transaction。Kernel-owned 字段按值、`data` 按引用比较；净零保持 revision 与 Canvas View 引用，真实变化生成确定排序的 before/after Change。当前 13 个公开行为测试、64 个断言、包级 typecheck 与 build 通过。
