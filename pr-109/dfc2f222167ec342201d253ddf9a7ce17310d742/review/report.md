# Verification report

Run: issue-108-document-final-1 · ZWkang/nodebraid · issue #108

## Reviewed and published source

- Review base: `e21c917b170b37ff60418d76a0bbcc65b8799d17`
- Independently prepared append parent: `e21c917b170b37ff60418d76a0bbcc65b8799d17`
- Published head: `dfc2f222167ec342201d253ddf9a7ce17310d742`
- Reviewed local head: `7d350e7feb4f0b70a1d054506c1ecb988d8522af`
- Tree: `324ed32cef93e05b910dbc6823296e497456cb76`
- Complete binary patch SHA-256: `c0c48dd815345418f018f407704a5911a18ca9cfbbfe96234db3038656049173`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

Deliver complete Document manual file export/import and a fresh atomic History baseline under https://github.com/ZWkang/nodebraid/issues/108#issuecomment-6365145631; preserve opaque application data through an explicit codec and verify the real file workflow.

### document-codec

Public package codec round trip for complete and empty graphs, owned structure and application data; invalid inputs fail before current Runtime mutation.

Dependencies: none

### history-baseline

Public synchronous History baseline Command atomically prepares a new graph and clears old Undo/Redo, including net-zero, preserving failures, reentrant commits and lifecycle contracts.

Dependencies: none

### example-and-docs

Real Examples file download, reopen/upload, error atomicity and continued editing; package/public bilingual docs and capability maps updated.

Dependencies: document-codec, history-baseline

### review-and-verification

Independent Standards with ponytail-review and Spec reports at exact source; formal agents:run verify full check.

Dependencies: example-and-docs

### publish-and-ready

One main PR with exact verified tree, current-head CI/feedback and actual immutable full report/visible evidence readback.

Dependencies: review-and-verification

### main-integration

POST-MERGE: only after user authorization, verify actual main integration and remaining whole-Issue acceptance.

Dependencies: publish-and-ready

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

# Standards review — Issue #108

What this change does: 提供带应用 Data Codec 的完整 Document 文件格式，并通过已有 History Command/Kernel Transaction 建立恢复后的新 Baseline。Examples Application 增加真实文件下载、导入与失败展示。

## Source identity

- Base: `e21c917b170b37ff60418d76a0bbcc65b8799d17`
- Head: `7d350e7feb4f0b70a1d054506c1ecb988d8522af`
- Tree: `324ed32cef93e05b910dbc6823296e497456cb76`
- Binary diff SHA-256: `c0c48dd815345418f018f407704a5911a18ca9cfbbfe96234db3038656049173`
- Command: `git diff --binary e21c917b170b37ff60418d76a0bbcc65b8799d17...7d350e7feb4f0b70a1d054506c1ecb988d8522af`

## Findings

无确定的 Standards 或 ponytail-review 问题。硬性规则违反：0；有具体反例的 smell 判断：0。

已按 AGENTS、CONTEXT、ADR-0011/0012/0013/0015/0016/0084/0085，以及 Boundary Discipline、Foundational Thinking、Model the Domain、Test Behavior、Prove It Works、Laziness Protocol 核对实际调用链。Document 在文件边界捕获并验证结构，复用 Kernel 图不变量，保留 opaque data 和 codec 异常身份；History 复用既有单飞与有序 Commit 处理，只有成功事务清除旧历史，净零恢复及后续重入 Commit 均有公共行为测试。Example 的文件 I/O、业务 codec 和 ID 分配职责明确。假定负载为单个交互式 Canvas Runtime。

已读取完整 Issue 归档及接受范围评论 `6365145631`；讨论实时刷新由协调者完成。

## Verification

- `bun run --filter '@nodebraid/document' test`：38 pass，0 fail；`standards-document.log`。
- `bun run --filter '@nodebraid/plugin-history' test`：37 pass，0 fail；`standards-history.log`。
- `bun test packages/core/tests/document-roundtrip.test.ts examples/app/tests/example-data-codec.test.ts`：6 pass，0 fail；`standards-integration.log`。
- 固定区间 `git diff --check` 通过；工作区干净；HEAD/tree/实际 binary diff hash 与审查身份一致。

Verdict: passed.

Not checked: 本审查未重跑浏览器、全量 `bun run check` 或发布回读；这些交付验证由协调者的正式流程执行。本报告不代表 PR 已满足 ready 条件。


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

# Spec review — Issue #108

**Verdict: passed.** No concrete missing/partial implementation, scope creep, or incorrectly implemented requirement found.

Reviewed the complete change and connected Kernel, Command, History, Session-facing Example and package-artifact paths against [Issue #108](https://github.com/ZWkang/nodebraid/issues/108), its [accepted decision](https://github.com/ZWkang/nodebraid/issues/108#issuecomment-6365145631), and ADR-0012/0015/0016/0078/0079/0083/0084/0085. The supplied full discussion snapshot was refreshed at `2026-10-23T13:11:10.428Z`; it contains no unresolved scope decision.

- The versioned complete-Document codec preserves graph identity and application-owned opaque data, rejects malformed/unsupported input before application decoding, delegates final graph invariants to an independent Kernel, preserves codec exception identity and captures graph structure before encoding.
- The synchronous Baseline Command uses the actual transaction/Commit identity, preserves failed graph/history updates, resets net-zero history, shares busy/caught-up/lifecycle semantics, and records subsequent reentrant commits normally.
- The Example decodes before replacing the complete graph without remounting Runtime. Actual-file browser coverage checks download, reload/upload, business-data re-export, error atomicity, Session preservation and collision-free subsequent connection/duplicate/paste IDs. Public exports, artifacts, bilingual docs and capability maps match this scope; npm publication is not claimed.

Source identity:

- Base: `e21c917b170b37ff60418d76a0bbcc65b8799d17`
- Head: `7d350e7feb4f0b70a1d054506c1ecb988d8522af`
- Tree: `324ed32cef93e05b910dbc6823296e497456cb76`
- Binary patch SHA-256: `c0c48dd815345418f018f407704a5911a18ca9cfbbfe96234db3038656049173`
- Diff: `git diff e21c917b170b37ff60418d76a0bbcc65b8799d17...7d350e7feb4f0b70a1d054506c1ecb988d8522af`
- Commit: `7d350e7 feat: save and restore documents`

Independent check at this clean head: `bun test packages/document/tests packages/plugin-history/tests packages/core/tests/document-roundtrip.test.ts examples/app/tests/example-data-codec.test.ts` — **81 passed, 0 failed**, exit 0; log: `spec-contracts.log`. `git diff --check` passed; patch hash matched.

Limits: existing dependency artifacts were reused. Browser success logs predate the main synchronization; this review inspected their assertions but did not rerun Chromium. Current-head formal `agents:run verify`, CI, published/read-back report and visible evidence, and post-merge acceptance remain pending delivery gates. This verdict does not claim those gates passed.


## Behavior evidence

### document-roundtrip-red

red — passed; exit 1; expected exit 1.

Development evidence before synchronization with main e21c917; final source is verified by the formal check. Complete graph and opaque bigint Map round trip initially failed because the new public serializer was explicitly unimplemented.

Command: `bun test packages/document/tests/index.test.ts`

[Original command output](logs/behavior-1.log)

### document-validation-red

red — passed; exit 1; expected exit 1.

Development evidence before synchronization with main e21c917; final source is verified by the formal check. Malformed envelopes, wrong versions/data formats and codec configuration/results initially violated their rejection contract (22 failing tests).

Command: `bun test packages/document/tests/index.test.ts`

[Original command output](logs/behavior-2.log)

### document-codec-green

green — passed; exit 0; expected exit 0.

Development evidence before synchronization with main e21c917; final source is verified by the formal check. 35 tests pass for full/empty graph round trip, explicit codec, rejection, Kernel invariants, capture consistency, owned-shell freezing and public types.

Command: `bun run --filter '@nodebraid/document' test:self`

[Original command output](logs/behavior-3.log)

### document-build-artifact

check — passed; exit 0; expected exit 0.

Development evidence before synchronization with main e21c917; final source is verified by the formal check. Build, declaration isolation and real @nodebraid/document package-name bigint round trip pass.

Command: `bun run --filter '@nodebraid/document' build`

[Original command output](logs/behavior-4.log)

### document-typecheck

check — passed; exit 0; expected exit 0.

Development evidence before synchronization with main e21c917; final source is verified by the formal check. Package implementation and public type tests typecheck. Dependencies were prepared by the preceding build.

Command: `bun run --filter '@nodebraid/document' typecheck:self`

[Original command output](logs/behavior-5.log)

### document-oxlint

check — passed; exit 0; expected exit 0.

Development evidence before synchronization with main e21c917; final source is verified by the formal check. Package oxlint passes without warnings.

Command: `./node_modules/.bin/oxlint packages/document`

[Original command output](logs/behavior-6.log)

### document-format

check — passed; exit 0; expected exit 0.

Development evidence before synchronization with main e21c917; final source is verified by the formal check. Package format check passes.

Command: `./node_modules/.bin/prettier --check packages/document`

[Original command output](logs/behavior-7.log)

### document-method-capture-red

red — passed; exit 1; expected exit 1.

Development evidence before synchronization with main e21c917; final source is verified by the formal check. Original codec methods were bypassed through caller-owned bind; typed class graph getters were rejected. Two public regressions failed before correction.

Command: `bun test packages/document/tests/capture.test.ts`

[Original command output](logs/behavior-8.log)

### document-method-capture-green

green — passed; exit 0; expected exit 0.

Development evidence before synchronization with main e21c917; final source is verified by the formal check. Public regressions now invoke original codec methods with their receiver, capture readable inherited fields once, omit extra application fields, and retain strict file/missing-field validation. Full package suite passes.

Command: `bun run --filter '@nodebraid/document' test:self`

[Original command output](logs/behavior-9.log)

### document-method-capture-build

check — passed; exit 0; expected exit 0.

Development evidence before synchronization with main e21c917; final source is verified by the formal check. Updated build, declaration isolation and real package-name consumer pass.

Command: `bun run --filter '@nodebraid/document' build`

[Original command output](logs/behavior-10.log)

### document-method-capture-types

check — passed; exit 0; expected exit 0.

Development evidence before synchronization with main e21c917; final source is verified by the formal check. Typed class getter regression and all package source/tests typecheck.

Command: `bun run --filter '@nodebraid/document' typecheck:self`

[Original command output](logs/behavior-11.log)

### history-net-zero-red

red — passed; exit 1; expected exit 1.

Development evidence before synchronization with main e21c917; final source is verified by the formal check. Net-zero baseline publication incorrectly accepted a reentrant History baseline; the public behavior assertion failed before correction.

Command: `bun test packages/plugin-history/tests/baseline.test.ts`

[Original command output](logs/behavior-12.log)

### history-green

green — passed; exit 0; expected exit 0.

Development evidence before synchronization with main e21c917; final source is verified by the formal check. 37 public History tests and 155 assertions pass, including atomic full replacement, failure identity, net-zero baseline, subsequent reentrant Commit recording and lifecycle.

Command: `bun run --filter @nodebraid/plugin-history test:self`

[Original command output](logs/behavior-13.log)

### history-artifacts

check — passed; exit 0; expected exit 0.

Development evidence before synchronization with main e21c917; final source is verified by the formal check. History package builds and its public declaration/package-name consumer checks pass.

Command: `bun run --filter @nodebraid/plugin-history build`

[Original command output](logs/behavior-14.log)

### history-types

check — passed; exit 0; expected exit 0.

Development evidence before synchronization with main e21c917; final source is verified by the formal check. History public input/output type tests pass.

Command: `bun run --filter @nodebraid/plugin-history typecheck`

[Original command output](logs/behavior-15.log)

### core-roundtrip

green — passed; exit 0; expected exit 0.

Development evidence before synchronization with main e21c917; final source is verified by the formal check. Public facade tests pass, including serialized file restore, fresh History and Undo of only the subsequent edit.

Command: `bun test packages/core/tests`

[Original command output](logs/behavior-16.log)

### core-artifacts

check — passed; exit 0; expected exit 0.

Development evidence before synchronization with main e21c917; final source is verified by the formal check. The facade declaration and actual package-name consumer include Document and History baseline APIs.

Command: `bun run --filter @nodebraid/core build`

[Original command output](logs/behavior-17.log)

### preview-selection-red

red — passed; exit 1; expected exit 1.

Development evidence before synchronization with main e21c917; final source is verified by the formal check. Document changes did not select an actual document-files scene before adding the scene selection contract.

Command: `bun test tests/preview-scenes.test.ts`

[Original command output](logs/behavior-18.log)

### preview-selection-green

green — passed; exit 0; expected exit 0.

Development evidence before synchronization with main e21c917; final source is verified by the formal check. Preview scene selection and existing collector protocol tests pass. This does not itself prove the browser file scene.

Command: `bun test tests/preview-scenes.test.ts`

[Original command output](logs/behavior-19.log)

### example-file-red

red — passed; exit 1; expected exit 1.

Development evidence before synchronization with main e21c917; final source is verified by the formal check. Actual Example was ready but lacked the Document file input.

Command: `bun run examples/app/browser-tests/document.browser.ts`

[Original command output](logs/behavior-20.log)

### example-data-capture-red

red — passed; exit 1; expected exit 1.

Development evidence before synchronization with main e21c917; final source is verified by the formal check. Repeated source iteration allowed data to change after validation.

Command: `bun test examples/app/tests/example-data-codec.test.ts`

[Original command output](logs/behavior-21.log)

### example-clipboard-capture-red

red — passed; exit 1; expected exit 1.

Development evidence before synchronization with main e21c917; final source is verified by the formal check. Clipboard serialized original data after accepting a different data snapshot.

Command: `bun test examples/app/tests/example-data-codec.test.ts`

[Original command output](logs/behavior-22.log)

### example-data-green

green — passed; exit 0; expected exit 0.

Development evidence before synchronization with main e21c917; final source is verified by the formal check. Five application codec tests verify accepted data snapshot use by Document and Clipboard.

Command: `bun test examples/app/tests`

[Original command output](logs/behavior-23.log)

### example-browsers

green — passed; exit 0; expected exit 0.

Development evidence before synchronization with main e21c917; final source is verified by the formal check. Basic SVG, Clipboard and Document suites passed with actual Chromium input and file transfer.

Command: `bun run --cwd examples/app test:browser:self`

[Original command output](logs/behavior-24.log)

### example-file-chooser

green — passed; exit 0; expected exit 0.

Development evidence before synchronization with main e21c917; final source is verified by the formal check. Actual Import click opens the native file chooser; cancellation and invalid files preserve graph/history/session; full file workflow passes.

Command: `bun run examples/app/browser-tests/document.browser.ts`

[Original command output](logs/behavior-25.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
