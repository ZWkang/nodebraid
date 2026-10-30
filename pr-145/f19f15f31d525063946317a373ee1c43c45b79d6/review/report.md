# Verification report

Run: issue-142-kernel-reuse-20261030 · ZWkang/nodebraid · issue #142

## Reviewed and published source

- Review base: `843c9484a7d32e957dceba6658b31a5662560329`
- Independently prepared append parent: `843c9484a7d32e957dceba6658b31a5662560329`
- Published head: `f19f15f31d525063946317a373ee1c43c45b79d6`
- Reviewed local head: `ece568a07a2f56ae25d6daa63d9f16d88108a5af`
- Tree: `2e6095cd9265a816d6e25dd8c13fe65e2d48794d`
- Complete binary patch SHA-256: `6f97fc0624d3bed2dae9a9712720886885ed7b9eab8950f75892a4d56796431b`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## PR risk and merge route

Risk: medium. Route: quick-human.

- standards: medium — Changes authoritative Kernel index ownership and immutable Snapshot reuse; public framework source has a medium path floor. Same-Transaction getter reentry and historical View isolation require focused human review.
- spec: medium — Public Kernel index ownership and cross-revision array reuse change internal behavior; public implementation paths have a medium floor. Same-Transaction getter reentry is an ownership-sensitive prerequisite.
- packages/kernel/src/canvas-kernel.ts: minimum medium risk.
- packages/kernel/src/canvas-view.ts: minimum medium risk.
- packages/kernel/src/entity-collection.ts: minimum medium risk.

### standards risk: medium

Impact and reasoning: Changes authoritative Kernel index ownership and immutable Snapshot reuse; public framework source has a medium path floor. Same-Transaction getter reentry and historical View isolation require focused human review.

Evidence: Pinned ece568a / tree 2e6095cd / patch 6f97fc06. Independently ran 295 Kernel tests with 1809 assertions; reviewed affected-2 success and original failure records. Verified 72 paired-result hashes/medians and unchanged build manifests; net-zero regression signal and mixed focused results remain explicit.

Rollback: Revert ece568a07a2f56ae25d6daa63d9f16d88108a5af to restore previous index/View construction and writer bookkeeping; no persistence schema or data migration is involved.

### spec risk: medium

Impact and reasoning: Public Kernel index ownership and cross-revision array reuse change internal behavior; public implementation paths have a medium floor. Same-Transaction getter reentry is an ownership-sensitive prerequisite.

Evidence: Pinned five-file patch; independent 26 tests / 296 assertions passed; existing Kernel 295 tests and affected-2 receipts checked. Same-byte harness, 60 optimized runs / 1800 formal samples and 72 paired runs / 2160 samples with stable artifact hashes verified. Net-zero regression signal remains visible and unexplained.

Rollback: Revert ece568a07a2f56ae25d6daa63d9f16d88108a5af to restore rebuilding committed indexes and Snapshot arrays, also reverting the same-Transaction reentry bookkeeping repair. No stored data migration or irreversible effects.

Automatic routing is a candidate only. The coordinator still checks current PR status, report publication, pre-merge acceptance and authorization immediately before a head-bound merge.

## Acceptance plan

Implement Issue #142: reuse closed Draft indexes and only untouched collection Snapshot arrays without changing public contracts; rerun the unchanged recorded baseline and compare actual results.

### kernel-reuse

Public-seam regression tests and both internal reuse changes preserve all existing Kernel contracts.

Dependencies: none

### affected-validation

Targeted package and affected consumers pass at the final code revision.

Dependencies: kernel-reuse

### performance-comparison

Same 20-case baseline and representative profiles run on built artifacts; raw samples and comparable base/optimized evidence retained.

Dependencies: affected-validation

### independent-reviews

Standards with ponytail-review and Spec pass at the same head/tree/patch, each with risk and rollback.

Dependencies: performance-comparison

### formal-verification

agents:run verify executes full check successfully on the final clean revision.

Dependencies: independent-reviews

### publication

One PR to main; matching source tree, report publication/readback and current-head CI/discussions accounted for.

Dependencies: formal-verification

### main-acceptance

After separately authorized merge, verify actual main integration and remaining whole-task acceptance; Issue closure requires independent authorization.

Dependencies: publication

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

# Standards / ponytail-review

变更作用：成功提交复用已经封闭的 Draft 关系索引，并复用没有写入的集合快照。Writer 在读取外部字段完成后，以当时的 Draft 实体更新索引，保留同一事务 getter 重入的合法行为。

固定身份：base 843c9484a7d32e957dceba6658b31a5662560329；head ece568a07a2f56ae25d6daa63d9f16d88108a5af；tree 2e6095cd9265a816d6e25dd8c13fe65e2d48794d；binary patch SHA-256 6f97fc0624d3bed2dae9a9712720886885ed7b9eab8950f75892a4d56796431b。

**发现：0 项。** 未发现违反已记录标准的改动，也没有需修正的 baseline smell。判断依据包括 AGENTS、CONTRIBUTING、CONTEXT、ADR-0009/0010/0011/0012/0029，以及边界、所有权、行为测试、读取负担和性能证据原则。

追踪了全部 createCanvasView/createEntityWriter 调用、GraphIndex 更新/查询、实体捕获、Change Set 回放与提交准备。新参数仅在内部组装使用；公共导出、完整校验和错误传播保持。Writer 关闭后才交付索引，新事务仍取得独立索引；复用条件使用 touched ID 而非净 Change Set，避免值相等替换造成 Snapshot/Query 引用分裂。writeCaptured 汇总实际共享的写入记账，没有引入配置层、静默回退或重入禁令。

独立验证：在该 head 执行 bun test packages/kernel/tests，295 pass、0 fail、1,809 assertions。已读开发检查的原始失败与修正后 affected-2 成功回执。独立核对 72 个配对进程的退出码、原始结果哈希、中位数、每次 50 项操作检查及前后产物哈希；两版本 harness 字节一致。

性能结论限定于实测：主要提交路径受益；50k 净零主对照慢 8–13%，六对补测有快有慢，不能宣称所有路径提升或稳定无回退。该限制是风险依据，未把 profile 样本百分比解释为精确阶段耗时。

**风险：medium；路由：quick-human。** 权威图索引和不可变快照的所有权发生内部变化，packages/*/src 路径最低为 medium；相关重入、异常、历史 View、冻结及回放有公共测试证据。需要重点人工审阅这些边界与净零性能观测。

**回滚：**回滚 ece568a 可恢复原构建与记账路径；无持久格式变更、数据迁移或不可逆副作用。

**未检查：**本轴没有重跑全量工程检查、浏览器或性能负载；正式 verify、发布、CI、人工合并与实际 main 验收仍由交付流程独立完成。

Verdict: passed。Standards 0 项发现。


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

# Spec review

**Verdict: passed. Findings: 0.**

Reviewed head: ece568a07a2f56ae25d6daa63d9f16d88108a5af; tree: 2e6095cd9265a816d6e25dd8c13fe65e2d48794d; binary patch: 6f97fc0624d3bed2dae9a9712720886885ed7b9eab8950f75892a4d56796431b.

对照 [Issue #142](https://github.com/ZWkang/nodebraid/issues/142) 与[已接受范围](https://github.com/ZWkang/nodebraid/issues/142#issuecomment-6517283433)，未发现遗漏、越界实现或违反规格的行为。

- Scope 1–2：提交后的 Query 使用本次已封闭 Draft 的索引；后续事务仍创建独立索引。Snapshot 数组仅在对应 touched-ID 集合为空时复用，值相等 replace 不会错误复用旧实体引用。
- Scope 3–4：公开 exports、Map 复制、最终图校验及错误传播路径未变。新的 committed Query 没有复用已关闭的 Transaction Query；发布仍在 metadata 读取成功之后，净零仍保留原 View。
- getter 重入记账修复符合规格中的现有重入语义要求。字段捕获后读取当前 Draft 实体，消除旧关系残留；没有新增重入禁令或失败降级。新增公共测试覆盖 Node/Edge 重入、原始异常、回滚、历史索引和双向 replay。

独立运行三个相关测试文件：26 passed、0 failed、296 assertions；日志为 reviews/spec-check.log。另核对 Kernel 295 tests 与 affected-2 成功回执。原性能 harness 与完整矩阵执行器字节一致；60 次优化版运行的 1,800 个正式样本、72 次配对运行的 2,160 个样本及构建产物前后哈希均有效。

性能证据支持提交路径改善，不支持所有路径改善：50k 净零主对照慢 8–13%，追加六对结果有快有慢，原因未定位；必须保留此限制。采样比例不能当作精确阶段时间。

**Risk: medium / quick-human.** 变更影响公共 Kernel 的索引所有权和跨 revision 引用复用，packages/*/src 路径最低为 medium。重点人工审阅重入记账、未触碰判定与历史 View 隔离。

**Rollback:** revert ece568a，恢复每次提交重建索引和 Snapshot 数组；同时撤回此次重入索引修复。没有数据格式迁移或不可逆操作。

本审查未执行正式全仓 verify、远端发布或主线验收；这些仍是后续交付条件。未读取 Standards 结论。


## Behavior evidence

### reentrant-draft-red

red — passed; exit 1; expected exit 1.

Before the bookkeeping repair, a same-Transaction getter replacement leaves a ghost parent relationship; the public assertion fails for that behavior.

Command: `bun test packages/kernel/tests/transaction-index.test.ts (initial single regression, before repair)`

[Original command output](logs/behavior-1.log)

### reentrant-draft-green

green — passed; exit 0; expected exit 0.

The same initial regression passes after indexing the actual Draft entity following field capture.

Command: `bun test packages/kernel/tests/transaction-index.test.ts (initial single regression, after repair)`

[Original command output](logs/behavior-2.log)

### untouched-snapshot-red

red — passed; exit 1; expected exit 1.

Before collection reuse, a Node-only update does not retain the untouched frozen Edge array.

Command: `bun test packages/kernel/tests/snapshot-reuse.test.ts (initial reuse regression, before optimization)`

[Original command output](logs/behavior-3.log)

### untouched-snapshot-green

green — passed; exit 0; expected exit 0.

The same untouched Edge collection regression passes after optimization.

Command: `bun test packages/kernel/tests/snapshot-reuse.test.ts (initial reuse regression, after optimization)`

[Original command output](logs/behavior-4.log)

### initial-affected-type-error

check — failed; exit 1; expected exit 0.

Initial affected validation stopped on five non-null type mismatches in the new test expectations; corrected without weakening runtime assertions.

Command: `bun run check:affected (first attempt)`

[Original command output](logs/behavior-5.log)

### affected-consumers

check — passed; exit 0; expected exit 0.

Affected workspace type checks and tests, React/SVG/Examples browser suites and docs checks passed after the test typing correction.

Command: `bun run check:affected (second attempt)`

[Original command output](logs/behavior-6.log)

### public-reentry-probe

green — passed; exit 0; expected exit 0.

The unchanged 18-case public package reproduction passes on the optimized build, including preserved committed results and corrected Draft indexes.

Command: `bun --no-install performance-optimized/reentrant-index.mjs plan-probes/reentrant-index-optimized-results.json`

[Original command output](logs/behavior-7.log)

### optimized-full-baseline

check — passed; exit 0; expected exit 0.

The byte-identical 20-case harness completes 60 optimized processes and 1800 measured Transactions with all correctness checks passing; receipts retain every command and exit code.

Command: `python3 performance-optimized/run-baseline.py`

[Original command output](logs/behavior-8.log)

### paired-performance

check — passed; exit 0; expected exit 0.

72 serial contemporaneous base/optimized processes complete with identical harness/settings and stable artifacts. Positive commit-path results and net-zero regressions are retained.

Command: `python3 performance-tools/run-comparison.py --base-revision 843c9484a7d32e957dceba6658b31a5662560329 --optimized-revision ece568a07a2f56ae25d6daa63d9f16d88108a5af --out performance-paired`

[Original command output](logs/behavior-9.log)

### net-zero-control

check — passed; exit 0; expected exit 0.

All six planned additional net-zero pairs complete. Mixed latency results are reported without deleting outliers or claiming a stable benefit.

Command: `python3 run-netzero-control.py`

[Original command output](logs/behavior-10.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.

## Performance and publication evidence

[Complete performance report and raw data](performance/README.md). [Publication mapping and path redaction notes](publication-notes.md). Net-zero timing limitations remain explicit; no all-path speedup is claimed.
