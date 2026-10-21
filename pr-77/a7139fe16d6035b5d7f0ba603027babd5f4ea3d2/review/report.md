# Verification report

Run: f2185fcf-d447-4ec9-9b46-511518f223bb · ZWkang/nodebraid · issue #76

## Reviewed and published source

- Review base: `99ed305515afaec32ef49494b509446ad9ba998c`
- Independently prepared append parent: `99ed305515afaec32ef49494b509446ad9ba998c`
- Published head: `a7139fe16d6035b5d7f0ba603027babd5f4ea3d2`
- Reviewed local head: `5827add8987de8096ac4065049a1bbcfa5efacad`
- Tree: `9708a9d120458480995c5063c16d49d7b5fef656`
- Complete binary patch SHA-256: `c358889e56b38986cf451533c571b52c6ec4d24286a7c3d60289652a09e3bbea`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

Retain the Viewport and Selection values actually accepted during validation; use one owned input snapshot through normalization, membership checking and publication, preserving existing Session contracts. Source: https://github.com/ZWkang/nodebraid/issues/76

### viewport-input-capture

Original real public Host repro retained; Viewport property re-read regressions red then green, captured finite positive values published with existing negative-zero/errors/no-op behavior.

Dependencies: none

### selection-owned-input

Collection/element re-reads and iterator-hidden unknown IDs reproduce red then pass with one owned indexed snapshot; preserve canonicalization, membership/error aggregation, native array-like semantics and original read failures.

Dependencies: viewport-input-capture

### related-checks-and-independent-review

Affected Session consumers, types/declarations and browser checks pass; independent Standards+ponytail-review and Spec cover the complete fixed patch, then sole agents:run verify full engineering check passes with source stable.

Dependencies: selection-owned-input

### publication-current-feedback

One non-draft main PR with Refs #76; actual remote tree/first-parent/base ancestry match, published-head media/full report uploaded and read back; complete current-head CI/feedback/mergeability pass.

Dependencies: related-checks-and-independent-review

### main-integration-acceptance

Requires actual delivery integration into fetched main and deployed public Session input acceptance before authorized Issue closure. Keep Issue open and no auto merge.

Dependencies: publication-current-feedback

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

# Standards + ponytail-review — Issue #76 完整补丁复审

Verdict: passed

- Base: `99ed305515afaec32ef49494b509446ad9ba998c`
- Head: `5827add8987de8096ac4065049a1bbcfa5efacad`
- Tree: `9708a9d120458480995c5063c16d49d7b5fef656`
- Binary patch SHA-256: `c358889e56b38986cf451533c571b52c6ec4d24286a7c3d60289652a09e3bbea`

已重新审查完整两文件、新增测试及 Session setter、validator、Kernel membership、Snapshot/FIFO 和 Interaction/Renderer/React 消费路径。

## 硬规范及原 P2 处置

未发现当前补丁违反硬规范。原 Selection 预分配遮蔽读取错误的 P2 已闭合：`packages/plugin-session/src/session-plugin.ts` 使用项目已有 native keys 自有描述模式逐项收集，不按不可信长度预分配。当前真实 Host 回归确认 Infinity length 的首项原始 Error 保持身份，读取一次且 Snapshot 不变；保存的旧 red 日志确为该行为断言失败。

Viewport 已验证的 x/y/zoom 直接用于发布和负零规范化，符合 ADR0018。Selection 校验、Set 去重排序及 Kernel 成员检查使用同一自有数据；未知实体仍整次拒绝，符合 ADR0017。非数组保留既有结构化诊断，数组不调用来方 iterator/method/constructor；稀疏、继承索引及长度转换维持约定语义。

问题聚合顺序、等价输入 Snapshot identity、提交后 reconciliation、FIFO 通知及 disposal 路径未改动，对应回归通过，符合 ADR0022/0035。测试使用真实 Host/Services，符合 Boundary Discipline、Fix Root Causes 和 Test Behavior, Not Implementation。

## 判断性 smell / ponytail

未发现有具体后果的可操作 smell。修复复用现有 validator、规范化和发布机制，惰性索引复用仓库模式；没有额外抽象、依赖、cap 或 fallback。按单 Canvas Host 的输入负载，新增所有权复制为线性，范围最小且完整。

## 实际检查及限制

本轮 `bun test packages/plugin-session/tests`：34 pass、116 assertions（Bun 1.4.2）。完整范围 `git diff --check` 通过，工作树干净。旧失败报告保持其原提交身份。

未执行构建、仓库 full check、浏览器、远端发布或 CI；仍在运行的其他检查未计为通过。


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: **passed**

已独立重审完整两文件补丁、Issue76 原文/空评论、prepared plan、ADR0017/0018/0022/0035、README、公共 API 与真实 Host 调用链；未发现剩余验收遗漏、错误实现或范围扩张。

先前索引异常被预分配覆盖的 P2 已修复。captureSelectionValues 使用自有 length descriptor 的原生 keys 懒遍历，原始集合 length 只读取一次，不访问输入 iterator/method/constructor/species，也不先按极大长度分配结果。Infinity length/index0 抛错现保留同一 Error 身份、一次索引读取及原 Snapshot，未加 cap/fallback。

Viewport 已知字段各捕获一次，验证、负零归一化与发布使用相同值；Selection 验证、membership、去重排序与发布复用拥有的索引集合。既有结构化错误聚合/顺序、unknown ID 原子拒绝、正有限 zoom/no-clamp、空值/no-op Snapshot 身份、FIFO/reconciliation、subscriber 隔离和 disposal 保持。

实际执行：`bun test packages/plugin-session/tests`，34 pass、0 fail、116 assertions；包含真实 Host 的新异常身份回归与全部原 Session 测试。已核读 index-error-red.log，旧实现失败为预期的 RangeError/原 Error 身份差异。`git diff --check` 通过，工作树干净。旧报告保留原 head，未改写。

未执行工程构建、类型/声明、浏览器、full check、远端发布、当前 head CI 或报告/媒体回读；不将运行中的 affected 检查计为通过。定向结果不代表完整交付或 main 验收完成。

- base: `99ed305515afaec32ef49494b509446ad9ba998c`
- head: `5827add8987de8096ac4065049a1bbcfa5efacad`
- tree: `9708a9d120458480995c5063c16d49d7b5fef656`
- raw binary patch SHA256: `c358889e56b38986cf451533c571b52c6ec4d24286a7c3d60289652a09e3bbea`


## Behavior evidence

### original-public-session-red

red — passed; exit 1; expected exit 1.

At main99, real public compiled Host reproduces invalid frozen Viewport publication, changed Selection collection, and iterator-hidden unknown IDs. The first invariant assertion exits1; all actual outcomes are logged.

Command: `bun original-public-repro.ts (main99 public compiled barrels)`

[Original command output](logs/behavior-1.log)

### viewport-capture-red

red — passed; exit 1; expected exit 1.

Before Viewport capture, x/y/zoom getters pass validation then publish their later invalid values; all three public setter assertions fail.

Command: `bun test packages/plugin-session/tests/input-values.test.ts (before Viewport capture)`

[Original command output](logs/behavior-2.log)

### selection-capture-red

red — passed; exit 1; expected exit 1.

After Viewport fix, six real Session tests still fail for collection/element re-reads and unknown members hidden by Node/Edge iterators.

Command: `bun test packages/plugin-session/tests/input-values.test.ts (before Selection ownership fix)`

[Original command output](logs/behavior-3.log)

### initial-fixture-types-failure

check — failed; exit 1; expected exit 0.

Throw-only getter fixtures inferred void; retained compiler failure is not a behavior regression red.

Command: `bun run --filter '@nodebraid/plugin-session' typecheck:self (initial fixture)`

[Original command output](logs/behavior-4.log)

### fixture-annotation-attempt-failure

check — failed; exit 1; expected exit 0.

An initial never annotation was applied to the returning getter; compiler rejected it and the remaining void getter. Original output retained, then precise annotations corrected.

Command: `bun run --filter '@nodebraid/plugin-session' typecheck:self (fixture annotation attempt)`

[Original command output](logs/behavior-5.log)

### affected-fixture-types-failure

check — failed; exit 1; expected exit 0.

First affected invocation stopped at the same fixture types before later consumer/browser checks. This is not counted as a complete affected pass.

Command: `bun run check:affected --base 99ed305515afaec32ef49494b509446ad9ba998c (before fixture correction)`

[Original command output](logs/behavior-6.log)

### session-regressions-green

green — passed; exit 0; expected exit 0.

33 tests /113 assertions including16 new real Host cases pass after final fixture correction. Owned values, read errors/order, valid hooked arrays, native length and inherited indices preserved; existing FIFO, no-op, malformed input, reconciliation and lifecycle remain green.

Command: `bun test packages/plugin-session/tests`

[Original command output](logs/behavior-7.log)

### session-types-green

check — passed; exit 0; expected exit 0.

Final source and fixture getter types pass without weakening assertions or the public API.

Command: `bun run --filter '@nodebraid/plugin-session' typecheck:self`

[Original command output](logs/behavior-8.log)

### affected-consumers-green

check — passed; exit 0; expected exit 0.

Selected downstream Session consumers, related root tests, real React/SVG/Example browser suites, builds and docs pass. This remains the targeted development check, not full delivery verification.

Command: `bun run check:affected --base 99ed305515afaec32ef49494b509446ad9ba998c`

[Original command output](logs/behavior-9.log)

### fixed-compiled-public-green

green — passed; exit 0; expected exit 0.

All original behavior assertions pass against the fixed compiled public barrels: one field/collection read, finite positive frozen Viewport, unknown Selection rejection with identical prior Snapshot and no iterator invocation. Only import root and metadata label differ; original source retained.

Command: `bun fixed-build-public-probe.ts (fixed public compiled barrels)`

[Original command output](logs/behavior-10.log)

### index-error-preallocation-red

red — passed; exit 1; expected exit 1.

Real public Host reproduces Array.from preallocation replacing the original index0 Error with RangeError; failed review finding retained.

Command: `bun test packages/plugin-session/tests/input-values.test.ts (before lazy indexed capture)`

[Original command output](logs/behavior-11.log)

### index-error-green

green — passed; exit 0; expected exit 0.

34 real public Session tests /116 assertions pass, including original indexed error identity with Infinity raw length, unchanged prior Snapshot and one index read.

Command: `bun test packages/plugin-session/tests`

[Original command output](logs/behavior-12.log)

### index-error-types-green

check — passed; exit 0; expected exit 0.

Lazy indexed capture and new public regression preserve type checking.

Command: `bun run --filter @nodebraid/plugin-session typecheck:self`

[Original command output](logs/behavior-13.log)

### affected-final-green

check — passed; exit 0; expected exit 0.

After the review correction, selected downstream Session consumers, root tests, real React/SVG/Example browser suites, builds and docs pass at final source. This is the targeted development check, not full delivery verification.

Command: `bun run check:affected --base 99ed305515afaec32ef49494b509446ad9ba998c`

[Original command output](logs/behavior-14.log)

### final-compiled-public-green

green — passed; exit 0; expected exit 0.

The original three regression assertions pass against final compiled public barrels: exact accepted Viewport/Selection values, atomic unknown-ID rejection, no input iterator calls.

Command: `bun fixed-build-public-probe.ts (final compiled public barrels)`

[Original command output](logs/behavior-15.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
