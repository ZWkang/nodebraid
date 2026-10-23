# Verification report

Run: a629a264-4183-4051-b048-4f9e1eb50b8e · ZWkang/nodebraid · issue #102

## Reviewed and published source

- Review base: `e21c917b170b37ff60418d76a0bbcc65b8799d17`
- Independently prepared append parent: `6f7b8247208a1decb943cd2c4ff8d39d38aa8707`
- Published head: `cb463d9941d41f8cc4f973bcbf0acb00da73da10`
- Reviewed local head: `723b81124050862940abcb8feb729e0c8baa7737`
- Tree: `67f3b505dae06ba0effc38ba653ea8c757d6f2a0`
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


### synchronize-main

Capture current fetched main and published source head independently before append-only synchronization of the existing delivery branch. Preserve original Issue scope.

Dependencies: none

### integration-compatibility

Fresh public affected consumers and integration checks pass. Save complete current head/tree/binary patch; historical evidence retains its original source.

Dependencies: synchronize-main

### independent-review

Fresh independent Standards with ponytail-review and Spec inspect the complete current patch against original Issue, ADRs and current main.

Dependencies: integration-compatibility

### formal-engineering-check

Pinned main versioned agents:run verify executes the real full bun run check after both review axes pass; preserve every attempt.

Dependencies: independent-review

### publish-current-head

Actual remote tree and original append parent match verification; current-head CI, complete feedback, immutable full report/media publication and readback pass.

Dependencies: formal-engineering-check

### authorized-merge

Recheck current source/base, strict checks and all feedback immediately before a normal expected-head merge. Preserve review disputes and protection.

Dependencies: publish-current-head

### main-integration-acceptance

Verify actual fetched main ancestry and the whole original Issue through fresh public acceptance; publish outcomes and close only after complete acceptance.

Dependencies: authorized-merge

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: Kernel Node Writers retain the first Position, Size and parent value supplied by a caller. They copy owned geometry once, so later getters cannot replace the values that final graph validation sees.

Source identity:
- Base: e21c917b170b37ff60418d76a0bbcc65b8799d17
- Head: 723b81124050862940abcb8feb729e0c8baa7737
- Tree: 67f3b505dae06ba0effc38ba653ea8c757d6f2a0
- Binary patch SHA256: 7c9f62f023b8e1b714c8b5316323cd175e060fae488071b87de4b08cc104f6c2

Scope: the complete base...head diff, both files and all 230 new test lines. Commits 6f7b824 and 723b811 were inspected. The saved canonical patch matches Git byte for byte. Merge parents, independent base, expected append parent and prepared/inspection digest agree. I read the saved Issue #102 request and its complete empty discussion.

Hard standards: No violations found. ADR0012's owned-shell copying and opaque-data reference contract are preserved. Closed/duplicate/missing/mismatched-ID guards still precede copying. Type, Position/scalars, Size/scalars, parent and data retain their read order and original thrown values under ADR0029. Copying finishes before Draft Maps, indexes or touched IDs change. Invalid geometry remains provisional until final validation, preserving explicit in-Transaction repair.

Judgment-only smells: No concrete finding across the full Fowler baseline. The change stays in the shared copy owner. Reusing the replay parser would change validation and error timing, so a new common abstraction is not justified.

Ponytail assessment: Correct, safe and lean for one isolated Kernel per Canvas. I traced add/replace, indexes, final validation, net-zero coalescing, revision-bound Views, replay preflight/materialization and History under ADR0010/0011. Current Runtime, Layout and Preset integration was inspected. Tests cover original exceptions, caught-write atomicity, inherited getters, immutable owned shells, opaque data and deliberate later repair.

Independent command at this head:
`bun test packages/kernel/tests packages/plugin-kernel/tests packages/plugin-history/tests`

Result: exit 0; 249 tests, 1276 assertions. Final identity, whitespace and clean-status audits passed.

Not checked independently: TypeScript, builds, browser interaction, full consumer suites/full engineering check, remote CI, publication or main integration.

Verdict: passed. Looks good. Ship.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

# Spec review — Issue #102 / PR #103 synchronization

Verdict: **passed**. 未发现验收缺漏、错误实现或未请求的范围扩张。

- Base: `e21c917b170b37ff60418d76a0bbcc65b8799d17`
- Head: `723b81124050862940abcb8feb729e0c8baa7737`
- Tree: `67f3b505dae06ba0effc38ba653ea8c757d6f2a0`
- Complete binary patch SHA256: `7c9f62f023b8e1b714c8b5316323cd175e060fae488071b87de4b08cc104f6c2`

已独立重读完整 Issue102、全部零评论、prepared request/同步计划及空反馈/依赖记录；request 与正文一致。完整核验两文件 diff、230行新增公共回归及 fix/merge 提交。实际 merge 第一父为 `6f7b8247208a1decb943cd2c4ff8d39d38aa8707`，第二父为上述 main base。依据当前 AGENTS/CONTEXT、tracker/discussion、code-review、ADR0010/0011/0012/0029，追踪 Writer、Draft/索引、最终图验证、KernelPlugin 与 History。

Issue 要求 “Capture … Position reference, optional Size reference and optional parent ID once” 并在 “existing final graph validation boundary” 拒绝无效首值。新 helper 按 type → Position/x/y → Size/width/height → parent → data 顺序一次读取，复制并冻结已捕获几何壳，undefined 可选字段继续省略。首次非法值不会被后来读取替换，仍可在 Transaction 中显式修复，不引入 eager graph validation。

Issue 要求保留原始失败和 “no partial Writer/Draft/index change”。closed/duplicate/missing/ID-mismatch guards 仍先执行，freeze 成功后才更新 Map、关系索引和 touched IDs。回归验证原 receiver、继承/non-enumerable getter、每个失败阶段及非 Error 值、caught failure 后继续写入和 exact View；opaque data 仍最后读取、保持原引用且不深冻结。Edge copying、ID capture、replay preflight、canonical/net-zero/metadata 与历史 evidence 路径保持。

新 main 的 Runtime descriptor、Layout Engine 和 Preset policy 修复未改变 Kernel 接口或图验证责任；本 PR 相对新 base 仍仅修共享 Node copy owner，没有新增 API、策略、依赖、cap 或 fallback。

依赖稳定后独立执行当前 head：`bun test packages/kernel/tests packages/plugin-kernel/tests packages/plugin-history/tests` **249 pass /1276 assertions，exit0**；`git diff --check BASE...HEAD` exit0。HEAD/tree、canonical patch/hash 与 inspection/complete.patch 一致。原始输出见同目录 `spec-commands.log`，已回读。

未独立运行构建、类型检查、compiled18-case probe、affected、浏览器或完整工程检查；当前 head 远端发布/CI、报告/media readback、合并和 main 全 Issue 验收未由本审查验证。历史 head 的结果未换绑。


## Behavior evidence

### current-kernel-related

check — passed; exit 0; expected exit 0.

Current merged source Kernel/KernelPlugin/History public suites249tests1276assertions pass.

Command: `bun test packages/kernel/tests packages/plugin-kernel/tests packages/plugin-history/tests`

[Original command output](logs/behavior-1.log)

### current-original-compiled-controls

check — passed; exit 0; expected exit 0.

Original18 typechecked compiled public Node add/replace geometry/size/parent controls execute on current built source; first invalid values reject with exact View preserved, stable valid values commit.

Command: `bun run /Users/zhou/.codex/local-workflows/nodebraid/runs/a629a264-4183-4051-b048-4f9e1eb50b8e/compiled-node-value-repro.ts`

[Original command output](logs/behavior-2.log)

### current-affected

check — passed; exit 0; expected exit 0.

All affected current consumers/types/public tests/native React/SVG/Examples browsers and docs passed.

Command: `bun run check:affected --base e21c917b170b37ff60418d76a0bbcc65b8799d17`

[Original command output](logs/behavior-3.log)

### independent-standards-commands

check — passed; exit 0; expected exit 0.

Independent Standards reviewer actually ran249 public Kernel/KernelPlugin/History tests1276assertions at exact current reviewed head; original command/output retained.

Command: `bun test packages/kernel/tests packages/plugin-kernel/tests packages/plugin-history/tests`

[Original command output](logs/behavior-4.log)

### independent-spec-commands

check — passed; exit 0; expected exit 0.

Independent Spec reviewer actually ran249 public Kernel/KernelPlugin/History tests1276assertions at exact current reviewed head; original command/output retained.

Command: `bun test packages/kernel/tests packages/plugin-kernel/tests packages/plugin-history/tests`

[Original command output](logs/behavior-5.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
