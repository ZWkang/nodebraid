# Verification report

Run: e1a42bd4-ea60-468b-9da7-4c156c1df78c · ZWkang/nodebraid · issue #120

## Reviewed and published source

- Review base: `b58f1b17ab5ce3d64780c329cf0af1703b86a4e3`
- Independently prepared append parent: `b58f1b17ab5ce3d64780c329cf0af1703b86a4e3`
- Published head: `4ae41e7c3b3b4942a2a32c64d9a5dfed85db559b`
- Reviewed local head: `7c80696d1b8aa54233c89842fff15b6bfddd9575`
- Tree: `3f189e61617cd7e4d8d2fc061cc7bb91aae3563e`
- Complete binary patch SHA-256: `b96e04e2723786126efa08e85ff053cb50fb14d78cd2a9ed2033090bf6d5a839`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

## Confirmed defect

On fetched main `b58f1b17ab5ce3d64780c329cf0af1703b86a4e3`, both direct Kernel Edge Writers reread a present Endpoint `portId` while copying its owned shell. The first value is used for the presence test, then a second read supplies the stored value.

A separately typechecked program runs **24 actual compiled public Kernel cases**: add/replace × source/target × six getter behaviors. Every getter returns values compatible with the public `string | undefined` type; no malformed input cast or private API is used.

- Eight changing-present/first-empty cases commit `replacement-port` instead of the first `first-port` or empty string.
- Four valid-first/later-throw cases fail on the unnecessary second read instead of accepting the first valid port.
- Four stable-present cases also read twice. Eight absent-first controls already read once and pass.
- Owned shells are frozen and opaque data references remain intact in successful controls. Failures preserve the exact committed View.

The public assertion requiring first-value capture exits **1**; the independent TypeScript check exits **0**. Original source, compiled artifact provenance, all observations and failure output are retained in investigation `20261026T045355-discovery-kernel-endpoint-values`: `kernel-endpoint-probe.ts`, `compiled-red.log`, `observations.json`.

## Contract and cause

[ADR0012](https://github.com/ZWkang/nodebraid/blob/b58f1b17ab5ce3d64780c329cf0af1703b86a4e3/docs/adr/0012-keep-domain-data-opaque-to-kernel.md) assigns copying/freezing of Kernel-owned Endpoint shells to Kernel and preserves opaque application data. [ADR0010](https://github.com/ZWkang/nodebraid/blob/b58f1b17ab5ce3d64780c329cf0af1703b86a4e3/docs/adr/0010-bind-canvas-query-to-snapshot-revision.md) binds Snapshot and Query to consistent committed evidence. Replay already captures Endpoint structural fields once before application.

In [`freezeEdgeEndpoint`](https://github.com/ZWkang/nodebraid/blob/b58f1b17ab5ce3d64780c329cf0af1703b86a4e3/packages/kernel/src/entity-values.ts), the conditional spread reads `endpoint.portId` for both presence and copying. The shared copy owner is used by direct `edges.add` and `edges.replace`.

## Acceptance

- Capture a direct incoming Endpoint's Node ID and optional Port ID once while copying, and retain the first Port ID for both presence and the frozen value.
- Cover source and target for add and replace: changing valid values, empty string, absent optional value, valid-first/later-throw and ordinary values. Preserve readable inherited/non-enumerable properties and original receivers.
- Preserve first-read external thrown-value identity, Writer closed/duplicate/missing/mismatched-ID precedence, source-before-target/data read order, and no partial Draft/index write when a copy failure is caught inside a larger Transaction.
- Preserve opaque data reference/read phase, independent Node/Edge ID namespaces, temporary/final graph semantics, canonical queries, historical Snapshot/Query/Change Set consistency, net-zero coalescing, and forward/reverse replay.
- Repair only the shared Endpoint copy owner. No new Port existence/type/role policy, public API, accessor ban, dependency, eager graph validation, cap, retry or fallback.
- Real public red/green and the original compiled24 controls; related Kernel/History/Document/Interaction checks, affected checks, independent Standards with ponytail-review and Spec, one formal complete check, exact remote tree/first-parent publication, current-head CI, complete immutable reports and all mapped native previews.
- Keep this Issue open until actual main integration and whole-Issue acceptance.

## Deduplication

Complete all-state collections contain **119 Issue/PR records** through the final short page and **61 PRs**. Full #102 and #89 discussions were read. #102/#103 explicitly limited the direct Writer fix to Node Position/Size/parent fields and excluded Edge Endpoint/Port policy; #89/#91 capture replay-owned records/Endpoints. Neither changes this direct Edge copy owner. #106/#107 capture Create Edge Command input before Kernel writing and do not remove this Kernel optional Port reread. This is a separate bounded copying defect, with no Port policy change.


### public-red

Original typed compiled24 direct Edge/Endpoint cases and a public Kernel regression fail before the source fix; preserve raw source and logs.

Dependencies: none

### capture-endpoint-ports

Shared Endpoint copy owner retains Node ID and optional Port ID once; all first-value, first-error, absence, receiver, writer/index atomicity and existing graph/replay/opaque data behavior remain.

Dependencies: public-red

### integration-and-independent-review

Original compiled24 controls, public Kernel/History/Document/Interaction consumers and affected checks pass; independent Standards+ponytail and Spec bind full exact source.

Dependencies: capture-endpoint-ports

### formal-engineering-check

Pinned main agents:run verify executes this attempt's sole formal full bun run check after both reviews pass; original failures retained.

Dependencies: integration-and-independent-review

### publish-current-head

Exact actual remote tree/first parent, current head CI, complete paginated feedback and full original report/all5 native previews immutable byte readback pass.

Dependencies: formal-engineering-check

### authorized-merge

Current deployed main policy, strict live protection and all current source/review/CI/feedback/ticket/presentation gates permit immediate normal expected-head merge; read back actual result.

Dependencies: publish-current-head

### main-integration-acceptance

Fresh fetched main contains actual merge; original compiled24 and public related controls/build plus full main CI satisfy whole Issue before acceptance publication and closure.

Dependencies: authorized-merge

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: retains the first Endpoint port value for both optional-property presence and the frozen Endpoint copy.

- Base: `b58f1b17ab5ce3d64780c329cf0af1703b86a4e3`
- Head: `7c80696d1b8aa54233c89842fff15b6bfddd9575`
- Tree: `3f189e61617cd7e4d8d2fc061cc7bb91aae3563e`
- Binary patch SHA256: `b96e04e2723786126efa08e85ff053cb50fb14d78cd2a9ed2033090bf6d5a839`
- Task digest: `59f00ccdd1514770dae1c9b2249b46f68e7a1fd6d27d9da325ba13da892b022c`

Reviewed the complete two-file diff, including all 263 new public-test lines; the complete Issue120 request, empty discussion, independent plan and retained red/green evidence. Canonical `git diff --binary BASE HEAD` matches `review.patch` bytewise. HEAD, tree, sole parent, task identity, clean checkout and `git diff --check BASE HEAD` were independently verified.

Hard documented standards: no violations found. Node-before-port and source-before-target reads remain ordered; undefined stays omitted and empty strings remain present. Raw getter failures retain identity and occur before opaque-data reads or Draft Map/index/touched mutation. Direct add/replace guards, Snapshot queries, net-zero replacement and transactional replay preserve ADR0010/0011; opaque data retains its reference under ADR0012, and external failures follow ADR0029. Tests exercise observable Kernel behavior and exact thrown values, consistent with `principle-test-behavior-not-implementation`.

Judgment-only smells: no concrete finding across the Fowler baseline. The shared private copying owner fixes the repeated read without new Port policy, abstraction or dependency.

Ponytail assessment: correct, safe, tested and lean for an isolated Canvas Kernel. Traced shared Writer add/replace, graph/index validation, replay preflight/application and History, Document, Interaction and Core consumers. The current compiled Endpoint helper also contains one ordered read per field.

Independent execution: `bun test packages/kernel/tests packages/plugin-kernel/tests packages/plugin-history/tests packages/document/tests packages/plugin-interaction/tests packages/core/tests` exited 0: **660 tests, 4097 assertions**. Full original output is retained in `standards-tests.log`.

Not independently checked: TypeScript, builds, affected/full engineering checks, browsers, remote CI, publication or main acceptance. Coordinator results are not counted as reviewer execution.

**Verdict: passed. Looks good. Ship.**


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: passed

base: b58f1b17ab5ce3d64780c329cf0af1703b86a4e3
head: 7c80696d1b8aa54233c89842fff15b6bfddd9575
tree: 3f189e61617cd7e4d8d2fc061cc7bb91aae3563e
binary patch SHA256: b96e04e2723786126efa08e85ff053cb50fb14d78cd2a9ed2033090bf6d5a839
taskDigest: 59f00ccdd1514770dae1c9b2249b46f68e7a1fd6d27d9da325ba13da892b022c

独立读取 [Issue120](https://github.com/ZWkang/nodebraid/issues/120) 全文、labels 与全部评论。最终读回 2026-10-26 05:04:42 UTC：open、bug/ready-for-agent，评论0，原始 request 未变。读取当前 AGENTS/CONTEXT、tracker/discussion/code-review、ADR0010/0011/0012/0029、prepared 依赖计划、Kernel 公共契约，以及 Writer→owned copy→Draft/index→Commit/Query→replay/History/Document/Interaction 调用链。完整两文件补丁及263行新公共测试均已审查；Git 原始补丁与 review.patch 字节一致，五项身份与 inspection/prepared 完全匹配。

未发现规格遗漏、错误实现或范围扩张。针对 “retain the first Port ID for both presence and the frozen value”，共享 freezeEdgeEndpoint 按原 nodeId→portId 顺序各捕获一次；空字符串保留，undefined 省略，后续 getter 不再替换首值或额外抛错。普通、继承、非枚举 getter 的 receiver 和首异常（含 falsey thrown value）保留。closed/duplicate/missing/mismatched-ID 判断仍在复制之前；两个 Endpoint 全部复制成功后才读 opaque data，完成冻结后才写 Draft/index。新增公共矩阵覆盖 source/target×add/replace、caught-copy-failure 后继续 Transaction、历史 Query、net-zero 与双向 replay。未加入 Port 存在/类型/role 校验，API、Node/Edge namespaces、最终图校验、data 引用与其他 owner 不变。

本轮独立执行 `bun test packages/kernel/tests packages/plugin-kernel/tests packages/plugin-history/tests packages/document/tests packages/plugin-interaction/tests packages/core/tests`：660 pass、0 fail、4097 assertions，36文件，exit0；`git diff --check BASE...HEAD` exit0。测试前后 HEAD/tree/clean 未变。核对当前 dist 单次捕获实现及 compiled24 的代码、记录结果、bundle/入口哈希；既有 tracer red→green 和 compiled24 仅作读取核验，未算作本人运行。完整原始命令及输出保存在 spec-commands.log。

未独立运行 build、类型检查、affected、browser、正式 full check，亦未验证远端发布、当前头 CI、报告/媒体、merge 或实际 main 整项验收；Spec passed 不替代这些交付条件。


## Behavior evidence

### original-compiled-red

red — passed; exit 1; expected exit 1.

Original main24 compiled cases:8 port substitutions and4 unnecessary later exceptions, plus redundant stable reads;8 absence controls pass. Assertion exits1.

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/20261026T045355-discovery-kernel-endpoint-values/build-and-run.ts`

[Original command output](logs/behavior-1.log)

### public-red

red — passed; exit 1; expected exit 1.

Original direct public Edge source Port regression rejects replacement-port instead of first-port before the helper edit.

Command: `bun test packages/kernel/tests/edge-endpoint-values.test.ts`

[Original command output](logs/behavior-2.log)

### public-tracer-green

green — passed; exit 0; expected exit 0.

The minimal shared Endpoint capture fix makes the initial1test/2assertion tracer pass.

Command: `bun test packages/kernel/tests/edge-endpoint-values.test.ts`

[Original command output](logs/behavior-3.log)

### compiled-typecheck

check — passed; exit 0; expected exit 0.

Original24-case control body is unchanged; only observation source-head metadata is adapted and disclosed. Independent typecheck passes.

Command: `node_modules/.bin/tsc --noEmit -p /Users/zhou/.codex/local-workflows/nodebraid/runs/e1a42bd4-ea60-468b-9da7-4c156c1df78c/compiled-controls/tsconfig.json`

[Original command output](logs/behavior-4.log)

### compiled-green

green — passed; exit 0; expected exit 0.

Actual reviewed7c80696 source:24/24 typed compiled controls pass, each first optional port captured once; original opaque data/frozen shells/historical View retained.

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/e1a42bd4-ea60-468b-9da7-4c156c1df78c/compiled-controls/build-and-run.ts`

[Original command output](logs/behavior-5.log)

### related-public

check — passed; exit 0; expected exit 0.

Final related Kernel/PluginKernel/History/Document/Interaction/Core working-tree suites pass660tests4097assertions; committed-source independent checks are recorded separately.

Command: `bun test packages/kernel/tests packages/plugin-kernel/tests packages/plugin-history/tests packages/document/tests packages/plugin-interaction/tests packages/core/tests`

[Original command output](logs/behavior-6.log)

### complete-affected

check — passed; exit 0; expected exit 0.

Exact committed source affected builds/types/tests/React+SVG+Examples native browsers/docs pass.

Command: `bun run check:affected --base origin/main`

[Original command output](logs/behavior-7.log)

### independent-standards

check — passed; exit 0; expected exit 0.

Independent standards review at exact head/tree/patch/task identity passed; separately executed660tests4097assertions.

Command: `bun test packages/kernel/tests packages/plugin-kernel/tests packages/plugin-history/tests packages/document/tests packages/plugin-interaction/tests packages/core/tests`

[Original command output](logs/behavior-8.log)

### independent-spec

check — passed; exit 0; expected exit 0.

Independent spec review at exact head/tree/patch/task identity passed; separately executed660tests4097assertions.

Command: `bun test packages/kernel/tests packages/plugin-kernel/tests packages/plugin-history/tests packages/document/tests packages/plugin-interaction/tests packages/core/tests`

[Original command output](logs/behavior-9.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.

## Reproducible source appendix

[Original24-case compiled failure and reviewed24-case passing program with actual source/artifact identities](probes/compiled-controls.md). Original independent Markdown, request, verification/publication receipts and raw logs remain unchanged. Only the observation metadata is adapted for the reviewed execution, as disclosed in the appendix.
