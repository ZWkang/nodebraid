# Verification report

Run: 17e05cbb-4fb7-42f7-be25-850a8fb227e4 · ZWkang/nodebraid · issue #89

## Reviewed and published source

- Review base: `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`
- Independently prepared append parent: `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`
- Published head: `7f4d4f2fe52d70a490166efb104e51fae2a34c8f`
- Reviewed local head: `68683f1311543c6f157390d8020b02992efd17e1`
- Tree: `38029e5cd73cc7d89d2e3808f6ac774008f2ce70`
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

### replay-record-ownership

Preserve both original real main reds and controls. Add public Kernel red/green tests for Graph Change source/target field substitution, then retain validated entity/kind/id/before/after fields across complete preflight and forward/reverse application.

Dependencies: none

### replay-entity-values-and-compatibility

Own Kernel-defined Node/Edge value shells and fields used by validation/preflight/application. Preserve opaque data references and their existing observation phase, strict validation/read/error precedence, caught-conflict atomicity, original exceptions, metadata, ordering, replay directions and graph invariants; pass relevant/affected checks and a fresh compiled public probe.

Dependencies: replay-record-ownership

### independent-review

Fresh independent Standards plus ponytail-review and Spec review identical complete head/tree/patch against original Issue89, ADR0010/0011/0012 and public Kernel contracts.

Dependencies: replay-entity-values-and-compatibility

### formal-engineering-check

Pinned deployed-main agents:run verify runs real full bun run check after targeted checks and dual reviews; retain every original failure log and exact stable source identity.

Dependencies: independent-review

### publish-and-current-head-acceptance

Publish exact checked tree with independently saved first parent, one PR to main; verify current published-head CI, complete feedback, mergeability and full immutable report/media byte readback before ready.

Dependencies: formal-engineering-check

### main-integration-acceptance

Keep Issue89 open until final human review/merge, real fetched-main integration and complete whole-Issue acceptance.

Dependencies: publish-and-current-head-acceptance

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: Kernel replay retains validated Graph Change fields and copied Node/Edge structural values through conflict preflight and application. Opaque data remains by reference and is read in its existing comparison or materialization phase.

Verdict: passed.

Reviewed identity:

- Base: 1c85d79db1e275e59f84a9bb77d1fe75c0a582e6
- Head: 68683f1311543c6f157390d8020b02992efd17e1
- Tree: 38029e5cd73cc7d89d2e3808f6ac774008f2ce70
- Binary patch SHA256: 300b8e7d7b4b8c95b5e1497b0029281e7f935aef23c6768708152b0593011088

Hard standards: No violations found in the complete three-file patch. ADR0010 keeps committed View/evidence consistent; ADR0011 requires whole-set source preflight before replay writes; ADR0012 owns structural shells while leaving domain data opaque. Boundary Discipline and Type System Discipline are maintained: private capture helpers validate runtime values, preserve accepted fields and feed the existing Writers without expanding public exports.

The lazy data property preserves the original receiver and observation phase. It does not leak into committed entities: existing Writer freezing materializes data while copying owned shells. Structural conflicts still reject before opaque data reads when those fields already mismatch. Final graph checks, revision handling, metadata and net-zero coalescing remain at their existing boundaries.

Judgment / ponytail: No actionable Fowler smell or correctness, safety, load, speed or testing finding. The old structural predicates are replaced at their sole caller rather than duplicated as another public validation layer. Read all changed production code and all 568 regression-test lines, every capture-helper caller, equality/preflight/write paths, GraphIndex, CanvasKernel publication and History replay. Assumed load: synchronous in-process Transactions for isolated Canvas Runtimes.

Discussion/evidence: Original and refreshed Issue89 bodies match and both contain no comments; no PR or unresolved human review is present. The original record and entity-value behavioral red logs were reviewed independently.

Actual checks at this head:

- Verified clean tree, commit history, exact head/tree/hash, independent prepared-task/inspection identity and byte-identical complete.patch.
- `git diff --check`: passed.
- `bun test packages/kernel/tests packages/plugin-history/tests`: 147 passed, 0 failed, 648 assertions. Forward/reverse values, source conflicts, inherited fields, original failures, opaque data, caught-conflict atomicity and History controls pass.

Not checked: other affected consumers, TypeScript checks, builds, compiled-package probes, browser suites, full engineering gate, current-head CI, publication and remote evidence readback.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: **passed**

独立审查完整三文件补丁和 568 行新增公共回归、Issue #89 原文及 prereview 全文/空讨论、独立 prepared plan、ADR0010/0011/0012、Kernel 公共契约与 History 调用链。未发现验收遗漏、错误实现或范围扩张。

满足“Preserve one accepted Graph Change identity and its Kernel-owned before/after entity values”：kind/id/before/after 及 Node/Edge 已接受字段进入自有冻结 shell，后续 preflight/application 不重读调用方结构字段。完整集合先检查冲突，再按方向应用；caught conflict 不留下部分 replay，后续明确写入仍可继续。既有 revision、重复/稀疏、顺序、最终图校验、metadata、索引及不可变提交证据保留。

opaque data 仅保留引用，不深复制/冻结；内部 forwarding getter 保留原 receiver 及 comparison/materialization 读取阶段，已知结构冲突仍先于 data getter。原始字段/data 异常和结构校验短路保留；无公共 API、accessor ban、cap、依赖、retry 或 fallback 新增。

实际执行 `bun test packages/kernel/tests packages/plugin-history/tests`：147 pass、0 fail、648 assertions；原始命令、head/tree、输出及 exit 0 保存于 `spec-targeted-tests.log`。`git diff --check` 通过；commit 列表、完整 binary patch、inspection/complete.patch 与干净工作树身份一致。

未独立运行类型/构建、affected、browser/full engineering gate 或 compiled public probes；未验证当前 head 的远端 CI、报告/媒体发布回读及 main 集成。其他执行者结果不计为本轮实际检查。

- base: `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`
- head: `68683f1311543c6f157390d8020b02992efd17e1`
- tree: `38029e5cd73cc7d89d2e3808f6ac774008f2ce70`
- binary patch SHA256: `300b8e7d7b4b8c95b5e1497b0029281e7f935aef23c6768708152b0593011088`


## Behavior evidence

### main-target-record-red

red — passed; exit 1; expected exit 1.

On pinned main1c85, changing after returns accepted-a during validation but unvalidated-b during application. The real invariant assertion fails; stable mismatched-ID control rejects. This original probe uses the source public barrel.

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/17e05cbb-4fb7-42f7-be25-850a8fb227e4/kernel-replay-record-repro.ts`

[Original command output](logs/behavior-1.log)

### main-source-record-red

red — passed; exit 1; expected exit 1.

On pinned main1c85, changing before bypasses conflict preflight and replaces the later999,999 edit, advancing revision2 to3. Stable stale control rejects and preserves exact View. Real invariant assertion fails; source public barrel.

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/17e05cbb-4fb7-42f7-be25-850a8fb227e4/kernel-replay-source-repro.ts`

[Original command output](logs/behavior-2.log)

### record-tdd-red

red — passed; exit 1; expected exit 1.

Before production edit, new public record regressions fail for target substitution and stale-source overwrite:70pass2fail. Saved test-only patch is tdd-record-red-test.patch; this is an earlier development snapshot, not final head.

Command: `bun run --filter '@nodebraid/kernel' test`

[Original command output](logs/behavior-3.log)

### record-tdd-green

green — passed; exit 0; expected exit 0.

Record capture repair passes the initial2 public regressions at its development snapshot; final current-head evidence follows.

Command: `bun test packages/kernel/tests/replay-record-values.test.ts`

[Original command output](logs/behavior-4.log)

### entity-values-tdd-red

red — passed; exit 1; expected exit 1.

Record-only repair still fails nested entity ID and source-coordinate substitution:3pass2fail; opaque-data stale-source control passes. Original development snapshot, not final head.

Command: `bun test packages/kernel/tests/replay-record-values.test.ts`

[Original command output](logs/behavior-5.log)

### entity-values-tdd-green

green — passed; exit 0; expected exit 0.

Owned entity shells pass all5 initial record/value regressions at development snapshot. Final expanded current-head suite follows.

Command: `bun test packages/kernel/tests/replay-record-values.test.ts`

[Original command output](logs/behavior-6.log)

### compiled-kernel-build

check — passed; exit 0; expected exit 0.

Build actual68683 current Kernel public JS/declarations and validate package artifacts.

Command: `bun run --filter '@nodebraid/kernel' build:self`

[Original command output](logs/behavior-7.log)

### compiled-target-record-green

green — passed; exit 0; expected exit 0.

At68683 compiled public barrel, changing after is read once and replay retains accepted-a; stable invalid ID rejects. This proves the original target case on actual compiled output.

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/17e05cbb-4fb7-42f7-be25-850a8fb227e4/current-kernel-replay-record-repro.ts`

[Original command output](logs/behavior-8.log)

### compiled-source-record-green

green — passed; exit 0; expected exit 0.

At68683 compiled public barrel, both changing and stable stale source records rejectCHANGE_SET_CONFLICT, preserve exact View/revision2/later999,999; before readonce.

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/17e05cbb-4fb7-42f7-be25-850a8fb227e4/current-kernel-replay-source-repro.ts`

[Original command output](logs/behavior-9.log)

### current-related-public-suites

green — passed; exit 0; expected exit 0.

At68683,160pass/779assert:Kernel123 plus Kernel/History Runtime and root preparation/Layout consumers. New53 public tests cover Node/Edge both directions, known fields, read/error precedence, opaque-data phases/identity and caught-conflict atomicity.

Command: `bun test packages/kernel/tests packages/plugin-kernel/tests packages/plugin-history/tests tests/kernel-commit-preparation.test.ts tests/layout-providers.test.ts`

[Original command output](logs/behavior-10.log)

### affected-engineering

check — passed; exit 0; expected exit 0.

Actual affected check against1c85 passes Kernel and23 consumers including real React/Renderer/Examples browser suites, build/type checks and docs; this does not replace formal fullcheck.

Command: `bun run check:affected --base 1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`

[Original command output](logs/behavior-11.log)

### historical-test-edit-parse-failure

check — failed; exit 2; expected exit 0.

A development test-only assertion edit temporarily broke syntax; formatter caught it before engineering checks. Original failed source/log retained; corrected and final123/160test suites, types and affected checks subsequently pass. This is a tooling failure, NOT a behavior red.

Command: `bunx prettier --write packages/kernel/src/change-set.ts packages/kernel/src/entity-values.ts packages/kernel/tests/replay-record-values.test.ts`

[Original command output](logs/behavior-12.log)

### formal-full-check-attempt-1

check — failed; exit 1; expected exit 0.

Current68683 full verify exit1, source stable:713pass4fail/717tests. Four unchanged workflow CLI fixtures hit existing5000ms watchdog; Kernel123pass. Browser/docs stages not reached. Original failure and receipt retained; investigation/reverification required.

Command: `bun /Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/scripts/local-agent.ts verify /Users/zhou/.codex/local-workflows/nodebraid/runs/17e05cbb-4fb7-42f7-be25-850a8fb227e4 /Users/zhou/.codex/local-workflows/nodebraid/runs/17e05cbb-4fb7-42f7-be25-850a8fb227e4/reviews.json /Users/zhou/.codex/local-workflows/nodebraid/runs/17e05cbb-4fb7-42f7-be25-850a8fb227e4/decisions.json`

[Original command output](logs/behavior-13.log)

### unchanged-main-timeout-control

check — failed; exit 1; expected exit 0.

Exact same workflow fixture blobs on main1c85 reproduce main-sync5000ms timeout:10pass1fail. This proves failure exists without the Kernel patch; no timeout/assertions/settings changed. Hostload is supporting context, not a proven sole cause.

Command: `bun test tests/local-agent-cli.test.ts tests/local-agent-bases.test.ts tests/preview-scenes.test.ts`

[Original command output](logs/behavior-14.log)

### repair-timeout-focused-control

check — passed; exit 0; expected exit 0.

At68683 same three workflow fixture files pass under unchanged default timeout:11pass112assert,12.60s. Full-check still must pass; focused control does not waive original failure.

Command: `bun test tests/local-agent-cli.test.ts tests/local-agent-bases.test.ts tests/preview-scenes.test.ts`

[Original command output](logs/behavior-15.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
