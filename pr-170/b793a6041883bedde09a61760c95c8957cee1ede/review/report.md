# Verification report

Run: repair-170 · ZWkang/nodebraid · issue #161

## Reviewed and published source

- Review base: `6579739b8b7b9987d3ff01e9408d2358b072a45f`
- Independently prepared append parent: `a752a65773252913a7e04b86171854dfa92ac0b6`
- Published head: `b793a6041883bedde09a61760c95c8957cee1ede`
- Reviewed local head: `b793a6041883bedde09a61760c95c8957cee1ede`
- Tree: `2ff8f991b25cf214d61fe7e801812b1440c3305c`
- Complete binary patch SHA-256: `a95947325d8194a8358865051946a6b3441bf38324d85c973f813c5ed0903b9a`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## PR risk and merge route

Risk: high. Route: full-human.

- standards: high — 改动涉及项目证据采集脚本并改变 Basic SVG 的编辑器组合，按路径规则需要完整人工复核。
- spec: high — 示例应用的 Runtime 重置影响草稿和组件订阅，且 scripts/collect-preview.ts 的变更触发 high 风险下限。
- scripts/collect-preview.ts: minimum high risk.

### standards risk: high

Impact and reasoning: 改动涉及项目证据采集脚本并改变 Basic SVG 的编辑器组合，按路径规则需要完整人工复核。

Evidence: 完整差异包含 scripts/collect-preview.ts 和五个应用或测试文件；节点标题与连线标签场景均保留，重置前后输入框数量的真实用例验证了挂载清理。

Rollback: 回退 PR #170 相对于 main 的新增改动即可恢复原侧栏及证据流程，已合入 main 的节点原位编辑可保留，无持久化格式迁移。

### spec risk: high

Impact and reasoning: 示例应用的 Runtime 重置影响草稿和组件订阅，且 scripts/collect-preview.ts 的变更触发 high 风险下限。

Evidence: 完整六文件补丁、旧实现重置失败与修复后通过的 Chromium 对照、Document 文件字节回读及 8 项独立定向测试。

Rollback: 整体撤回 #161 相对基线的净变更即可恢复原有属性面板和采集场景，保留已合入的 #159，无存储格式迁移。

Automatic routing is a candidate only. The coordinator still checks current PR status, report publication, pre-merge acceptance and authorization immediately before a head-bound merge.

## Acceptance plan

## 使用场景

选中一条连线，为条件分支填写或清除标签。

## 验收条件

提交后只更新目标连线，端点和 ID 保持；取消无变化，一次撤销可还原，导出再导入仍保留标签。

## 建议验证入口

Basic SVG 属性编辑、SVG 投影与 Document 文件往返。

实施范围及验收入口已确认。

## 使用场景

选中一条连线，为条件分支填写或清除标签。

## 验收条件

提交后只更新目标连线，端点和 ID 保持；取消无变化，一次撤销可还原，导出再导入仍保留标签。

## 建议验证入口

Basic SVG 属性编辑、SVG 投影与 Document 文件往返。

同步已合入 #169 的 main，保留两个编辑器并按当前 head 重新验证。

### integrate

Resolve the reproduced Basic SVG import conflict while preserving edge-label and inline node-title editing.

Dependencies: none

### behavior

Exercise both public editing paths, edge identity, cancellation, undo and document round-trip on the combined checkout.

Dependencies: integrate

### verify

Review the entire candidate against the fetched main independently on both axes and pass the formal engineering verification.

Dependencies: behavior

### publish

Append to PR 170, verify the remote tree and parents, then publish and read back source-bound media and report.

Dependencies: verify

### accept

After required human review and main integration, verify main CI, deployment and complete Issue acceptance.

Dependencies: publish

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

## Standards 审查

**结论：通过。** 复审基线为 `6579739`，修正后的合并提交为 `b793a60`。已核对完整补丁的六个文件，以及 Basic SVG 路由、Runtime 挂载、编辑草稿、Command、Kernel 事务和媒体采集的调用关系。

上轮发现的侧栏重复 key 已修复。EdgeLabelEditor 使用稳定的同级位置；重置 Runtime 时，页面先卸载旧变更表单，再用新的 Runtime 建立编辑器。Chromium 回归在旧实现中重现重置后仍有一个连线输入框。修正后，记录显示重置清除未提交的草稿与输入框，重新选中连线时只出现一个输入框。回归检查用户可见的控件数量，未来重构不必保留当前 key 写法。

此前的选择与草稿回归仍覆盖同一页面上的两条连线。修改中的草稿绑定原 Edge，恢复原标签后编辑器跟随当前 Selection；事务按精确源身份校验后只更新目标标签。路由保留了节点标题原位编辑、节点属性编辑与连线标签编辑的入口。

独立在本提交运行四个有针对性的 Bun 测试文件，20 项通过，97 次断言。完整 diff 通过 git diff --check。浏览器验证由交付者执行，本轴核对失败、修复后通过的结果及操作记录。未发现剩余 Standards 阻断项。


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

## Spec 审查

**通过。** 已按 #161 的范围复核基线 6579739 至提交 b793a60 的全部六个变更文件，并核对 #159 的节点原位标题编辑入口。连线属性与节点编辑器分别维护草稿；取消或恢复原标签会释放连线草稿，提交在一次事务内验证并更新目标 Edge。其余连线、源与目标 Port、ID 及业务标签数组保持一致。[#161 验收条件](https://github.com/ZWkang/nodebraid/issues/161#issuecomment-7187151668) · [#159 验收条件](https://github.com/ZWkang/nodebraid/issues/159#issuecomment-7187149173)

上一轮发现的 Runtime 重置问题已修复。两个同级编辑器的 React 身份现在互异，重置时旧连线属性组件随原 Runtime 卸载。Chromium 回归在旧实现中观测到新画布选区为空时残留 1 个旧输入框；修复后，相同操作得到 0 个，再选中连线仅出现 1 个输入框。

独立执行边标签和节点草稿的两份定向测试，8 项通过，共 45 个断言。另核对该次 Document 浏览器场景的动作日志和导出文件，确认放弃草稿、切换连线、清空及一步撤销的可见结果，且编辑前后仅目标标签变化，带新标签的文档重新导入后导出字节一致。本轴核对已有浏览器执行产物；正式全量验证与发布回执由交付流程另行记录。未发现剩余规格阻断项。


## Behavior evidence

### reset-red

red — passed; exit 1; expected exit 1.

77a50ac：重置后选区为空，仍观察到 1 个旧的连线输入框，预期为 0。

Command: `bun run --cwd examples/app ./browser-tests/document.browser.ts`

[Original command output](logs/behavior-1.log)

### reset-green

green — passed; exit 0; expected exit 0.

修正后的 Document 场景通过，重置后不再显示旧编辑器，重新选边时只有一个输入框。

Command: `bun run --cwd examples/app ./browser-tests/document.browser.ts`

[Original command output](logs/behavior-2.log)

### node-authoring

check — passed; exit 0; expected exit 0.

合并后节点标题编辑、取消及撤销的浏览器场景通过。

Command: `bun run --cwd examples/app ./browser-tests/node-authoring.browser.ts`

[Original command output](logs/behavior-3.log)

### edge-and-preview

check — passed; exit 0; expected exit 0.

连线标签和证据场景的定向测试通过。

Command: `bun test examples/app/tests/edge-label.test.ts tests/preview-scenes.test.ts tests/evidence-producer.test.ts`

[Original command output](logs/behavior-4.log)

### preview-test-path

check — failed; exit 1; expected exit 0.

首次定向调用使用了不存在的测试路径，未执行测试。后续调用已改用仓库实际的 preview-scenes 与 evidence-producer 测试。

Command: `bun test tests/collect-preview.test.ts`

[Original command output](logs/behavior-5.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.

Public log copies display the checkout directory as `<worktree>`. Command output and review reports retain their contents.
