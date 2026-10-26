# Verification report

Run: 2690b62a-d6a9-4970-8e20-1a6d3369d34e · ZWkang/nodebraid · issue #118

## Reviewed and published source

- Review base: `c7d7f1b8c5a729a1e127bf6a1a080a1487b4471d`
- Independently prepared append parent: `c7d7f1b8c5a729a1e127bf6a1a080a1487b4471d`
- Published head: `1df8f82a2a10c20ef1f1efeb2d7eb937d1beee30`
- Reviewed local head: `0255b60bb4e4404328ec4458a4f38ae64f035bc3`
- Tree: `f7cc6c61b670b49c3d2cfe4079471d7df9adaf58`
- Complete binary patch SHA-256: `7486a70010106403bbc66592cf79b9643fea9951e1f27f1e2e656d8afe64d133`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

## Confirmed defect

On fetched clean main `c7d7f1b8c5a729a1e127bf6a1a080a1487b4471d`, the public Document serializer allocates a complete output array before reading its first entity. A typed caller-owned array Proxy reporting length `4294967296` or `Infinity` makes `Array.from` throw an internal `RangeError` before the first entity can fail validation or expose its original getter exception.

A separately typechecked actual compiled public Kernel/Document12-case program creates a real graph and exercises both Node and Edge collections:
- Ordinary length1 with first `null` rejects `document / INVALID_DOCUMENT`; the same length with a throwing first getter preserves the exact original Error. Both read index0 once.
- For each entity collection and each large length above, malformed-first and throwing-first instead raise `RangeError`, read index0 zero times, and lose the required first failure. All8 large-length cases reproduce.
- No encoder runs and the active Kernel retains its exact View in all12 controls. A normal public serialize/deserialize round trip succeeds before those cases.
- The assertion requiring first-entity admission before allocation exits1 after all observations are saved. This safely exposes allocation-before-validation without constructing a large array.

Original current-main code and raw output are retained in local run `20261026T032824-discovery-document-codec-inputs`: `document-array-probe.ts`, `build-and-run.ts`, `tsconfig.json`, `typecheck.log`, `red.log`, `observations.json`, and resolved compiled public-entry hashes. The program uses actual exported packages and Kernel state, with no private helper or mocked success path.

## Contract and cause

[Approved Document scope #108](https://github.com/ZWkang/nodebraid/issues/108) requires explicit malformed-input failures, complete graph capture/validation before application data interpretation, original external errors, pure public package-name tests and unchanged active state. [ADR0084](https://github.com/ZWkang/nodebraid/blob/c7d7f1b8c5a729a1e127bf6a1a080a1487b4471d/docs/adr/0084-serialize-complete-documents-with-application-data-codecs.md) retains the explicit application codec and independent Kernel validation boundary; [ADR0029](https://github.com/ZWkang/nodebraid/blob/c7d7f1b8c5a729a1e127bf6a1a080a1487b4471d/docs/adr/0029-preserve-domain-and-external-error-identity.md) preserves original external failure identity. [The public Document error contract](https://github.com/ZWkang/nodebraid/blob/c7d7f1b8c5a729a1e127bf6a1a080a1487b4471d/packages/document/README.md#errors) identifies malformed graph-owned fields as `INVALID_DOCUMENT` and supports readable getter/array capture.

[Document captureArray](https://github.com/ZWkang/nodebraid/blob/c7d7f1b8c5a729a1e127bf6a1a080a1487b4471d/packages/document/src/document.ts) uses `Array.from({ length: value.length }, mapper)`. The native allocation precedes mapper validation and can hide even an immediate invalid or throwing entry. Existing Kernel, Session and Interaction boundaries already use lazy native indices to retain first failure without imposing a new cap.

## Acceptance

- Replace the Document array helper's eager preallocation with owned lazy indexed capture. Read/coerce the incoming length once with the existing native array-like semantics; capture/validate each indexed entry in order, stopping at its first actual failure. Incoming iterator/map/constructor/species hooks cannot choose validation or allocation.
- All8 large-length cases above must reach index0 once and return `INVALID_DOCUMENT` for malformed first entities or propagate the exact original getter-thrown value. No later entity/codec is consumed after that first failure. Ordinary-length and real normal round-trip controls retain their behavior.
- Preserve original collection-root/length/index read failures and receivers, falsey thrown values, native fractional/empty/negative/BigInt/Symbol/coercion behavior, sparse-array rejection and first invalid field ordering. Do not pre-read all entries, bulk allocate, add arbitrary length caps, accessor bans, retries or fallback.
- Keep complete graph capture and independent Kernel validation before encode/decode callbacks. Preserve known-field getter capture, canonical ordering, original opaque data/codec-returned references, receiver-bound captured codec methods, format/version and explicit error contracts, duplicates/invalid graph Kernel errors, empty graph support and unchanged active Kernel state.
- Scope is the private Document collection helper and public regressions. Its serialized JSON decoder shares that helper and must retain all normal/malformed/codec/graph behavior. Do not alter the file schema, public API, codec policy, Kernel, History Baseline, Examples UI, other packages' helpers or dependencies.
- Use the established pure package-name Document public seam: real test-first red/green, original typed compiled12-case controls, normal serialization/deserialization and affected consumers; independent Standards+ponytail-review and Spec on exact full source, versioned formal full check, actual remote tree/first-parent/current-head CI and complete original report/all mapped previews publication and immutable readback. Keep the Issue open for real main integration and complete final acceptance.

## Deduplication

Read all117 all-state Issue/PR records through100+17 pages and all60 PRs through the final short page. Read full #108 and both discussions, plus #76/#92 and their complete acceptance discussions. #108/#109 delivered complete files and already closed after main acceptance; no active owner or existing repair covers this private helper. #76 owns Session and #92 owns replay headers; their native-capture patterns are precedents, not Document fixes. Completed Delete Selection #112/#114/#116 remain separate. Open #111 changes review/merge authority and is unrelated.


### public-red

Preserve original current-main typed compiled12-case program and request; public Document regression fails before implementation.

Dependencies: none

### capture-document-arrays

Use native lazy owned indices so allocation cannot hide first Document entity validation/read failure; normal capture/codec/graph/error/native-length behavior remains.

Dependencies: public-red

### integration-and-independent-review

Original typed12case program, Document/Kernel/Core related suites and affected consumers pass; independent Standards+ponytail and Spec review exact full source.

Dependencies: capture-document-arrays

### formal-engineering-check

Pinned main agents:run verify performs this delivery attempt's sole formal full bun run check after both reviews pass, preserving all original logs.

Dependencies: integration-and-independent-review

### publish-current-head

Actual remote tree/first parent, current-head CI, complete paginated feedback and complete original report/all mapped media immutable byte readback pass.

Dependencies: formal-engineering-check

### authorized-merge

Normal expected-head protected merge only after then-current deployed main protocol/policy and all source/review/CI/feedback/evidence/pre-merge gates permit.

Dependencies: publish-current-head

### main-integration-acceptance

Actual fetched main contains delivery; fresh package build/tests, original typed12case program and complete main CI satisfy whole Issue before outcomes and authorized closure.

Dependencies: authorized-merge

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: Document capture validates entities one at a time instead of allocating an output array from the reported length first. An invalid or throwing first entity now exposes its actual failure.

Source identity:

- Base: c7d7f1b8c5a729a1e127bf6a1a080a1487b4471d
- Head: 0255b60bb4e4404328ec4458a4f38ae64f035bc3
- Tree: f7cc6c61b670b49c3d2cfe4079471d7df9adaf58
- Binary patch SHA256: 7486a70010106403bbc66592cf79b9643fea9951e1f27f1e2e656d8afe64d133
- Task digest: da5ad9e49644d693af0cada6b4de12a53849c0d018aa8f9eb9f973fb42100556

Scope: complete base...head diff, both files, the shared helper and all 195 added public test lines. Sole commit 0255b60, parent, prepared/inspection identities and canonical saved `review.patch` bytes agree. Read Issue #118 and its empty discussion, independent plan, approved Issue #108 and both comments, original 12-case observations and behavioral red/green logs.

Hard standards: No violations found. The helper keeps native length conversion and indexed order while allowing the first failure to surface under ADR0029 and Document README's error contract. It adds no length cap, accessor restriction, retry or fallback.

ADR0084's boundaries remain intact: serializer/deserializer use the same owner, complete graph capture and independent Kernel validation still precede data encoding/decoding, and file schema/version checks are unchanged. Codec methods retain their receiver; opaque data and codec-returned references retain ADR0012's contract.

Judgment-only smells: No concrete finding across the full Fowler baseline. The existing private helper serves Nodes and Edges in both directions; replacing its allocation step requires no new layer or cross-package parser.

Ponytail assessment: Correct and lean for a local Canvas file workflow. I traced both public owners through captureGraph, Kernel, codec callbacks, Core exports and Example restore/Baseline consumers. Public tests exercise large virtual lengths safely, malformed entries, exact falsey exceptions, fractional/empty/native conversion cases, ignored caller hooks, normal round trips and unchanged state.

Independent command at this exact head:
`bun test packages/document/tests packages/kernel/tests packages/plugin-history/tests packages/core/tests`

Result: exit 0; 352 tests, 1698 assertions. Current compiled lazy capture, final identity, whitespace and clean-status audits passed.

Not checked independently: TypeScript, builds, native browsers, complete affected/full engineering gates, remote CI, publication or main acceptance. Supplied compiled-control execution was not counted as my run.

Verdict: passed. Looks good. Ship.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: passed

base: c7d7f1b8c5a729a1e127bf6a1a080a1487b4471d
head: 0255b60bb4e4404328ec4458a4f38ae64f035bc3
tree: f7cc6c61b670b49c3d2cfe4079471d7df9adaf58
binary patch SHA256: 7486a70010106403bbc66592cf79b9643fea9951e1f27f1e2e656d8afe64d133
taskDigest: da5ad9e49644d693af0cada6b4de12a53849c0d018aa8f9eb9f973fb42100556

独立读取 [Issue118](https://github.com/ZWkang/nodebraid/issues/118) 全文、labels 和完整评论；最终读回为 2026-10-26 03:44:40 UTC，open、bug/ready-for-agent，评论0，正文与 prepared request 一致。读取原 Issue108 全文及两条讨论、当前规则/领域词汇、ADR0084/0012/0029、Document 公共契约和 Core/Example→History Baseline 调用链。完整两文件补丁及195行新增测试均已审查，Git 补丁与 review.patch 字节一致，inspection/prepared digest 完全匹配。

未发现缺失、错误实现或范围扩张。针对 “capture/validate each indexed entry in order, stopping at its first actual failure”，私有 helper 先捕获并原生转换 length，再在自有 descriptor 上惰性产生索引；逐项读取、验证、追加，没有提前分配整个输出。Node/Edge 首无效值及原始（含 falsey）抛值能先于后续元素和 codec 失败；原 receiver、一次 coercion、fractional/empty/negative/BigInt/Symbol 语义及 sparse 拒绝保留，输入 hooks 不参与遍历/分配。serializer 和 decoder 共用相同 helper，完整 graph capture→独立 Kernel validation→codec 的边界保持；schema、canonical ordering、opaque data/codec-returned reference、Errors、History 与其他包 helper 均未变。

独立执行 `bun test packages/document/tests packages/kernel/tests packages/plugin-history/tests packages/core/tests`：352 pass、0 fail、1698 assertions，20文件，exit0；`git diff --check BASE...HEAD` exit0。前后 HEAD/tree/clean 未变；核对当前 dist 惰性 helper 和编译入口哈希。原12场景程序仅输出路径变化、历史8个 RangeError/零索引读取及当前12个预期结果、red→green 日志均作读取核验，未算作本人执行。完整原始命令和输出在 spec-commands.log。

未独立执行构建、类型检查、affected、浏览器、正式全量检查、远端 CI/发布/媒体或合入 main 验收；这些后续交付条件不由本次 Spec passed 代替。


## Behavior evidence

### original-compiled-red

red — passed; exit 1; expected exit 1.

Original c7d public12cases:8large-length RangeErrors hide first Node/Edge validation/read failures;4normal controls correct. Intentional behavior assertion exits1.

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/20261026T032824-discovery-document-codec-inputs/build-and-run.ts`

[Original command output](logs/behavior-1.log)

### public-red

red — passed; exit 1; expected exit 1.

Before helper edit,38Document tests pass and new public first-getter regression fails because Array.from raises RangeError instead of original Error.

Command: `bun test packages/document/tests`

[Original command output](logs/behavior-2.log)

### public-tracer-green

green — passed; exit 0; expected exit 0.

Minimal private lazy capture fix turns tracer green:39tests107assertions.

Command: `bun test packages/document/tests`

[Original command output](logs/behavior-3.log)

### expanded-public-green

green — passed; exit 0; expected exit 0.

All83Document public tests347assertions pass; both collections, original falsey errors, large/fractional/empty/coercion lengths, hooks and normal decode/graph/codec controls.

Command: `bun test packages/document/tests`

[Original command output](logs/behavior-4.log)

### compiled-green

green — passed; exit 0; expected exit 0.

Exact0255 reviewed source: original typed12case program passes, every first index reads once; malformed keeps document error, getter keeps exact marker, codec0 and activeView unchanged.

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/2690b62a-d6a9-4970-8e20-1a6d3369d34e/compiled-controls/build-and-run.ts`

[Original command output](logs/behavior-5.log)

### public-integration

check — passed; exit 0; expected exit 0.

Exact0255 Document/Kernel/History/Core352tests1698assertions pass.

Command: `bun test packages/document/tests packages/kernel/tests packages/plugin-history/tests packages/core/tests`

[Original command output](logs/behavior-6.log)

### complete-affected

check — passed; exit 0; expected exit 0.

Current complete affected builds/types/consumers/native Examples including files and docs pass; source/test final tree unchanged by commit hooks.

Command: `bun run check:affected --base c7d7f1b8c5a729a1e127bf6a1a080a1487b4471d`

[Original command output](logs/behavior-7.log)

### independent-standards

check — passed; exit 0; expected exit 0.

Independent standards full current-source/contract/identity review and actual352tests1698assertions. No independently claimed full/browser/remote gate.

Command: `bun test packages/document/tests packages/kernel/tests packages/plugin-history/tests packages/core/tests`

[Original command output](logs/behavior-8.log)

### independent-spec

check — passed; exit 0; expected exit 0.

Independent spec full current-source/contract/identity review and actual352tests1698assertions. No independently claimed full/browser/remote gate.

Command: `bun test packages/document/tests packages/kernel/tests packages/plugin-history/tests packages/core/tests`

[Original command output](logs/behavior-9.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.

## Reproducible source appendix

[Original typed compiled program, reviewed controls and exact public-entry hashes](probes/compiled-controls.md). The two programs retain their own main/review identities; original request, checks, independent review bodies, raw logs and receipts remain unchanged.

## Preview provenance

[Changed-source CI file scene and separate same-head complete five-scene capture](probes/preview-provenance.md). Both source identities and original evidence are preserved.
