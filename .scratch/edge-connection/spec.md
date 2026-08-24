# CFlow Interaction v1 Edge Connection

**Status:** ready-for-agent

## Problem Statement

CFlow 已有 Selection、multi-Node Drag、Pan、Wheel Zoom、Focus、取消、恢复与 History 闭环，但还不能从真实 Renderer Input 创建 Edge。现有 `HitResult` 虽然预留 Port 形状，SVG Provider 没有 Port Geometry、不产生 Port hit，也会显式拒绝 port-qualified Edge。Kernel 只保存 Edge 内嵌 Endpoint，不生成 Edge ID、不解释 Port，也不判断业务连接规则。

目标是以一条真实纵向链路确定 Connection、Connection Anchor 与 Port 的 seam：mouse pointer down source Anchor → Connection Gesture → transient Preview → target hit/structural validation → typed Create Edge Command → one synchronous Kernel Transaction → Canvas Commit → SVG projection → History undo/redo。

## Solution

扩展现有 `@cflow/interaction-api` 与 `@cflow/plugin-interaction`，不新建 Connection package。Connection 使用同一 Active Gesture authority 与排他 Interaction Projection Binding。Renderer 为每个正尺寸 Node 派生 node-level source/target Connection Anchor；Anchor 不是 Document 实体、Port 或 Endpoint。首版 Edge Endpoint 仅保存 `nodeId`，Port 实体与 Registry 继续暂缓。

应用通过可选的窄同步 materializer 为已确认 source/target 产生完整 `CanvasEdge`，因而拥有 Edge ID、type 与 opaque data。Interaction 执行公开 typed Create Edge Command；handler 以 Anchor evidence 校验完整 Edge，并在一个同步 Transaction 内重验 Node 存在性、Endpoint、self-loop 与 Edge ID 可用性后提交。

SVG Provider 新增 Anchor 语义 Hit Result、位于 Node layer 之上的 provider-owned Interaction layer、Connection Preview line 与稳定 DOM seam。Anchor 中心是 World Point，命中容差使用稳定 CSS logical pixels。显示、Hit Test 与 Input World Point 继续来自同一 Effective Renderer State。

## Confirmed Interface Decisions

- Connection Anchor identity 是 `{ nodeId, role: 'source' | 'target' }`，不表达 Port。
- `HitResult` 新增 `connection-anchor`，Anchor 命中优先于 Node body。
- source Anchor 在 Node 右侧中点，target Anchor 在左侧中点。
- Anchor 只从 SVG 已接受的正尺寸 Node 派生；零尺寸 Node 继续按现有 SVG contract 显式拒绝。
- SVG `connectionAnchorHitTolerance` 默认 `8 CSS px`，有限且非负，不随 zoom、DPR、viewBox 或 CSS transform 变化。
- Renderer 始终派生 Anchor；未配置 materializer 时 Anchor 按所属 Node 执行 Selection。
- `connection-preview` 完整替换值包含 source、Pointer World Point 和 `none | valid | invalid` target。
- Interaction layer 属于同一 SVG Projection subtree；Anchor 和 Preview DOM 不是 Document 实体。
- Anchor 和 Preview 只暴露 class/data/geometry seam，视觉半径、fill、stroke 由 CSS 控制。
- materializer 同步接收 source/target node-level Endpoint 并返回完整 `CanvasEdge`。
- Create Edge Command input 包含完整 Edge 与 source/target Anchor evidence，返回 `CanvasCommit`。
- 首版只做结构前置条件：拒绝 self-loop 和 Port，允许 parallel Edge，不增加业务 validator。
- `INVALID_CONNECTION` 表达 malformed input/materialized Edge；`STALE_GESTURE` 表达 Node 消失或 Edge ID 竞争。
- Connection Projection Baseline 只依赖 source 与可选 target Node 存在性，不绑定 Geometry 或全局 revision。

## Gesture Decisions

- 优先级为 auxiliary/Space Pan → plain primary source Anchor Connection → Node Drag/Selection/Canvas Pan。
- Connection 只接受 mouse；pen/touch 显式拒绝。
- source pointerdown 立即 Focus、Capture 并显示 Preview，不使用 Drag threshold。
- pointermove 更新 `none | valid | invalid` target；pointerup 重新 Hit Test 并至多提交一条 Edge。
- source 原地点击只取消；target Anchor 单独点击按 Node Selection 处理。
- pointer cancel、lost capture、Escape、source 删除、dependency loss 和 dispose 取消整个 Gesture。
- target 删除只清 candidate；Node position/size/data 变化与无关 Commit 不取消。
- 终止先进入 idle，再清 Preview、释放 Capture，最后提交或发布 cancellation。
- 终止清理失败时继续其余清理并聚合错误，但不得提交 Edge。

## Recovery And Diagnostics Decisions

- Document Commit 移除 Preview 引用的 Node 时，Renderer 在接受 Commit 前清 Projection。
- Geometry 变化保持 Projection 并以最新 Effective State 重算 Anchor。
- reset 一律清 Projection；active Interaction 在成功 recovery 后重发完整 Projection。
- SVG Interaction layer 纳入预检、defensive copy、DOM rollback journal 和 projection-out-of-sync 语义。
- rollback 失败后 Runtime 仅做一次完整 reset；再失败进入 `SYNC_FAILED`。
- 继续使用 `interaction` error domain，不新建 Connection domain。
- materializer 外部失败保留原始身份，通过 `cflow.plugin.interaction.connection-materializer.fault` 报告一次。
- invalid target 是预期 cancellation，不是 Fault；diagnostics 不携带图 ID、坐标、data 或 config。
- dependency reactivation 建立全新 idle Activation，不继承 Gesture、Pointer、Preview、key 或 materializer snapshot。

## Public Test Seams

1. **Real Runtime + SVG + Chromium**: 证明 Anchor、Hit、Preview、mouse input、Commit、History、cancel 与 dispose 成功路径。
2. **Direct CanvasRenderer interface**: 证明 Projection 结构、defensive copy、baseline、reset、Hit、坐标和 DOM rollback。
3. **Real Plugin Host + controlled public adapter failure**: 仅用于 materializer、Binding、cleanup、dependency 与 recovery fault injection。

成功 Connection 不得用 fake Renderer 证明；测试不跨越公开 seam 断言私有 Gesture object、DOM journal 或 parser helper。

## User Stories

1. User can start a Connection from a visible source Anchor with a primary mouse pointer.
2. User sees a transient line that follows the Pointer without modifying Document or Session.
3. User sees valid and invalid target Anchor states without Renderer interpreting business rules.
4. User can release on a valid target and create exactly one Edge in exactly one Transaction.
5. User can undo and redo the created Edge through existing History.
6. User cannot create self-loops or port-qualified Edges through v1 Connection.
7. User can create parallel Edges with different IDs.
8. Application owns Edge ID, type, and data through a synchronous materializer.
9. Missing materializer leaves Connection disabled while Anchor hits retain Node Selection behavior.
10. Pan keeps priority over Connection for auxiliary or Space-assisted input.
11. Mouse Connection does not silently accept pen or touch.
12. Pointer cancellation, lost capture, and Escape clear Preview without committing.
13. Source deletion cancels; target deletion clears only the candidate.
14. Geometry and unrelated commits preserve the Gesture and reproject from current state.
15. Edge ID or Node competition rejects the commit as stale without partial mutation.
16. Cleanup failures remain explicit, aggregate all attempted cleanup, and prevent commit.
17. Dependency recovery starts from a fresh idle Interaction Activation.
18. SVG Anchor hit tolerance remains stable under zoom, DPR, viewBox, and CSS transform.
19. Anchor and Preview DOM remain backend-specific implementation behind CFlow values.
20. Public declarations contain no DOM/native types outside the SVG Provider.

## Out Of Scope

- Port 顶级实体、Port Registry、Port Geometry resolver 或 port-qualified Connection。
- Edge Routing、self-loop 绘制、曲线、多段线编辑、marker 或 label。
- 通用 Validation Framework、Node type 兼容、容量、DAG 或业务连接规则。
- Tool/Gesture Registry、多 Interaction writer 或公开 InteractionService。
- touch、pen、pinch、pressure、tilt 或 coalesced input。
- snapping、grid、Edge Routing、协作 presence、framework adapter 或产品 UI。
- CFlow 默认 Edge ID/type/data generator。
- silent fallback、fake success、retry loop 或 timeout cleanup。
