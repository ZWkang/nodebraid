# Verification report

Run: eeeb218c-ccdf-4b8e-951a-250aca1b6ccb · ZWkang/nodebraid · issue #114

## Reviewed and published source

- Review base: `3ebb9bf51df19825ce98b3371075885dfa496fdf`
- Independently prepared append parent: `3ebb9bf51df19825ce98b3371075885dfa496fdf`
- Published head: `e0df47ce818ef1dce8dad3b5b8f5c930efc3fe45`
- Reviewed local head: `0399f1d4cdafa6590d188056b4da19de29af60ab`
- Tree: `02ef1145bade98ea58045242438cb2dce93c2d4f`
- Complete binary patch SHA-256: `3b832f733f227c091bf0a65732ac5be270d953b3a4c4914ad043c3a4df8952fc`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

## Confirmed defect

On fetched clean main `3ebb9bf51df19825ce98b3371075885dfa496fdf`, Delete Selection admits one Selection but can delete a different target. An independently typechecked actual compiled public Host/Kernel/Command/Session/Interaction program seeds real Nodes a/b and obtains real frozen Session Selection Snapshots for each. All modes share one real frozen current Kernel Snapshot. The prior #112 evidence repair is deployed: its getter reads exactly once in all modes.

- Stable Selection a deletes a and retains b; stable Selection b deletes b. Both commit at revision2, so the observation detects which target actually changed.
- A legal `input.selection` getter returns the real frozen a Selection first and the b Selection later. The root is read3 times; deletion wrongly removes b, retains a, and prunes the live b Selection.
- A fixed Selection shell with a `nodeIds` getter returning frozen [a] first and [b] later is read twice and also deletes b.
- A frozen ordinary NodeId array whose indexed value remains a but whose custom iterator yields b passes shape validation and deletes b (caller iterator executes once).

The assertion requiring the first admitted target a to be deleted exits1. The probe uses public compiled exports with shared Runtime/Service-token identity and actual Kernel/Session state; no internal handler or mocked Kernel. Its explicit application-owned in-memory Renderer does not claim native/browser coverage. Original current-main source/output is retained in run `20261025T213022-discovery-delete-selection-selection`: `delete-selection-repro.ts`, `selection-observations.json`, `selection-red.log`, `repro-typecheck.log`, and resolved public entry hashes. No old-head test result is rebound.

## Contract and cause

[ADR0072](https://github.com/ZWkang/nodebraid/blob/3ebb9bf51df19825ce98b3371075885dfa496fdf/docs/adr/0072-guard-selection-deletion-with-target-evidence.md) defines one Selection's explicit Node/Edge targets and complete incident closure as one atomic undoable deletion. [The public DeleteSelectionInput](https://github.com/ZWkang/nodebraid/blob/3ebb9bf51df19825ce98b3371075885dfa496fdf/packages/plugin-interaction/src/contracts.ts) carries a readonly SelectionSnapshot and exact evidence Snapshot. [The current handler](https://github.com/ZWkang/nodebraid/blob/3ebb9bf51df19825ce98b3371075885dfa496fdf/packages/plugin-interaction/src/delete-selection-command.ts) validates `value.selection` and its indexed arrays, then rereads input.selection/nodeIds/edgeIds and invokes caller iteration during canonicalization. Consequently the targets written differ from the values admitted by its shape checks.

The accepted [Session capture repair #76](https://github.com/ZWkang/nodebraid/issues/76) establishes owned indexed Selection values at the Session mutator boundary; direct Commands are a distinct owner. [ADR0014](https://github.com/ZWkang/nodebraid/blob/3ebb9bf51df19825ce98b3371075885dfa496fdf/docs/adr/0014-keep-command-dependencies-in-feature-plugins.md) keeps this repair in the shared feature handler, and [ADR0029](https://github.com/ZWkang/nodebraid/blob/3ebb9bf51df19825ce98b3371075885dfa496fdf/docs/adr/0029-preserve-domain-and-external-error-identity.md) preserves original external failures. The current Move Nodes handler and Session code already use native lazy array indices without caller traversal hooks.

## Acceptance

- At the existing Delete Selection handler boundary capture input.selection once, then its nodeIds/edgeIds roots, native array-like length and each owned indexed ID once. Validate these owned values and use them for all canonicalization, target/incident-closure lookup and Transaction preflight/writes. Caller iterator/every/map/method/constructor/species hooks must not select different admitted/applied IDs. Preserve normal getters, inherited/non-enumerable properties and original receivers.
- The three changing-root/collection/iterator modes above must delete first-admitted a, retain b and the live b Selection. Stable a/b controls remain valid. Cover both Node and explicit Edge selection paths and mixed/duplicate/overlapping targets; retain canonical sorting and deduplication rather than imposing new order/uniqueness restrictions.
- Preserve abort-before-input reads, input/Selection shape then nodeIds-before-edgeIds-before-evidence admission short circuits, original owned-root/length/index read exceptions and falsey thrown-value identity. Missing/sparse/invalid indexed IDs reject `INVALID_DELETE` before evidence is consumed. Preserve native length normalization/coercion and lazy first-invalid-entry failure without eager bulk allocation, new caps, accessor bans or fallback. Empty Selection still validates evidence before returning null.
- Preserve #112's once-only first evidence Snapshot capture and all original Node/Edge root identities; do not clone evidence entities or traverse/freeze opaque data. Retain exact-source ABA/stale/incident guards, unrelated-Commit acceptance, Kernel graph errors, atomicity, metadata/no-op identity, Session pruning and History Undo/Redo/data references.
- Scope is Delete Selection's Selection value capture in the shared handler, using the existing native-index pattern. Do not change generic validators, Kernel, Session mutator semantics, other Commands, public API/dependencies, Snapshot identity policy or Gesture/Shortcut/Runtime policy. Evidence Snapshot collection internals and other pending interfaces remain queued.
- Use the established public Command/Kernel/Session/History seam with test-first red/green, original typed five-control compiled program, relevant and affected checks, independent Standards+ponytail-review and Spec on exact full head/tree/binary patch, versioned formal full check, actual remote tree/ordered parent/current-head CI and complete original report/all mapped media immutable readback. Keep the Issue open until actual main integration and whole-Issue acceptance.

## Deduplication

Read all113 all-state Issue/PR records through100+13 pages and58 PRs through the final short page. Read full #76/#112 and complete discussions. #112/#113 explicitly repair only the evidence root and leave Selection/array capture out of scope; main confirms that repair remains active (evidence reads1 in every new mode). #76 captures Session mutator values, #104 owns Move Nodes and #27 Fragment arrays; none captures this direct Delete Command Selection. PR #111 only changes review/merge policy and is not deployed. No existing Selection-target capture delivery was found.


### public-red

Independently retain the real current-main five-mode compiled reproduction and original request; public Command target-regression fails before any implementation edit.

Dependencies: none

### capture-selection-values

The shared Delete handler captures Selection roots/native indexed IDs once; original target substitution turns green with guard/error/native length/canonical/stale/History/evidence-root controls.

Dependencies: public-red

### integration-and-independent-review

Current public related suites, original typed compiled controls and affected checks pass; independent Standards+ponytail and Spec review exact complete head/tree/binary patch against the Issue.

Dependencies: capture-selection-values

### formal-engineering-check

Pinned main agents:run verify performs this delivery attempt's sole formal full bun run check after both reviews pass; retain every original result.

Dependencies: integration-and-independent-review

### publish-current-head

Verify actual remote source tree and ordered parent; current-head CI, complete paginated feedback and full original report/all mapped media immutable byte readback pass.

Dependencies: formal-engineering-check

### authorized-merge

Normal expected-head protected merge only after then-current deployed main policy and all source/base/review/CI/feedback/evidence/pre-merge prerequisites permit it.

Dependencies: publish-current-head

### main-integration-acceptance

Actual fetched main contains the delivery; fresh public tests, original typed compiled program and complete main CI satisfy whole-Issue acceptance before publishing outcomes and authorized closure.

Dependencies: authorized-merge

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: Delete Selection captures its Selection root and both ID collections once, then validates and applies the same owned indexed values. Caller getters or traversal hooks can no longer redirect deletion to another target.

Source identity:
- Base: 3ebb9bf51df19825ce98b3371075885dfa496fdf
- Head: 0399f1d4cdafa6590d188056b4da19de29af60ab
- Tree: 02ef1145bade98ea58045242438cb2dce93c2d4f
- Binary patch SHA256: 3b832f733f227c091bf0a65732ac5be270d953b3a4c4914ad043c3a4df8952fc

Scope: complete base...head diff, both files and all 436 added regression/helper lines. Sole commit 0399f1d, parent, canonical saved bytes and independent prepared/inspection identities agree. Read Issue #114's complete body and empty discussion, plan and original behavioral red/green plus expanded test evidence.

Hard standards: No violations found. Boundary Discipline and ADR0014 place capture in the shared feature handler. Admission remains Selection → Node IDs → Edge IDs → evidence. Native length conversion occurs once and lazy indices expose original read/coercion failures without caller traversal or bulk allocation. Existing NodeId/EdgeId constructors preserve semantic types. Abort, getters/receivers and thrown-value identity retain ADR0029's contract.

The first evidence Snapshot remains the exact original reference under ADR0072. Entity identities, incident closure, unrelated-Commit acceptance, canonical sorting/deduplication and preflight-before-removal are unchanged. Opaque data is neither traversed nor frozen under ADR0012.

Judgment-only smells: No concrete finding across the full Fowler baseline. The one private ID helper serves both actual namespaces. Similar native-index loops in other packages have different validation/error ownership; a cross-package parser is not justified.

Ponytail assessment: Correct and lean for isolated Canvas Hosts. I traced keyboard capture, Command execution, Kernel identity/graph checks, Session pruning and History replay/Baseline with Document integration under ADR0084/0085. Tests prove first-target deletion, retained live Selection, both Node/Edge paths, sparse and native lengths, strict error identity and opaque-data Undo/Redo.

Independent command at this head:
`bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts`

Result: exit 0; 251 tests, 1730 assertions. Confirmed current compiled capture helpers and no subsequent input-root rereads. Final identity, whitespace and clean-status audits passed.

Not checked independently: TypeScript, builds, native browsers, complete affected/full engineering gates, remote CI, publication or main acceptance. Evidence Snapshot collection internals remain outside this repair.

Verdict: passed. Looks good. Ship.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

# Spec review — Issue #114

Verdict: **passed**. 未发现本 Issue 的验收缺漏、错误实现或范围扩张。

- Base: `3ebb9bf51df19825ce98b3371075885dfa496fdf`
- Head: `0399f1d4cdafa6590d188056b4da19de29af60ab`
- Tree: `02ef1145bade98ea58045242438cb2dce93c2d4f`
- Complete binary patch SHA256: `3b832f733f227c091bf0a65732ac5be270d953b3a4c4914ad043c3a4df8952fc`

已独立读取 Issue114 全文/全部零评论、prepared request/plan、完整两文件补丁、436行新增回归及原始 red/green。依据当前 AGENTS/CONTEXT/code-review、ADR0072/0014/0029/0012/0084/0085，追踪 Keyboard Delete→共享 Command→Kernel closure/Session pruning/History 及 Document Baseline。

Issue 要求 “capture input.selection once” 并使用同一自有值完成全部验证与删除。helper 一次读取 Selection、nodeIds/edgeIds roots，各数组先一次原生数值转换长度，再惰性 Get 真实索引并验证非空字符串。后续 canonicalIds 只接收私有数组，应用 iterator/every/map/constructor/species 不再选择 Selection IDs；仍排序去重，不增加输入顺序或唯一性限制。根/集合/index 改值及 evidence 回调修改旧数组，都不能把首目标 a 换成 b，保留未删 b 和 live b Selection。

Issue 要求 “nodeIds-before-edgeIds-before-evidence” 和原始异常/原生长度语义。源码保留该短路顺序、getter receiver、继承/non-enumerable、falsey thrown-value；稀疏/非法索引在 evidence 前拒绝，fraction/empty/BigInt/Symbol/Infinity 首条失败仍按 native lazy 模式处理，无 bulk allocation、cap、fallback 或 accessor ban。空 Selection 继续先验证 evidence，再返回 null。

#112 的首 evidence 仍只读取一次并保留原 Snapshot/实体引用；没有克隆 evidence 或遍历/冻结 data。Node/Edge identity、ABA、incident closure、无关 Commit、图失败原子性、metadata、Session 与 History Undo/Redo 路径不变。范围仅本地 Selection 捕获，Snapshot 内部集合及其他 pending 接口未修改；没有新增公开 API/依赖或改变共享 validator/Kernel/Session/Gesture 策略。

独立核验 HEAD/clean、parent、canonical patch/hash 与保存记录一致；当前 dist/delete-selection-command.js 含两个新 helper，SHA 已记录。独立执行 `bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts`：**251 pass /1730 assertions，exit0**；`git diff --check BASE...HEAD` exit0。原始输出见 `spec-commands.log`，已回读。

未独立执行构建、类型检查、typed five-mode compiled probe、affected、浏览器或正式 full check；远端发布/current-head CI、完整报告/media readback、合并及 main 全 Issue 验收未由本审查验证。公共 Renderer seam 不证明原生浏览器输入。


## Behavior evidence

### current-main-original-five-mode-red

red — passed; exit 1; expected exit 1.

Independent pre-fix main3ebb typed five-mode compiled controls: stablea/b work; changing Selection/nodeIds/iterator all admit a but delete b. Final assertion intentionally fails. Not claimed at repaired head.

Command: `bun run /Users/zhou/.codex/local-workflows/nodebraid/runs/20261025T213022-discovery-delete-selection-selection/build-and-run.ts`

[Original command output](logs/behavior-1.log)

### public-target-red

red — passed; exit 1; expected exit 1.

Before handler edit, old23 tests pass and first wrong-target public tracer fails because Node a remains after successful deletion of b.

Command: `bun test packages/plugin-interaction/tests/delete-selection-command.test.ts`

[Original command output](logs/behavior-2.log)

### public-tracer-green

green — passed; exit 0; expected exit 0.

Minimal whole-Selection capture repair turns tracer green:24tests141assertions before expanded controls.

Command: `bun test packages/plugin-interaction/tests/delete-selection-command.test.ts`

[Original command output](logs/behavior-3.log)

### expanded-public-green

green — passed; exit 0; expected exit 0.

All67Delete public tests852assertions pass (44new716assertions). Node/Edge roots, indexed/collection hooks, length/coercion/read-order, opaque-data replay and previous evidence-root controls. Recorded before subsequent test-description-only kind label formatting; production/assertion semantics unchanged, exact committed-head suite recorded separately below.

Command: `bun test packages/plugin-interaction/tests/delete-selection-command.test.ts`

[Original command output](logs/behavior-4.log)

### current-compiled-five-mode-green

green — passed; exit 0; expected exit 0.

Original separately typechecked five-mode program at exact0399 repaired public build preserves stablea/b controls; all three adversarial modes delete admitted a and retain b/live b Selection, root/field/evidence reads once, caller iterator0.

Command: `bun run /Users/zhou/.codex/local-workflows/nodebraid/runs/eeeb218c-ccdf-4b8e-951a-250aca1b6ccb/compiled-current/build-and-run.ts`

[Original command output](logs/behavior-5.log)

### current-public-integration

check — passed; exit 0; expected exit 0.

Exact committed-source public Interaction/History/Document/Core251tests1730assertions pass; includes corrected descriptive test-role labels.

Command: `bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts`

[Original command output](logs/behavior-6.log)

### current-complete-affected

check — passed; exit 0; expected exit 0.

Exact-source affected builds/types/consumers/SVG/Examples native browsers including Document files and docs pass.

Command: `bun run check:affected --base 3ebb9bf51df19825ce98b3371075885dfa496fdf`

[Original command output](logs/behavior-7.log)

### independent-standards-commands

check — passed; exit 0; expected exit 0.

Independent Standards+ponytail exact-source public251tests1730assertions and identity audits; no reviewer browser claim.

Command: `bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts`

[Original command output](logs/behavior-8.log)

### independent-spec-commands

check — passed; exit 0; expected exit 0.

Independent Spec exact-source public251tests1730assertions and identity audits; no reviewer browser claim.

Command: `bun test packages/plugin-interaction/tests packages/plugin-history/tests packages/document/tests packages/core/tests/document-roundtrip.test.ts`

[Original command output](logs/behavior-9.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.

## Original executable public control source

[Before/after programs, drivers, type configurations and resolved public entry hashes](probes/compiled-controls.md).
