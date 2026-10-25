# Verification report

Run: 69ec7983-4d6a-41ab-8bb3-479a18d4850e · ZWkang/nodebraid · issue #116

## Reviewed and published source

- Review base: `c709c10461f04de9489aa5e8a6cf527164d22afc`
- Independently prepared append parent: `c709c10461f04de9489aa5e8a6cf527164d22afc`
- Published head: `6fe0b78aef7ac9f05740c6e51bedf8102ae023bb`
- Reviewed local head: `44cb1ba67a358bfdcaaa2f0351cbbca15fc77315`
- Tree: `6b39b2cf190d137f8375ca35040e87018be88287`
- Complete binary patch SHA-256: `adad99b51c4359d7c2a9fda2f3485c37c6706a0e2eff81471be2934481ad8da9`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

## Confirmed defect

On fetched clean main `c709c10461f04de9489aa5e8a6cf527164d22afc`, Delete Selection retains the first input evidence root but rereads the evidence Snapshot's revision, Node/Edge collection roots and indexed values. Caller-owned `map` can replace validated entities before stale-target preflight.

A separately typechecked actual compiled public Host/Kernel/Command/Session/Interaction probe creates real frozen S1 and S3 Snapshots. A selected Node or explicit Edge was replaced and restored to identical values; its entity root identity still differs, so S1 must reject as stale.

- Stable current S3 deletes normally. Stable stale S1 rejects `interaction / STALE_SELECTION` and preserves the exact View at revision3.
- A readonly frozen Snapshot shell supplies the stale collection for its first two reads and the current collection later. The Node root is read3 times and Edge root4 times; both incorrectly delete at revision4.
- A frozen collection's indexed getter supplies the stale entity first and current entity later. Node index reads2 and Edge index reads3; both incorrectly delete.
- A frozen stale collection's custom `map` instead maps current entities. The caller method runs once; both incorrectly delete.
- A custom Edge iterator yielding current entities alone still rejects in this fixture and remains a negative control, not a claimed bypass.
- The top-level input evidence getter reads exactly once in all12 cases. The deployed #112 and #114 fixes are preserved.

The stale-identity assertion exits1 after all observations are saved. Source/output are retained in local run `20261025T223222-discovery-delete-selection-evidence-collections`: `delete-selection-repro.ts`, `build-and-run.ts`, `tsconfig.json`, `typecheck.log`, `red.log`, `observations.json`, and actual exported entry hashes. The in-memory application-owned public Renderer only supports the real Runtime/Command contract exercise; it is not browser evidence. The program imports compiled public exports with shared Runtime/Service-token identity and uses no internal handler or mocked Kernel.

## Contract and cause

[ADR0072](https://github.com/ZWkang/nodebraid/blob/c709c10461f04de9489aa5e8a6cf527164d22afc/docs/adr/0072-guard-selection-deletion-with-target-evidence.md) requires exact target entity and complete incident-Edge closure identity from the supplied evidence. Same-value ABA replacement must reject; unrelated commits remain valid. [The handler](https://github.com/ZWkang/nodebraid/blob/c709c10461f04de9489aa5e8a6cf527164d22afc/packages/plugin-interaction/src/delete-selection-command.ts) currently validates one set of Snapshot fields/elements, then builds maps and closure/preflight from later field/element reads and caller methods. Thus a stale first entity can be replaced with the current root used by the identity comparison.

[ADR0014](https://github.com/ZWkang/nodebraid/blob/c709c10461f04de9489aa5e8a6cf527164d22afc/docs/adr/0014-keep-command-dependencies-in-feature-plugins.md) places this invariant in the shared feature handler. [ADR0029](https://github.com/ZWkang/nodebraid/blob/c709c10461f04de9489aa5e8a6cf527164d22afc/docs/adr/0029-preserve-domain-and-external-error-identity.md) preserves original external failures. Existing Session and Selection input capture establish native length/index admission without caller traversal hooks.

## Acceptance

- After the existing input/Selection admission, capture input.evidence once, then its revision and Node/Edge collection roots, native array-like length and each indexed entity reference once. Validate those captured values and use owned arrays for all maps, explicit targets, incident closure and synchronous preflight. Preserve the exact original Node/Edge root references; do not clone entities, traverse opaque data or turn evidence into a global revision lock.
- All six root/index/map bypass cases must reject `STALE_SELECTION`, retaining exact View, revision, Session and History. Stable current/stale and custom-iterator negative controls must retain their expected behavior. Original getter receivers, inherited/non-enumerable properties and original thrown-value identity remain supported.
- Caller iterator/every/map/filter/method/constructor/species hooks must not replace or hide evidence entities. Capture and validate revision once; a malformed first revision/collection/entity must retain `INVALID_DELETE` even if a later read would be valid.
- Preserve abort-before-input, existing Selection-before-evidence, revision-before-nodes-before-edges short circuits, empty-Selection evidence validation/no-op, native length normalization/coercion, lazy first-invalid-index failure, existing entity shape checks and error categories. No eager bulk allocation, arbitrary cap, accessor prohibition, fallback or retry.
- Retain canonical explicit/incident closure and overlap/deduplication, same-value Node/explicit-Edge/incident-Edge ABA rejection, new incident Edge detection, unrelated-Commit acceptance, one atomic Commit and metadata, Kernel graph failures, Session pruning and History Undo/Redo with opaque data identity.
- Scope is Delete Selection evidence Snapshot field and collection capture in its shared handler. No public API, generic validator, Kernel, other Command, Gesture, Shortcut, browser-input, dependency or lifecycle policy changes.
- Use existing public Command/Kernel/Session/History tests with a real red/green tracer, both entity kinds and full closure/exception/validation controls; rerun the original typed compiled12-case program. Related/affected checks, independent Standards with ponytail-review and Spec at exact head/tree/patch, versioned formal full check, actual remote tree/first-parent/current-head CI and complete original report plus all mapped preview scenes must pass and be read back. Keep this Issue open for actual main integration and complete final acceptance.

## Deduplication

Read all115 current Issue/PR records through100+15 pages and all59 PRs through the final short page. Read full #76/#112/#114 and their complete discussions. #76 owns Session setters, #112 the top-level evidence root, #114 Selection roots and ID arrays. Each is already main-accepted and explicitly leaves nested evidence collections outside its scope. No existing delivery fixes these Snapshot field/collection reads. Open #111 concerns review/merge policy and remains separate.


### public-red

Retain original current-main typed compiled12-case evidence and request; public evidence-collection regression fails before implementation.

Dependencies: none

### capture-evidence-values

Capture evidence revision and native-indexed Node/Edge collections once; retain root identity and pass first-stale/first-invalid/error/closure/History/validation controls.

Dependencies: public-red

### integration-and-independent-review

Original typed compiled12-case program and related/affected checks pass; independent Standards+ponytail and Spec review exact full head/tree/patch.

Dependencies: capture-evidence-values

### formal-engineering-check

Pinned main agents:run verify performs this attempt's sole formal full bun run check after both independent reviews; retain all logs.

Dependencies: integration-and-independent-review

### publish-current-head

Verify actual remote source tree/first parent, current-head CI, complete feedback and full original report/all mapped scenes immutable byte readback.

Dependencies: formal-engineering-check

### authorized-merge

Normal expected-head protected merge only after then-current deployed main policy and all pre-merge source/review/CI/evidence/feedback gates permit it.

Dependencies: publish-current-head

### main-integration-acceptance

Actual fetched main contains delivery; fresh public suites and original typed12-case program plus full main CI satisfy complete Issue acceptance before outcomes and authorized closure.

Dependencies: authorized-merge

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: Delete Selection captures evidence revision, collection roots and indexed entity references once. Its maps, incident closure and stale checks now use owned arrays containing those original entities.

Source identity:

- Base: c709c10461f04de9489aa5e8a6cf527164d22afc
- Head: 44cb1ba67a358bfdcaaa2f0351cbbca15fc77315
- Tree: 6b39b2cf190d137f8375ca35040e87018be88287
- Binary patch SHA256: adad99b51c4359d7c2a9fda2f3485c37c6706a0e2eff81471be2934481ad8da9
- Task digest: d563922badc7376ce27272edd7e8583e119722f78d2ab8439d0ec461b3b643e7

Scope: complete base...head diff, both files, all changed production lines and 481 added test lines. Sole commit 44cb1ba, parent and prepared/inspection identities agree. The saved `review.patch` matches canonical Git bytes. Read Issue #116, its empty discussion, independent plan, original 12-case discovery and behavioral red/green evidence. The getter-only fixture failure and unchanged-assertion correction were assessed separately.

Hard standards: No violations found. ADR0072's original Node/Edge identity is preserved: only the containing arrays/envelope are copied. No entity is cloned or newly frozen; opaque data is neither traversed nor frozen. The captured revision remains admission evidence rather than a global revision lock. Selection → revision → Nodes → Edges checks, empty-selection validation and first-error order remain intact. Native lazy indexing preserves coercion and original failures under ADR0029 without caller traversal or bulk preallocation.

Judgment-only smells: No concrete finding across the full Fowler baseline. The private array helper has three real consumers: Selection IDs, Nodes and Edges. It shares the traversal decision without adding a public parser or changing entity validation ownership.

Ponytail assessment: Correct and lean for isolated Canvas Hosts. I traced keyboard/direct Command admission, existing Selection capture, Kernel entity/incident identity checks, atomic removal, Session pruning and History/Baseline replay. Tests cover same-value replacement, later-field mutation, valid inherited getters, malformed first values, falsey exceptions, native lengths, unchanged state and opaque Undo data.

Independent command at this exact head:
`bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests`

Result: exit 0; 332 tests, 2290 assertions. Current compiled capture, final source identity, whitespace and clean-status audits passed.

Not checked independently: TypeScript, builds, native browsers, complete affected/full engineering gates, remote CI, publication or main acceptance.

Verdict: passed. Looks good. Ship.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: passed

base: c709c10461f04de9489aa5e8a6cf527164d22afc
head: 44cb1ba67a358bfdcaaa2f0351cbbca15fc77315
tree: 6b39b2cf190d137f8375ca35040e87018be88287
binary patch SHA256: adad99b51c4359d7c2a9fda2f3485c37c6706a0e2eff81471be2934481ad8da9
taskDigest: d563922badc7376ce27272edd7e8583e119722f78d2ab8439d0ec461b3b643e7

独立读回 [Issue116](https://github.com/ZWkang/nodebraid/issues/116) 全文及全部评论；最终读回时间为 2026-10-25 22:52:48 UTC，Issue open，评论为0，正文与独立 prepared request 一致。核对完整两文件补丁及全部481行新增测试、当前领域/审查规则、ADR0012/0014/0029/0072/0084/0085及 Shortcut→Command→Kernel/Session/History/Document 调用链。Git 原始补丁与 review.patch 字节完全一致，身份与 inspection/prepared digest 一致。

未发现验收遗漏、错误实现或范围扩张。针对要求 “use owned arrays for all maps, explicit targets, incident closure and synchronous preflight”，首 revision、Nodes/Edges 根、一次原生长度转换和 indexed entity 引用均进入本地自有数组；后续 map/closure/逐目标预检复用这些值，保留实体及 opaque data 引用。未调用输入集合的遍历/分配 hooks。原生惰性索引读取、首无效值短路、原始外部异常和 receiver、Selection-before-evidence、空 Selection 验证、abort-first 保持；私有数组 helper 的本地复用不改变通用 validator 或公共 API。ADR0072 的 ABA identity、完整 incident closure、无全局 revision lock，以及原子 Commit、Session pruning、History Undo/Redo 均有公共行为覆盖。

本轮独立执行 `bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests`：332 pass、0 fail、2290 assertions（23文件），exit0；`git diff --check BASE...HEAD` exit0。测试前后 HEAD/tree/clean 未变，并核对当前 dist 私有 captureSnapshot/captureArray。原 typed compiled12场景的代码、观察和入口哈希仅作读取核验，未算作本人执行。实际命令及完整输出保存在 spec-commands.log；前置归档文件名/metadata key 读取错误发生于测试前，已原样说明。

未独立执行构建、类型检查、affected、浏览器、正式全量验证、远端当前头 CI、报告/媒体发布或合入 main 验收；本结论不表示这些交付阶段已完成。


## Behavior evidence

### original-compiled-red

red — passed; exit 1; expected exit 1.

All12 typed current-main observations,6actual stale-identity bypasses; first behavioral assertion intentionally exits1. This is original c709 main, not repaired head.

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/20261025T223222-discovery-delete-selection-evidence-collections/build-and-run.ts`

[Original command output](logs/behavior-1.log)

### public-red

red — passed; exit 1; expected exit 1.

Before source edit:67 pass/1fail because stale first collection is replaced and command resolves, contradicting STALE_SELECTION.

Command: `bun test packages/plugin-interaction/tests/delete-selection-command.test.ts`

[Original command output](logs/behavior-2.log)

### public-tracer-green

green — passed; exit 0; expected exit 0.

Minimal capture fix:68tests/859assertions.

Command: `bun test packages/plugin-interaction/tests/delete-selection-command.test.ts`

[Original command output](logs/behavior-3.log)

### expanded-fixture-failure

check — failed; exit 1; expected exit 0.

Original expanded fixture assigned getter-only Edge index0 before evidence admission; TypeError is genuine and preserved. fixture-correction.json records correction; not a product/online repair.

Command: `bun test packages/plugin-interaction/tests/delete-selection-command.test.ts`

[Original command output](logs/behavior-4.log)

### expanded-public-green

green — passed; exit 0; expected exit 0.

Corrected public fixture and native-length controls:134tests/1373assertions. All prior Selection/evidence-root regressions retained.

Command: `bun test packages/plugin-interaction/tests/delete-selection-command.test.ts`

[Original command output](logs/behavior-5.log)

### current-compiled-green

green — passed; exit 0; expected exit 0.

Exact44cb source, original typed12case program passes; stale first refs always reject, getters/indices once, caller methods0.

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/69ec7983-4d6a-41ab-8bb3-479a18d4850e/compiled-controls/build-and-run.ts`

[Original command output](logs/behavior-6.log)

### current-public-integration

check — passed; exit 0; expected exit 0.

Exact44cb public Interaction/History/Document/Core332tests/2290assertions.

Command: `bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests`

[Original command output](logs/behavior-7.log)

### affected

check — passed; exit 0; expected exit 0.

Current complete affected builds/types/consumers/native SVG/Examples and docs pass; command began after final source/format edits and completed at committed44cb.

Command: `bun run check:affected --base c709c10461f04de9489aa5e8a6cf527164d22afc`

[Original command output](logs/behavior-8.log)

### independent-standards

check — passed; exit 0; expected exit 0.

Independent standards exact-source full patch/identity/contract review and actual public332tests2290assertions. Original command log retains any metadata helper failure separately; no reviewer full/browser/remote claim.

Command: `bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests`

[Original command output](logs/behavior-9.log)

### independent-spec

check — passed; exit 0; expected exit 0.

Independent spec exact-source full patch/identity/contract review and actual public332tests2290assertions. Original command log retains any metadata helper failure separately; no reviewer full/browser/remote claim.

Command: `bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests`

[Original command output](logs/behavior-10.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.

## Reproducible source appendix

[Original typed compiled program, reviewed controls, entry hashes and preserved fixture/presentation corrections](probes/compiled-controls.md). Each program retains its original main/review identity. Source, original requests, both independent review bodies, checks, logs and receipts are unchanged.
