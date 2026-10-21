# Verification report

Run: 88d80bb7-4921-4e82-b4fd-058ca934a242 · ZWkang/nodebraid · issue #74

## Reviewed and published source

- Review base: `99ed305515afaec32ef49494b509446ad9ba998c`
- Independently prepared append parent: `99ed305515afaec32ef49494b509446ad9ba998c`
- Published head: `c7621535e3e7484e26153650917e8ab6c1fa91e6`
- Reviewed local head: `d03be1d5138bf2937bf49c9b69f21c7c3bb361f4`
- Tree: `a662eb153bdecc5ec4385187135bb3e8fc6788a9`
- Complete binary patch SHA-256: `c80710dd719e3c7d6b912f57184ec907f4f64d82242dd47096548aacafccbb29`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

Reject invalid actual Duplicate ID mappings atomically without invoking caller-owned collection hooks; capture each collection once while preserving native indexed semantics, existing errors and valid behavior. Source: https://github.com/ZWkang/nodebraid/issues/74

### public-reproduction-and-implementation

Actual Node/Edge mapping hooks reproduce rejection/atomicity defects red, then pass after minimal owned indexed translation. Collection capture, sparse/inherited entries, native length and original error identity remain correct.

Dependencies: none

### related-checks-and-independent-review

Fragment/Duplicate/Clipboard public seams, package declaration/type checks and affected checks pass; independent Standards+ponytail-review and Spec cover identical complete head/tree/patch, followed by sole full agents:run verify.

Dependencies: public-reproduction-and-implementation

### publication-and-current-feedback

One non-draft PR to main with Refs #74; actual published tree/first-parent/base ancestry verified; current head CI, complete feedback and real report/media publication/readback pass.

Dependencies: related-checks-and-independent-review

### main-integration-acceptance

Only after actual main integration, verify deployed mapping behavior and all remaining acceptance before authorized Issue closure. Keep Issue open beforehand; no auto merge.

Dependencies: publication-and-current-feedback

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

# Standards + ponytail-review — Issue #74

Verdict: passed

- Base: `99ed305515afaec32ef49494b509446ad9ba998c`
- Head: `d03be1d5138bf2937bf49c9b69f21c7c3bb361f4`
- Tree: `a662eb153bdecc5ec4385187135bb3e8fc6788a9`
- Binary patch SHA-256: `c80710dd719e3c7d6b912f57184ec907f4f64d82242dd47096548aacafccbb29`

完整两文件及新增公共测试已审查。变更让 Duplicate 自己遍历并翻译实际映射元素，捕获集合后继续使用原 Fragment 验证器。

## 硬规范

未发现违反。已追踪 Example → Duplicate factory/Command → Fragment materialization → Kernel Transaction/Session Selection，以及 Clipboard 共享消费者。

`packages/plugin-duplicate-selection/src/duplicate-selection-command.ts` 中 Node/Edge 集合各读取一次；无效 Node 集合仍先于 Edge 字段读取失败。Array.from 使用自有 array-like 描述，不执行输入 map、iterator、constructor 或 species。精确覆盖、ID 类型/namespace/唯一性仍由 Fragment 边界验证，实体写入和 Selection 更新顺序保持，符合 ADR0073/0076/0078 及 Boundary Discipline。

外部 materializer、集合/元素读取失败没有被统一捕获改写，原 INVALID_MATERIALIZATION 路径保留，符合 ADR0077。新增测试通过真实 Host、Kernel、Command、Session 检查拒绝、未提交状态、集合捕获及有效 hooked arrays，符合 Test Behavior, Not Implementation。

已读取保存的行为 red：非法映射错误地 resolve，以及重复读取集合导致有效输入 reject。依赖未构建的导入失败未计作行为 red。

## 判断性 smell / ponytail

未发现有具体后果的可操作 smell。修复集中在应用映射到 Fragment 的负责边界，复用既有共享验证；按单 Canvas Host 的选中子图负载，新增索引遍历为线性，未增加抽象、依赖、cap 或 fallback，符合 Fix Root Causes 和 Laziness Protocol。

## 实际检查及限制

本轮 `bun test packages/plugin-duplicate-selection/tests`：34 pass、117 assertions（Bun 1.4.2）。完整范围 `git diff --check` 通过，工作树干净。

未执行构建、full check、浏览器、远端发布或 CI；不将其他执行记录当成本轮运行结果。


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: **passed**

已独立核验完整两文件补丁、Issue74 全文/空评论、prepared plan、ADR0073/0077/0078，以及 Duplicate Command→转换→共享 Fragment materialization→Kernel Transaction 调用链；未发现明确验收遗漏、错误实现或范围扩张。

`translateMaterialization` 各读取 nodes/edges 一次，先验证捕获的集合，再按真实索引投影到自有冻结数组；不读取来方 map/iterator/constructor/species。非法实际映射仍由现有转换/Fragment 边界拒绝，发生在 Transaction 与 Selection 更新之前。原生长度转换、继承索引、空位拒绝、读取/应用异常身份、Node 集合短路及规范化/namespace 校验保持，没有新增公开 API 或策略。

实际运行：`bun test packages/plugin-duplicate-selection/tests packages/canvas-fragment/tests packages/plugin-clipboard/tests`，109 pass、0 fail、422 assertions。覆盖新11项真实 Host 回归、既有 Duplicate、Fragment 与 Clipboard 组合行为；`git diff --check` 通过，工作树干净。

已核读 mapping-hook-prepared-red.log 与 collection-capture-red.log：原实现分别错误成功、重复读取后拒绝，均是业务断言失败。首次依赖未准备的日志不计作业务 red。保存的公开包 probe 与 affected/browser 结果不是本审查重跑。

未运行构建、类型/声明检查、浏览器、full check、远端发布、当前 head CI 或报告/媒体回读。本产品补丁不包含执行器升级，不代表新执行协议已部署至 main；实际 main 集成及完整验收仍待完成。

- base: `99ed305515afaec32ef49494b509446ad9ba998c`
- head: `d03be1d5138bf2937bf49c9b69f21c7c3bb361f4`
- tree: `a662eb153bdecc5ec4385187135bb3e8fc6788a9`
- raw binary patch SHA256: `c80710dd719e3c7d6b912f57184ec907f4f64d82242dd47096548aacafccbb29`


## Behavior evidence

### original-public-invalid-mapping

red — passed; exit 1; expected exit 1.

At main99 the real public compiled-barrel Host probe commits a custom map replacement for numeric duplicateId42 (revision1→2); rejection assertion fails. This is the original historical source, not current success.

Command: `bun original-public-repro.ts (main99 public package barrels)`

[Original command output](logs/behavior-1.log)

### initial-unprepared-test-dependency

check — failed; exit 1; expected exit 0.

Initial focused invocation started before dependency build finished and could not resolve plugin-command. Retained as setup failure, not regression red.

Command: `bun test packages/plugin-duplicate-selection/tests/mapping-input.test.ts (before dependency build finished)`

[Original command output](logs/behavior-2.log)

### actual-node-edge-hook-red

red — passed; exit 1; expected exit 1.

After actual dependencies completed, both real Host tests resolve and commit invalid actual Node/Edge mappings instead of rejecting; failure is the behavior assertion.

Command: `bun test packages/plugin-duplicate-selection/tests/mapping-input.test.ts (before indexed translation fix)`

[Original command output](logs/behavior-3.log)

### collection-re-read-red

red — passed; exit 1; expected exit 1.

After method-hook correction, changing Node/Edge collection getters replace the accepted arrays with empty arrays, rejecting otherwise valid duplication; both retained-value assertions fail.

Command: `bun test packages/plugin-duplicate-selection/tests/mapping-input.test.ts (before collection capture fix)`

[Original command output](logs/behavior-4.log)

### duplicate-regressions-green

green — passed; exit 0; expected exit 0.

34 real Host/public Command tests, 117 assertions; actual invalid Node/Edge mappings reject atomically, collection capture is stable, valid frozen hooked mappings pass, native sparse/inherited/string-length behavior and original errors remain.

Command: `bun test packages/plugin-duplicate-selection/tests`

[Original command output](logs/behavior-5.log)

### fixed-compiled-public-probe

green — passed; exit 0; expected exit 0.

Same original behavior assertions against the fixed compiled public barrels: INVALID_MATERIALIZATION, map calls0, Document revision remains1. Only import root and metadata label differ from original source; both sources retained.

Command: `bun fixed-build-public-probe.ts (fixed published package barrels)`

[Original command output](logs/behavior-6.log)

### affected-consumers-browser-docs

check — passed; exit 0; expected exit 0.

Affected selector executed Duplicate, Clipboard, Core, Examples, real Examples browser scenes, related root Layout provider composition test and docs at unchanged product source.

Command: `bun run check:affected --base 99ed305515afaec32ef49494b509446ad9ba998c`

[Original command output](logs/behavior-7.log)

### fragment-regressions

check — passed; exit 0; expected exit 0.

Shared Fragment value regressions remain green (23 tests43 assertions); no shared validator validation was removed.

Command: `bun run --filter '@nodebraid/canvas-fragment' test:self`

[Original command output](logs/behavior-8.log)

### duplicate-typecheck

check — passed; exit 0; expected exit 0.

Duplicate source and public test types pass.

Command: `bun run --filter '@nodebraid/plugin-duplicate-selection' typecheck:self`

[Original command output](logs/behavior-9.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
