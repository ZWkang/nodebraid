# 03 — 实现多 Node Drag 与可逆提交

**What to build:** 让用户从已选 Node 开始一次可见的单或多 Node Drag，在 pointermove 期间只更新 Gesture Preview，并在 pointerup 通过一个 Move Nodes Command 原子产生至多一个可撤销 Commit。

**Blocked by:** 02 — 实现完整 Selection 交互。

**Status:** resolved

- [x] 从 pointerdown Screen Point 计算可配置阈值，阈值以下保持 click，跨过后不再回退。
- [x] 未选 Node Drag 只选择并预览该 Node；从已选 Node 开始时预览所有 selected Nodes，selected Edges 保留但不独立移动。
- [x] pointerup 按 clear Projection、结束 Gesture、执行 `interaction.nodes.move` 顺序完成一次同步 Transaction，返回 CanvasCommit 或 null。
- [x] Move Nodes Command 校验非空、规范、唯一且有限的逐 Node 起点/目标 position，只替换当前完整 Node 的 position。
- [x] 无关 Commit 和 Node data/size 变化不取消 Drag；Node position 竞争或删除使整次 Gesture stale 且不部分提交。
- [x] 真实 Chromium 验证 Preview、incident Edge、DOM identity、一个 History Entry、Undo、Redo 与 net-zero no-op。

## Answer

Interaction 现从 pointerdown Screen Point 以四个 CSS pixel 阈值区分 click 与 Node Drag，并为单个或所有 selected Nodes 产生只写 Renderer 的 Gesture Preview。pointerup 先清 Projection，再通过 `interaction.nodes.move` 对规范、唯一、有限且与当前 position 一致的全部 Node 完成一次 Transaction。真实 Chromium 已验证多 Node Preview 与一次提交，History 可以一次 Undo/Redo 整个 Gesture；外部位置竞争使整组移动以 Stale Gesture 取消而不部分覆盖。
