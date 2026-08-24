# 01 — 让自定义 Layout Engine 计算 full Proposal

**What to build:** 让高级调用方能从已提交 Canvas View 生成不可变 Layout Input，通过自定义 Layout Engine 异步计算并验证一份 full Layout Proposal。

**Blocked by:** None — can start immediately

**Status:** completed

- [x] 公开 Layout computation seam 保持 Node/Edge ID、Size、position、revision 和确定顺序。
- [x] Engine 执行始终返回 Promise，接收 AbortSignal，并产生精确覆盖输入 Node 的不可变 Proposal。
