# Verification report

Run: 808b813e-fa3a-4e86-8f4b-72edfd2b9cd4 · ZWkang/nodebraid · issue #74

## Reviewed and published source

- Review base: `01c4827666dbc089a38eec61925030728411fe9d`
- Independently prepared append parent: `3f0e991651721f737f9388f7d0804a027f4f6aed`
- Published head: `59c8d7c8e74eedd426d60ce14ee3db73f7839824`
- Reviewed local head: `7eebf6bf122781d5269e683ddc84c09d39fe2d5d`
- Tree: `67473f3965387e5d2f58d8aa74bb1330517becb0`
- Complete binary patch SHA-256: `c80710dd719e3c7d6b912f57184ec907f4f64d82242dd47096548aacafccbb29`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

Revalidate the existing Duplicate Selection ID mapping repair against fetched main01c containing Runtime diagnostics and Layout repairs. Capture Node/Edge mapping collections once and translate actual indexed entries into owned arrays without caller map/iterator/constructor/species hooks; preserve accepted strictness, exceptions and public behavior. Source: https://github.com/ZWkang/nodebraid/issues/74

### sync-source-and-public-checks

Fresh full Issue74/PR75, feedback and dependencies read; synchronize actual remote source3f0 with fetched main01c without losing source changes. Inspect complete patch/callers and run current Duplicate/Clipboard/Fragment public regressions, types and selected consumers. Historical original red remains provenance, not current-head acceptance.

Dependencies: none

### independent-review-and-full-check

Fresh independent Standards+ponytail-review and Spec review exact synchronized head/tree/patch versus main01c, then deployed main01c versioned verify executes one real full check with stable source, retaining every failure.

Dependencies: sync-source-and-public-checks

### append-current-head-acceptance

Append verified tree on existing PR75, independently captured first parent3f0 and actual main01c ancestry. Actual current-head CI/complete feedback plus full report/media publication and immutable file readback pass; never rebind old receipts.

Dependencies: independent-review-and-full-check

### main-integration-acceptance

Actual main integration and whole-Issue acceptance remain pending prerequisites before authorized closure; human final review/merge.

Dependencies: append-current-head-acceptance

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: Duplicate Selection captures each mapping collection once and translates its actual indexed entries into owned arrays. Application array hooks cannot substitute valid mappings for invalid input before shared Fragment validation.

Verdict: passed.

Reviewed identity:

- Base: 01c4827666dbc089a38eec61925030728411fe9d
- Head: 7eebf6bf122781d5269e683ddc84c09d39fe2d5d
- Tree: 67473f3965387e5d2f58d8aa74bb1330517becb0
- Binary patch SHA256: c80710dd719e3c7d6b912f57184ec907f4f64d82242dd47096548aacafccbb29

Hard standards: No violations found in the complete two-file patch. ADR0073 requires owned outputs and exact, fresh same-namespace mappings; ADR0077 preserves materializer and unknown failure identity. The translator now owns traversal while shared Fragment validation continues to own mapping validity, coverage and canonical output. This follows Boundary Discipline without changing public contracts or dependencies.

Judgment / ponytail: No actionable Fowler smell or correctness, safety, load, speed or testing finding. Captured collections preserve structural Node-before-Edge rejection. Native Array.from operates on an owned length descriptor, avoiding input map/iterator/constructor/species hooks while reading actual indexed values. Original indexed exceptions propagate. Sparse invalid entries reject, inherited entries remain usable, and frozen mappings work. The existing shared validator and Transaction/Selection lifecycle remain in place.

Connected code checked: factory normalization and registration, materializer translation, Fragment capture/materialization and its indexed helper, Kernel writes, Session publication, History replay and the Clipboard consumer of shared Fragment validation. Current Runtime diagnostics and Layout integration do not change these interfaces. Assumed load: synchronous materialization within one local Canvas Runtime.

Actual checks at this head:

- Verified commit history, clean tree, exact head/tree/hash, inspection.json and prepared-task identity. Saved complete.patch matches the fixed Git diff byte for byte.
- Read both complete changed files, including all 201 regression-test lines, plus the supplied Issue/PR snapshots and feedback record.
- `git diff --check`: passed.
- `bun test packages/plugin-duplicate-selection/tests`: 34 passed, 0 failed, 117 assertions, including all 11 new regressions.

Not checked: remaining affected consumers, typecheck, builds, browsers, full engineering gate, remote CI, publication and remote report readback. Prior-head receipts and historical PR evidence were not counted as current verification.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: **passed**

独立审查当前完整两文件补丁、Issue #74 全文及空讨论/外部依赖、PR75 全分页空评论/reviews/threads、独立 prepared plan、ADR0073/0077，以及 Command → Duplicate → Fragment → Kernel/Session/History 公共调用链。未发现规格遗漏、错误实现或范围扩张。

满足“Capture each incoming Node/Edge mapping collection once”：捕获后校验同一集合，按原生归一化长度读取实际索引，翻译到自有冻结数组，不读取输入 map、iterator、constructor/species。非法实际值由既有 Fragment materialization 校验拒绝并转换为 `INVALID_MATERIALIZATION`，发生于 Kernel Transaction 前；原始外部异常继续原样抛出。规范排序、同 namespace 唯一性、稀疏/继承项、Selection 更新、单 Commit 与 History replay 保留。无公共 API、依赖、cap 或 fallback 新增。

本轮实际执行 `bun test packages/plugin-duplicate-selection/tests`：34 pass、0 fail、117 assertions；包含真实 Host/Kernel/Command/Session、History 及新增 Node/Edge regressions。`git diff --check` 通过；核对 commit 列表、精确 head/tree、完整 binary patch 和干净工作树。新 main 的 Runtime/Layout 变更未修改 Duplicate/Fragment；结论未沿用旧 head 的报告或验证。

未运行 build、browser、affected/full engineering check；未验证当前待发布 head 的远端 CI、报告发布/回读、main 集成。历史 red 和旧 PR 证据不计作当前完整验收。

- base: `01c4827666dbc089a38eec61925030728411fe9d`
- head: `7eebf6bf122781d5269e683ddc84c09d39fe2d5d`
- tree: `67473f3965387e5d2f58d8aa74bb1330517becb0`
- raw binary patch SHA256: `c80710dd719e3c7d6b912f57184ec907f4f64d82242dd47096548aacafccbb29`


## Behavior evidence

### historical-main99-public-red

red — passed; exit 1; expected exit 1.

Original public real-Host probe on main99 accepted an invalid Node mapping supplied through caller-owned map and changed the Document; expected rejection assertion failed. Original provenance only, not current-head acceptance.

Command: `bun duplicate-array-hook-repro.ts (original discovery main99)`

[Original command output](logs/behavior-1.log)

### current-duplicate-clipboard-fragment

green — passed; exit 0; expected exit 0.

Fresh synchronized head7eeb/main01c:109 public tests422 assertions passed, including application array hooks, stable collection capture, strict failures, real Host/Command/Kernel/Session/History and Clipboard/Fragment composition.

Command: `bun test packages/plugin-duplicate-selection/tests packages/plugin-clipboard/tests packages/canvas-fragment/tests`

[Original command output](logs/behavior-2.log)

### current-selected-consumers

check — passed; exit 0; expected exit 0.

New base01c selected affected consumers, types/declarations/builds, real Example browser suites and documentation passed, exit0. No earlier-base check is counted.

Command: `bun run check:affected --base 01c4827666dbc089a38eec61925030728411fe9d`

[Original command output](logs/behavior-3.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
