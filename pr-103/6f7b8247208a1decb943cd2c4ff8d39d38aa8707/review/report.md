# Verification report

Run: d1ab6451-478a-4351-8c15-ae7bc43236c0 · ZWkang/nodebraid · issue #102

## Reviewed and published source

- Review base: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Independently prepared append parent: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Published head: `6f7b8247208a1decb943cd2c4ff8d39d38aa8707`
- Reviewed local head: `234a304c34c84b65a24786b48650a294666d892d`
- Tree: `607dd464004b2f845876d7a0f06792cd3a84fb9a`
- Complete binary patch SHA-256: `7c9f62f023b8e1b714c8b5316323cd175e060fae488071b87de4b08cc104f6c2`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

## Confirmed defect

On fetched main `dcf13482b68bc2422fc4d714df1226ab0ef259aa`, direct Kernel Node Writers reread caller-owned `position`, `size` and `parentId` while copying the Node. A later read can replace the first invalid owned value before final graph validation.

A typechecked probe executes **18 actual compiled public `createCanvasKernel().transact()` cases**: three fields × add/replace × stable valid/stable invalid/changing invalid. Stable invalid values reject with `INVALID_GRAPH` and preserve the exact View. Changing inputs with the same first invalid value instead commit:

- `position`: first `{x:10,y:NaN}`, then `{x:20,y:30}`. Two reads produce the mixed committed position `{x:10,y:30}`.
- `size`: first `{width:40,height:-1}`, then `{width:50,height:60}`. Three reads discard the invalid first Size and commit the later valid one.
- `parentId`: first the valid branded ID of an absent parent, then `undefined`. Two reads drop the missing-parent relationship and commit.
- Both public `nodes.add()` and `nodes.replace()` are affected. All getters have values compatible with the public readonly field types; no malformed-ID cast, mocked collaborator or private API is required.

The assertion requiring invalid first values to reject exits 1. The exact reproduction typechecks before execution. Original source/output remain in local run `20261023T091255-discovery-kernel-value-errors`: `kernel-node-value-repro.ts`, `node-value-red.log`, `node-repro-typecheck.log`. The current compiled Kernel came from normal prepack/build and declaration checks at the same clean main; prior focused Query baseline passed9 tests/53 assertions.

## Contract and cause

[ADR0012](https://github.com/ZWkang/nodebraid/blob/dcf13482b68bc2422fc4d714df1226ab0ef259aa/docs/adr/0012-keep-domain-data-opaque-to-kernel.md) assigns copying/freezing of NodeBraid-owned entity shells to Kernel while retaining opaque data references. [ADR0010](https://github.com/ZWkang/nodebraid/blob/dcf13482b68bc2422fc4d714df1226ab0ef259aa/docs/adr/0010-bind-canvas-query-to-snapshot-revision.md) binds Snapshot, Query and Change Set to consistent committed evidence. [Graph validation](https://github.com/ZWkang/nodebraid/blob/dcf13482b68bc2422fc4d714df1226ab0ef259aa/packages/kernel/src/graph-validation.ts) rejects non-finite positions, invalid sizes and absent parents.

In `freezeCanvasNode()`, `node.position` is read separately for x/y; `node.size` is read for presence, width and height; `node.parentId` is read for presence and copying. The copied Node can therefore contain geometry or a relationship that was not the first supplied value. Direct Writers pass that copy into Draft Maps/indexes and final validation.

## Acceptance

- Capture each incoming Node-owned Position reference, optional Size reference and optional parent ID once per direct add/replace, and retain that value during copying and final validation. Preserve one read of each Point/Size scalar within its captured shell.
- Invalid first Position, Size and missing-parent values must not be replaced by later reads; both Writers must reject at the existing final graph validation boundary and preserve the committed View/revision.
- Valid first values must remain usable if later reads would change or throw. Retain optional absence, inherited/non-enumerable getters and frozen owned shells; preserve opaque data references and its existing read phase.
- Keep existing read/error precedence: Writer closed/duplicate/missing/mismatched-ID checks first; Node type before Position and its scalars, then Size and its scalars, parent, and opaque data. Preserve original external thrown-value identity and no partial Writer/Draft/index change when an external getter failure is caught within a larger Transaction.
- Preserve temporary/final graph semantics, explicit later repair in a Transaction, strict ID capture, Node/Edge namespaces, Edge copying behavior, immutable historical Query/Snapshot/Change Set, canonical ordering, net-zero coalescing, metadata and forward/reverse replay.
- Repair the shared Node copy owner only. No public API, eager geometry validation, new policy, accessor ban, dependency, cap, retry or fallback. Do not expand this into Edge Endpoint/Port policy or replay normalization redesign.
- Public red/green and valid/invalid/getter/error controls, relevant Kernel/History consumers and affected checks, independent Standards with ponytail-review and Spec, the versioned formal full check, exact tree/append-parent publication, current-head CI and complete immutable reports/media.
- Keep this Issue open until human merge, actual main integration and whole-Issue acceptance.

## Deduplication

Complete all-state collections contain **101 Issue/PR records and52 PRs**, through final short pages. Full #82, #89 and #92 bodies/discussions were read and archived. #82 / PR #83 capture direct Writer IDs; #89 / PR #91 capture incoming replay record/entity values; #92 / PR #93 capture replay revision headers. They do not retain these three root fields while a direct Node Writer copies its owned shell. Current open #96, #98 and #100 own unrelated Runtime, Layout and Basic Canvas boundaries.


### public-node-value-regression-and-fix

Public Kernel add/replace red-green retains first Position/Size/parent field values, preserves read/error phases and caught external-error Draft atomicity.

Dependencies: none

### affected-consumers

Complete current Kernel/public consumer suites, original compiled18-case reproduction, relevant types and affected checks pass with immutable Query/replay/opaque-data behavior.

Dependencies: public-node-value-regression-and-fix

### independent-review

Independent Standards with ponytail-review and Spec inspect the same exact committed head/tree/full binary patch against original Issue102 and ADR0010/0012/0029.

Dependencies: affected-consumers

### formal-engineering-check

Pinned deployed main agents:run verify executes the sole formal full bun run check after both independent reviews pass and retains original logs.

Dependencies: independent-review

### source-publication

Actual remote source tree and first parent match checked tree and independently captured append parent before local branch mapping.

Dependencies: formal-engineering-check

### current-head-ci-and-reports

Current-head real CI, all paginated feedback, full actual independent review Markdown and report/preview bytes pass immutable publication/readback before readiness.

Dependencies: source-publication

### human-merge

Human final review and normal protected merge into main.

Dependencies: current-head-ci-and-reports

### main-integration-acceptance

Fetched actual main contains delivery merge and passes fresh whole-Issue public acceptance before closure.

Dependencies: human-merge

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: Kernel Node copying retains the first Position, optional Size and parent values supplied to add/replace. Geometry scalars are copied once from their captured shells before final graph validation.

Reviewed identity:

- Base: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Head: `234a304c34c84b65a24786b48650a294666d892d`
- Tree: `607dd464004b2f845876d7a0f06792cd3a84fb9a`
- Binary patch SHA256: `7c9f62f023b8e1b714c8b5316323cd175e060fae488071b87de4b08cc104f6c2`

Scope: complete three-dot base-to-head diff, `packages/kernel/src/entity-values.ts` and all 230 lines of `node-owned-values.test.ts`. Read the canonical Issue #102 with its complete empty discussion, independent plan and fixture-correction record. Applied current project rules, local workflow, review skills and applicable principles.

Hard standards: no violations found. Strict Writer ID/availability checks still precede copying. Read order remains type → Position/scalars → Size/scalars → parent → opaque data. The copy completes before Draft Maps or indexes change. Getter failures preserve exact thrown values, including falsy values; inherited receivers and absent optional properties remain supported.

The repair stays in the shared copy owner under Boundary Discipline and ADR0012. It freezes owned shells without copying or freezing domain data. It adds no eager geometry validation: invalid provisional values still reach final graph validation and can be explicitly repaired inside the Transaction. Historical Query/Snapshot/Change Set evidence remains consistent under ADR0010/0011, and original external failures retain identity under ADR0029.

Traced direct Writers, replay capture/materialization, graph/index validation, equality/net-zero coalescing, commit publication and History consumers. Edge copying and Port/data policy are unchanged.

Judgment checks: no concrete Fowler smell found. For one synchronous Kernel per Canvas, local captured values are sufficient. No abstraction, interface, dependency, cap, retry or fallback was added.

Actual independent check: `bun test packages/kernel/tests packages/plugin-history/tests tests/layout-providers.test.ts` passed 245 tests / 1339 assertions at this head. This includes Node ownership/error phases, caught-write atomicity, strict IDs, replay, immutable evidence, net-zero and real Dagre/ELK History integration. Raw output is saved in `standards-tests.log`.

Also verified exact revisions, full saved patch bytes/hash, task/inspection binding, clean worktree and `git diff --check`. Implementer checks were not counted as independent execution.

Not checked independently: typecheck/builds, browsers, full engineering gate, live GitHub refresh, current-head CI, publication or merge.

Verdict: passed. Looks good. Ship.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

# Spec review — Issue #102

Verdict: **passed**. 未发现要求遗漏、错误实现或未请求的范围扩张。

- Base: `dcf13482b68bc2422fc4d714df1226ab0ef259aa`
- Head: `234a304c34c84b65a24786b48650a294666d892d`
- Tree: `607dd464004b2f845876d7a0f06792cd3a84fb9a`
- Complete binary patch SHA256: `7c9f62f023b8e1b714c8b5316323cd175e060fae488071b87de4b08cc104f6c2`

已独立读取完整 Issue102、全部零评论、prepared/input 计划与 fixture 类型修正记录；request 与原始 Issue 正文一致。核验完整两文件补丁、唯一提交和 inspection/complete.patch；依据 AGENTS/CONTEXT、tracker/discussion、code-review、ADR0010/0011/0012/0029，追踪共享 Writer、Draft/关系索引、最终图校验、Change Set 回放及历史 evidence。

Issue 要求 “Capture each incoming Node-owned Position reference, optional Size reference and optional parent ID once”。freezeCanvasNode 现在按 type → Position/x/y → Size/width/height → parent → data 顺序读取，三个根字段及各 scalar 均只读取一次；undefined Size/parent 仍省略属性。先前无效值不会被后续读取替换；未新增 eager validation，错误仍在原最终图校验边界产生，允许同一 Transaction 显式后续修复。

Issue 要求保留 “original external thrown-value identity and no partial Writer/Draft/index change”。共享 Writer 的 closed/duplicate/missing/ID-mismatch guards 仍先于复制；freeze 完成后才更新 Map、关系索引和 touched IDs。新增公共回归检查每个读阶段、非 Error thrown values、caught failure 后继续写入、继承/non-enumerable getter、原 receiver、冻结壳和 opaque data 引用。data 仍末尾读取，不深复制/冻结；Edge copy、严格 ID capture、回放 capture/preflight、canonical order、net-zero 与 metadata 未改变，无 API、策略、cap 或 fallback 新增。

独立执行当前 head 的 `bun test packages/kernel/tests`：**217 pass / 1152 assertions，exit 0**；`git diff --check BASE...HEAD` exit 0。实际 HEAD/tree、完整 binary patch/hash 与保存记录一致；原始输出见同目录 `spec-commands.log`。fixture 的 this:CanvasNode 注解不削弱运行时断言。

未独立执行构建、类型检查、18-case compiled probe、affected、浏览器或完整工程检查；协调器日志未计为本审查实跑。远端发布/当前 head CI、完整报告/media、人工合并及 main 全 Issue 验收仍未由本审查验证。


## Behavior evidence

### public-first-owned-value-red

red — passed; exit 1; expected exit 1.

Six initial type-valid public add/replace regressions against original main reject first invalid Position/Size/parent values. Actual original implementation failed all6, while stable invalid and valid controls in the18-case compiled discovery probe establish the observation. Original failed output retained.

Command: `bun test packages/kernel/tests/node-owned-values.test.ts`

[Original command output](logs/behavior-1.log)

### current-complete-kernel

green — passed; exit 0; expected exit 0.

Current source passes217 public Kernel tests/1152 assertions, including56 new cases for the3 root fields, add/replace, property forms, first valid/invalid values, Node receiver, exact external thrown values/order, caught-error Draft atomicity and explicit final graph repair. Includes existing strict IDs, Query, replay, metadata, net-zero and opaque-data controls.

Command: `bun test packages/kernel/tests`

[Original command output](logs/behavior-2.log)

### current-original-compiled18-repro

green — passed; exit 0; expected exit 0.

Original18 real compiled-package comparisons rerun with only the current public entry path changed. Each owned root field is read once; every first-invalid case rejects and preserves View/revision; stable valid controls commit.

Command: `bun compiled-node-value-repro.ts`

[Original command output](logs/behavior-3.log)

### current-affected-consumers

check — passed; exit 0; expected exit 0.

Actual corrected fixture/current source affected checks pass connected packages, types, real React/SVG/Examples browser suites and documentation. This is not a substitute for the later formal full verify.

Command: `bun run check:affected --base origin/main`

[Original command output](logs/behavior-4.log)

### historical-fixture-receiver-type-failure

check — failed; exit 1; expected exit 0.

Initial extra test descriptor getter inferred the descriptor object for this, so expect(this).toBe(input) failed TypeScript. First annotation hit another getter; both type logs and this affected failure are retained. Final actual descriptor declares this:CanvasNode, keeping all runtime assertions/inputs unchanged. Current types and affected check pass; this is not a current delivery failure.

Command: `bun run check:affected --base origin/main`

[Original command output](logs/behavior-5.log)

### independent-standards-execution

check — passed; exit 0; expected exit 0.

Original Standards reviewer output at exact reviewed local head:245 tests/1339 assertions, covering Kernel, History and Layout integration; implementer execution is separate.

Command: `bun test packages/kernel/tests packages/plugin-history/tests tests/layout-providers.test.ts`

[Original command output](logs/behavior-6.log)

### independent-spec-execution

check — passed; exit 0; expected exit 0.

Original Spec reviewer output at exact reviewed local head:217 Kernel tests/1152 assertions, with exact source and patch identity checks.

Command: `bun test packages/kernel/tests`

[Original command output](logs/behavior-7.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
