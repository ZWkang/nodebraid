# Verification report

Run: d46a97bf-b74e-4425-a6a3-0cba573fc83b · ZWkang/nodebraid · issue #74

## Reviewed and published source

- Review base: `710038f0ed0cfc830580241ca1e90fca5f50677e`
- Independently prepared append parent: `c7621535e3e7484e26153650917e8ab6c1fa91e6`
- Published head: `3f0e991651721f737f9388f7d0804a027f4f6aed`
- Reviewed local head: `5820f81aad5f07b3ab8f2b3fd6a42b54ab26d745`
- Tree: `4c89643ed1cc7290211b851a29e3de9feea24328`
- Complete binary patch SHA-256: `c80710dd719e3c7d6b912f57184ec907f4f64d82242dd47096548aacafccbb29`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

Revalidate the existing Duplicate Selection ID mapping repair after synchronizing fetched main. Capture Node/Edge collections once and translate actual indexed entries without caller-owned collection hooks; preserve the accepted public behavior. Source: https://github.com/ZWkang/nodebraid/issues/74

### current-source-and-related-checks

Read actual complete Issue74/PR75 feedback and remote source; inspect conflict-free main sync and unchanged complete two-file product patch; actual Duplicate/Clipboard/Fragment public checks pass.

Dependencies: none

### independent-review-and-full-check

Fresh Standards+ponytail-review and Spec cover exact synchronized head/tree/patch against main710. Current-main versioned verify executes full check after reviews, preserving failures.

Dependencies: current-source-and-related-checks

### append-and-current-head-acceptance

Append exact reviewed tree on existing PR75 first-parent c762 plus additional main710 parent; actual current-head CI, complete feedback, full report/media publication and immutable byte readback pass.

Dependencies: independent-review-and-full-check

### main-integration-acceptance

Human main integration and whole-Issue acceptance remain pending before authorized closure.

Dependencies: append-and-current-head-acceptance

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

# Standards + ponytail-review — Issue #74 / PR #75 main 同步复审

Verdict: passed

- Base: `710038f0ed0cfc830580241ca1e90fca5f50677e`
- Head: `5820f81aad5f07b3ab8f2b3fd6a42b54ab26d745`
- Tree: `4c89643ed1cc7290211b851a29e3de9feea24328`
- Binary patch SHA-256: `c80710dd719e3c7d6b912f57184ec907f4f64d82242dd47096548aacafccbb29`

已重新核验本轮完整 Issue/空反馈快照、当前规范、两文件补丁及本地 merge 双父。当前产品范围仅为 Duplicate 映射所有权修复；本轮结论使用新 head 实际检查结果。

## 硬规范

未发现违反。`packages/plugin-duplicate-selection/src/duplicate-selection-command.ts` 一次捕获 Node/Edge 集合，保留 Node 集合结构校验先于 Edge 字段读取的短路。自有 array-like 描述按实际索引翻译，不调用输入 map、iterator、constructor 或 species；正常长度转换、稀疏拒绝和继承索引回归通过。

已追踪 Duplicate factory/Command → Fragment materialization → Kernel Transaction → Session，以及共享 Clipboard 消费边界。ID 类型、精确覆盖、同 namespace 唯一性、规范排序和冻结仍由 Fragment 验证；提交前 source/Selection/内部 Edge 闭包检查保留，符合 ADR0073/0078。原 materializer/元素读取错误不被统一改写，已知无效映射仍原子拒绝，符合 ADR0077。

真实 Host/Kernel/Command/Session 测试覆盖无效实际元素、变化集合、冻结 hooked arrays、原异常和正常复制；现有 History、stale、并行 Edge/自环及生命周期回归通过，符合 Boundary Discipline、Fix Root Causes、Test Behavior, Not Implementation 和 Prove It Works。

## 判断性 smell / ponytail

未发现有具体后果的可操作 smell。修复集中在应用映射翻译的负责边界，复用既有共享验证而未增加公共 API、依赖、accessor 禁令、cap、retry 或 fallback。按单 Canvas Host 的选中子图负载，所有权复制为线性，范围最小充分。

## 当前提交实际检查及限制

本轮 `bun test packages/plugin-duplicate-selection/tests`：34 pass、117 assertions（Bun 1.4.2）。完整范围 `git diff --check` 通过，工作树干净。

未执行 build、check:affected、仓库 full check、浏览器、真实远端发布、报告上传或当前 head CI；旧提交的结果没有换绑为当前验证。


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: **passed**

已在同步后新身份独立审查完整两文件补丁、本轮 Issue74 全文/空评论/blockers、PR75 正文及空反馈、prepared plan、当前 AGENTS/CONTEXT/讨论规范与 ADR0073/0077/0078；未发现明确验收遗漏、错误实现或范围扩张。

Node/Edge 集合分别单次捕获，验证后按实际索引翻译到自有冻结数组，不调用来方 map/iterator/constructor/species。原始数字 duplicateId 等非法映射在现有转换/Fragment 验证边界拒绝，发生于 Transaction 和 Selection 更新前。原始读取/materializer 异常、集合短路、原生长度、稀疏/继承索引、精确覆盖、规范顺序、冻结和同 namespace 校验保持，没有新增公开 API、cap、retry 或 fallback。

实际在新 head 执行：`bun test packages/plugin-duplicate-selection/tests packages/canvas-fragment/tests packages/plugin-clipboard/tests`，109 pass、0 fail、422 assertions。真实 Host 的 Node/Edge 绕过、捕获一次、原异常、hooked 合法映射及共享 Fragment/Clipboard 组合均通过。

已核验新身份/hash/完整 diff/提交列表、c762+main710 合并父链、空 combined diff及 package 文件等同比较；`git diff --check` 通过，工作树干净。结论来自本轮代码检查和执行，旧报告未换绑。

未运行工程构建、类型/声明、浏览器、full check/verify、远端追加发布、当前 head CI/完整反馈或报告/媒体回读。PR 既有历史验证文字不作为本轮全量验收证据；实际 main 集成和完整验收仍待完成。

- base: `710038f0ed0cfc830580241ca1e90fca5f50677e`
- head: `5820f81aad5f07b3ab8f2b3fd6a42b54ab26d745`
- tree: `4c89643ed1cc7290211b851a29e3de9feea24328`
- raw binary patch SHA256: `c80710dd719e3c7d6b912f57184ec907f4f64d82242dd47096548aacafccbb29`


## Behavior evidence

### historical-duplicate-red

red — passed; exit 1; expected exit 1.

Historical original main99 real Host probe accepted invalid raw duplicateId42 through caller-owned map hook, mutating Document. Preserve its original source identity; this is not a verification receipt for current source.

Command: `bun duplicate-array-hook-repro.ts (original discovery20261021T181732-discovery, main99)`

[Original command output](logs/behavior-1.log)

### current-duplicate-consumers

green — passed; exit 0; expected exit 0.

Synchronized5820f81/main710 public Duplicate, Clipboard and Fragment suites:109 passed,422 assertions. Includes actual mapping hooks, indexed/native semantics, membership, immutable/atomic rejection cases.

Command: `bun test packages/plugin-duplicate-selection/tests packages/plugin-clipboard/tests packages/canvas-fragment/tests`

[Original command output](logs/behavior-2.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
