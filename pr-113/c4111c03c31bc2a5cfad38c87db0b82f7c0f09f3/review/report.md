# Verification report

Run: c3f119c7-4435-4a0c-9802-eca0875153c5 · ZWkang/nodebraid · issue #112

## Reviewed and published source

- Review base: `ce74d89ba882374c16174cff1f20a3e6418acc02`
- Independently prepared append parent: `ce74d89ba882374c16174cff1f20a3e6418acc02`
- Published head: `c4111c03c31bc2a5cfad38c87db0b82f7c0f09f3`
- Reviewed local head: `911cdd05dfb1959c871472ceed11b339fe822b5e`
- Tree: `71cbf9c8c0a4c1739fa2385105397d0a5b10e997`
- Complete binary patch SHA-256: `41d2c0e8a58bffd5411f10c6c8115c32aacf42b9c4b959b6be5ee2bd4c48eed3`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

## Confirmed defect

On fetched clean main `ce74d89ba882374c16174cff1f20a3e6418acc02`, Delete Selection rereads `input.evidence` between admission and stale-target preflight. An independently typechecked actual compiled public Host/Kernel/Command/Interaction probe supplies a legal readonly input getter returning the real frozen Snapshot S1 on the first read and the real frozen Snapshot S3 thereafter. Node a was replaced and returned to the same values: S1 and S3 contain deeply equal values but different Node root identity, as expected for ABA.

- Stable current S3 succeeds, deleting a at revision4 (5 evidence getter reads).
- Stable stale S1 correctly rejects `interaction / STALE_SELECTION`, preserving the exact committed View at revision3 (4 reads).
- Changing S1→S3 instead succeeds, deleting a at revision4 (5 reads). Its first supplied stale evidence is replaced by later input reads before the identity check.

The assertion requiring the originally supplied stale evidence to reject exits1. The probe typechecks before execution and uses actual frozen public Kernel Snapshots and compiled exported packages, with shared Runtime/Service-token identity; no internal handler or mocked Kernel. Its explicit application-owned public in-memory Renderer is not native/browser evidence. Original current-main code/output: local run `20261025T204252-discovery-delete-selection-current-main` (`delete-selection-repro.ts`, `delete-selection-red.log`, `delete-selection-observations.json`, `repro-typecheck.log`). Existing public Delete Command regressions pass7 tests/38 assertions. The older dcf-main observation is preserved independently, not rebound to this head.

## Contract and cause

[ADR0072](https://github.com/ZWkang/nodebraid/blob/ce74d89ba882374c16174cff1f20a3e6418acc02/docs/adr/0072-guard-selection-deletion-with-target-evidence.md) requires target entity and incident-Edge closure identity against the exact source Snapshot; unrelated Commits remain valid, but same-value ABA replacement must reject. [The public input](https://github.com/ZWkang/nodebraid/blob/ce74d89ba882374c16174cff1f20a3e6418acc02/packages/plugin-interaction/src/contracts.ts) carries a readonly Selection and exact CanvasSnapshot evidence. [The handler](https://github.com/ZWkang/nodebraid/blob/ce74d89ba882374c16174cff1f20a3e6418acc02/packages/plugin-interaction/src/delete-selection-command.ts) validates one evidence root, then rereads it for Node/Edge maps, incident closure and Transaction preflight. Consequently it can validate a different deletion origin from the one it applies. [ADR0014](https://github.com/ZWkang/nodebraid/blob/ce74d89ba882374c16174cff1f20a3e6418acc02/docs/adr/0014-keep-command-dependencies-in-feature-plugins.md) assigns this feature invariant to its shared handler; [ADR0029](https://github.com/ZWkang/nodebraid/blob/ce74d89ba882374c16174cff1f20a3e6418acc02/docs/adr/0029-preserve-domain-and-external-error-identity.md) preserves external errors.

## Acceptance

- Capture `input.evidence` once at the existing Delete Selection handler boundary, at its current admission stage after input/Selection shape validation. Validate that first Snapshot and reuse that exact reference for all subsequent evidence Node/Edge maps, explicit targets, incident closure and synchronous Transaction preflight. Do not reread the input evidence root.
- The real S1→S3 ABA reproduction must reject `STALE_SELECTION` and preserve the exact View, revision, Session and History. Stable current evidence still deletes normally; valid first evidence remains usable when subsequent root reads would change or throw. A malformed first evidence must retain `INVALID_DELETE` even if a later getter result would be valid.
- Preserve abort-before-input reads, existing input/Selection-before-evidence shape short circuits, empty-Selection evidence validation/no-op, original getter receiver (including inherited/non-enumerable getters), and original external thrown-value identity.
- Preserve original Node/Edge root identity: do not clone Snapshot entities or traverse/freeze application data. Retain explicit/incident Edge closure, same-value ABA rejection, unrelated-Commit acceptance, canonical overlap/deduplication, missing/replaced target errors, one atomic Commit and metadata, Kernel graph failure, Session pruning and History Undo/Redo.
- Scope is the Delete Selection **evidence-root reread** in its shared handler. No changes to Selection/array traversal semantics, generic validators, Kernel, other Commands, Gesture/Shortcut policies, public API, dependencies, Snapshot identity policy or Runtime lifecycle. Other partially investigated inputs remain pending; no accessor ban, retry, fallback or cap.
- Use the established public Command/Kernel/Session/History test seam: test-first current regression, stable valid/stale/malformed/error/getter and Node/explicit-Edge/incident-Edge controls; repeat the original typed compiled reproduction. Related and affected checks, independent Standards with ponytail-review and Spec on exact complete source, versioned formal full check, actual remote tree/first-parent/current-head CI and complete original report/media immutable publication readback are required. Keep this Issue open until actual main integration and whole-Issue acceptance.

## Deduplication

Read all111 current all-state Issue/PR records through100+11 pages and57 PRs through the final short page; no existing Delete Selection evidence-root repair exists. Read full #104/#106 and their complete discussions: those delivered Move Nodes and Create Edge repairs deliberately leave Delete Selection outside their scope. Existing Delete Selection public ABA tests cover stable stale input, which passes, and do not cover a getter replacing the admitted evidence Snapshot. The pending PR #111 concerns review/merge policy and does not implement this Command. Only actually integrated main capabilities are counted as deployed.


### public-red

Preserve independent source request and current compiled ABA reproduction; public Command regression fails before source edits.

Dependencies: none

### capture-evidence-root

Existing handler captures and validates the first evidence Snapshot once, then reuses that reference; current red turns green with narrow guard/error/ABA/identity/History controls.

Dependencies: public-red

### integration-and-independent-review

Current public related suites, original typed compiled controls and affected checks pass; independent Standards with ponytail-review and Spec inspect exact complete source.

Dependencies: capture-evidence-root

### formal-engineering-check

Pinned main agents:run verify executes the sole formal full bun run check after both exact-source reviews pass; all attempts retained.

Dependencies: integration-and-independent-review

### publish-current-head

Actual remote tree and ordered append parent match verification; current-head CI, complete feedback, full original report/media immutable publication and byte readback pass.

Dependencies: formal-engineering-check

### authorized-merge

After current-source/base/review/feedback/CI/protection and applicable main-policy checks, perform only a normal expected-head protected merge.

Dependencies: publish-current-head

### main-integration-acceptance

Actual fetched main contains delivery; fresh public tests/typed compiled controls and complete main CI/whole-Issue acceptance pass before acceptance publication and authorized Issue closure.

Dependencies: authorized-merge

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: Delete Selection captures its first evidence Snapshot once and uses that same reference throughout target and incident-Edge checks. A later getter result can no longer replace stale evidence with current state.

Source identity:
- Base: ce74d89ba882374c16174cff1f20a3e6418acc02
- Head: 911cdd05dfb1959c871472ceed11b339fe822b5e
- Tree: 71cbf9c8c0a4c1739fa2385105397d0a5b10e997
- Binary patch SHA256: 41d2c0e8a58bffd5411f10c6c8115c32aacf42b9c4b959b6be5ee2bd4c48eed3

Scope: complete base...head diff, both files, every changed hunk and the full public test/fixture chain. Sole commit 911cdd0, parent, canonical saved bytes and prepared/inspection identities agree. Read Issue #112's complete body and empty discussion, independent plan, original behavioral red/green logs and the separately recorded Selection-fixture correction.

Hard standards: No violations found. ADR0072 requires original target identity; the capture returns the exact Snapshot and retains original Node/Edge references. Input/Selection validation still precedes evidence reads, and evidence validation precedes the empty-selection no-op. Abort, getter receiver and thrown-value identity remain intact under ADR0029. Target/closure preflight still finishes before any removal; unrelated revisions remain allowed.

Judgment-only smells: No concrete finding across the full Fowler baseline. The small helper has one meaningful job: validate and retain the evidence reference at admission. It introduces no generalized parser, copied entity model or new policy.

Ponytail assessment: Correct and lean for isolated Canvas Hosts. I traced keyboard Selection/Snapshot capture, shared Command registration, Kernel identity/incident indexes and atomic removal, Session pruning, and History replay/Baseline under ADR0012/0014/0084/0085. Public regressions exercise Node and explicit/incident-Edge replacement, malformed first evidence, falsey errors, inherited getters, unchanged state and opaque-data replay. The original red demonstrates a wrong successful deletion; the expanded fixture correction preserves original Selection intent before Session pruning.

Independent command at this head:
`bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts`

Result: exit 0; 207 tests, 1014 assertions. Confirmed the current compiled private module contains the capture and no later input.evidence read. Final identity, whitespace and clean-status audits passed.

Not checked independently: TypeScript, builds, native browsers, full engineering check, remote CI, publication or main acceptance. Selection and nested-array capture remain outside this change.

Verdict: passed. Looks good. Ship.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

# Spec review — Issue #112

Verdict: **passed**. 未发现本 Issue 的验收遗漏、错误实现或范围扩张。

- Base: `ce74d89ba882374c16174cff1f20a3e6418acc02`
- Head: `911cdd05dfb1959c871472ceed11b339fe822b5e`
- Tree: `71cbf9c8c0a4c1739fa2385105397d0a5b10e997`
- Complete binary patch SHA256: `41d2c0e8a58bffd5411f10c6c8115c32aacf42b9c4b959b6be5ee2bd4c48eed3`

已独立读取 Issue112 全文/全部零评论、prepared request/plan、完整两文件补丁、唯一提交、原始 red/green 和 Selection fixture 修正记录。依据当前 AGENTS/CONTEXT/code-review、ADR0072/0012/0014/0029/0084/0085，追踪 Runtime Delete 调用、Kernel identity/Transaction、Session pruning、History 和 Document Baseline。

Issue 要求 “Capture input.evidence once … after input/Selection shape validation”。helper 保留既有输入/Selection shape 短路后正常读取 evidence，验证首个 Snapshot 并直接返回同一引用；Node/Edge maps、显式目标、incident closure 及事务内预检都使用它，后续没有 input.evidence Get。没有克隆 Snapshot 实体、深遍历或冻结 data，也没有新增全局 revision 锁，因此保留精确目标 identity 与 unrelated-Commit 语义。

S1→S3 的同值 ABA、显式/incident Edge 重建及新增 incident Edge 均以首证据预检；稳定当前与首有效后续抛错的输入仍可删除。原 getter receiver、继承/non-enumerable、非 Error thrown-value、pre-abort、malformed Selection-before-evidence、首 malformed evidence 和空 Selection 验证/no-op 路径保持。事务仍先完整预检，再规范去重删除 Edge/Node；metadata、图失败原子性、Session/History 和 Undo/Redo 数据引用未改。fixture 修正恢复了 ABA 前的真实 Selection，没有弱化断言。

范围仅 evidence 根；Selection 与内层数组解析保持原样，未声称其他 pending 输入已修复。未改变 Kernel、其他 Command、公开 API、策略或新增 cap/retry/fallback。

独立确认 HEAD/工作树干净、canonical patch/hash 与 inspection/complete.patch 一致，并读取当前 dist/delete-selection-command.js 确认新 helper 及 handler 调用，SHA 已记录。独立执行 `bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts`：**207 pass /1014 assertions，exit0**；`git diff --check BASE...HEAD` exit0。完整输出见 `spec-commands.log`，已回读。

未独立执行构建、类型检查、compiled ABA probe、affected、浏览器或正式 full check；远端发布/current-head CI、完整报告/media readback、合并和 main 全 Issue 验收仍未由本审查验证。公共 Renderer seam 不作为原生浏览器证明。


## Behavior evidence

### current-main-original-compiled-red

red — passed; exit 1; expected exit 1.

Original compiled public three controls at independent pre-fix base ce74: stable valid passes, stable stale rejects; changing first-stale/current-later wrongly deletes. Final regression assertion intentionally fails. Executed on current main before implementation; not claimed to run on repaired source.

Command: `bun run /Users/zhou/.codex/local-workflows/nodebraid/runs/20261025T204252-discovery-delete-selection-current-main/build-and-run.ts`

[Original command output](logs/behavior-1.log)

### public-regression-red

red — passed; exit 1; expected exit 1.

First public current-base regression rejects expected STALE_SELECTION but actually resolves deletion:7pass1fail before any handler edit.

Command: `bun test packages/plugin-interaction/tests/delete-selection-command.test.ts`

[Original command output](logs/behavior-2.log)

### public-tracer-green

green — passed; exit 0; expected exit 0.

Small root-capture fix makes original tracer green:8tests45assertions before expanded controls.

Command: `bun test packages/plugin-interaction/tests/delete-selection-command.test.ts`

[Original command output](logs/behavior-3.log)

### expanded-fixture-failure

check — failed; exit 1; expected exit 0.

Original explicit-edge ABA fixture incorrectly supplied the now-empty live Selection after removal had triggered Session pruning, so Delete correctly returned null. Original output retained as a failed check, not product success; fixed fixture captures original Selection with evidence before ABA. No product edit or assertion weakening.

Command: `bun test packages/plugin-interaction/tests/delete-selection-command.test.ts`

[Original command output](logs/behavior-4.log)

### expanded-public-green

green — passed; exit 0; expected exit 0.

Corrected original Selection fixture with unchanged expected rejection; all23public Delete tests136assertions pass,16new98assertions. Includes Node/explicit/incident/new closure, original getter/receiver/errors/abort/empty/malformed and opaque Map replay.

Command: `bun test packages/plugin-interaction/tests/delete-selection-command.test.ts`

[Original command output](logs/behavior-5.log)

### current-compiled-controls-green

green — passed; exit 0; expected exit 0.

Original typechecked three public controls at exact911 source now read evidence once. Stable current still deletes; stable stale and changing evidence reject STALE_SELECTION preserving exact View at revision3. Resolved source package entries and hashes saved separately.

Command: `bun run /Users/zhou/.codex/local-workflows/nodebraid/runs/c3f119c7-4435-4a0c-9802-eca0875153c5/compiled-current/build-and-run.ts`

[Original command output](logs/behavior-6.log)

### current-public-integration

check — passed; exit 0; expected exit 0.

Exact-source Interaction/History/Document/Core public suites207tests1014assertions pass.

Command: `bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts`

[Original command output](logs/behavior-7.log)

### current-affected

check — passed; exit 0; expected exit 0.

Complete current affected types/builds/consumer tests, native SVG/Examples including Document files, and docs all pass.

Command: `bun run check:affected --base ce74d89ba882374c16174cff1f20a3e6418acc02`

[Original command output](logs/behavior-8.log)

### independent-standards-commands

check — passed; exit 0; expected exit 0.

Independent Standards+ponytail207tests1014assertions; complete actual command output/identity audit. No reviewer-native-browser claim.

Command: `bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts`

[Original command output](logs/behavior-9.log)

### independent-spec-commands

check — passed; exit 0; expected exit 0.

Independent Spec207tests1014assertions; complete actual command output/identity audit. No reviewer-native-browser claim.

Command: `bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts`

[Original command output](logs/behavior-10.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
