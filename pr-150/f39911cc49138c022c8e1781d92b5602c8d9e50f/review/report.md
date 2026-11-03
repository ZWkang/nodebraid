# Verification report

Run: issue-149-test-effectiveness · ZWkang/nodebraid · issue #149

## Reviewed and published source

- Review base: `42ad909b0d8581fe90883bc90eaa872745dab5a2`
- Independently prepared append parent: `42ad909b0d8581fe90883bc90eaa872745dab5a2`
- Published head: `f39911cc49138c022c8e1781d92b5602c8d9e50f`
- Reviewed local head: `f39911cc49138c022c8e1781d92b5602c8d9e50f`
- Tree: `56584f33f75bff9d3000fc464dc97817f4102bcc`
- Complete binary patch SHA-256: `98c89109f72795cabcc5dc88a6660a2bd4c0b29ecc580de308570693956aaedd`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## PR risk and merge route

Risk: high. Route: full-human.

- standards: high — 完整变更仅优化测试并修正能力地图导航，不修改产品、公开契约或执行权限；但 .agents/skills/control-nodebraid/references/capabilities.md 属于 skills 路径，按 pr-risk 的路径最低等级必须判为 high。
- spec: high — 变更的行为影响局限于测试及对应能力地图链接，未修改生产源码或公开契约；但 .agents/skills/control-nodebraid/references/capabilities.md 命中 pr-risk 的 Agent skill 路径最低 high，必须完整人工审阅及按既有权限合并。
- .agents/skills/control-nodebraid/references/capabilities.md: minimum high risk.

### standards risk: high

Impact and reasoning: 完整变更仅优化测试并修正能力地图导航，不修改产品、公开契约或执行权限；但 .agents/skills/control-nodebraid/references/capabilities.md 属于 skills 路径，按 pr-risk 的路径最低等级必须判为 high。

Evidence: 已核实完整 base 42ad909b0d8581fe90883bc90eaa872745dab5a2 至 head f39911cc49138c022c8e1781d92b5602c8d9e50f 的 tree 与 binary patch 摘要；7 个测试文件及 1 个技能地图文件。behavior-evidence.json 的 8 类故障原始日志均显示旧绿/新红及正常实现绿；最终增量只修正 Selection 链接，目标真实存在。

Rollback: 回退本次提交即可恢复原测试与能力地图；不涉及生产数据、迁移或不可逆外部副作用。回退会重新引入已确认的测试漏检。

### spec risk: high

Impact and reasoning: 变更的行为影响局限于测试及对应能力地图链接，未修改生产源码或公开契约；但 .agents/skills/control-nodebraid/references/capabilities.md 命中 pr-risk 的 Agent skill 路径最低 high，必须完整人工审阅及按既有权限合并。

Evidence: 审查绑定当前 head/tree/binary patch；完整 8 文件 diff、#149 current.md:19–30、42–44；evidence/react-snapshot-mutations/results.json 及七份对应日志，evidence/node-editing/rerun-verified/、evidence/port-selection/rerun-verified/ 和 mutation-evidence/layout-elk/ 的旧绿/新红/基线绿原始日志。三组保存的测试快照与当前文件一致；git diff --check 通过。另核对 verification.json 和 check-5717f40e-f44e-41ae-8d9a-23b4bd984b3f.log：首次完整检查 exit 0，但 stable=false，收据拒绝。core.abbrev=7 复得旧摘要，默认/8 位复得新摘要；规范化 index 哈希后两份 diff 完全一致。新尝试仍需真实执行。

Rollback: 撤销本提交的测试与能力地图链接改动即可恢复基线；无生产数据迁移或不可逆外部状态。回滚会同时撤销新增行为回归保护。

Automatic routing is a candidate only. The coordinator still checks current PR status, report publication, pre-merge acceptance and authorization immediately before a head-bound merge.

## Acceptance plan

优化测试，检查用例是否真实有效；沿用现有领域契约与公共测试入口，对实证漏检做最小补强，精简自证断言，产品行为不变。

### audit-and-strengthen

审查核心、交互、浏览器与工具测试，记录实际范围；对有具体故障反例的测试做最小补强，保留有效公共契约。

Dependencies: none

### verify-mutations

各确认漏检有旧测试通过、优化测试失败、真实行为通过的证据；临时故障不进入 diff；check:affected 通过。

Dependencies: audit-and-strengthen

### review-and-check

当前提交 Standards 与 Spec 独立通过，agents:run verify 完整工程检查通过。

Dependencies: verify-mutations

### publish-pr

面向 main 的单个 PR 关联 #149，发布并回读当前 head 审查验证报告。

Dependencies: review-and-check

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

变更作用：加强 React 独立 Snapshot 通知、Node 完整字段与 Undo/Redo、ELK 增量计算及世界坐标的行为验证；将 Port 选择迁到公共 Renderer Input seam，保留 core 类型契约。

已审查完整 8 文件 diff、相连生产调用链及 ADR-0012/0023/0027/0082/0083/0087。Node 期望来自原始输入；ELK 用实际位移和世界平移关系验证结果；Port 测试观察 Session 并包含可成功选择的正例。未发现未处理的标准违规、实现耦合或具体代码异味。

历史 finding：原 head 5e6571f 删除私有测试后，capabilities.md:20 仍指向 selection-transition.test.ts，违反 control-nodebraid/SKILL.md:64 的地图维护要求。最终 head 仅追加将该链接改为 delete-selection-input.test.ts，目标已核实存在，问题已修复。

证据：逐项核对 behavior-evidence.json 的原始日志与故障注入脚本。3 类 React 缺通知分别停在对应 DOM 等待点；2 类 Node 字段丢失、Port 点击漏处理、ELK 无操作增量及坐标平移丢失均在行为断言处失败；旧测试及正常实现对照通过。Node、Port、ELK 归档强化测试与交付文件一致。第一轮完整 bun run check 已退出 0；verification.json 的 checks.stable 为 false，因此该收据未通过交付验收。

Verdict: passed；未解决发现 0 项。

绑定复核：HEAD 与 tree 未变化。独立比较 git -c core.abbrev=7 diff --binary 与当前默认 diff，恰有 8 条 index 行由 7 位对象缩写变为 8 位；只规范化这些 index 行后两份 diff 完全相同，源码内容和审查范围没有变化。旧 patch bc5bd9ae…、新 patch 98c89109… 均已重算。旧报告原样保存在 standards-review-attempt1.json；当前报告绑定新摘要，verdict 和 risk 不变。协调方将重新真实执行完整 verify，不能复用首轮收据宣告通过。

## Spec review

Verdict: passed. [Original report](reviews/spec.md)

未发现 Spec 缺失、错误实现或范围扩大。对照 #149 current.md:19、22–30、42–44 及 ADR-0083、0087、0023、0027，已审完整 diff 与相关生产调用链。React 三种 Snapshot 通知分别触发 DOM 更新；Node 创建、编辑、Undo/Redo 按原始完整输入和 data identity 断言；ELK 证明增量确实移动，并以已知平移关系验证 Fixed Node 连通布局的世界坐标。Port helper 的所属 Node 选择回归迁入真实 Renderer Input→Session 路径，并覆盖单选、加选和取消；core 只移除字面量自证断言，类型注解仍由 typecheck 包含。已逐项核对 8 类故障的旧绿、新红及真实实现绿日志：三个通知缺失、size/parentId 丢失、Port 输入被忽略、增量 no-op、世界平移丢失；失败均落在对应行为观察上。证据中的 Node/Port/ELK 测试快照与交付版本一致。能力地图链接同步属于测试迁移维护，未改生产行为、API、ADR 或权限。结论限于已检查调用链与上述故障；不是全仓穷举证明。首次完整 bun run check 已 exit 0，但 verify 的 stable=false，收据拒绝。独立比较确认旧、新 binary diff 只在 index 哈希缩写由 7 位变为 8 位处不同；head、tree、文件内容均未变化。报告重绑当前 patch；新的完整 verify 尚待执行，不能把首次通过当作有效交付收据。Spec findings: 0。

## Behavior evidence

### react-original-kernel

check — passed; exit 0; expected exit 0.

Snapshot notification isolation: original-kernel; original muted notifications pass incorrectly, improved muted notifications must fail at the corresponding DOM state.

Command: `bun .tmp/test-effectiveness-browser/original-kernel.browser.ts`

[Original command output](logs/behavior-1.log)

### react-original-session

check — passed; exit 0; expected exit 0.

Snapshot notification isolation: original-session; original muted notifications pass incorrectly, improved muted notifications must fail at the corresponding DOM state.

Command: `bun .tmp/test-effectiveness-browser/original-session.browser.ts`

[Original command output](logs/behavior-2.log)

### react-original-history

check — passed; exit 0; expected exit 0.

Snapshot notification isolation: original-history; original muted notifications pass incorrectly, improved muted notifications must fail at the corresponding DOM state.

Command: `bun .tmp/test-effectiveness-browser/original-history.browser.ts`

[Original command output](logs/behavior-3.log)

### react-improved-control

green — passed; exit 0; expected exit 0.

Snapshot notification isolation: improved-control; original muted notifications pass incorrectly, improved muted notifications must fail at the corresponding DOM state.

Command: `bun .tmp/test-effectiveness-browser/improved-control.browser.ts`

[Original command output](logs/behavior-4.log)

### react-improved-kernel

red — passed; exit 1; expected exit 1.

Snapshot notification isolation: improved-kernel; original muted notifications pass incorrectly, improved muted notifications must fail at the corresponding DOM state.

Command: `bun .tmp/test-effectiveness-browser/improved-kernel.browser.ts`

[Original command output](logs/behavior-5.log)

### react-improved-session

red — passed; exit 1; expected exit 1.

Snapshot notification isolation: improved-session; original muted notifications pass incorrectly, improved muted notifications must fail at the corresponding DOM state.

Command: `bun .tmp/test-effectiveness-browser/improved-session.browser.ts`

[Original command output](logs/behavior-6.log)

### react-improved-history

red — passed; exit 1; expected exit 1.

Snapshot notification isolation: improved-history; original muted notifications pass incorrectly, improved muted notifications must fail at the corresponding DOM state.

Command: `bun .tmp/test-effectiveness-browser/improved-history.browser.ts`

[Original command output](logs/behavior-7.log)

### node-editing-baseline

green — passed; exit 0; expected exit 0.

Complete Node fields and opaque data survive create/edit/history: baseline; original mutant pass demonstrates the gap; strengthened mutant fails at the behavior assertion.

Command: `python3 evidence/node-editing/rerun.py <checkout> (case baseline)`

[Original command output](logs/behavior-8.log)

### node-editing-baseline-strengthened

green — passed; exit 0; expected exit 0.

Complete Node fields and opaque data survive create/edit/history: baseline-strengthened; original mutant pass demonstrates the gap; strengthened mutant fails at the behavior assertion.

Command: `python3 evidence/node-editing/rerun.py <checkout> (case baseline-strengthened)`

[Original command output](logs/behavior-9.log)

### node-editing-drop-size

check — passed; exit 0; expected exit 0.

Complete Node fields and opaque data survive create/edit/history: drop-size; original mutant pass demonstrates the gap; strengthened mutant fails at the behavior assertion.

Command: `python3 evidence/node-editing/rerun.py <checkout> (case drop-size)`

[Original command output](logs/behavior-10.log)

### node-editing-drop-size-strengthened

red — passed; exit 1; expected exit 1.

Complete Node fields and opaque data survive create/edit/history: drop-size-strengthened; original mutant pass demonstrates the gap; strengthened mutant fails at the behavior assertion.

Command: `python3 evidence/node-editing/rerun.py <checkout> (case drop-size-strengthened)`

[Original command output](logs/behavior-11.log)

### node-editing-drop-parent

check — passed; exit 0; expected exit 0.

Complete Node fields and opaque data survive create/edit/history: drop-parent; original mutant pass demonstrates the gap; strengthened mutant fails at the behavior assertion.

Command: `python3 evidence/node-editing/rerun.py <checkout> (case drop-parent)`

[Original command output](logs/behavior-12.log)

### node-editing-drop-parent-strengthened

red — passed; exit 1; expected exit 1.

Complete Node fields and opaque data survive create/edit/history: drop-parent-strengthened; original mutant pass demonstrates the gap; strengthened mutant fails at the behavior assertion.

Command: `python3 evidence/node-editing/rerun.py <checkout> (case drop-parent-strengthened)`

[Original command output](logs/behavior-13.log)

### port-selection-baseline

green — passed; exit 0; expected exit 0.

Renderer Input Port clicks update Session Selection: baseline; original mutant pass demonstrates the gap; strengthened mutant fails at the behavior assertion.

Command: `python3 evidence/port-selection/rerun.py <checkout> (case baseline)`

[Original command output](logs/behavior-14.log)

### port-selection-baseline-public-input

green — passed; exit 0; expected exit 0.

Renderer Input Port clicks update Session Selection: baseline-public-input; original mutant pass demonstrates the gap; strengthened mutant fails at the behavior assertion.

Command: `python3 evidence/port-selection/rerun.py <checkout> (case baseline-public-input)`

[Original command output](logs/behavior-15.log)

### port-selection-ignore-port-click

check — passed; exit 0; expected exit 0.

Renderer Input Port clicks update Session Selection: ignore-port-click; original mutant pass demonstrates the gap; strengthened mutant fails at the behavior assertion.

Command: `python3 evidence/port-selection/rerun.py <checkout> (case ignore-port-click)`

[Original command output](logs/behavior-16.log)

### port-selection-ignore-port-click-public-input

red — passed; exit 1; expected exit 1.

Renderer Input Port clicks update Session Selection: ignore-port-click-public-input; original mutant pass demonstrates the gap; strengthened mutant fails at the behavior assertion.

Command: `python3 evidence/port-selection/rerun.py <checkout> (case ignore-port-click-public-input)`

[Original command output](logs/behavior-17.log)

### elk-baseline-old

green — passed; exit 0; expected exit 0.

ELK baseline: old tests; original mutant passes; improved mutant fails on actual movement/world translation.

Command: `bun test /Users/zhou/.codex/local-workflows/nodebraid/runs/issue-149-test-effectiveness/mutation-evidence/layout-elk/baseline/packages/layout-elk/tests (old test snapshot)`

[Original command output](logs/behavior-18.log)

### elk-baseline-new

green — passed; exit 0; expected exit 0.

ELK baseline: new tests; original mutant passes; improved mutant fails on actual movement/world translation.

Command: `bun test /Users/zhou/.codex/local-workflows/nodebraid/runs/issue-149-test-effectiveness/mutation-evidence/layout-elk/baseline/packages/layout-elk/tests (new test snapshot)`

[Original command output](logs/behavior-19.log)

### elk-incremental-noop-old

check — passed; exit 0; expected exit 0.

ELK incremental-noop: old tests; original mutant passes; improved mutant fails on actual movement/world translation.

Command: `bun test /Users/zhou/.codex/local-workflows/nodebraid/runs/issue-149-test-effectiveness/mutation-evidence/layout-elk/incremental-noop/packages/layout-elk/tests (old test snapshot)`

[Original command output](logs/behavior-20.log)

### elk-incremental-noop-new

red — passed; exit 1; expected exit 1.

ELK incremental-noop: new tests; original mutant passes; improved mutant fails on actual movement/world translation.

Command: `bun test /Users/zhou/.codex/local-workflows/nodebraid/runs/issue-149-test-effectiveness/mutation-evidence/layout-elk/incremental-noop/packages/layout-elk/tests (new test snapshot)`

[Original command output](logs/behavior-21.log)

### elk-fixed-lost-translation-old

check — passed; exit 0; expected exit 0.

ELK fixed-lost-translation: old tests; original mutant passes; improved mutant fails on actual movement/world translation.

Command: `bun test /Users/zhou/.codex/local-workflows/nodebraid/runs/issue-149-test-effectiveness/mutation-evidence/layout-elk/fixed-lost-translation/packages/layout-elk/tests (old test snapshot)`

[Original command output](logs/behavior-22.log)

### elk-fixed-lost-translation-new

red — passed; exit 1; expected exit 1.

ELK fixed-lost-translation: new tests; original mutant passes; improved mutant fails on actual movement/world translation.

Command: `bun test /Users/zhou/.codex/local-workflows/nodebraid/runs/issue-149-test-effectiveness/mutation-evidence/layout-elk/fixed-lost-translation/packages/layout-elk/tests (new test snapshot)`

[Original command output](logs/behavior-23.log)

### historical-verification-binding-failure

check — failed; exit 1; expected exit 0.

Historical verification attempt: full check exited 0, but fetching evidence changed automatic Git diff blob abbreviations, so the wrapper rejected stability. Source head/tree were unchanged; current verification retries the full check under the refreshed review digest.

Command: `bun run agents:run verify <run> <reviews> <decisions> (first attempt)`

[Original command output](logs/behavior-24.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
