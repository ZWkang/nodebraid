# Verification report

Run: 1164aeba-5330-4429-9b80-97cb1e8efa32 · ZWkang/nodebraid · issue #78

## Reviewed and published source

- Review base: `99ed305515afaec32ef49494b509446ad9ba998c`
- Independently prepared append parent: `99ed305515afaec32ef49494b509446ad9ba998c`
- Published head: `181faea507e1c83bd26e8496036d5cdc3285043b`
- Reviewed local head: `e43480244c7210f0190ef3680f2b3bd3f4ea9d63`
- Tree: `8ebd682c79c220fc9723d8ccec66cb6603f2792b`
- Complete binary patch SHA-256: `d0195d7d0b6c31fc143c3f3562adb0b3099efa7a6f6a40c3d632dc667c53a380`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

Retain the Layout Proposal values actually accepted during validation through canonicalization and freezing, preserving existing Layout contracts. Source: https://github.com/ZWkang/nodebraid/issues/78

### proposal-owned-values

Retain the original real public Layout compute/validator repro; finite coordinates, source revision, complete position sequence, IDs and Fixed Node values are captured once and the exact accepted values are published canonically and immutably.

Dependencies: none

### proposal-caller-regressions

Public direct/engine and Runtime callers cover changed getters/sequence, no second traversal, original read exceptions and validation precedence; existing error codes/details, sparse/inherited behavior, empty/all-fixed, cancellation, stale and History behavior remain intact.

Dependencies: proposal-owned-values

### related-checks-and-review

Affected API/real Dagre/ELK/Runtime/consumer checks and types pass; both independent Standards+ponytail-review and Spec approve the same complete patch, then agents:run verify performs the sole full engineering check for the delivery attempt.

Dependencies: proposal-caller-regressions

### publication-current-feedback

One non-draft PR to main with Refs #78; actual remote tree/first-parent/base ancestry and published SHA verified, published-head preview/report fully uploaded and read back; actual current-head CI and complete feedback/mergeability pass.

Dependencies: related-checks-and-review

### main-integration-acceptance

Requires actual integration into fetched main and final public Layout acceptance before authorized closure. Keep Issue open and human final review/merge pending.

Dependencies: publication-current-feedback

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

# Standards + ponytail-review — Issue #78

Verdict: passed

- Base: `99ed305515afaec32ef49494b509446ad9ba998c`
- Head: `e43480244c7210f0190ef3680f2b3bd3f4ea9d63`
- Tree: `8ebd682c79c220fc9723d8ccec66cb6603f2792b`
- Binary patch SHA-256: `d0195d7d0b6c31fc143c3f3562adb0b3099efa7a6f6a40c3d632dc667c53a380`

完整三文件及新增测试已审查。已追踪 Provider/defineLayoutEngine → shared validator → freezeLayoutProposal → Runtime/Kernel/History，读取相关 Layout 契约、README 与现有 Port-topology 范围。

## 硬规范

未发现违反。`packages/layout-api/src/proposal-validation.ts` 捕获 sourceRevision、ID、position 和 x/y，原 positions 序列只读取、遍历一次。后续精确覆盖、规范排序及冻结仅处理自有已验证数据，符合 ADR0021/0026 的完整、有限、同 revision 和 owned immutable shell 契约。

revision、重复/未知 ID、x 再 y 的原校验顺序保留；Fixed Node 比较和错误 actual 使用同一捕获坐标。原读取/Provider 异常没有被包装或吞掉，Runtime 仍独立重验、检查实时 revision，并由 Kernel 负责最终提交。没有移除取消、stale 或共享边界验证。

新增测试通过公开 validator/Engine 和真实 Host/Kernel/Command/History；覆盖一次读取、单次序列、Fixed Node、异常优先级、不可变输出及 Undo/Redo，符合 Boundary Discipline、Fix Root Causes、Test Behavior, Not Implementation 和 Sequence Verifiable Units。保存的业务 red 确为冻结 NaN、revision 1→11 的断言失败；依赖/导入错误未当作业务 red。

## 判断性 smell / ponytail

未发现有具体后果的可操作 smell。acceptCoordinate 复用相同坐标检查并保留读取短路；所有权复制位于原 shared boundary，未新增公共 seam、cap、retry 或 fallback。按单 Canvas 的完整布局负载，额外存储为线性，排序复杂度保持，范围最小充分。

## 实际检查及限制

本轮 Layout API、Runtime、真实 Dagre/ELK 和根 Runtime/History 组合测试：52 pass、182 assertions（Bun 1.4.2）。完整范围 `git diff --check` 通过，工作树干净。

未执行构建、仓库 full check、浏览器、远端发布或 CI；其他仍在运行的检查未计为通过。


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: **passed**

已独立审查完整三文件补丁、Issue78 原文/空讨论、prepared plan、ADR0021/0026、Layout README及关联 Issue37 全部讨论，并检查 direct validator→Engine→Runtime→Kernel/History 调用链；未发现明确验收遗漏、错误实现或范围扩张。

共享边界单次捕获 sourceRevision、原生遍历得到的 positions 序列及每项 id/position/x/y，边验证边形成自有值，再排序并复用既有冻结 helper；不再遍历或读取原 Proposal。revision、重复/未知/缺失 Node、finite 坐标、Fixed Node 检查和错误先后保留。Runtime 二次验证继续作用于稳定值，当前 revision/stale、取消和 Provider 错误传播未改。没有新增 accessor 禁令、API、cap 或 fallback。

实际执行：

- `bun test packages/layout-api/tests tests/layout-providers.test.ts`：30 pass、138 assertions。
- `bun test packages/plugin-layout/tests packages/layout-dagre/tests packages/layout-elk/tests`：22 pass、44 assertions。

合计52 tests、182 assertions、0 fail。真实 getter-backed Engine 经 Runtime/History 验证单 Commit、重复调用 no-op、Undo/Redo及 Session/Edge/data 保持；真实 Dagre/ELK 与 stale/cancellation 回归通过。已核读坐标与 revision 的行为 red 日志；初次依赖命令或缺导入失败不计业务 red。`git diff --check` 通过，工作树干净。

未执行工程构建、类型检查、浏览器、full check/正式 verify、远端发布、当前 head CI 或报告/媒体回读；运行中的 affected full 检查未计为通过。本次 Spec pass 不代表实际 main 集成与完整验收完成。

- base: `99ed305515afaec32ef49494b509446ad9ba998c`
- head: `e43480244c7210f0190ef3680f2b3bd3f4ea9d63`
- tree: `8ebd682c79c220fc9723d8ccec66cb6603f2792b`
- raw binary patch SHA256: `d0195d7d0b6c31fc143c3f3562adb0b3099efa7a6f6a40c3d632dc667c53a380`


## Behavior evidence

### original-public-proposal-red

red — passed; exit 1; expected exit 1.

At main99 the real public Engine/validator returns frozen NaN, empty coverage and changed revision after successful validation. Original assertion failure and all actual outcomes retained.

Command: `bun original-public-repro.ts (main99 compiled public barrels)`

[Original command output](logs/behavior-1.log)

### dependency-flag-setup-failure

check — failed; exit 1; expected exit 0.

The initial --dependencies invocation supplied two workspace names and failed before building dependencies. Retained as setup failure, not behavioral red.

Command: `bun scripts/build-workspaces.ts --dependencies @nodebraid/layout-api @nodebraid/plugin-layout`

[Original command output](logs/behavior-2.log)

### missing-built-dependency-setup-failure

check — failed; exit 1; expected exit 0.

First regression invocation could not import Kernel because dependency build had failed; not counted as business red.

Command: `bun test packages/layout-api/tests/proposal-values.test.ts (unprepared dependencies)`

[Original command output](logs/behavior-3.log)

### coordinate-behavior-red

red — passed; exit 1; expected exit 1.

After correcting dependency preparation, public Engine returns NaN instead of accepted finite10; actual value assertion fails.

Command: `bun test packages/layout-api/tests/proposal-values.test.ts (before coordinate ownership)`

[Original command output](logs/behavior-4.log)

### coordinate-green

green — passed; exit 0; expected exit 0.

The finite coordinate accepted during public compute is retained after freezing, with one original field read.

Command: `bun test packages/layout-api/tests/proposal-values.test.ts (coordinate ownership)`

[Original command output](logs/behavior-5.log)

### revision-red

red — passed; exit 1; expected exit 1.

After coordinate repair, the new source-revision assertion still receives11 instead of accepted1.

Command: `bun test packages/layout-api/tests/proposal-values.test.ts (before revision ownership)`

[Original command output](logs/behavior-6.log)

### revision-green

green — passed; exit 0; expected exit 0.

Both independent coordinate and revision regressions now pass.

Command: `bun test packages/layout-api/tests/proposal-values.test.ts`

[Original command output](logs/behavior-7.log)

### proposal-contracts-green

green — passed; exit 0; expected exit 0.

26 API tests /46 assertions pass, including16 new coordinate/field/sequence/Fixed Node/error identity and validation precedence regressions.

Command: `bun test packages/layout-api/tests`

[Original command output](logs/behavior-8.log)

### proposal-types-green

check — passed; exit 0; expected exit 0.

Current API source and new regression fixtures pass type checking.

Command: `bun run --filter @nodebraid/layout-api typecheck:self`

[Original command output](logs/behavior-9.log)

### related-layout-green

green — passed; exit 0; expected exit 0.

52 tests /182 assertions pass across API, real Dagre/ELK, Runtime and root composition, including new getter-backed Runtime revalidation, single Commit/History, no-op and Undo/Redo coverage.

Command: `bun test packages/layout-api/tests packages/layout-dagre/tests packages/layout-elk/tests packages/plugin-layout/tests tests/layout-providers.test.ts`

[Original command output](logs/behavior-10.log)

### final-compiled-public-green

green — passed; exit 0; expected exit 0.

All three original public assertions pass against the fixed compiled barrels; header records actual committed head/tree and original metadata is explicitly labelled base.

Command: `git show -s --format=%H,%T HEAD; bun fixed-final-public-probe.ts`

[Original command output](logs/behavior-11.log)

### affected-development-green

check — passed; exit 0; expected exit 0.

check:affected automatically selected full because the existing root composition test changed. Its actual599 tests/2527 assertions, real browser suites, builds and docs pass. This is retained as a development check; it does not replace post-review agents:run verify.

Command: `bun run check:affected --base 99ed305515afaec32ef49494b509446ad9ba998c (selector mode full)`

[Original command output](logs/behavior-12.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
