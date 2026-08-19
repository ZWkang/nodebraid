# 03 — 应用 keyed 连续 Commit

**What to build:** 让 SVG Renderer 在首次 reset 后接受连续 Canvas Commit，对 Node 与 Edge 原位增量更新，保留已有 DOM identity 并对任何重复、stale 或跳号提交显式报告失步。

**Blocked by:** 01 — 创建 SVG Provider 并投影首个 Node.

**Status:** resolved

- [x] 连续 Commit 可增加、替换、移动、调整尺寸和删除 Node 与 Edge。
- [x] 已有 keyed 实体在 commit 后保留同一 SVG element identity。
- [x] 增删后实体仍按规范 ID 顺序排列。
- [x] reset 可以跳到任意有效 revision 并重建实体 DOM。
- [x] 无 Baseline、重复、stale 和跳号 Commit 都以 `DOCUMENT_OUT_OF_SYNC` 失败，不修改原状态。

## Answer

SVG Renderer 现在在本地 Baseline revision 上接受连续 Canvas Commit，对 Node 和 Edge 完成 keyed 增、改、删与规范重排，并保留已有实体的 SVG element identity。重复、stale、跳号或无 Baseline Commit 均以稳定 `DOCUMENT_OUT_OF_SYNC` details 失败，显式 reset 可在任意有效 revision 重建 Projection 与 identity。
