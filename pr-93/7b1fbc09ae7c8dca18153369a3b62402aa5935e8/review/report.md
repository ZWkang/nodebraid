# Verification report

Run: b7ca9279-f07e-4c5d-998e-1b4faeebafa7 · ZWkang/nodebraid · issue #92

## Reviewed and published source

- Review base: `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`
- Independently prepared append parent: `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`
- Published head: `7b1fbc09ae7c8dca18153369a3b62402aa5935e8`
- Reviewed local head: `d937a3a3b0a45c93350008c49b45ac803c20b81e`
- Tree: `0cb449750b82649b86c7cae04a9769f4bbe36ee2`
- Complete binary patch SHA-256: `21ac257815c4b059873c6c8fb86691a91b0ab63b8bc883e8c0f58d7a2d805e7a`

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


### revision-header-red-green

Preserve original compiled main reproduction and stable controls. Add public failing tests for non-adjacent first header values replaced during later reads, then retain one header pair through numeric/range/adjacency validation and diagnostics.

Dependencies: none

### revision-header-compatibility

Node/Edge forward/reverse coverage, valid/invalid stable and changing values, safe-integer limits and bounded diagnostics, guard/read order, inherited inputs, original exceptions, zero changes reads on invalid headers and caught-error atomicity; related/affected checks and fresh compiled public probe pass. Existing Issue89 replay record scope stays separate.

Dependencies: revision-header-red-green

### independent-review

Independent Standards plus ponytail-review and Spec review the identical complete head/tree/patch against original Issue92, ADR0011/0029 and public Kernel revision contracts.

Dependencies: revision-header-compatibility

### formal-engineering-check

Pinned deployed-main versioned agents:run verify performs the actual full bun run check after targeted checks and dual reviews; preserve all original attempt logs and stable source identity.

Dependencies: independent-review

### publish-and-current-head-acceptance

Publish exact checked tree with independently saved first parent, one PR to main; verify actual published-head CI, complete feedback, mergeability and full immutable report/media byte readback before ready.

Dependencies: formal-engineering-check

### main-integration-acceptance

Keep Issue92 open until final human review/merge, real fetched-main integration and whole-Issue acceptance.

Dependencies: publish-and-current-head-acceptance

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: Kernel replay captures beforeRevision and revision once, then uses that same pair for safe-integer, range and adjacency checks and bounded error details.

Verdict: passed.

Reviewed identity:

- Base: 1c85d79db1e275e59f84a9bb77d1fe75c0a582e6
- Head: d937a3a3b0a45c93350008c49b45ac803c20b81e
- Tree: 0cb449750b82649b86c7cae04a9769f4bbe36ee2
- Binary patch SHA256: 21ac257815c4b059873c6c8fb86691a91b0ab63b8bc883e8c0f58d7a2d805e7a

Hard standards: No violations found in the complete two-file patch. CONTEXT.md defines adjacent Change Set revisions; ADR0011 retains Transaction-based replay and source conflict protection. ADR0029 requires bounded structural details and original external failure identity. Boundary Discipline and Type System Discipline are satisfied by checking captured runtime values rather than trusting annotations or later getter results. AGENTS.md and CONTRIBUTING.md regression requirements are supported by the retained behavioral red and current public tests.

Direction/object guards remain before header access; rejected headers remain before collection reads or writes. Getters retain their receiver, and first-read exceptions propagate unchanged. Actual commit revisions still come from the current Kernel View rather than restoring incoming revision numbers. Collection/record handling, preflight, Writers, final graph validation and History consumption are unchanged.

Judgment / ponytail: No actionable Fowler smell or correctness, safety, load, speed or testing finding. Two local values fix the repeated-read decision without another type, abstraction, dependency, cap or fallback. Read the full production change, all 336 test lines and 38 new cases, Kernel applyChangeSet/guard/header/collection/preflight/write paths, commit publication and History replay. Assumed load: synchronous in-process Transactions for isolated Canvas Runtimes.

Discussion/evidence: Original and refreshed Issue92 bodies match; both have no comments. No PR or unresolved human review exists. The retained test-only red shows an invalid first tuple committing instead of throwing; the development-time type error was not counted as a behavioral red.

Actual checks at this head:

- Verified clean tree, complete commit/diff identities, prepared-task/inspection binding and byte-identical complete.patch.
- `git diff --check`: passed.
- `bun test packages/kernel/tests packages/plugin-history/tests`: 132 passed, 0 failed, 546 assertions, including numeric limits, bounded diagnostics, both namespaces/directions, inherited inputs and caught-error atomicity.

Not checked: other affected consumers, TypeScript checks, builds, compiled-package probes, browsers, full engineering gate, current-head CI, publication or remote evidence readback.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: **passed**

独立审查完整两文件补丁和 38 个新公共测试、Issue #92 原文及 prereview 完整正文/两次空讨论、独立 prepared plan、AGENTS/CONTEXT、tracker/讨论规范、ADR0010/0011/0012/0029，以及公共 Transaction → replay validation/preflight/writer → History 调用链。未发现验收遗漏、错误实现或范围扩张。

满足“Read each revision header field once and retain that accepted pair”：direction/object guards 后依次捕获 beforeRevision/revision，safe-integer、nonnegative、adjacency 和 bounded diagnostics 均使用首次 pair。后续 getter 不能修复首个无效 pair 或破坏首个有效 pair；无效 header 先于 changes/实体读取及写入拒绝，保持 exact View/revision，caught error 后仅留下后续明确写入。继承 getter receiver、原始异常及读取顺序保持；最大安全相邻 pair 不恢复历史 revision。collection/record、重复/稀疏、冲突 preflight、图校验、metadata、History 和 opaque data 路径未改变；无新 API、accessor ban、cap、retry、依赖或 fallback。

实际执行 `bun test packages/kernel/tests packages/plugin-history/tests`：132 pass、0 fail、546 assertions；命令、精确 head/tree、原始输出和 exit 0 保存于 `spec-targeted-tests.log`。`git diff --check` 通过；commit 列表、完整 binary patch、inspection/complete.patch 和干净工作树身份一致。

未独立运行类型/构建、affected、browser/full engineering gate 或 compiled public probes；未验证当前 head 的远端 CI、报告/媒体发布回读或 main 集成。定向结果不代表完整交付验收；Issue89 的 record/entity ownership 不在本补丁中。

- base: `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`
- head: `d937a3a3b0a45c93350008c49b45ac803c20b81e`
- tree: `0cb449750b82649b86c7cae04a9769f4bbe36ee2`
- binary patch SHA256: `21ac257815c4b059873c6c8fb86691a91b0ab63b8bc883e8c0f58d7a2d805e7a`


## Behavior evidence

### compiled-main-header-red

red — passed; exit 1; expected exit 1.

Pinned main1c85 fresh compiled public Kernel: first non-adjacent header tuples0/5 or0/2 pass after later property reads, in both directions; stable0/5 rejects and valid0/1 succeeds. The real invariant assertion exits1, not setup/type failure.

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/b7ca9279-f07e-4c5d-998e-1b4faeebafa7/kernel-replay-header-repro.ts`

[Original command output](logs/behavior-1.log)

### public-header-tdd-red

red — passed; exit 1; expected exit 1.

Before production edit, the first new public regression fails because no INVALID_CHANGE_SET is thrown:70 existing pass1newfail. Test-only source patch retained; development snapshot before implementation.

Command: `bun run --filter '@nodebraid/kernel' test`

[Original command output](logs/behavior-2.log)

### public-header-tdd-green

green — passed; exit 0; expected exit 0.

The minimal capture repair makes the original public regression reject first tuple0/5 before changes access, preserving exact View:1test3assert. Development snapshot; final current-head checks follow.

Command: `bun test packages/kernel/tests/replay-revision-values.test.ts`

[Original command output](logs/behavior-3.log)

### current-compiled-header-green

green — passed; exit 0; expected exit 0.

At exactd937a3a compiled public barrel, all8 original valid/stableinvalid/changingheader cases pass in both directions. Each header readonce; invalid cases retain exact View/revision and do not read changes.

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/b7ca9279-f07e-4c5d-998e-1b4faeebafa7/current-kernel-replay-header-probe.ts`

[Original command output](logs/behavior-4.log)

### current-related-public-tests

green — passed; exit 0; expected exit 0.

At d937a3a,145pass677assert across Kernel108 and Kernel/History/Layout consumers. New38 tests cover both header fields, Node/Edge both directions, first valid/invalid values, numeric boundaries/bounded diagnostics, original failures/read precedence, inheritance and caught-error atomicity.

Command: `bun test packages/kernel/tests packages/plugin-kernel/tests packages/plugin-history/tests tests/kernel-commit-preparation.test.ts tests/layout-providers.test.ts`

[Original command output](logs/behavior-5.log)

### current-affected-engineering

check — passed; exit 0; expected exit 0.

At d937a3a the real affected check passes Kernel and23 consumers, types/builds, root combinations, real React/Renderer/Examples browser suites and docs. It does not replace formal full verification.

Command: `bun run check:affected --base 1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`

[Original command output](logs/behavior-6.log)

### historical-test-type-check-failure

check — failed; exit 1; expected exit 0.

Development test declarations had literal widening, nullable expected values and a readonly Bun table type. Runtime assertions passed; typecheck failed. Declarations were corrected without changing production behavior or weakening assertions; current affected types pass. This is NOT a behavior red.

Command: `bun run --filter '@nodebraid/kernel' typecheck:self`

[Original command output](logs/behavior-7.log)

### development-test-type-check-green

check — passed; exit 0; expected exit 0.

Corrected development test declarations pass Kernel typecheck; final current-head affected/formal type checks remain separately recorded.

Command: `bun run --filter '@nodebraid/kernel' typecheck:self`

[Original command output](logs/behavior-8.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
