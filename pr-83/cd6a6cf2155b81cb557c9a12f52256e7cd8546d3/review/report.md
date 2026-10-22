# Verification report

Run: 2d23ece4-c0e8-4327-81c0-fd5261dca478 · ZWkang/nodebraid · issue #82

## Reviewed and published source

- Review base: `01c4827666dbc089a38eec61925030728411fe9d`
- Independently prepared append parent: `01c4827666dbc089a38eec61925030728411fe9d`
- Published head: `cd6a6cf2155b81cb557c9a12f52256e7cd8546d3`
- Reviewed local head: `4c8984b04a944811f545afb00d3b6fbcb64dee68`
- Tree: `112b395b2f7ffbbcfa17b3c520ec0db83be13187`
- Complete binary patch SHA-256: `41f9934066885c572e7f7457f47b6ada9f238cc2556b6cf329483bf9e5a45413`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

Retain accepted Kernel writer entity IDs and consistent, replayable commit evidence; revalidate the complete unchanged Kernel patch after externally merged Runtime and Layout repairs advanced fetched main. Source: https://github.com/ZWkang/nodebraid/issues/82

### sync-source-and-public-checks

Independently retain source/plan and current fetched main01c; conflict-free main sync inspected, full Kernel patch remains41f. Re-run public Kernel tests/types/compiled probes and selected consumers at exact synchronized source. Original reds and old-base wake failure/recovery stay historical.

Dependencies: none

### independent-review-and-full-check

Fresh independent Standards+ponytail-review and Spec cover current base01c/exact head/tree/patch, then deployed main01c versioned verify executes actual full check with stable source. Do not reuse old verification/reviews.

Dependencies: sync-source-and-public-checks

### publication-current-head-acceptance

Initial remote source branch still absent; publish exact reviewed tree with independently prepared first parent main01c, one PR for Issue82, real current-head CI/complete feedback and full report/media publication plus immutable readback.

Dependencies: independent-review-and-full-check

### main-integration-acceptance

Actual main integration and whole-Issue public acceptance remain pending prerequisites before authorized closure; human final review/merge.

Dependencies: publication-current-head-acceptance

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: Kernel Node and Edge Writers retain the incoming ID accepted by their strict checks. Owned entity copies, Map keys, relation indexes and replayable Change Set evidence use that same identity.

Verdict: passed.

Reviewed identity:

- Base: 01c4827666dbc089a38eec61925030728411fe9d
- Head: 4c8984b04a944811f545afb00d3b6fbcb64dee68
- Tree: 112b395b2f7ffbbcfa17b3c520ec0db83be13187
- Binary patch SHA256: 41f9934066885c572e7f7457f47b6ada9f238cc2556b6cf329483bf9e5a45413

Hard standards: No violations found. The complete three-file patch preserves ADR0009–0012 Kernel ownership, immutable entity shells, opaque data references, revision-bound evidence and Transaction replay. AGENTS.md, CONTRIBUTING.md and Boundary Discipline retain their existing requirements; comparing the updated main confirms that the standards, glossary and ADRs did not change.

Integration review: Read both mechanical merges, the full current product patch and the intervening Runtime diagnostics/Layout production changes. Layout still passes owned, validated positions through Kernel Service Transactions. Runtime diagnostics retains its existing observational interface. Neither introduces another freeze-helper caller or changes EntityWriter contracts. History still replays through the same strict Node/Edge Writers.

Judgment / ponytail: No actionable Fowler smell or correctness, safety, load, speed or testing finding. The explicit private ID argument carries one accepted value without adding policy or abstraction. Closed/missing-target checks retain precedence; duplicate/mismatch failures precede remaining field reads. Copy errors, final graph validation, net-zero identity, canonical ordering, separate namespaces and replay remain intact.

Connected code checked: current Writer/freezer callers, CanvasKernel publication, GraphIndex, Change Set preflight/application, Kernel Plugin propagation, History replay and Layout submission. Assumed load: synchronous in-process Transactions for an isolated Canvas Runtime.

Actual checks at this head:

- Independently verified commit history, clean tree, exact head/tree and complete binary patch hash; re-read the full new test file and connected code.
- `git diff --check`: passed.
- `bun test packages/kernel/tests`: 70 passed, 0 failed, 280 assertions, including all 12 regressions.

Not checked: current affected consumers, TypeScript checks, builds, browser suites, full engineering gate, remote CI, publication and remote report readback. Earlier-base review and full-check results were not counted as current verification.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: **passed**

对新基线独立审查完整三文件补丁、新增公共测试、Issue #82 全文及空讨论、独立 prepared task、ADR0009–0012/0027，以及 Writer → owned entity → Map/关系索引 → touched IDs → Change Set/replay 调用链，未发现遗漏、错误实现或范围扩张。

Issue 要求“Capture the incoming entity ID once”：Node/Edge 的 add/replace 均只读取一次输入 ID，并将相同值传入私有 freeze helper、Map、索引及提交证据。closed/missing/duplicate/mismatch 的既有读序保持；复制失败先于 Draft 写入；原异常、opaque data 引用、冻结、净零与双向 replay 保持。required ID 参数未进入公共 API。

本轮实际执行 `bun test packages/kernel/tests`：70 pass、0 fail、280 assertions；`git diff --check` 通过。核对精确提交、tree、完整 binary patch 和干净工作树，并确认新 main 的 Runtime/Layout 集成未修改 Kernel。未借用旧 head 的审查或检查结论。

本轮未执行构建、浏览器、affected/full engineering gate，未验证当前 head 的远端 CI、报告发布或 main 最终集成；定向通过不代表交付验收完成。

- base: `01c4827666dbc089a38eec61925030728411fe9d`
- head: `4c8984b04a944811f545afb00d3b6fbcb64dee68`
- tree: `112b395b2f7ffbbcfa17b3c520ec0db83be13187`
- raw binary patch SHA256: `41f9934066885c572e7f7457f47b6ada9f238cc2556b6cf329483bf9e5a45413`


## Behavior evidence

### original-main710-public-red

red — passed; exit 1; expected exit 1.

Historical original main710 public compiled Kernel proof: Node/Edge adds overwrite existing IDs, Node replacement violates Query/Snapshot/ChangeSet identity and cannot replay. This is original red provenance, not a current-head check.

Command: `bun kernel-writer-id-repro.ts (original main710 discovery)`

[Original command output](logs/behavior-1.log)

### original-edge-replace-red

red — passed; exit 1; expected exit 1.

Historical original main710 Edge replace also returns a different valid entity ID under its checked key.

Command: `bun original-edge-replace-repro.ts (original main710)`

[Original command output](logs/behavior-2.log)

### original-node-add-tracer-red

red — passed; exit 1; expected exit 1.

Original TDD slice before the ID fix demonstrated existing Node overwrite. Later source/baseline changes do not change this red's original provenance.

Command: `bun test packages/kernel/tests/writer-id-values.test.ts (Node add before fix)`

[Original command output](logs/behavior-3.log)

### original-node-replace-tracer-red

red — passed; exit 1; expected exit 1.

Original TDD replace slice before capture fix published duplicate Snapshot IDs.

Command: `bun test packages/kernel/tests/writer-id-values.test.ts (Node replace before fix)`

[Original command output](logs/behavior-4.log)

### current-kernel-public-checks

green — passed; exit 0; expected exit 0.

New synchronized4c/main01c Kernel public suite:70 pass280assert, including12 ID/strictness/rollback/index/replay/net-zero regressions.

Command: `bun test packages/kernel/tests`

[Original command output](logs/behavior-5.log)

### current-kernel-types

check — passed; exit 0; expected exit 0.

New synchronized source Kernel types passed; no public signature/export change.

Command: `bun run --filter '@nodebraid/kernel' typecheck:self`

[Original command output](logs/behavior-6.log)

### current-compiled-public-probe

green — passed; exit 0; expected exit 0.

New synchronized compiled public Kernel probe retains original existing Node/Edge data, consistent IDs and reversible generated evidence, with one ID read.

Command: `bun kernel-writer-id-probe.ts`

[Original command output](logs/behavior-7.log)

### current-affected-consumers

check — passed; exit 0; expected exit 0.

Current base01c/head4c selected public consumers, browser scenarios, build/declarations and documentation passed; executed mode affected, exit0.

Command: `bun run check:affected --base 01c4827666dbc089a38eec61925030728411fe9d`

[Original command output](logs/behavior-8.log)

### historical-base710-full-failure

check — failed; exit 1; expected exit 0.

Historical earlier-base full check:583 pass16 process/Git fixture timeout failures during machine sleep/wake. Original failure preserved. Same failed suites subsequently39 pass371 assertions, and full retry passed. Neither this failure nor retry substitutes for current main01c verification.

Command: `bun run agents:run verify (historical run9cf, base710/head926)`

[Original command output](logs/behavior-9.log)

### historical-base710-full-retry

check — passed; exit 0; expected exit 0.

Historical same-source base710 retry:599 pass2606 assertions plus browsers/build/docs. Source remained926/tree9f13. Later main changed; this is preserved provenance, not current-head acceptance.

Command: `bun run agents:run verify (historical run9cf, base710/head926)`

[Original command output](logs/behavior-10.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
