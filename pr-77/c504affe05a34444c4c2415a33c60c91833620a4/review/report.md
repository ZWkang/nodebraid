# Verification report

Run: b2e72f0b-5b5a-4649-a665-b5d3807a6be5 · ZWkang/nodebraid · issue #76

## Reviewed and published source

- Review base: `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`
- Independently prepared append parent: `2c1cc4b78f5d85530c1ce7ff94ff3c615bb866a9`
- Published head: `c504affe05a34444c4c2415a33c60c91833620a4`
- Reviewed local head: `f3c41d9f95cefb7f21424ba0b62ad729663fae5d`
- Tree: `ee6c00bd97da199489fdf439422bd51d699313a5`
- Complete binary patch SHA-256: `f631def090171fc90bdbb50bd525138000ac9da572ba9afaba61825de6a85068`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

Complete the Session input ownership repair on current main1c85, preserving the externally synchronized source2c1 and the verified local correction that converts an incoming length object once to an owned native number before lazy indexed capture. Retain accepted Viewport/Selection values and the original Issue76 validation, atomic membership, normalization, transition and failure contracts. Source: https://github.com/ZWkang/nodebraid/issues/76

### sync-source-and-public-checks

Refresh full Issue76/PR77 and true dependencies/feedback; independently capture source2c1 and target main1c85. Preserve external main sync and committed local native-length fix without overwriting work. Inspect complete current patch; actual current public Session/Kernel/Renderer/Interaction and affected consumer/browser/type/build checks pass. Keep original main99 and local53a length-red provenance under their actual identities.

Dependencies: none

### independent-review-and-full-check

Fresh independent Standards+ponytail-review and Spec review exact new base/head/tree/complete patch including the coercible-length repair and new Duplicate integration. Then deployed main1c85 versioned verify runs actual full check with stable source; no old review/fullcheck is relabeled.

Dependencies: sync-source-and-public-checks

### append-current-head-acceptance

Append exact checked tree on existing PR77 with independently captured first parent2c1 and actual inherited main1c85. Verify new source blobs, actual remote tree/parents, published-head CI, all feedback, full report/media publication and immutable byte readback before ready.

Dependencies: independent-review-and-full-check

### main-integration-acceptance

Human final review/merge, actual main integration and whole-Issue acceptance are pending prerequisites before authorized closure; keep Issue76 open until they pass.

Dependencies: append-current-head-acceptance

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: Session validates and publishes owned Viewport fields and indexed Selection values. The incoming array length is converted once before lazy traversal, preventing caller-controlled coercion from hiding IDs.

Verdict: passed.

Reviewed identity:

- Base: 1c85d79db1e275e59f84a9bb77d1fe75c0a582e6
- Head: f3c41d9f95cefb7f21424ba0b62ad729663fae5d
- Tree: ee6c00bd97da199489fdf439422bd51d699313a5
- Binary patch SHA256: f631def090171fc90bdbb50bd525138000ac9da572ba9afaba61825de6a85068

Hard standards: No violations found in the complete two-file patch. ADR0017 atomic membership checks, ADR0018 finite coordinates/positive zoom and ADR0022 consistent breadth-first notification remain intact. Boundary Discipline and Type System Discipline keep runtime normalization at Session's ownership boundary. Issue aggregation, original read errors, no-op Snapshot identity and disposal remain covered. No public API, input cap, fallback or dependency was added.

New main integration: Reviewed Duplicate's merged indexed-mapping translation and its full path through Fragment materialization, Kernel commit, Session evidence check and setSelection. Fragment supplies frozen ID arrays; Session copies their actual values, checks current Kernel membership and publishes canonically. History retains the original single Document Commit and replays through Kernel; Session changes do not enter History. Renderer and Interaction still observe consistent queued Snapshots.

Judgment / ponytail: No actionable Fowler smell or correctness, safety, load, speed or testing finding. The private helper serves both ID namespaces without another abstraction. Original length-coercion P2 remains resolved at this identity: the unchanged public probe reads both IDs, performs one coercion, rejects the unknown entity and preserves the Snapshot. Assumed load: an isolated Canvas Runtime with synchronous mutations and reentrant observers.

Actual checks at this head:

- Verified complete history, clean tree, exact head/tree/hash, independent prepared-task/inspection identity and byte-identical complete.patch.
- Read the full current production change, all 323 regression-test lines, refreshed source/feedback and connected callers; diff --check passed.
- `bun test packages/plugin-session/tests packages/plugin-duplicate-selection/tests`: 70 passed, 243 assertions.
- Replayed the original public Host stdin probe: exit 0; coercions=1, indices=[0,1], SELECTION_ENTITY_NOT_FOUND, unchanged=true.

Not checked: other affected consumers, TypeScript checks, builds, browsers, full engineering gate, published-head CI, publication and remote evidence readback. Historical checks and reports were not accepted as current results.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: **passed**

对新 main/source 同步后的完整两文件补丁（含 323 行公共回归）独立审查，重读 Issue #76 全部验收、最新空分页反馈/依赖、独立 prepared plan、ADR0017/0018/0022，并核对 Session → Kernel/Renderer/Interaction 及新 Duplicate 调用。未发现验收遗漏、错误实现或范围扩张。

满足“Capture Selection collections once into owned indexed arrays”与原生长度要求：捕获的 length 只经一次 ToNumber，再以自有数值执行原生 ToLength/惰性索引读取；变化的 coercible length 不能隐藏未知 Node/Edge，Infinity 第一项原始异常不被预分配掩盖。验证、membership、规范化及发布复用同一 owned 值。Viewport 单次字段捕获、负零、finite/positive/no-clamp 规则保持；issue 顺序、原始异常、错误码/消息、空选择、等价 Snapshot、FIFO、reconciliation、订阅隔离和 disposal 保留。Duplicate 在一个 Commit 后传入冻结 ID 集合，与该捕获和 membership 边界兼容；无新 API、cap、依赖或 fallback。

本轮实际运行 `bun test packages/plugin-session/tests`：36 pass、0 fail、126 assertions。另以 `bun --eval` 在当前工作树实际运行 8 个真实 Host/Kernel/Session 长度场景（BigInt、Symbol、转换抛错、分数、boxed number、负值、NaN、undefined），全部通过。`git diff --check` 通过；实际 commit 列表、head/tree、完整及保存的 binary patch/inspection、干净工作树均核对。旧 run 结果未计入本轮。

未执行 build、browser、affected/full engineering gate 或消费者整套；未验证当前新 head 的远端 CI、报告/媒体发布回读及最终 main 集成。定向通过不代表完整交付验收。

- base: `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`
- head: `f3c41d9f95cefb7f21424ba0b62ad729663fae5d`
- tree: `ee6c00bd97da199489fdf439422bd51d699313a5`
- raw binary patch SHA256: `f631def090171fc90bdbb50bd525138000ac9da572ba9afaba61825de6a85068`


## Behavior evidence

### historical-main99-public-red

red — passed; exit 1; expected exit 1.

Original main99 compiled public Session probe published invalid Viewport coordinates/zoom and substituted Selection IDs; original rejection assertion exit1. Historical original defect provenance, not current-source acceptance.

Command: `bun session-input-repro.ts (original main99 discovery)`

[Original command output](logs/behavior-1.log)

### historical-53a-independent-length-red

red — passed; exit 1; expected exit 1.

Actual independent Standards probe at53a/tree8dc found a second unknown ID omitted when a retained length object was coerced twice. Native control visited both indices once; Session incorrectly changed Snapshot. Original report and raw output keep53a identity.

Command: `bun run - < standards-coercible-length-probe.ts (historical53a root)`

[Original command output](logs/behavior-2.log)

### tdd-node-edge-length-red

red — passed; exit 1; expected exit 1.

Before changing the helper, two new public Node/Edge length-coercion regressions failed because Session did not reject the unknown ID. Only the regression test was uncommitted on53a; original red patch and log retained.

Command: `bun test packages/plugin-session/tests/input-values.test.ts --test-name-pattern captured coercible (before fix)`

[Original command output](logs/behavior-3.log)

### tdd-node-edge-length-green

green — passed; exit 0; expected exit 0.

The same two public regressions passed10 assertions after capturing native numeric length once. This is the actual TDD working-tree green before final source/main integration, not the final-head verification.

Command: `bun test packages/plugin-session/tests/input-values.test.ts --test-name-pattern captured coercible (after fix)`

[Original command output](logs/behavior-4.log)

### current-public-consumers

green — passed; exit 0; expected exit 0.

Fresh main1c85/currentf3c dependency build and Session/Kernel/Renderer/Interaction public suites passed153 tests650 assertions. Local native-length repair remains intact alongside the external source sync and newly integrated Duplicate fix.

Command: `bun test packages/plugin-session/tests packages/kernel/tests packages/plugin-renderer/tests packages/plugin-interaction/tests`

[Original command output](logs/behavior-5.log)

### current-native-length-host-probe

green — passed; exit 0; expected exit 0.

Actual current-source Host probe: one length getter, one coercion, indices0/1 retained, SELECTION_ENTITY_NOT_FOUND and original Session Snapshot preserved; independent native control agrees.

Command: `bun run - < standards-coercible-length-probe.ts (currentf3c root)`

[Original command output](logs/behavior-6.log)

### current-affected-consumers

check — passed; exit 0; expected exit 0.

Current complete patch selected types/build/declarations, affected public consumers, real React/SVG/Examples browsers and documentation; actual exit0. Prior f0e/8a checks remain historical.

Command: `bun run check:affected --base 1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`

[Original command output](logs/behavior-7.log)

### current-compiled-session-public-probe

green — passed; exit 0; expected exit 0.

Actual freshly built public package barrels retain finite accepted Viewport10/20/2, one field read each, the accepted Selection collection and atomic rejection of iterator-hidden unknown IDs. Compiled probe checks actual pinned Git headf3c.

Command: `bun compiled-session-public-probe.ts`

[Original command output](logs/behavior-8.log)

### current-compiled-native-length-probe

green — passed; exit 0; expected exit 0.

Fresh compiled public Session package retains both indexed IDs, one native length coercion, SELECTION_ENTITY_NOT_FOUND and the original Snapshot, matching independent native control.

Command: `bun run - < compiled-length-public-probe.ts (current root)`

[Original command output](logs/behavior-9.log)

### independent-current-native-boundary-cases

green — passed; exit 0; expected exit 0.

Independent Spec reviewer persisted and reran eight real public Host length cases at exactf3c/head/tree: BigInt, Symbol, conversion error, fractional, boxed number, negative, NaN and undefined; actual exit0. This log contains commands and source identity.

Command: `bun run - < spec-native-length-probe.ts (independent current-source run)`

[Original command output](logs/behavior-10.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
