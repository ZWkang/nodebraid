# Verification report

Run: 3b5cf684-3507-4c1f-828c-06031ac83ceb · ZWkang/nodebraid · issue #59

## Reviewed and published source

- Base: `e88b531ba643ca2e32e558e2195c9784271af33f`
- Published head: `c19cf9366223687e73f5849f050479d43ef1b74c`
- Reviewed local head: `aa935d2162ee77b42715baa5e41dafc83584e274`
- Tree: `401ef3c6892b35f61c1fcc2ff85b2d4427a5f18c`
- Complete binary patch SHA-256: `39338ace33092a479b81122e32299446b46c3a1f40c1d026c517df69d5bf0d5e`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

d471a41e84b7b6172bccfb5f2e1b00b84b148ca8fb45e8595187662da8b030c7

### nonempty-collection

Public Fragment red-green: normalized zero-length Proxy arrays reject with existing INVALID_FRAGMENT, domain and message; no empty accepted Fragment is returned.

Dependencies: none

### snapshot-and-consumers

Retain one accepted indexed collection for nonempty and membership validation; native length conversion, source read/error identity, valid ordering/opaque data/immutability and real Clipboard/Duplicate behavior preserved.

Dependencies: nonempty-collection

### delivery

Affected/full checks and independent Standards+ponytail-review/Spec; append-only exact remote tree/parent, current-head CI, actual report/preview publication/readback; human review/merge.

Dependencies: snapshot-and-consumers

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

**verdict: passed**

完整三文件已审查。

硬标准：未发现违反。非空检查使用规范化后的自有 Node 集合，符合 ADR0078 的 Fragment 验证边界；未改变 ADR0012 的 opaque data 引用约定。公共回归符合 AGENTS/TDD 要求，Clipboard 测试使用真实 Runtime Services。

判断性 smell：未发现有具体后果的可操作问题。移动既有判断即可修复根因，无新增抽象或边界策略。

已追踪 Fragment 接受、materialization、Clipboard 错误包装、Duplicate 和 Example codec。保留原生长度转换、索引读取异常、排序及冻结行为；Clipboard 在提交前以 `INVALID_FRAGMENT` 拒绝空集合。

本轮实际执行三个相关包测试：**98 pass、392 assertions**；`git diff --check` 通过，工作树干净。未执行构建、full check、浏览器、发布或 CI；结论限于指定提交。

```text
head: aa935d2162ee77b42715baa5e41dafc83584e274
tree: 401ef3c6892b35f61c1fcc2ff85b2d4427a5f18c
patch: 39338ace33092a479b81122e32299446b46c3a1f40c1d026c517df69d5bf0d5e
```

## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: **passed**

已核验完整三文件补丁、Issue #59 全文、空 comments/blockers、prepared task、ADR0078/0012及公共消费者；未发现验收遗漏、范围扩张或错误实现。

既有非空检查移到 owned Node 集合之后，与后续验证及返回值使用同一集合；normalized-zero 输入保留原 `CanvasFragmentError` domain/code/message。原生长度转换、索引读取异常、opaque data、parent/Endpoint、Selection 和冻结语义未改变。真实 Clipboard 回归确认错误在 decoded Fragment 边界包装为 `plugin.clipboard/INVALID_FRAGMENT`，且无状态提交。

已查看原始 red 日志，失败属于预期行为断言。实际运行：

`bun test packages/canvas-fragment/tests packages/plugin-clipboard/tests packages/plugin-duplicate-selection/tests`

结果 **98 pass、0 fail、392 assertions**；`git diff --check` 通过，工作树干净。

未执行构建、full check，未验证当前 head 的远端 CI 或报告发布回读。

- head: `aa935d2162ee77b42715baa5e41dafc83584e274`
- tree: `401ef3c6892b35f61c1fcc2ff85b2d4427a5f18c`
- patch SHA256: `39338ace33092a479b81122e32299446b46c3a1f40c1d026c517df69d5bf0d5e`

## Behavior evidence

### normalized-empty-red

red — passed; exit 1; expected exit 1.

On base e88b531, a genuine Proxy array length 0.5 passed the existing nonempty check and returned an empty accepted Fragment. The public regression expected INVALID_FRAGMENT but no exception was thrown.

Command: `bun test packages/canvas-fragment/tests/array-input.test.ts --test-name-pattern 'empty normalized'`

[Original command output](logs/behavior-1.log)

### normalized-empty-green

green — passed; exit 0; expected exit 0.

The same public regression rejects normalized empty input with the existing CanvasFragmentError domain, code and exact message after checking the owned collection.

Command: `bun test packages/canvas-fragment/tests/array-input.test.ts --test-name-pattern 'empty normalized'`

[Original command output](logs/behavior-2.log)

### clipboard-old-built-dependency-red

red — passed; exit 1; expected exit 1.

Real Command/Runtime test ran against the unmodified Fragment artifact built from base e88b531 before rebuilding the changed dependency. It exposed the raw CanvasFragmentError instead of the promised Clipboard INVALID_FRAGMENT wrapper. This is a behavior assertion failure, not a build/setup failure.

Command: `bun test packages/plugin-clipboard/tests/failures.test.ts --test-name-pattern 'normalized Node collection'`

[Original command output](logs/behavior-3.log)

### fragment-build

check — passed; exit 0; expected exit 0.

Rebuilt the changed Fragment package and its required declarations/artifact checks before testing consumers through package-name imports.

Command: `bun run --filter '@nodebraid/canvas-fragment' build`

[Original command output](logs/behavior-4.log)

### fragment-and-consumers-green

green — passed; exit 0; expected exit 0.

98 tests / 392 assertions passed: normalized-zero lengths, one accepted Node collection, original input-read errors/hooks, and real Clipboard/Duplicate integration. Clipboard rejects the decoded malformed value with the proper wrapper and no Document change.

Command: `bun test packages/canvas-fragment/tests packages/plugin-clipboard/tests packages/plugin-duplicate-selection/tests`

[Original command output](logs/behavior-5.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
