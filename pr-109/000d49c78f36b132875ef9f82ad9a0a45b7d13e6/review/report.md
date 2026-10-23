# Verification report

Run: issue-108-document-final-2 · ZWkang/nodebraid · pr #109

## Reviewed and published source

- Review base: `a81b3fdc348e1d9d0aa78a6576eec5ad9e1a8688`
- Independently prepared append parent: `dfc2f222167ec342201d253ddf9a7ce17310d742`
- Published head: `000d49c78f36b132875ef9f82ad9a0a45b7d13e6`
- Reviewed local head: `427f91fe383bf619feea2ceeac50646e0e452b58`
- Tree: `992d05a73fc309a7b06c6f7d07bc7dc2700f6081`
- Complete binary patch SHA-256: `c0c48dd815345418f018f407704a5911a18ca9cfbbfe96234db3038656049173`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

Synchronize existing PR #109 with fetched main a81b3fdc348e1d9d0aa78a6576eec5ad9e1a8688 because current-head CI passed but strict merge state is BEHIND; preserve approved Issue #108 complete Document save/restore scope and repeat source-bound review, full verification, CI and evidence publication.

### synchronize-main

Merge the independently captured current main into the existing PR branch without changing approved Document behavior; keep the existing published head as first parent.

Dependencies: none

### review-and-verification

Independent Standards/Spec review of the complete feature patch against current main; formal full check at exact resulting head/tree.

Dependencies: synchronize-main

### publish-and-ready

Append verified tree to PR #109, then pass current-head CI/feedback and publish/read back complete current-head report/media.

Dependencies: review-and-verification

### main-integration

POST-MERGE ONLY with user authorization: verify actual main integration and whole-Issue acceptance.

Dependencies: publish-and-ready

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

# Standards review — Issue #108

What this change does: 完整 Document 通过应用明确提供的 Data Codec 保存为文件，恢复通过一次 Kernel Transaction 建立新的 History Baseline；Example 提供真实文件下载、导入与错误展示。

## Source identity

- Base: `a81b3fdc348e1d9d0aa78a6576eec5ad9e1a8688`
- Head: `427f91fe383bf619feea2ceeac50646e0e452b58`
- Tree: `992d05a73fc309a7b06c6f7d07bc7dc2700f6081`
- Binary diff SHA-256: `c0c48dd815345418f018f407704a5911a18ca9cfbbfe96234db3038656049173`
- Reviewed command: `git diff --binary a81b3fdc348e1d9d0aa78a6576eec5ad9e1a8688...427f91fe383bf619feea2ceeac50646e0e452b58`

## Findings

硬性 Standards 违反：0；有具体反例的 ponytail/smell finding：0。

重新核对完整功能的 Document → Kernel 校验、Example → Command → History → Kernel 提交与有序通知链，并对照 AGENTS、CONTEXT、ADR-0011/0012/0013/0015/0016/0084/0085 及适用工程原则。文件验证与业务 codec、图一致性、History 记录边界各有明确所有者；没有新增静默降级或推测性框架。

本次重点重评 main 的 `freezeCanvasNode` 修复：position、size、parentId 单次捕获仍在 Draft 写入前完成，抛错不会留下部分实体。Document 先捕获自己的输入，交给 Kernel 的值是已稳定的普通字段；解码后的冻结结构和 opaque data 引用继续保留。History Baseline callback 使用修复后的同一 writer，失败仍不会提交或清空历史；净零、重入 Commit、后续 Undo/Redo 与依赖释放语义不受字段读取修复影响。按单个交互式 Canvas Runtime 的实际负载评估，未发现需删除的抽象或可复现的性能问题。

已读取刷新后的完整 Issue #108 与接受范围评论 `6365145631`；GitHub 实时讨论刷新由协调者完成。

## Verification

在该 head 执行：

`bun test packages/kernel/tests/node-owned-values.test.ts packages/document/tests packages/plugin-history/tests packages/core/tests/document-roundtrip.test.ts examples/app/tests/example-data-codec.test.ts`

结果：137 pass、0 fail，9 个文件；日志为 `standards-targeted.log`。其中包含新增 Kernel 回归及完整 Document/History 测试。确认当前 Kernel 依赖产物包含新字段捕获实现；本审查未并行重建产物。

固定区间 `git diff --check` 通过，工作区干净，实际 HEAD/tree/binary patch hash 与上述身份一致。

Verdict: passed.

Not checked: 未重跑浏览器、全量工程验证或远端发布回读；本审查结论不替代当前 head 的正式交付验证。


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

# Spec review — Issue #108 / PR #109, synchronized main

**Verdict: passed.** No concrete missing/partial requirement, scope creep, or incorrectly implemented behavior found at this source.

Reassessed the complete feature against [Issue #108](https://github.com/ZWkang/nodebraid/issues/108) and its [accepted scope](https://github.com/ZWkang/nodebraid/issues/108#issuecomment-6365145631). The supplied complete Issue snapshot was refreshed at `2026-10-23T13:32:54.143Z`; requirements and the sole accepted discussion remain unchanged. Repository instructions, domain vocabulary and applicable ADRs are unchanged.

The feature patch is byte-identical to the prior review, but its Kernel dependency changed. I read the complete main delta: `freezeCanvasNode` now captures position, size and parentId once, with new public regression coverage. I traced both affected consumers: Document's independent validation Kernel receives already captured ordinary structures; restore inserts the decoded frozen entities through the live Kernel inside the Baseline Transaction. Neither path relies on repeated getter reads. Opaque data remains the original reference, and graph validation still occurs before commit.

The specification's “failed preparation/Transaction leaves the current graph and existing History unchanged” and “successful net-zero transactions still reset History” remain satisfied. The unchanged History state machine retains exact Commit identity, reentry, caught-up/busy, cancellation and disposal behavior. File download/reopen/upload assertions, continued editing with occupied generated IDs, public exports, bilingual documentation and capability maps remain aligned with the accepted complete-Document scope.

Source identity:

- Base: `a81b3fdc348e1d9d0aa78a6576eec5ad9e1a8688`
- Head: `427f91fe383bf619feea2ceeac50646e0e452b58`
- First parent: `dfc2f222167ec342201d253ddf9a7ce17310d742`
- Tree: `992d05a73fc309a7b06c6f7d07bc7dc2700f6081`
- Patch SHA-256: `c0c48dd815345418f018f407704a5911a18ca9cfbbfe96234db3038656049173`
- Diff: `git diff a81b3fdc348e1d9d0aa78a6576eec5ad9e1a8688...427f91fe383bf619feea2ceeac50646e0e452b58`
- Commits: `dfc2f22 feat: save and restore documents`; `427f91f Merge remote-tracking branch 'origin/main' into feat/issue-108`.

Independent current-head check: `bun test packages/kernel/tests/node-owned-values.test.ts packages/document/tests packages/plugin-history/tests packages/core/tests/document-roundtrip.test.ts examples/app/tests/example-data-codec.test.ts` — **137 passed, 0 failed**, exit 0; `spec-contracts.log`. Confirmed refreshed Kernel artifacts contain the new capture implementation. Patch hash and `git diff --check` passed; worktree stayed clean.

Limits: no build, Chromium rerun, full check or remote mutation performed by this reviewer. Prior-head CI/media publication does not verify this head; formal verification, current-head CI and report/media publication/readback remain pending, as does authorized post-merge acceptance. npm release is not claimed.


## Behavior evidence

### document-roundtrip-red

red — passed; exit 1; expected exit 1.

Historical development evidence from the unchanged feature patch before subsequent main merges. Development evidence before synchronization with main e21c917; final source is verified by the formal check. Complete graph and opaque bigint Map round trip initially failed because the new public serializer was explicitly unimplemented.

Command: `bun test packages/document/tests/index.test.ts`

[Original command output](logs/behavior-1.log)

### document-validation-red

red — passed; exit 1; expected exit 1.

Historical development evidence from the unchanged feature patch before subsequent main merges. Development evidence before synchronization with main e21c917; final source is verified by the formal check. Malformed envelopes, wrong versions/data formats and codec configuration/results initially violated their rejection contract (22 failing tests).

Command: `bun test packages/document/tests/index.test.ts`

[Original command output](logs/behavior-2.log)

### document-codec-green

green — passed; exit 0; expected exit 0.

Historical development evidence from the unchanged feature patch before subsequent main merges. Development evidence before synchronization with main e21c917; final source is verified by the formal check. 35 tests pass for full/empty graph round trip, explicit codec, rejection, Kernel invariants, capture consistency, owned-shell freezing and public types.

Command: `bun run --filter '@nodebraid/document' test:self`

[Original command output](logs/behavior-3.log)

### document-build-artifact

check — passed; exit 0; expected exit 0.

Historical development evidence from the unchanged feature patch before subsequent main merges. Development evidence before synchronization with main e21c917; final source is verified by the formal check. Build, declaration isolation and real @nodebraid/document package-name bigint round trip pass.

Command: `bun run --filter '@nodebraid/document' build`

[Original command output](logs/behavior-4.log)

### document-typecheck

check — passed; exit 0; expected exit 0.

Historical development evidence from the unchanged feature patch before subsequent main merges. Development evidence before synchronization with main e21c917; final source is verified by the formal check. Package implementation and public type tests typecheck. Dependencies were prepared by the preceding build.

Command: `bun run --filter '@nodebraid/document' typecheck:self`

[Original command output](logs/behavior-5.log)

### document-oxlint

check — passed; exit 0; expected exit 0.

Historical development evidence from the unchanged feature patch before subsequent main merges. Development evidence before synchronization with main e21c917; final source is verified by the formal check. Package oxlint passes without warnings.

Command: `./node_modules/.bin/oxlint packages/document`

[Original command output](logs/behavior-6.log)

### document-format

check — passed; exit 0; expected exit 0.

Historical development evidence from the unchanged feature patch before subsequent main merges. Development evidence before synchronization with main e21c917; final source is verified by the formal check. Package format check passes.

Command: `./node_modules/.bin/prettier --check packages/document`

[Original command output](logs/behavior-7.log)

### document-method-capture-red

red — passed; exit 1; expected exit 1.

Historical development evidence from the unchanged feature patch before subsequent main merges. Development evidence before synchronization with main e21c917; final source is verified by the formal check. Original codec methods were bypassed through caller-owned bind; typed class graph getters were rejected. Two public regressions failed before correction.

Command: `bun test packages/document/tests/capture.test.ts`

[Original command output](logs/behavior-8.log)

### document-method-capture-green

green — passed; exit 0; expected exit 0.

Historical development evidence from the unchanged feature patch before subsequent main merges. Development evidence before synchronization with main e21c917; final source is verified by the formal check. Public regressions now invoke original codec methods with their receiver, capture readable inherited fields once, omit extra application fields, and retain strict file/missing-field validation. Full package suite passes.

Command: `bun run --filter '@nodebraid/document' test:self`

[Original command output](logs/behavior-9.log)

### document-method-capture-build

check — passed; exit 0; expected exit 0.

Historical development evidence from the unchanged feature patch before subsequent main merges. Development evidence before synchronization with main e21c917; final source is verified by the formal check. Updated build, declaration isolation and real package-name consumer pass.

Command: `bun run --filter '@nodebraid/document' build`

[Original command output](logs/behavior-10.log)

### document-method-capture-types

check — passed; exit 0; expected exit 0.

Historical development evidence from the unchanged feature patch before subsequent main merges. Development evidence before synchronization with main e21c917; final source is verified by the formal check. Typed class getter regression and all package source/tests typecheck.

Command: `bun run --filter '@nodebraid/document' typecheck:self`

[Original command output](logs/behavior-11.log)

### history-net-zero-red

red — passed; exit 1; expected exit 1.

Historical development evidence from the unchanged feature patch before subsequent main merges. Development evidence before synchronization with main e21c917; final source is verified by the formal check. Net-zero baseline publication incorrectly accepted a reentrant History baseline; the public behavior assertion failed before correction.

Command: `bun test packages/plugin-history/tests/baseline.test.ts`

[Original command output](logs/behavior-12.log)

### history-green

green — passed; exit 0; expected exit 0.

Historical development evidence from the unchanged feature patch before subsequent main merges. Development evidence before synchronization with main e21c917; final source is verified by the formal check. 37 public History tests and 155 assertions pass, including atomic full replacement, failure identity, net-zero baseline, subsequent reentrant Commit recording and lifecycle.

Command: `bun run --filter @nodebraid/plugin-history test:self`

[Original command output](logs/behavior-13.log)

### history-artifacts

check — passed; exit 0; expected exit 0.

Historical development evidence from the unchanged feature patch before subsequent main merges. Development evidence before synchronization with main e21c917; final source is verified by the formal check. History package builds and its public declaration/package-name consumer checks pass.

Command: `bun run --filter @nodebraid/plugin-history build`

[Original command output](logs/behavior-14.log)

### history-types

check — passed; exit 0; expected exit 0.

Historical development evidence from the unchanged feature patch before subsequent main merges. Development evidence before synchronization with main e21c917; final source is verified by the formal check. History public input/output type tests pass.

Command: `bun run --filter @nodebraid/plugin-history typecheck`

[Original command output](logs/behavior-15.log)

### core-roundtrip

green — passed; exit 0; expected exit 0.

Historical development evidence from the unchanged feature patch before subsequent main merges. Development evidence before synchronization with main e21c917; final source is verified by the formal check. Public facade tests pass, including serialized file restore, fresh History and Undo of only the subsequent edit.

Command: `bun test packages/core/tests`

[Original command output](logs/behavior-16.log)

### core-artifacts

check — passed; exit 0; expected exit 0.

Historical development evidence from the unchanged feature patch before subsequent main merges. Development evidence before synchronization with main e21c917; final source is verified by the formal check. The facade declaration and actual package-name consumer include Document and History baseline APIs.

Command: `bun run --filter @nodebraid/core build`

[Original command output](logs/behavior-17.log)

### preview-selection-red

red — passed; exit 1; expected exit 1.

Historical development evidence from the unchanged feature patch before subsequent main merges. Development evidence before synchronization with main e21c917; final source is verified by the formal check. Document changes did not select an actual document-files scene before adding the scene selection contract.

Command: `bun test tests/preview-scenes.test.ts`

[Original command output](logs/behavior-18.log)

### preview-selection-green

green — passed; exit 0; expected exit 0.

Historical development evidence from the unchanged feature patch before subsequent main merges. Development evidence before synchronization with main e21c917; final source is verified by the formal check. Preview scene selection and existing collector protocol tests pass. This does not itself prove the browser file scene.

Command: `bun test tests/preview-scenes.test.ts`

[Original command output](logs/behavior-19.log)

### example-file-red

red — passed; exit 1; expected exit 1.

Historical development evidence from the unchanged feature patch before subsequent main merges. Development evidence before synchronization with main e21c917; final source is verified by the formal check. Actual Example was ready but lacked the Document file input.

Command: `bun run examples/app/browser-tests/document.browser.ts`

[Original command output](logs/behavior-20.log)

### example-data-capture-red

red — passed; exit 1; expected exit 1.

Historical development evidence from the unchanged feature patch before subsequent main merges. Development evidence before synchronization with main e21c917; final source is verified by the formal check. Repeated source iteration allowed data to change after validation.

Command: `bun test examples/app/tests/example-data-codec.test.ts`

[Original command output](logs/behavior-21.log)

### example-clipboard-capture-red

red — passed; exit 1; expected exit 1.

Historical development evidence from the unchanged feature patch before subsequent main merges. Development evidence before synchronization with main e21c917; final source is verified by the formal check. Clipboard serialized original data after accepting a different data snapshot.

Command: `bun test examples/app/tests/example-data-codec.test.ts`

[Original command output](logs/behavior-22.log)

### example-data-green

green — passed; exit 0; expected exit 0.

Historical development evidence from the unchanged feature patch before subsequent main merges. Development evidence before synchronization with main e21c917; final source is verified by the formal check. Five application codec tests verify accepted data snapshot use by Document and Clipboard.

Command: `bun test examples/app/tests`

[Original command output](logs/behavior-23.log)

### example-browsers

green — passed; exit 0; expected exit 0.

Historical development evidence from the unchanged feature patch before subsequent main merges. Development evidence before synchronization with main e21c917; final source is verified by the formal check. Basic SVG, Clipboard and Document suites passed with actual Chromium input and file transfer.

Command: `bun run --cwd examples/app test:browser:self`

[Original command output](logs/behavior-24.log)

### example-file-chooser

green — passed; exit 0; expected exit 0.

Historical development evidence from the unchanged feature patch before subsequent main merges. Development evidence before synchronization with main e21c917; final source is verified by the formal check. Actual Import click opens the native file chooser; cancellation and invalid files preserve graph/history/session; full file workflow passes.

Command: `bun run examples/app/browser-tests/document.browser.ts`

[Original command output](logs/behavior-25.log)

### current-standards

check — passed; exit 0; expected exit 0.

Current merged source passes 137 Kernel/Document/History/facade/Example data tests in independent Standards review.

Command: `bun test packages/kernel/tests/node-owned-values.test.ts packages/document/tests packages/plugin-history/tests packages/core/tests/document-roundtrip.test.ts examples/app/tests/example-data-codec.test.ts`

[Original command output](logs/behavior-26.log)

### current-spec

check — passed; exit 0; expected exit 0.

Current source independently passes Kernel capture and Document/History integration regressions in Spec review.

Command: `bun test packages/kernel/tests/node-owned-values.test.ts packages/document/tests packages/plugin-history/tests packages/core/tests/document-roundtrip.test.ts examples/app/tests/example-data-codec.test.ts`

[Original command output](logs/behavior-27.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
