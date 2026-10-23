# Verification report

Run: f44f5bac-07ac-4991-b4d2-2cf64427c9e8 · ZWkang/nodebraid · issue #89

## Reviewed and published source

- Review base: `2092dcdee82f453e8569dd0dca384d10781bc408`
- Independently prepared append parent: `7f4d4f2fe52d70a490166efb104e51fae2a34c8f`
- Published head: `9ff6d1f038878450fb384b0f8c5f11c70e7ff984`
- Reviewed local head: `cba486a0576f98f1969e9fa91761d979280e62c1`
- Tree: `c30dee926bbbe35d0bbb2bbb6a4267cdf2561a5c`
- Complete binary patch SHA-256: `300b8e7d7b4b8c95b5e1497b0029281e7f935aef23c6768708152b0593011088`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

## Confirmed defect

On fetched main `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`, Change Set replay captures the outer collection and indexed entries but retains each caller-owned Graph Change record. Validation, source-state preflight and application can therefore read different `before` / `after` values from the same accepted record.

Two real public Kernel source-barrel probes reproduce:
1. A record has ID `accepted-a`. Its `after` getter returns Node A for the two validation reads, then Node B. Replay succeeds at revision 1 with `unvalidated-b` instead of the Node whose kind/ID passed validation. The stable mismatched-ID control rejects with `INVALID_CHANGE_SET`.
2. A Node's later edit is `{x:999,y:999}`. A replay record's `before` getter exposes the old source during validation, then the newer Node during conflict preflight. Replay incorrectly succeeds, advances revision 2→3 and replaces the later edit with `{x:100,y:100}`. The stable old-source control rejects with `CHANGE_SET_CONFLICT` and preserves the exact View.

Actual stale-state outcome:
```json
{"control":{"sameView":true,"revision":2,"position":{"x":999,"y":999},"code":"CHANGE_SET_CONFLICT"},"actual":{"sameView":false,"revision":3,"position":{"x":100,"y":100},"code":null}}
```

Both real invariant assertions exit 1. Existing Kernel tests pass (70 tests / 280 assertions). Original executable sources and outputs are retained in run `20261022T081447-maintenance`: `kernel-replay-record-repro.ts`, `kernel-replay-record-red.log`, `kernel-replay-source-repro.ts`, `kernel-replay-source-red.log`. These are source-barrel public-API reproductions, not native-browser or compiled-package acceptance.

## Contract and cause

[ADR0011](https://github.com/ZWkang/nodebraid/blob/1c85d79db1e275e59f84a9bb77d1fe75c0a582e6/docs/adr/0011-replay-change-sets-through-transactions.md) requires source-state mismatch to fail without overwriting later changes. [ADR0012](https://github.com/ZWkang/nodebraid/blob/1c85d79db1e275e59f84a9bb77d1fe75c0a582e6/docs/adr/0012-keep-domain-data-opaque-to-kernel.md) owns defensive copying/freezing of Kernel shells while leaving domain data opaque.

[validateChangeSet](https://github.com/ZWkang/nodebraid/blob/1c85d79db1e275e59f84a9bb77d1fe75c0a582e6/packages/kernel/src/change-set.ts) checks record fields, then stores the original reference with `accepted.push(change)`. The subsequent preflight and write loops reread those fields. Capturing only the array/entry reference does not preserve the record that was validated.

## Acceptance

- Preserve one accepted Graph Change identity and its Kernel-owned before/after entity values across validation, whole-set conflict preflight and forward/reverse application. Later field reads must not substitute a different entity or source state.
- A stable invalid identity still rejects; a changing target cannot introduce an unvalidated ID. A stale source still rejects with `CHANGE_SET_CONFLICT`, preserves later edits and the original committed View, and leaves no partial replay even when the caller catches the error inside a larger Transaction.
- Cover Node and Edge, both directions, ordinary valid replay, changing record/value properties, strict error/read precedence and original exceptions. Preserve revision validation, duplicate/sparse checks, ordering, final graph validation, metadata, relation indexes, immutable evidence and opaque data references.
- Reuse existing ownership/value helpers. Add no public API, accessor ban, dependency, input cap, retry, fallback or weakening of validation.
- Public red/green regressions, related Kernel/History consumers, independent Standards + ponytail-review / Spec, full engineering verification, exact remote publication, actual current-head CI and complete report/media readback.
- Keep this Issue open until actual main integration and whole-Issue acceptance.

## Deduplication

Complete all-state metadata through final short pages: 88 Issues/PRs and 45 PRs. Closed #48 / PR #51 explicitly cover array traversal/outer-reference ownership; #82 / PR #83 cover direct Entity Writer ID capture. Their original scopes do not capture replay record fields. This is a separate remaining replay-value ownership defect.

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

What this change does: Kernel replay owns the Graph Change fields and structural Node/Edge values accepted during validation. Preflight and forward/reverse application use those same values instead of rereading caller-controlled records.

Verdict: passed. Looks good. Ship.

Reviewed identity:

- Base: `2092dcdee82f453e8569dd0dca384d10781bc408`
- Head: `cba486a0576f98f1969e9fa91761d979280e62c1`
- Tree: `c30dee926bbbe35d0bbb2bbb6a4267cdf2561a5c`
- Binary patch SHA256: `300b8e7d7b4b8c95b5e1497b0029281e7f935aef23c6768708152b0593011088`

Hard standards: no violations found. Read the complete three-file patch, all 568 regression-test lines, current project rules and applicable principle guidance. Read Issue #89, its empty discussion/blockers, the prepared plan and supplied PR #91 description and complete empty feedback checkpoint.

The capture helpers preserve validation order, original exceptions, existing semantic IDs and Kernel-owned frozen shells. Whole-set source preflight still precedes writes, matching ADR0011. Opaque data keeps its original receiver, reference identity and comparison/materialization read phase; it is not eagerly read, copied or deep-frozen, matching ADR0012. Pure Kernel errors remain separate from Runtime observation under ADR0028/0029. Revision-header logic is unchanged; Issue #92 is a separate boundary.

Judgment checks: no concrete Fowler smell found. For one synchronous Kernel per Canvas, linear capture is needed to make accepted records stable. The private helpers stay with entity ownership. Traced Transaction → validation → preflight → EntityWriter → relation indexes → commit/History replay, and current Session, Layout and Runtime consumers. No new public interface, dependency, cap, retry or fallback was added.

Independent checks after dependency construction completed: `bun test packages/kernel/tests packages/plugin-history/tests tests/layout-providers.test.ts` passed 151 tests / 740 assertions at this head. They cover Node/Edge and both replay directions, changing fields, caught-conflict atomicity, inherited values, opaque-data errors/phases, normal replay and real Dagre/ELK Undo/Redo.

Verified exact saved patch/hash, task/inspection binding, original source first parent, captured main second parent, clean worktree and `git diff --check`. Current prepared compiled Kernel dependencies contain the capture helpers. Commands/raw output are in `standards-command-log.txt`.

Not checked: fresh builds/typecheck, browsers, full engineering gate, live feedback refresh, new-head CI, publication or merge. Historical TDD/check results were not relabeled. This report covers independent Standards and ponytail-review only.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: **passed**

独立重审完整三文件补丁及 568 行公共回归、原 Issue #89 全文/空讨论/依赖、独立 prepared plan、AGENTS/CONTEXT、tracker/讨论/code-review、ADR0011/0012/0028/0029，以及当前 Kernel/History/Session/Interaction/Layout 消费链。未发现规格遗漏、错误实现或范围扩张。

满足“Preserve one accepted Graph Change identity and its Kernel-owned before/after entity values”：kind/id/before/after 与 Node/Edge 自有字段进入固定冻结 shell，validate、whole-set conflict preflight、forward/reverse application 复用同值。changing target 不能引入未验证 ID，stale source 拒绝且保留 later edit/exact View；caught conflict 无部分 replay，后续明确写入可继续。原异常/短路顺序、重复/稀疏、排序、最终图校验、metadata、关系索引及不可变证据保留。

opaque data 不复制或深冻结；内部 forwarding getter 保留原 receiver、比较/物化读取阶段和引用，已知结构冲突先于 data 读取。修复复用现有 value helper 模块，无公共 API、accessor ban、cap、retry 或 fallback；revision header 仍为既有校验，Issue92 范围未混入。

本轮实际 `bun test packages/kernel/tests packages/plugin-history/tests tests/layout-providers.test.ts`：151 pass、0 fail、740 assertions；`git diff --check` 通过。当前新 main 的真实 Dagre/ELK/History/Session 组合也在这些测试内。命令/原始输出保存 `spec-review-commands.log`；完整 patch/inspection、干净源码、head/tree 及 parents 7f4d4f2/main2092 均核对，历史结果未换绑。

当前 published 7f4d4f2 的完整 comments/reviews/threads 均空，无新增反馈；新本地 head 未发布。未执行 build、affected、browser/full verify、compiled public probe、新 head CI/反馈、报告回读或 merge/main 验收。

- base: `2092dcdee82f453e8569dd0dca384d10781bc408`
- head: `cba486a0576f98f1969e9fa91761d979280e62c1`
- tree: `c30dee926bbbe35d0bbb2bbb6a4267cdf2561a5c`
- binary patch SHA256: `300b8e7d7b4b8c95b5e1497b0029281e7f935aef23c6768708152b0593011088`


## Behavior evidence

### public-integration

green — passed; exit 0; expected exit 0.

Fresh current-head Kernel/Kernel Plugin/History/Command/Session/root Layout public suites verify retained replay records and owned shells, conflict atomicity, forward/reverse, opaque data read phases and connected consumers. Original TDD stays at its original source.

Command: `bun test packages/kernel/tests packages/plugin-kernel/tests packages/plugin-history/tests packages/plugin-command/tests packages/plugin-session/tests tests/layout-providers.test.ts`

[Original command output](logs/behavior-1.log)

### affected-integration

check — passed; exit 0; expected exit 0.

Fresh affected public consumers, real browser suites and documentation for newly integrated Session/Interaction/Preset/Layout/docs changes. Canvas media supplements API assertions.

Command: `bun run check:affected --base 7f4d4f2fe52d70a490166efb104e51fae2a34c8f`

[Original command output](logs/behavior-2.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
