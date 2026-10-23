# Verification report

Run: c143cf74-a459-4419-a8bf-d880ae669e87 · ZWkang/nodebraid · issue #92

## Reviewed and published source

- Review base: `2b54295f82eec2f08f8b0b34a34352c2b5d94e08`
- Independently prepared append parent: `7b1fbc09ae7c8dca18153369a3b62402aa5935e8`
- Published head: `936c3419f0589b5a2f96f3c3f9f7de58bb5d54e1`
- Reviewed local head: `baa7147beeed1cfd66eb1aa6ba2670c92cbbcfe3`
- Tree: `16862e6483263a3ac59f39f0c406ad7e984ae1ed`
- Complete binary patch SHA-256: `47bc25a1cd9ad2f5f8baee434d06dfc0ea13ca20fadcb960935600dc0ce6098b`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

## Confirmed defect

On fetched main `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`, replay validation rereads caller-owned `beforeRevision` and `revision` across safe-integer, range and adjacency checks. A changing getter can replace the first revision tuple with later values and make an invalid tuple pass.

A fresh compiled public Kernel probe executes both directions:
- Stable `(0,1)` replays normally.
- Stable non-adjacent `(0,5)` rejects with `INVALID_CHANGE_SET / INVALID_REVISIONS`, preserves the exact View and never reads `changes`.
- A `revision` getter returning `5` then `1` exposes the same first tuple `(0,5)`, but replay succeeds. Forward inserts a Node at revision 1; reverse removes it and advances revision 1→2.
- A `beforeRevision` getter returning `0` then `1`, with revision `2`, similarly accepts first tuple `(0,2)`.
- Actual changing cases read beforeRevision 3 times, revision 2 times and changes once. The real rejection invariant fails with exit 1.

Original executable source/output: run `20261022T101847-maintenance`, `kernel-replay-header-repro.ts` and `kernel-replay-header-red.log`. The compiled build and existing focused Kernel suites pass (27 tests / 116 assertions); a separate compiled Query/Snapshot/artifact probe passes. These are public Kernel API checks, not browser input acceptance.

## Contract and cause

The [domain definition](https://github.com/ZWkang/nodebraid/blob/1c85d79db1e275e59f84a9bb77d1fe75c0a582e6/CONTEXT.md) defines a Change Set between adjacent revisions. Existing [replay validation](https://github.com/ZWkang/nodebraid/blob/1c85d79db1e275e59f84a9bb77d1fe75c0a582e6/packages/kernel/src/change-set.ts) requires adjacent non-negative safe integers and reports bounded `INVALID_REVISIONS` details. [ADR0011](https://github.com/ZWkang/nodebraid/blob/1c85d79db1e275e59f84a9bb77d1fe75c0a582e6/docs/adr/0011-replay-change-sets-through-transactions.md) keeps replay inside the existing Transaction boundary; [ADR0029](https://github.com/ZWkang/nodebraid/blob/1c85d79db1e275e59f84a9bb77d1fe75c0a582e6/docs/adr/0029-preserve-domain-and-external-error-identity.md) preserves original external errors.

`validateChangeSet` performs guards against repeated property reads and rereads those properties again while describing errors. There is no retained pair shared by validation and diagnostics.

Minimal public reproduction after `bun run --filter '@nodebraid/kernel' build`:

```ts
import assert from 'node:assert/strict';
import { createCanvasKernel, nodeId } from '@nodebraid/kernel';
const kernel = createCanvasKernel();
const before = kernel.read();
const id = nodeId('header-accepted');
let reads = 0;
const input = {
  beforeRevision: 0,
  get revision() { return ++reads === 1 ? 5 : 1; },
  changes: [{
    entity: 'node' as const, id, before: null,
    after: { id, type: 'task', position: { x: 1, y: 2 }, data: null },
  }],
};
assert.throws(
  () => kernel.transact(tx => tx.applyChangeSet(input, 'forward')),
  e => e instanceof Error && Reflect.get(e, 'code') === 'INVALID_CHANGE_SET',
);
assert.equal(kernel.read(), before);
```

Actual: no error; the Node is committed. The assertion fails.

## Acceptance

- Read each revision header field once and retain that accepted pair across numeric/range/adjacency validation and error details.
- A first non-adjacent pair cannot become valid through later property reads; a first valid pair cannot be invalidated by later substitutions. Rejected headers precede changes/value reads and writes, preserve exact View/revision, and leave no partial replay when caught inside a larger Transaction.
- Cover both header fields, Node/Edge and forward/reverse public replay; valid and invalid stable controls, non-negative safe-integer limits, bounded diagnostic values, inherited/getter inputs, original read exceptions, guard ordering and caught-error atomicity.
- Preserve existing direction/object checks, collection and record semantics, duplicate/sparse checks, conflict preflight, ordering, graph validation, metadata, History replay, immutable evidence and opaque data references. No new public API, accessor ban, cap, retry, dependency or fallback.
- Public red/green, related consumers/affected checks, independent Standards + ponytail-review / Spec, formal full engineering check, exact remote tree/append-parent, current-head CI and full report/media readback.
- Keep this Issue open until actual main integration and whole-Issue acceptance.

## Deduplication

All-state metadata through final short pages: 91 Issues/PRs (4 pages), 47 PRs (2 pages). Complete original bodies and empty discussions read for #18, #48, #82 and #89. Their scopes are commit metadata publication, replay collection traversal, direct Writer IDs and replay Graph Change/entity-value ownership. Open #89 / PR #91 explicitly preserve existing revision validation and do not change the header reads. This remaining header-validation defect is separate; no replacement for those deliveries is created.


### synchronize-main

Capture current fetched main and published source head independently before append-only synchronization of the existing delivery branch. Preserve original Issue scope.

Dependencies: none

### integration-compatibility

Fresh public affected consumers and integration checks pass. Save complete current head/tree/binary patch; historical evidence retains its original source.

Dependencies: synchronize-main

### independent-review

Fresh independent Standards with ponytail-review and Spec inspect the complete current patch against original Issue, ADRs and current main.

Dependencies: integration-compatibility

### formal-engineering-check

Pinned main versioned agents:run verify executes the real full bun run check after both review axes pass; preserve every attempt.

Dependencies: independent-review

### publish-current-head

Actual remote tree and original append parent match verification; current-head CI, complete feedback, immutable full report/media publication and readback pass.

Dependencies: formal-engineering-check

### authorized-merge

Recheck current source/base, strict checks and all feedback immediately before a normal expected-head merge. Preserve review disputes and protection.

Dependencies: publish-current-head

### main-integration-acceptance

Verify actual fetched main ancestry and the whole original Issue through fresh public acceptance; publish outcomes and close only after complete acceptance.

Dependencies: authorized-merge

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: Kernel replay retains the first beforeRevision/revision pair for all checks and error details. This revision combines that header repair with main’s deployed record and entity-shell capture.

Verdict: passed. Looks good. Ship.

Reviewed identity:

- Base: `2b54295f82eec2f08f8b0b34a34352c2b5d94e08`
- Head: `baa7147beeed1cfd66eb1aa6ba2670c92cbbcfe3`
- Tree: `16862e6483263a3ac59f39f0c406ad7e984ae1ed`
- Binary patch SHA256: `47bc25a1cd9ad2f5f8baee434d06dfc0ea13ca20fadcb960935600dc0ce6098b`

Hard standards: no violations found. Re-read the complete two-file patch, all 336 added test lines, Issue #92, empty discussion/blockers, independent prepared plan and supplied PR #93 checkpoint. Current AGENTS, CONTRIBUTING, CONTEXT, tracker/discussion rules, review skills and applicable principle guidance match the checked project documents.

Header capture remains after direction/object guards and before changes, record capture or opaque data access. Invalid first values produce bounded details without collection reads; valid first values cannot be replaced later. Original read errors and inherited receivers remain intact. This follows Boundary Discipline and ADR0029. The integrated capture helpers retain structural values while preserving opaque data’s reference and read phase under ADR0012. Whole-set preflight, final graph validation and new local commit revisions preserve ADR0011; pure Kernel validation does not add Runtime observation under ADR0028.

Judgment checks: no concrete Fowler smell found. For one synchronous Kernel per Canvas, two local constants solve the header boundary with constant overhead and no new abstraction or policy. Traced header → collection → owned records/entities → conflict preflight → writer → commit → History, including current Layout consumers.

Independent checks after dependency construction completed: `bun test packages/kernel/tests packages/plugin-history/tests tests/layout-providers.test.ts` passed 189 tests / 911 assertions at this head. Both header and record regression suites passed, including Node/Edge, both directions, original errors, caught-conflict atomicity, opaque-data phases and real Dagre/ELK Undo/Redo.

Verified clean head/tree, exact saved patch/hash, task/inspection binding and `git diff --check`. Local parents are the earlier unpublished sync and new main; the separately captured remote append parent remains an ancestor. Prepared compiled Kernel contains both repairs. Commands/raw output are in `standards-command-log.txt`.

Not checked: fresh builds/typecheck, browsers, full engineering gate, live feedback refresh, new-head CI, API publication/tree readback or merge. Earlier reports/results retain their original identities. This report covers independent Standards and ponytail-review only.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

# Spec review — Issue #92 / PR #93

Verdict: **passed**. 未发现验收遗漏、错误实现或范围扩张。

- Base: `2b54295f82eec2f08f8b0b34a34352c2b5d94e08`
- Head: `baa7147beeed1cfd66eb1aa6ba2670c92cbbcfe3`
- Tree: `16862e6483263a3ac59f39f0c406ad7e984ae1ed`
- Complete binary patch SHA256: `47bc25a1cd9ad2f5f8baee434d06dfc0ea13ca20fadcb960935600dc0ce6098b`

已独立核验完整两文件补丁、实际提交及父节点、Issue #92 全文和当前分页反馈；Issue comments/blockers、PR comments/reviews/threads 均为空。复核 AGENTS、CONTEXT、tracker/discussion、code-review、ADR0011/0012/0028/0029，以及 Kernel、History、Session/Layout 调用链。

Issue 要求 “Read each revision header field once” 且 “Rejected headers precede changes/value reads and writes”。实现先保留两个 header，numeric/range/adjacency 与 bounded details 全部使用同一首 tuple；direction/object guards、原 getter receiver/异常及 exact View 保持。新增公共回归覆盖首有效/无效、两字段、Node/Edge、正反方向、安全整数边界、继承 getter、诊断和 caught-error 原子性。

新 main 已部署的 record/entity owned shells、whole-set conflict preflight、应用顺序和 immutable evidence 保持；opaque data 仍在原比较/物化阶段按原引用读取。未改变公开 API、验证政策、依赖或新增 fallback。

独立执行：`bun test packages/kernel/tests packages/plugin-history/tests tests/layout-providers.test.ts`，**189 pass / 911 assertions，exit 0**；`git diff --check BASE...HEAD` 与 remote append parent 的 ancestor 检查均 exit 0。即时本地父为 `2f182d3`，真实远端追加父为 `7b1fbc0`，已区分。完整原始命令输出见 `spec-review-commands.log`。

本审查未运行 build、browser、affected 或完整工程检查，未验证本 head 远端发布、CI、报告/media readback 或 main 合入；旧 head 检查不计作本轮验证。


## Behavior evidence

### public-integration

green — passed; exit 0; expected exit 0.

Fresh current-head combined Kernel/History/Command/Session/root Layout public suites pass: both first revision-header tuples and the actually deployed record/entity shell capture are exercised together. Preserve exact View, guard/read/error ordering, opaque data phases and caught-error atomicity. Historical2092 tests/reviews are not reused.

Command: `bun test packages/kernel/tests packages/plugin-kernel/tests packages/plugin-history/tests packages/plugin-command/tests packages/plugin-session/tests tests/layout-providers.test.ts`

[Original command output](logs/behavior-1.log)

### affected-integration

check — passed; exit 0; expected exit 0.

Actual affected checks for integrated Kernel record/value capture cover public consumers, real browsers and documentation. Canvas media supplements public API assertions.

Command: `bun run check:affected --base 2f182d3059ec21d6466affb4362821ceccda9098`

[Original command output](logs/behavior-2.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
