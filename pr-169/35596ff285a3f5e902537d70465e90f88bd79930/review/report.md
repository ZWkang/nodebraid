# Verification report

Run: issue-159-preview-repair · ZWkang/nodebraid · pr #169

## Reviewed and published source

- Review base: `e56e8337f37ae92fa0c714149e6c3308e5190859`
- Independently prepared append parent: `6723600124f4276b52e1af4d9a1ebcd1e5f53189`
- Published head: `35596ff285a3f5e902537d70465e90f88bd79930`
- Reviewed local head: `35596ff285a3f5e902537d70465e90f88bd79930`
- Tree: `3093370506180cff8c55f3f8b37cd5bf5e17fd9c`
- Complete binary patch SHA-256: `824ea644a23aef47335881d34104a6c7631ed01f97770a9d1e8676a913d3dd76`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## PR risk and merge route

Risk: high. Route: full-human.

- standards: high — 变更修改 scripts/collect-preview.ts，涉及验收证据采集，按路径规则进入 full-human。
- spec: high — 改动涉及应用内键盘焦点及原位编辑，并修改 scripts/collect-preview.ts，触及验证工具 high 路径下限。
- scripts/collect-preview.ts: minimum high risk.

### standards risk: high

Impact and reasoning: 变更修改 scripts/collect-preview.ts，涉及验收证据采集，按路径规则进入 full-human。

Evidence: 公共 Node Editing Command 保留冲突、事务和 History 契约；媒体采集器操作真实 DOM，当前 head 的六个场景通过。

Rollback: 整体回退此 PR 可恢复原侧栏编辑与媒体流程，无持久化迁移。单独回退滚动修复会重新引入离屏双击风险。

### spec risk: high

Impact and reasoning: 改动涉及应用内键盘焦点及原位编辑，并修改 scripts/collect-preview.ts，触及验证工具 high 路径下限。

Evidence: 最终 head 上媒体清单和动作日志记录实际滚动、双击、输入、确认、撤销，已核对 node-authoring 场景产物摘要及变更代码。

Rollback: 回退标题编辑与媒体滚动修复两个提交即可恢复既有侧栏编辑和原录制场景，无持久化格式迁移。

Automatic routing is a candidate only. The coordinator still checks current PR status, report publication, pre-merge acceptance and authorization immediately before a head-bound merge.

## Acceptance plan

Repair the offscreen native double-click in the node-authoring evidence scene and publish current-head verification.

### repair

After Document restore the preview scrolls the Canvas into view before native double-click and captures the real inline title draft and applied state.

Dependencies: none

### verify

Both reviews and formal full check pass.

Dependencies: repair

### publish

Current-head CI, all preview scenes and full report pass and are read back.

Dependencies: verify

### main

Main integration and acceptance after merge.

Dependencies: publish

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

## Standards 审查

**结论通过。** 复审了 `e56e833...35596ff` 全部六个文件。节点命中使用公开 Renderer Service，提交使用精确的源 Node 和原有 Update Node Data Command；未修改的标题保留原始数据。草稿有改动时再次双击会保留当前输入，取消和冲突遵循 ADR-0087。检查了双击切换、文本删除、初始标题、撤销和竞争提交对应的 Chromium 验收断言。

相对于上一轮审查树，唯一源码差异是媒体采集器在 Document 恢复后、双击节点前滚动画布进入可见区域。真实双击、编辑提交与 Undo 断言均保留。当前提交的预览清单记录六个场景全部通过，包含原位编辑中和提交后的两份截图与快照。媒体由交付者采集，本轴核对了清单身份与结果。

本轴独立在当前提交运行两个 Node Draft 测试文件，共 14 项通过、77 次断言；完整 diff 通过 git diff --check。未发现剩余 Standards 阻断项。

## Spec review

Verdict: passed. [Original report](reviews/spec.md)

## Spec 审查

依据 [#159 范围与验收条件](https://github.com/ZWkang/nodebraid/issues/159#issuecomment-7187149173)，核对 e56e833 至 35596ff 的六个变更文件。Basic SVG 在节点原位提供标题输入，默认标题与空数据节点的 SVG 显示一致，已有显式空标题保留。确认使用打开时捕获的节点对象执行既有 Node Editing Command。Escape 取消、Delete 在输入框内编辑、提交后一步撤销、其他编辑已替换节点时保护新值，均有 Chromium 回归断言。未发现剩余规格缺口。

修复提交在媒体场景双击前将画布滚入视口。已核对当前 head 的 preview.json、node-authoring/actions.log 及该场景声明的各产物摘要。记录显示滚动画布后双击目标节点，输入并确认后读到 Inline card，执行一次 Undo 后读到 Custom card。六个媒体场景均通过。本轴复核了已有浏览器执行记录，未单独重跑浏览器或全量工程检查。

## Behavior evidence

Behavior evidence: not provided. The full engineering check does not establish regression red/green coverage.

## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
