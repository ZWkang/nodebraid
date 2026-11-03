# Verification report

Run: issue-143-readable-edges-20261103-main2998 · ZWkang/nodebraid · issue #143

## Reviewed and published source

- Review base: `2998d4b1425e759e987fe651a3095d487fe0a0e3`
- Independently prepared append parent: `2998d4b1425e759e987fe651a3095d487fe0a0e3`
- Published head: `5e5015ad054cb354b63eeb7833369a7983a125f6`
- Reviewed local head: `57cc1440c57ac7efb0012df6a0e2b9ffa28c055c`
- Tree: `6ef85c5d81b8b297ce26205542f57bd3e382df7b`
- Complete binary patch SHA-256: `c4b5ea1f59134edfb2a449a63757f793b5a8a0e6ddaac0a012495aa27637aaa4`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## PR risk and merge route

Risk: high. Route: full-human.

- standards: high — The complete change adds compatible public SVG behavior and changes validation/evidence surfaces. Verification skills, scripts/collect-preview.ts and packages/renderer-svg/artifacts/check-declarations.ts impose the pr-risk high minimum. The narrow-gap correction stays within the existing geometry owner and adds no new policy or public API. Full human review and merge routing applies.
- spec: high — Compatible public Renderer presentation and shared drawing/hit geometry changes affect rendering and selection. Changed skills, scripts/collect-preview.ts and packages/renderer-svg/artifacts/check-declarations.ts impose the high path floor.
- .agents/skills/control-nodebraid/references/capabilities.md: minimum high risk.
- .agents/skills/verify-nodebraid/features/README.md: minimum high risk.
- .agents/skills/verify-nodebraid/features/port-connection.md: minimum high risk.
- packages/renderer-svg/artifacts/check-declarations.ts: minimum high risk.
- packages/renderer-svg/src/contracts.ts: minimum medium risk.
- packages/renderer-svg/src/edge-geometry.ts: minimum medium risk.
- packages/renderer-svg/src/edge-projection.ts: minimum medium risk.
- packages/renderer-svg/src/hit-test.ts: minimum medium risk.
- packages/renderer-svg/src/index.ts: minimum medium risk.
- packages/renderer-svg/src/port-geometry.ts: minimum medium risk.
- packages/renderer-svg/src/svg-config.ts: minimum medium risk.
- packages/renderer-svg/src/svg-projection.ts: minimum medium risk.
- packages/renderer-svg/src/svg-renderer-error.ts: minimum medium risk.
- packages/renderer-svg/src/svg-renderer.ts: minimum medium risk.
- scripts/collect-preview.ts: minimum high risk.

### standards risk: high

Impact and reasoning: The complete change adds compatible public SVG behavior and changes validation/evidence surfaces. Verification skills, scripts/collect-preview.ts and packages/renderer-svg/artifacts/check-declarations.ts impose the pr-risk high minimum. The narrow-gap correction stays within the existing geometry owner and adds no new policy or public API. Full human review and merge routing applies.

Evidence: Reviewed the full fixed patch using the prior unchanged-code review plus the complete three-file correction, connected geometry/hit/state callers and public regression assertions. parallel-gap-red.log reproduces unreachable parallel Edges; parallel-gap-green.log records the complete Renderer browser suite passing; parallel-gap-typecheck.log records success. Earlier Example/docs/workflow logs remain qualified by carryover.md. Current-head full verification and report publication are not established by this review.

Rollback: Revert commit 57cc1440c57ac7efb0012df6a0e2b9ffa28c055c and rebuild. No migration, destructive effect or new persisted schema is introduced; existing application Edge data remains opaque.

### spec risk: high

Impact and reasoning: Compatible public Renderer presentation and shared drawing/hit geometry changes affect rendering and selection. Changed skills, scripts/collect-preview.ts and packages/renderer-svg/artifacts/check-declarations.ts impose the high path floor.

Evidence: Verified head 57cc1440c57ac7efb0012df6a0e2b9ffa28c055c, tree 6ef85c5d81b8b297ce26205542f57bd3e382df7b and binary patch c4b5ea1f59134edfb2a449a63757f793b5a8a0e6ddaac0a012495aa27637aaa4. Reassessed the complete patch and Issue #143 with its full supplied discussion; the only delta from the prior review is the narrow-gap geometry correction and its public browser regression. parallel-gap-red.log proves the former failure; parallel-gap-green.log records the complete corrected Renderer and legacy browser suite passing; parallel-gap-typecheck.log records exit 0. Earlier Example/docs logs retain their recorded source limits. Formal full verification and publication are not claimed complete.

Rollback: Revert commit 57cc1440c57ac7efb0012df6a0e2b9ffa28c055c to restore the preceding renderer, Example configuration, documentation and evidence collector. No persisted schema migration or irreversible data change requires rollback.

Automatic routing is a candidate only. The coordinator still checks current PR status, report publication, pre-merge acceptance and authorization immediately before a head-bound merge.

## Acceptance plan

## Problem Statement

SVG Edge 当前只提供无箭头、无标签的直线，难以表达流程方向、连接含义与同端点多条连接。为框架调用方增加显式启用的正交折线和贝塞尔曲线投影，同时保持单一权威 Document 和现有未配置调用方的兼容行为。

## Scope and decisions

- SVG Provider 新增窄的应用投影配置：应用从完整 Edge 值同步提供路径选择与可选纯文本标签。支持正交折线和贝塞尔曲线，箭头表达 source → target。Kernel 不解释 label/path 的业务 schema，不新增全局 Registry 或 Renderer 图写权。
- 连线预览使用显式配置的路径；预览尚无 Edge，不提前或重复调用 materializeEdge，不创建虚拟 Edge。预览与已提交路径复用几何规则，但应用仍负责预览配置与最终 Edge 投影选择的一致性，最终平行边分道在 Edge ID 已知后确定。
- 自环继续由现有 Interaction/Create Edge Command 与 SVG Provider 明确拒绝。本次不扩展自环创建或显示。
- 同一对端点的多条 Edge 自动分道，以确定性规则使每条路径可区分并分别命中。端点身份包含 Node 与可选 Port ID；反向连接保留 source/target 方向。同组增删 Edge 可以重新排布派生路径，不额外修改 Document 或 History。
- 新路径模式以最近路径/箭头几何决定 Edge 命中，等距时沿用确定性叠放优先级；容差保持 Target-local CSS pixels。Node/Port 优先级保持既有契约。文字标签为显示内容，不增加独立标签 Hit Result 或依赖 DOM/CSS 的命中。
- 普通 Endpoint 的新路径使用节点边界连接位置；Port-qualified Endpoint 使用既有 Port Geometry，不退回节点中心。正式路径、节点拖动候选路径、箭头、标签定位和命中共享几何来源。
- 短距离、反向连接和重叠节点继续接受并生成确定性有限几何；不承诺全图自动避障或遮挡消除。缺少 Port、无尺寸节点及其他既有明确错误继续显式失败。
- 未启用新配置时保留原直线 DOM、端点与命中行为。新模式每条 Edge 仅有一个 data-nodebraid-edge-id；连续提交、派生几何和 Selection 更新保持该实体元素身份，路径种类切换也不丢失身份。箭头和标签拥有独立稳定样式入口。
- 应用投影函数的原始异常向调用方传播；无效结果在改变已接受状态前失败。Session、Viewport、拖动候选和 hitTest 不重新调用应用投影函数；它们使用已接受的只读表示。
- 数据更新继续由调用方通过现有 Transaction/Command 组合完成。没有属性面板、业务编辑 UI、新增编辑 Command 或新的持久化 schema。文件与 Clipboard 沿用应用 codec；Provider 配置不自动序列化。

## Domain and architecture

沿用 CONTEXT.md 中的 Edge、Endpoint、Port Geometry、Renderer、Interaction Projection 和 Effective Renderer State。

- Kernel 拥有 Document；Session 拥有 Selection/Viewport。
- 应用拥有业务数据和 Edge 显示语义的映射。
- SVG Provider 拥有路径、箭头、标签和命中几何，Interaction 继续拥有行为解释。
- 更新相关 Renderer ADR 与文档，明确显式新模式对直线投影/命中规则的扩展，保留旧调用方契约。
- 示例仅用于组合公共接口和验收：保持原初始实体计数，初始 Edge 展示正交路径，现有创建连线操作展示贝塞尔路径；标签来自应用现有可编码 data，不新增编辑控件。

## Acceptance

1. 通过 Renderer 公共 Factory/updateDocument/updateSession/updateInteraction/hitTest 接口，在真实 Chromium 中验证两种路径、箭头方向、纯文本标签及普通/Port Endpoint。
2. 同端点多条 Edge 可以分别命中；增删、Undo/Redo 后重新分道确定，缩放后命中容差仍以 CSS pixels 计算，等距选择确定。新模式不回退为旧直线。
3. Node Drag、Viewport Pan、连续 Commit、Port 更新和 Layout 后，显示端点、候选路径与 hitTest 使用同一有效几何；派生更新不新增 Document revision 或 History。
4. 短距离、反向连接、重叠节点不新增拒绝；自环、缺失 Port、非法配置/结果及应用抛错保留明确失败。失败后已接受 DOM、几何和 Baseline 保持原状；清理和回滚遵循现有错误契约。
5. 未配置调用方的既有 Renderer/browser suites 保持；显式新模式保持实体 DOM identity、Selection、顺序和唯一标识，标签作为文本而非 HTML 注入。
6. Examples Application 经真实输入覆盖连线、拖动、布局、Undo/Redo 与文件往返，展示两种路径和标签；没有新增属性面板或产品工作流。
7. 更新双语 Provider/Example 文档、相关 ADR 和能力/证据地图；定向开发检查、独立 Standards/Spec review、正式 verify 全量检查均通过。
8. 单一 main PR 关联本 Issue，发布并回读当前 head 的完整报告和真实媒体；合并后另核对实际 main 集成与剩余验收。

## Non-goals

自环扩展、全图自动避障、手动控制点、HTML/React 标签、属性面板、业务规则、协作、新渲染后端与包发布均不在本次范围。

## Delivery

一个面向 main 的 PR，使用 Refs #143 保持合并后验收可见；实施步骤与证据放在本地 run。Issue 关闭遵循独立授权及合并后验收。

### renderer-contract

Public SVG Renderer opt-in config, orthogonal/bezier geometry, labels/arrows, multi-edge lanes, accepted-state atomicity and legacy compatibility pass public Chromium seam tests.

Dependencies: none

### example-and-docs

Existing Example demonstrates both paths, labels, native parallel-edge selection, drag/layout/History/file roundtrip; bilingual docs/ADR/capability evidence map match.

Dependencies: renderer-contract

### independent-review

Targeted checks pass; same complete committed head/tree/patch passes independent Standards+ponytail-review and Spec with risk assessment.

Dependencies: example-and-docs

### delivery-verification

agents:run verify executes complete bun run check on reviewed clean head and saves actual success evidence.

Dependencies: independent-review

### pr-and-evidence

Single main PR Refs #143 has exact checked tree; published current-head media/full report read back and current CI/reviews assessed.

Dependencies: delivery-verification

### main-acceptance

After separately authorized merge, actual merge SHA is on fetched main and whole spec acceptance accounted for; no automatic Issue closure.

Dependencies: pr-and-evidence

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: Adds explicit SVG Edge presentation with orthogonal or Bezier paths, direction arrows and application-owned text labels. Shared geometry drives drawing, dragging, parallel lanes and semantic hit tests. Existing callers retain straight lines.

Looks good. No actionable documented-standard breach or baseline code smell was found.

Checked: The complete base-to-head change, including the unchanged Renderer/Runtime callers, accepted-state handling, Port geometry, DOM journal, Example codec, documentation and collector reviewed previously. The only later changes are the narrow-gap route and its public browser regression. At the 48-unit endpoint gap, parallel orthogonal Edges now use separate turn columns and outer lanes. That fixes the geometry owner instead of changing hit priority, rejecting valid input or adding a fallback. Bezier routing and wider-gap routing retain their existing branches.

The four new cases cover two and three Edges with aligned and staggered Nodes. They sample the actual rendered paths and require each Edge to win a public hitTest somewhere visible. They do not assert private routing constants. This follows AGENTS.md's regression requirement and the Fix Root Causes and Test Behavior principles. The overall change retains CONTEXT.md ownership, ADR-0054 atomic updates, ADR-0050 entity identity and ADR-0089 shared geometry.

Evidence: parallel-gap-red.log shows the public reproduction failing with unreachable lower-ID Edges. parallel-gap-green.log records the complete Renderer browser suite, including legacy scenarios, passing. parallel-gap-typecheck.log records success. Earlier Example, documentation and workflow evidence remains explicitly distinguished from current-head full verification. Head, tree and binary patch digest were independently verified.

Risk: High. Verification skills, scripts/collect-preview.ts and declaration validation carry the pr-risk high path minimum. Full human review and merge routing applies.

Rollback: Revert 57cc1440 and rebuild. No data migration or new persistent schema is involved; labels remain opaque application Edge data.

Not checked: An independent browser rerun, current-head full engineering verification, published media/report readback, or large-graph performance. Load assumptions follow the reference Provider and Examples Application.

Verdict: Ship.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

Spec review: passed.

The previous P2 is resolved. Issue #143 requires “同一对端点的多条 Edge 自动分道，以确定性规则使每条路径可区分并分别命中”. In packages/renderer-svg/src/edge-geometry.ts:106-129, narrow orthogonal sibling routes now use distinct turn columns and outer lanes. This removes the coincident-stub geometry at a 48-unit endpoint gap without rejecting legitimate endpoints or changing the nearest-distance hit rule.

The public regression in packages/renderer-svg/browser-tests/edge-presentation.entry.ts covers two and three Edges with aligned and vertically offset Nodes. It samples each actual SVG path and requires hitTest to return that specific Edge somewhere on its visible path, rather than treating different path strings as proof. parallel-gap-red.log records unreachable Edges before the fix; parallel-gap-green.log records the corrected complete Renderer browser suite, including legacy cases, passing. parallel-gap-typecheck.log records exit 0.

Reassessed the complete patch against the Issue body and full supplied discussion. No remaining missing implementation, incorrect behavior or scope creep was found. The public opt-in API, both path kinds, directional arrows, literal labels, endpoint/Port handling, deterministic grouping, shared drag/hit geometry, explicit preview configuration, atomic acceptance and legacy identity contract remain consistent with the spec. The Example retains its initial entity count and existing workflows; bilingual documentation, ADR and verification maps cover the new behavior. No property panel, editing Command, business schema or persistence ownership was introduced.

Formal current-head verification, current-head report/media publication and readback, and post-merge integration remain delivery acceptance steps; this review does not claim they have completed. Earlier Example/documentation evidence retains its recorded revision limits.

Risk: high. Rendering and selection change through a compatible public API, and skills, scripts/collect-preview.ts and declaration validation impose the high path floor. Evidence comprises the complete fixed patch, public regression and recorded checks. Revert the delivery commit to restore the preceding renderer, Example and evidence collector; there is no persisted schema migration or irreversible data change.

Sources: https://github.com/ZWkang/nodebraid/issues/143 and https://github.com/ZWkang/nodebraid/issues/143#issuecomment-6595672537.


## Behavior evidence

### renderer-public-red

red — passed; exit 1; expected exit 1.

Real Chromium reaches the new public Renderer fixture and rejects the unsupported edges config in the original implementation; confirms the new public behavior is absent.

Command: `bun run --filter '@nodebraid/renderer-svg' test:browser`

[Original command output](logs/behavior-1.log)

### renderer-types

green — passed; exit 0; expected exit 0.

Public edge configuration and synchronous/readonly type contracts compile.

Command: `bun run --filter '@nodebraid/renderer-svg' typecheck:self`

[Original command output](logs/behavior-2.log)

### renderer-bun

green — passed; exit 0; expected exit 0.

SVG Provider public export and error contracts pass Bun tests.

Command: `bun test packages/renderer-svg/tests`

[Original command output](logs/behavior-3.log)

### renderer-browser-green

green — passed; exit 0; expected exit 0.

Complete public Renderer Chromium suite passes opt-in routed Edge and legacy behavior, including Port Drag geometry and rollback.

Command: `bun run --filter '@nodebraid/renderer-svg' test:browser`

[Original command output](logs/behavior-4.log)

### example-public-red

red — passed; exit 1; expected exit 1.

Before Example opts in, real Chromium observes no expected orthogonal path, direction arrow or application label.

Command: `bun run example:test`

[Original command output](logs/behavior-5.log)

### example-basic-green

green — passed; exit 0; expected exit 0.

Real native creation, parallel-edge selection, Layout, Undo/Redo, and existing Canvas behavior pass.

Command: `bun run examples/app/browser-tests/basic-svg.browser.ts`

[Original command output](logs/behavior-6.log)

### example-clipboard-green

green — passed; exit 0; expected exit 0.

Real clipboard transport and existing copy/paste behavior pass.

Command: `bun run examples/app/browser-tests/clipboard.browser.ts`

[Original command output](logs/behavior-7.log)

### example-document-green

green — passed; exit 0; expected exit 0.

Downloaded/uploaded Document retains application labels and supports further edits.

Command: `bun run examples/app/browser-tests/document.browser.ts`

[Original command output](logs/behavior-8.log)

### example-authoring-green

green — passed; exit 0; expected exit 0.

Existing Node creation/editing/History/file behavior remains valid.

Command: `bun run examples/app/browser-tests/node-authoring.browser.ts`

[Original command output](logs/behavior-9.log)

### example-types

check — passed; exit 0; expected exit 0.

Example composition compiles against public SVG config.

Command: `bun run --filter @nodebraid/examples typecheck:self`

[Original command output](logs/behavior-10.log)

### docs

check — passed; exit 0; expected exit 0.

Bilingual documentation verification, real Quick Start and VitePress build pass.

Command: `bun run docs:check`

[Original command output](logs/behavior-11.log)

### workflow

check — passed; exit 0; expected exit 0.

Workflow sources and verification skill references remain valid.

Command: `bun run agents:check`

[Original command output](logs/behavior-12.log)

### workflow-types

check — passed; exit 0; expected exit 0.

Preview collector and workflow TypeScript compile.

Command: `bun run agents:typecheck`

[Original command output](logs/behavior-13.log)

### evidence-tests

check — passed; exit 0; expected exit 0.

Preview scene selection, evidence integrity and publication producer regressions pass.

Command: `bun test tests/preview-scenes.test.ts tests/pr-evidence.test.ts tests/evidence-producer.test.ts`

[Original command output](logs/behavior-14.log)

### lint

check — passed; exit 0; expected exit 0.

Repository lint passes.

Command: `bun run lint`

[Original command output](logs/behavior-15.log)

### parallel-gap-red

red — passed; exit 1; expected exit 1.

Public Renderer Chromium reproduction: at 48-unit endpoint gap, orthogonal parallel paths overlap and lower-ID Edges cannot be independently hit, including a horizontally aligned three-edge case.

Command: `bun run --filter '@nodebraid/renderer-svg' test:browser`

[Original command output](logs/behavior-16.log)

### parallel-gap-green

green — passed; exit 0; expected exit 0.

Distinct turn columns and outer lanes fix the narrow-gap regression; complete Renderer Chromium suite including legacy cases passes.

Command: `bun run --filter '@nodebraid/renderer-svg' test:browser`

[Original command output](logs/behavior-17.log)

### parallel-gap-types

check — passed; exit 0; expected exit 0.

Corrected public browser regressions and Renderer implementation typecheck.

Command: `bun run --filter '@nodebraid/renderer-svg' typecheck:self`

[Original command output](logs/behavior-18.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
