# Verification report

Run: issue-161-edge-label · ZWkang/nodebraid · issue #161

## Reviewed and published source

- Review base: `e56e8337f37ae92fa0c714149e6c3308e5190859`
- Independently prepared append parent: `e56e8337f37ae92fa0c714149e6c3308e5190859`
- Published head: `a752a65773252913a7e04b86171854dfa92ac0b6`
- Reviewed local head: `59b10da8b5ca1f02128df64abafb13a54629e225`
- Tree: `5e2f8cdc6a50f026b763ad5f01eab63a4e99f1ff`
- Complete binary patch SHA-256: `c2bdcd73cf860b52806227b59512def94d8c999f2f2c73a901aa55b663895816`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## PR risk and merge route

Risk: high. Route: full-human.

- standards: high — 变更覆盖证据采集脚本 scripts/collect-preview.ts，按仓库路径规则要求完整人工复核。
- spec: high — 变更涉及用户草稿、连线数据更新及验收采集脚本，scripts/ 路径触发 high 风险下限。
- scripts/collect-preview.ts: minimum high risk.

### standards risk: high

Impact and reasoning: 变更覆盖证据采集脚本 scripts/collect-preview.ts，按仓库路径规则要求完整人工复核。

Evidence: 源 Edge 身份、端点、tags、其他连线和无净变化已有定向回归；浏览器两条不同边的选择切换、实际标签提交与文件往返覆盖之前发现的错绑。

Rollback: 整体回退两个功能提交即可恢复原属性界面和媒体流程，既有 Document 格式可以继续读取已保存标签。

### spec risk: high

Impact and reasoning: 变更涉及用户草稿、连线数据更新及验收采集脚本，scripts/ 路径触发 high 风险下限。

Evidence: 已核对 EdgeLabelEditor、applyEdgeLabel、Document 往返产物、实际 Chromium 两条边切换记录及公开 Kernel 的五个断言。

Rollback: 整体回退连线标签功能与草稿修复两个提交即可恢复旧应用及采集行为，无持久化迁移。

Automatic routing is a candidate only. The coordinator still checks current PR status, report publication, pre-merge acceptance and authorization immediately before a head-bound merge.

## Acceptance plan

Edit or clear a selected edge label in Basic SVG, preserving endpoints, undo, and document round-trip.

### edit

Apply or cancel the selected edge label without changing IDs, endpoints, tags or other edges; one history entry for changes.

Dependencies: none

### browser

Chromium selection, text projection, cancel, clear, undo and export/import demonstrate the accepted spec.

Dependencies: edit

### verify

Independent Standards/Spec reviews and official full verification pass.

Dependencies: browser

### publish

Publish current-head PR and verify its report and media.

Dependencies: verify

### main

After main integration verify acceptance and deployment.

Dependencies: publish

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

## Standards 审查

**结论：通过。** 已复审 `e56e833...59b10da` 完整改动，覆盖 Basic SVG 属性面板、应用的 Edge 标签事务、Document 浏览器验收、媒体采集器与连接的公开调用方。应用解释自己的标签和 tags，提交时按精确源 Edge 检查身份，只替换目标 Edge 的 data。无净变化保留原状态。

上次报告的草稿误绑已修复。真实双边场景在修改前复现：有未提交草稿时选择另一条连线，恢复原标签后输入框仍显示前一条的 Flow。当前代码在输入等于源标签时释放草稿并清理反馈；在修改中的草稿仍绑定原目标。已核对相同浏览器回归的通过记录及 SVG 断言，包括选择 B 后恢复 A 的旧文字、编辑 B 并确认只有 B 的标签改变。原有取消、清除、Undo、导出及恢复字节检查仍保留。浏览器用例由交付者执行。

本轴独立运行 Edge Label 和 Example Data Codec 两个测试文件，6 项通过、20 次断言，完整 diff 通过 git diff --check。此次 Standards 复审无剩余阻断项。

## Spec review

Verdict: passed. [Original report](reviews/spec.md)

## Spec 审查

依据 [#161 规格及验收入口](https://github.com/ZWkang/nodebraid/issues/161#issuecomment-7187151668)，复审 e56e833 至 59b10da 的完整变更。单选连线时可设置或清空标签；有未保存输入时，草稿仍指向开始编辑的连线。输入恢复为原标签会释放草稿，编辑器随即显示当前选中连线的标签。提交通过同一事务更新目标 Edge，保留 ID、类型、端点、Port 与已有标签以外的数据，拒绝覆盖已替换的 Edge。取消仅清理草稿。未发现剩余规格缺口。

独立运行 edge-label.test.ts，1 项测试、5 次断言通过。核对本轮 Chromium 的动作日志，先在第一条边输入 Dirty，再选中第二条、将第一条的输入改回 Flow，后续提交只改变第二条边。已有场景同时覆盖取消、清空、一次撤销和 SVG 文本反馈。对照实际 Document 文件，编辑前后仅目标边标签变化，带标签文件再导入后重新导出的字节完全相同。

本轴核对了已有浏览器记录和文件，未重复运行浏览器及正式全量检查。

## Behavior evidence

Behavior evidence: not provided. The full engineering check does not establish regression red/green coverage.

## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
