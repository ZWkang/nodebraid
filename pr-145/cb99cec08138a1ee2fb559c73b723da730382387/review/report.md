# Verification report

Run: issue-142-kernel-reuse-main-772aedc-20261030 · ZWkang/nodebraid · pr #145

## Reviewed and published source

- Review base: `772aedcbcbd288a96c1f79cda6c8096c27763b56`
- Independently prepared append parent: `f19f15f31d525063946317a373ee1c43c45b79d6`
- Published head: `cb99cec08138a1ee2fb559c73b723da730382387`
- Reviewed local head: `a13082d93b93d731b08f1f316aaa562df64aa3ee`
- Tree: `8f2a86b1bb51f3d0ffdb5462eb296f1c68d02a6a`
- Complete binary patch SHA-256: `6f97fc0624d3bed2dae9a9712720886885ed7b9eab8950f75892a4d56796431b`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## PR risk and merge route

Risk: medium. Route: quick-human.

- standards: medium — Authoritative Kernel index and immutable Snapshot ownership change remains medium under the public framework source path floor. The new main Examples consumers keep Node identity and readonly Snapshot assumptions compatible, but focused human review remains required.
- spec: medium — The same public Kernel ownership and reference-reuse change remains medium risk after the main merge. New Examples consumers use committed Node identity and readonly Snapshot values and do not require fresh untouched-array allocations. Public implementation path floor remains medium.
- packages/kernel/src/canvas-kernel.ts: minimum medium risk.
- packages/kernel/src/canvas-view.ts: minimum medium risk.
- packages/kernel/src/entity-collection.ts: minimum medium risk.

### standards risk: medium

Impact and reasoning: Authoritative Kernel index and immutable Snapshot ownership change remains medium under the public framework source path floor. The new main Examples consumers keep Node identity and readonly Snapshot assumptions compatible, but focused human review remains required.

Evidence: Verified new merge ordered parents, exact unchanged five-file binary patch, and 102 current Kernel/Diagnostics source/build files against measured artifacts. Read current-head 320-test/1909-assertion success and example:check browser evidence. Prior pure-Kernel performance remains artifact-equivalent evidence with explicit net-zero regression uncertainty; it is not a new-head measurement.

Rollback: Restore the five Kernel files changed by this PR to the current main versions while retaining PR146 Examples changes. No persistence schema or data migration is involved.

### spec risk: medium

Impact and reasoning: The same public Kernel ownership and reference-reuse change remains medium risk after the main merge. New Examples consumers use committed Node identity and readonly Snapshot values and do not require fresh untouched-array allocations. Public implementation path floor remains medium.

Evidence: New-base full patch independently matched 6f97fc; exact ordered merge parents checked. All 102 Kernel/Diagnostics source and built artifact files matched the original measured bytes. Current Kernel build, 320 Kernel+Examples tests / 1909 assertions, and real example:check browser logs passed. Prior net-zero regression signal and uncertain repeat variation remain disclosed.

Rollback: Retain integrated main and revert optimization commit f19f15f31d525063946317a373ee1c43c45b79d6 on the delivery branch; this restores committed index and Snapshot reconstruction and removes the reentry bookkeeping repair. No persisted-format migration or irreversible effect.

Automatic routing is a candidate only. The coordinator still checks current PR status, report publication, pre-merge acceptance and authorization immediately before a head-bound merge.

## Acceptance plan

Refresh Issue #142 / PR #145 against the newly integrated main Examples refactor. Preserve the same Kernel optimization and contracts. Verify production package artifacts against the completed performance comparisons; perform independent reviews, full verification and current-head publication.

### integrate-main

Merge actual main into the existing delivery branch without changing the approved Kernel implementation; capture both parents and equivalent Kernel/Diagnostics source/artifacts.

Dependencies: none

### integration-validation

Current relevant consumers and public Kernel contracts pass; retained performance evidence is explicitly bound through identical package artifact bytes.

Dependencies: integrate-main

### independent-reviews

Both independent axes pass at the updated head/tree/patch with risk and rollback.

Dependencies: integration-validation

### formal-verification

Canonical verify executes a new complete check successfully.

Dependencies: independent-reviews

### publication

Append to PR145, verify source publication, current-head CI/feedback and complete report/preview publication/readback.

Dependencies: formal-verification

### main-acceptance

Actual-main acceptance and Issue closure remain subject to separate merge/closure authorization.

Dependencies: publication

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

# Standards / ponytail-review

变更作用：复用已经封闭的 Draft 关系索引与完全未写入集合的冻结快照，并保持外部 getter 在同一事务内重入时的索引一致性。本次审查重新检查了这些所有权规则与新 main 的 Examples 调用方之间的兼容性。

固定身份：base 772aedcbcbd288a96c1f79cda6c8096c27763b56；head a13082d93b93d731b08f1f316aaa562df64aa3ee；tree 8f2a86b1bb51f3d0ffdb5462eb296f1c68d02a6a；binary patch SHA-256 6f97fc0624d3bed2dae9a9712720886885ed7b9eab8950f75892a4d56796431b。

**发现：0 项。** 依据仍为 AGENTS、CONTRIBUTING、CONTEXT、ADR-0009/0010/0011/0012/0029，以及所有权、边界、行为测试、读取负担和性能证据原则。未发现新增的标准违反或可操作的代码异味。

独立核对合并有序父提交：第一父为原发布 f19f15f31d525063946317a373ee1c43c45b79d6，第二父为新 main 772aedc。相对新 main 的完整差异仍是相同五个 Kernel 文件，patch 字节身份不变。上游仅改八个 Examples 文件，未改 Kernel 契约或工程规则。

追踪了提取后的 projectNodeEditor、reconcileNodeDraft、applyNodeDraft 和 viewport helpers。前者继续使用精确 Node identity、revision-bound Query 与 Command 后的当前读取；后者只读节点几何。它们不依赖未写入集合每次产生新数组，复用条件仍以 touched ID 为准，值相等替换不会混用旧 Snapshot 与新 Query 引用。Writer 关闭、旧 View 隔离、完整校验及原错误传播保持。

验证证据：读取当前 head 的 Kernel 构建、Kernel+Examples 测试（320 pass、0 fail、1,909 assertions）和 example:check 的类型、构建、真实浏览器成功日志。未重复执行相同测试。另独立重算 102 份当前 Kernel/Diagnostics 源码和构建文件，与原 ece568a 测量副本逐字节一致；原性能结果通过此产物映射沿用，不宣称旧测量或旧全量检查在新 head 执行。

性能限制保留：主对照中 50k 净零路径慢 8–13%，六对补测有快有慢，未证明稳定无回退；主要提交路径的收益不能推广到所有路径或浏览器帧率。

**风险：medium；路由：quick-human。** 权威图索引与不可变快照的内部所有权变化，且公共框架源码路径下限为 medium。需重点人工审阅重入、引用一致性及净零性能结果。

**回滚：**将本 PR 五个 Kernel 文件恢复至当前 main 版本，保留 PR146 的 Examples 变更；无持久格式变更、数据迁移或不可逆副作用。

**未检查：**新基线正式 full verify、追加发布、当前远端 CI 与 main 验收仍独立待执行；本轴没有重跑浏览器或性能负载。

Verdict: passed。Standards 0 项发现。


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

# Spec review

**Verdict: passed. Findings: 0.**

Base: 772aedcbcbd288a96c1f79cda6c8096c27763b56. Reviewed head: a13082d93b93d731b08f1f316aaa562df64aa3ee; tree: 8f2a86b1bb51f3d0ffdb5462eb296f1c68d02a6a; binary patch: 6f97fc0624d3bed2dae9a9712720886885ed7b9eab8950f75892a4d56796431b.

重新对照 [Issue #142](https://github.com/ZWkang/nodebraid/issues/142) 及[已接受范围](https://github.com/ZWkang/nodebraid/issues/142#issuecomment-6517283433)，规格未改变。新基线下仍只有原五个 Kernel 文件，完整 patch 与已审版本一致；未发现缺漏、范围扩张或实现错误。

合并新增的八个 Examples 文件已单独检查。Node Editor 提取后的 projection/reconcile/apply 继续依赖已提交 Node identity 和真实 Command/History；它们没有依赖未修改 Snapshot 数组必须每次分配。Viewport helper 只读 Snapshot 节点，未取得图写入权。因此两项复用与新增调用组合相容。Draft 索引、未触碰集合判定、getter 重入记账、失败原子性和历史 View 隔离的实现保持原样。

独立核验了合并的有序父提交、精确 patch，以及当前 Kernel/Diagnostics 的 102 个源码、manifest、构建产物：它们与性能实测版本 ece568a07a2f56ae25d6daa63d9f16d88108a5af 逐字节相同。此映射支持保留原纯 Kernel 性能证据，**不表示性能测试在新 head 上重新执行**，也不证明 Examples/浏览器性能。

已读取本次新执行的 Kernel build、Kernel+Examples 测试（320 passed、0 failed、1,909 assertions）及 example:check 成功日志；后者包含真实 Basic SVG、Clipboard、Document、Node Authoring 浏览器检查。未无理由重复同字节 Kernel 测试。

净零限制保持：原主对照三对慢 8–13%，另六对有快有慢，原因未定位；不能宣称所有路径均改善。

**Risk: medium / quick-human.** 公共 Kernel 的索引所有权与跨 revision 引用复用仍需重点人工审阅；合入应用层重构没有消除此风险。

**Rollback:** 保留已集成的 main，在交付分支回退优化提交 f19f15f31d525063946317a373ee1c43c45b79d6，恢复提交后索引/数组重建并撤回重入记账修复；没有数据格式迁移。

新基线的正式全量 verify、当前 head 发布回读/CI 与主线验收仍待完成。本报告未读取 Standards 结论。


## Behavior evidence

### reentrant-draft-red

red — passed; exit 1; expected exit 1.

Before the bookkeeping repair, a same-Transaction getter replacement leaves a ghost parent relationship; the public assertion fails for that behavior. Executed in the initial delivery run; this run verifies the Kernel/Diagnostics artifact equivalence rather than claiming execution at the new merge head.

Command: `bun test packages/kernel/tests/transaction-index.test.ts (initial single regression, before repair)`

[Original command output](logs/behavior-1.log)

### reentrant-draft-green

green — passed; exit 0; expected exit 0.

The same initial regression passes after indexing the actual Draft entity following field capture. Executed in the initial delivery run; this run verifies the Kernel/Diagnostics artifact equivalence rather than claiming execution at the new merge head.

Command: `bun test packages/kernel/tests/transaction-index.test.ts (initial single regression, after repair)`

[Original command output](logs/behavior-2.log)

### untouched-snapshot-red

red — passed; exit 1; expected exit 1.

Before collection reuse, a Node-only update does not retain the untouched frozen Edge array. Executed in the initial delivery run; this run verifies the Kernel/Diagnostics artifact equivalence rather than claiming execution at the new merge head.

Command: `bun test packages/kernel/tests/snapshot-reuse.test.ts (initial reuse regression, before optimization)`

[Original command output](logs/behavior-3.log)

### untouched-snapshot-green

green — passed; exit 0; expected exit 0.

The same untouched Edge collection regression passes after optimization. Executed in the initial delivery run; this run verifies the Kernel/Diagnostics artifact equivalence rather than claiming execution at the new merge head.

Command: `bun test packages/kernel/tests/snapshot-reuse.test.ts (initial reuse regression, after optimization)`

[Original command output](logs/behavior-4.log)

### initial-affected-type-error

check — failed; exit 1; expected exit 0.

Initial affected validation stopped on five non-null type mismatches in the new test expectations; corrected without weakening runtime assertions. Executed in the initial delivery run; this run verifies the Kernel/Diagnostics artifact equivalence rather than claiming execution at the new merge head.

Command: `bun run check:affected (first attempt)`

[Original command output](logs/behavior-5.log)

### affected-consumers

check — passed; exit 0; expected exit 0.

Affected workspace type checks and tests, React/SVG/Examples browser suites and docs checks passed after the test typing correction. Executed in the initial delivery run; this run verifies the Kernel/Diagnostics artifact equivalence rather than claiming execution at the new merge head.

Command: `bun run check:affected (second attempt)`

[Original command output](logs/behavior-6.log)

### public-reentry-probe

green — passed; exit 0; expected exit 0.

The unchanged 18-case public package reproduction passes on the optimized build, including preserved committed results and corrected Draft indexes. Executed in the initial delivery run; this run verifies the Kernel/Diagnostics artifact equivalence rather than claiming execution at the new merge head.

Command: `bun --no-install performance-optimized/reentrant-index.mjs plan-probes/reentrant-index-optimized-results.json`

[Original command output](logs/behavior-7.log)

### optimized-full-baseline

check — passed; exit 0; expected exit 0.

The byte-identical 20-case harness completes 60 optimized processes and 1800 measured Transactions with all correctness checks passing; receipts retain every command and exit code. Executed in the initial delivery run; this run verifies the Kernel/Diagnostics artifact equivalence rather than claiming execution at the new merge head.

Command: `python3 performance-optimized/run-baseline.py`

[Original command output](logs/behavior-8.log)

### paired-performance

check — passed; exit 0; expected exit 0.

72 serial contemporaneous base/optimized processes complete with identical harness/settings and stable artifacts. Positive commit-path results and net-zero regressions are retained. Executed in the initial delivery run; this run verifies the Kernel/Diagnostics artifact equivalence rather than claiming execution at the new merge head.

Command: `python3 performance-tools/run-comparison.py --base-revision 843c9484a7d32e957dceba6658b31a5662560329 --optimized-revision ece568a07a2f56ae25d6daa63d9f16d88108a5af --out performance-paired`

[Original command output](logs/behavior-9.log)

### net-zero-control

check — passed; exit 0; expected exit 0.

All six planned additional net-zero pairs complete. Mixed latency results are reported without deleting outliers or claiming a stable benefit. Executed in the initial delivery run; this run verifies the Kernel/Diagnostics artifact equivalence rather than claiming execution at the new merge head.

Command: `python3 run-netzero-control.py`

[Original command output](logs/behavior-10.log)

### kernel-and-example-tests

check — passed; exit 0; expected exit 0.

Current merged checkout: 320 tests and 1909 assertions pass.

Command: `bun test packages/kernel/tests examples/app/tests`

[Original command output](logs/behavior-11.log)

### example-current-check

check — passed; exit 0; expected exit 0.

Current merged checkout: type/build and real Basic SVG, Clipboard, Document and Node Authoring browser checks pass.

Command: `bun run example:check`

[Original command output](logs/behavior-12.log)

### performance-artifact-equivalence

check — passed; exit 0; expected exit 0.

All 102 current Kernel/Diagnostics source, manifest and built files match the prior measured package bytes. This binds prior pure-Kernel measurements without claiming a fresh benchmark at this merge head.

Command: `Compare SHA-256 against preserved performance-optimized/artifact-manifest.json after building current Kernel`

[Original command output](logs/behavior-13.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.

## Performance evidence and delivery identity

[Complete performance report and raw data](performance/README.md). [Current delivery equivalence and publication notes](publication-notes.md). The net-zero regression observations remain explicit; no all-path speedup or new-head performance execution is claimed.
