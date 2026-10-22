# Verification report

Run: 12831587-0f44-446d-8b1e-a2110e1376de · ZWkang/nodebraid · issue #76

## Reviewed and published source

- Review base: `7fd790eef783afb05d9c3a765b9b59018ca8fb82`
- Independently prepared append parent: `c504affe05a34444c4c2415a33c60c91833620a4`
- Published head: `e5096672ef7aeba21963da2a765f5a72ec458d1b`
- Reviewed local head: `6b9d519cc524fb2c09d3b0deb4ab143f86424fb1`
- Tree: `cba1ce1ca110b6d2910a757f2e2c786388daabc1`
- Complete binary patch SHA-256: `f631def090171fc90bdbb50bd525138000ac9da572ba9afaba61825de6a85068`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

## Confirmed defect

At main `99ed305515afaec32ef49494b509446ad9ba998c`, Session validates caller-owned input and then reads it again for publication. A real public-package Host/Kernel/Session probe reproduces:

1. Viewport getters first return `{x:10,y:20,zoom:2}`, then `{x:NaN,y:Infinity,zoom:0}`. `setViewport` returns successfully and publishes the invalid values in a frozen Snapshot; each field was read twice.
2. A Selection `nodeIds` getter returns `['a']` for validation and `['b']` for construction. Both Nodes exist; Session publishes `['b']`, rather than the collection accepted during validation.
3. A Node-ID array actually contains unknown `'missing'`, but its custom iterator yields nothing. The ordinary control rejects with `SELECTION_ENTITY_NOT_FOUND`; the hooked array instead clears the previous Selection without error.

The original public compiled-barrel probe exits 1 at the Viewport invariant assertion and logs all three real outcomes. Sources/output are retained in local run `20261021T190719-discovery` (`session-input-repro.ts`, `session-input-red.log`). Existing Session tests (17 /73 assertions) pass.

## Contract and cause

[ADR 0018](https://github.com/ZWkang/nodebraid/blob/99ed305515afaec32ef49494b509446ad9ba998c/docs/adr/0018-use-logical-screen-units-for-viewport.md) requires finite Viewport coordinates and finite positive zoom. [ADR 0017](https://github.com/ZWkang/nodebraid/blob/99ed305515afaec32ef49494b509446ad9ba998c/docs/adr/0017-bind-selection-to-current-kernel-view.md) rejects unknown Selection entities atomically. [ADR 0022](https://github.com/ZWkang/nodebraid/blob/99ed305515afaec32ef49494b509446ad9ba998c/docs/adr/0022-linearize-session-transitions-breadth-first.md) owns breadth-first transitions and consistent observer Snapshots.

In [session-plugin.ts](https://github.com/ZWkang/nodebraid/blob/99ed305515afaec32ef49494b509446ad9ba998c/packages/plugin-session/src/session-plugin.ts), Viewport issue collection and later copying consume different reads. Selection validation indexes the input arrays, while later canonicalization re-reads fields and consumes caller iterators.

## Acceptance

- Capture each incoming Viewport field once; validate, normalize negative zero and publish those exact accepted values. Do not publish non-finite coordinates or non-positive zoom after successful validation.
- Capture Selection collections once into owned indexed arrays; validate, check Kernel membership, canonicalize and publish the same owned values. Incoming iterator/method/constructor/species hooks must not replace the validated IDs.
- Use native array-like length/index normalization without new caps or fallback. Preserve explicit empty Selection, duplicate/order canonicalization, equivalent-input Snapshot identity, issue aggregation/order, original read exceptions, existing error codes/messages, positive zoom/no-clamp semantics, transition FIFO, reconciliation, subscriber isolation and disposal.
- Do not add a public API, blanket accessor prohibition, dependency, retry or silent degradation.
- Public red/green regressions for both mutators, changed properties/elements and hidden unknown IDs; related Session/Kernel/Renderer/Interaction and browser checks, independent Standards + ponytail-review / Spec, full engineering check, actual publication/current-head CI and report/media readback. Keep the Issue open for main integration and final acceptance; human final review/merge.

## Related work

Complete all-state metadata through final short pages (75 Issues/PRs, 39 PRs) found no existing Session repair. Closed #29, #35 and #38 concern Port or factory capture; #74 / PR #75 concerns Duplicate mapping translation. They do not fix these Session mutation boundaries.

## Authorized integration

Human direct request: pr统一合并一下. Preserve current PR77 source branch and source Issue76. Synchronize fetched main through append-only merge; no product scope changes. Fetched review base: 7fd790eef783afb05d9c3a765b9b59018ca8fb82. Original published head: c504affe05a34444c4c2415a33c60c91833620a4.

### synchronize-main

Record source/target independently before local merge. Append fetched main to the existing PR77 branch, preserving the reviewed Session fix and original parent; resolve real conflicts only within approved scope.

Dependencies: none

### integration-compatibility

Run fresh Session public checks and affected checks for the integration delta, preserving existing regression evidence at original identities. Capture complete new base/head/tree/patch; no old tests/reviews relabeled as new SHA.

Dependencies: synchronize-main

### independent-review

Independent Standards plus ponytail-review and Spec inspect full current PR scope against original Issue76 and actual merged main, with exact new source identities.

Dependencies: integration-compatibility

### formal-engineering-check

Pinned main versioned agents:run verify runs real full bun run check after both axes pass and preserves all attempts.

Dependencies: independent-review

### publish-current-head

Append exact reviewed tree with original branch head as first parent and captured main parent, verify publication before local alignment, then current-head CI/full feedback/mergeability and full immutable report/preview readback.

Dependencies: formal-engineering-check

### authorized-merge

Immediately before normal PR merge recheck actual source head, strict CI and all feedback; use expected_head_sha, no bypass/approve/dismiss/force/auto-merge. Read back merge result and fetch main.

Dependencies: publish-current-head

### main-integration-acceptance

Prove merged commit in fetched main and whole original Issue76 acceptance with real public checks; only then publish acceptance and close under existing user authorization.

Dependencies: authorized-merge

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: Session captures Viewport fields and indexed Selection IDs once, then validates and publishes those same values. The appended main update adds only the Renderer documentation fix.

Verdict: passed. Looks good. Ship.

Reviewed identity:

- Base: `7fd790eef783afb05d9c3a765b9b59018ca8fb82`
- Head: `6b9d519cc524fb2c09d3b0deb4ab143f86424fb1`
- Tree: `cba1ce1ca110b6d2910a757f2e2c786388daabc1`
- Binary patch SHA256: `f631def090171fc90bdbb50bd525138000ac9da572ba9afaba61825de6a85068`

Hard standards: no violations found. Reviewed the complete two-file patch, all 323 regression-test lines, current project rules, applicable principle guidance, Issue #76 with its saved empty discussion, PR #77 context and independent prepared plan. Input capture remains at Session’s boundary. ADR0017 membership rejection, ADR0018 finite coordinates/positive zoom, and ADR0022 FIFO notifications remain intact. Existing validation, error details, canonical frozen values, equivalent-input identity, reconciliation and cleanup are retained.

Judgment checks: no concrete Fowler smell found. Applying ponytail-review for one isolated Host per Canvas, the owned arrays and lazy indexed traversal are necessary. Converting length once prevents changing coercion from hiding an unknown ID. No cap, fallback, dependency or public interface was added. Traced Kernel reads/commits, Duplicate and Clipboard Selection publication, Interaction mutations, Renderer subscriptions and React Snapshot consumers. No new integration conflict was found.

Independent checks at this head: `bun test packages/plugin-session/tests` passed 36 tests and 126 assertions. Eight additional real Host cases passed for Node/Edge BigInt and Symbol lengths, original coercion errors and Infinity-length first-index errors; failures preserve the exact Snapshot. The saved patch matches the exact Git diff/hash and inspection. Verified the original source as first parent, captured main as second parent, clean worktree and `git diff --check`. Commands and outputs are saved in `standards-command-log.txt`.

Not checked: fresh builds, browser behavior, full engineering gate, live PR feedback/mergeability, current-head remote CI, publication or merge. Previous-head results were not used as current-head verification. This report covers Standards and ponytail-review only.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: **passed**

独立重审新 main 基线的完整两文件补丁及 323 行公共回归、原 Issue #76 全文/空讨论、独立 prepared plan、AGENTS/CONTEXT、tracker/讨论规范、code-review、ADR0017/0018/0022 和 Session/Kernel/Renderer/Interaction 调用链。未发现规格遗漏、错误实现或范围扩张。

满足“Capture each incoming Viewport field once”及“publish the same owned values”：Viewport 验证、负零归一化与发布复用捕获值，保持 finite/positive/no-clamp；Selection 集合、length 的一次数值转换及实际索引进入 owned 数组，验证、membership、去重排序和冻结发布复用同值。输入 hooks 不替换 ID，unknown ID 原子拒绝；原始异常/诊断顺序、空选择、等价 Snapshot、FIFO、reconciliation、订阅隔离及 disposal 保留。无 API、cap、accessor ban 或 fallback 新增。

实际 `bun test packages/plugin-session/tests`：36 pass、0 fail、126 assertions；`git diff --check` 通过。另核对 append 第一父为原 published source c504affe、第二父为 main7fd，integration delta 仅两份 Renderer 文档四行；完整 patch/inspection、head/tree 与干净工作树一致。命令与原始输出在 `spec-review-commands.log`，未借用旧 head 结果。

已读 PR77 当前 published head c504affe 的完整空 comments/reviews/threads，未见新增反馈；本地被审 head 尚未发布。未执行本轮 full verify、build/browser、affected/docs 全套、远端新 head CI/反馈、报告回读或最终 merge/main 验收；由后续交付证据分别确认。

- base: `7fd790eef783afb05d9c3a765b9b59018ca8fb82`
- head: `6b9d519cc524fb2c09d3b0deb4ab143f86424fb1`
- tree: `cba1ce1ca110b6d2910a757f2e2c786388daabc1`
- binary patch SHA256: `f631def090171fc90bdbb50bd525138000ac9da572ba9afaba61825de6a85068`


## Behavior evidence

### current-session-input-contract

green — passed; exit 0; expected exit 0.

At synchronized local head6b9d519, fresh public Session suite passes36 tests/126 assertions covering captured Viewport/Selection values, original errors, membership, immutable Snapshot and lifecycle. Existing original TDD evidence remains at its original identities, not relabeled.

Command: `bun run --filter @nodebraid/plugin-session test`

[Original command output](logs/behavior-1.log)

### main-integration-delta

check — passed; exit 0; expected exit 0.

Actual delta from previous published parent c504affe is only two Renderer documentation snippets. Affected planner selected docs; content, Quick Start and VitePress passed on synchronized head.

Command: `bun run check:affected --base c504affe05a34444c4c2415a33c60c91833620a4`

[Original command output](logs/behavior-2.log)

### independent-session-boundaries

check — passed; exit 0; expected exit 0.

Standards reviewer independently ran36 tests/126 assertions and8 real Host BigInt/Symbol/coercion/Infinity-first-index cases at the exact synchronized head, preserving original errors and exact Snapshot on rejection. Not a visual/browser claim.

Command: `See actual commands in standards-command-log.txt`

[Original command output](logs/behavior-3.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
