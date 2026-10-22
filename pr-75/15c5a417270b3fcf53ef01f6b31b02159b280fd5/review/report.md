# Verification report

Run: 12953ebc-8af8-4fc1-b968-bfb9c29b9017 · ZWkang/nodebraid · issue #74

## Reviewed and published source

- Review base: `f0e3fc12e3118b9a3b3d9502940b22f516302b13`
- Independently prepared append parent: `59c8d7c8e74eedd426d60ce14ee3db73f7839824`
- Published head: `15c5a417270b3fcf53ef01f6b31b02159b280fd5`
- Reviewed local head: `74160ef20e9acf06a032ab0f4171398d6748fee4`
- Tree: `761b37081d75d6994d43b54b70b696d7344037b7`
- Complete binary patch SHA-256: `c80710dd719e3c7d6b912f57184ec907f4f64d82242dd47096548aacafccbb29`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

Revalidate the existing Duplicate Selection ID mapping repair after the Kernel writer identity repair reached fetched mainf0e. Capture Node/Edge mapping collections once and translate actual indexed entries into owned arrays without caller-owned collection hooks; preserve the confirmed Issue74 public contract. Source: https://github.com/ZWkang/nodebraid/issues/74

### sync-source-and-public-checks

Fresh full Issue74/PR75 source and feedback, independently captured current source59c8 and target mainf0e. Inspect main sync, unchanged complete two-file product patch and connected new Kernel behavior; actual Duplicate/Clipboard/Fragment public tests and affected consumers pass at new exact source.

Dependencies: none

### independent-review-and-full-check

Fresh independent Standards+ponytail-review and Spec review same complete head/tree/patch versus mainf0e. Deployed mainf0e executor then performs actual full check with stable source; prior base01c receipts remain historical.

Dependencies: sync-source-and-public-checks

### append-current-head-acceptance

Append exact checked tree on original PR75 with independent first parent59c8 and inherited mainf0e. Verify actual published-head CI, complete feedback, full report/media publication and immutable byte readback before ready.

Dependencies: independent-review-and-full-check

### main-integration-acceptance

Human final review/merge, actual main integration and whole-Issue acceptance remain prerequisites before authorized closure.

Dependencies: append-current-head-acceptance

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: Duplicate Selection translates the actual indexed application mappings into owned arrays after capturing each collection once. Caller-owned array methods cannot replace the records validated by the shared Fragment boundary.

Verdict: passed.

Reviewed identity:

- Base: f0e3fc12e3118b9a3b3d9502940b22f516302b13
- Head: 74160ef20e9acf06a032ab0f4171398d6748fee4
- Tree: 761b37081d75d6994d43b54b70b696d7344037b7
- Binary patch SHA256: c80710dd719e3c7d6b912f57184ec907f4f64d82242dd47096548aacafccbb29

Hard standards: No violations found. The full two-file patch follows ADR0073 ownership and exact same-namespace mapping requirements, ADR0077 external-error identity, and the public-regression requirements in AGENTS.md and CONTRIBUTING.md. Structural collection validation remains local; shared Fragment validation still owns mapping coverage, uniqueness and canonical immutable outputs.

New Kernel integration: Re-read the merged ID-capture changes and their callers. Fragment materialization produces frozen entities with ordinary ID properties. Kernel now forwards one captured ID through its freeze helpers, Map keys and touched IDs, preserving matching Change Set identities. Duplicate still performs one Transaction and then updates Session; History replays that evidence through ordinary Transactions. The Clipboard consumer retains the same Fragment/Kernel seam. No public signature or additional policy is required.

Judgment / ponytail: No actionable Fowler smell, correctness, safety, load, speed or testing finding. The translation change remains minimal and preserves original element-read failures, structural Node-before-Edge rejection, native array-like conversion, inherited entries, invalid-hole rejection and hook-free frozen inputs. Existing collision, stale-source, post-Commit Selection, lifecycle and Undo/Redo behavior remains covered. Assumed load: synchronous materialization in one isolated Canvas Runtime.

Actual checks at this head:

- Independently verified complete commit history, clean tree and exact head/tree/hash.
- Verified inspection/prepared-task identity and complete.patch byte-for-byte against the fixed Git diff.
- Read both full changed files, all 201 regression-test lines, refreshed Issue/PR source and empty feedback, and connected Fragment/Kernel/Session/History/Clipboard paths.
- `git diff --check`: passed.
- `bun test packages/plugin-duplicate-selection/tests`: 34 passed, 0 failed, 117 assertions.

Not checked: remaining affected consumers, typecheck, builds, browsers, full engineering gate, current published-head CI, publication or remote report readback. Earlier-head reports and checks were not reused as current acceptance.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: **passed**

独立审查新 main 基线的完整两文件补丁、新增公共测试、Issue #74 全文、空 Issue/PR 分页反馈及外部依赖、独立 prepared plan、ADR0073/0077，并核对 Duplicate → Fragment → 新 Kernel writer → Session/History 及 Clipboard 调用边界。未发现规格遗漏、错误实现或范围扩张。

满足“Capture each incoming Node/Edge mapping collection once”：校验捕获的同一数组，按原生归一化长度读取实际索引，输出自有冻结数组，不调用输入 map、iterator、constructor/species。无效映射在 Transaction 前以既有 `INVALID_MATERIALIZATION` 原子拒绝；继承项、缺失项、原始读取/应用异常与验证短路保持。Fragment 的精确覆盖、规范排序、namespace 和冻结规则继续生效。新 Kernel 捕获自有实体的稳定 ID，与 Duplicate 提交、关系索引及 History replay 无冲突；无 API、依赖、cap 或 fallback 新增。

本轮实际执行 `bun test packages/plugin-duplicate-selection/tests`：34 pass、0 fail、117 assertions，包括真实 Host/Kernel/Command/Session、单 Commit、Undo/Redo、Lifecycle 和全部新增回归；`git diff --check` 通过。核对精确 commit/tree、完整 binary patch、保存的 patch/inspection 与干净工作树；旧基线结果不计入本轮。

未独立运行 Clipboard/Fragment 整套、affected、build、browser 或 full engineering gate；未验证当前新 head 的远端 CI、证据发布/回读及最终 main 集成。定向通过不代表整体验收完成。

- base: `f0e3fc12e3118b9a3b3d9502940b22f516302b13`
- head: `74160ef20e9acf06a032ab0f4171398d6748fee4`
- tree: `761b37081d75d6994d43b54b70b696d7344037b7`
- raw binary patch SHA256: `c80710dd719e3c7d6b912f57184ec907f4f64d82242dd47096548aacafccbb29`


## Behavior evidence

### historical-main99-public-red

red — passed; exit 1; expected exit 1.

Historical original public Host probe on main99 accepted invalid duplicateId42 substituted by a caller-owned map, violating atomic rejection. Original exit1 remains red provenance, not current-base verification.

Command: `bun duplicate-array-hook-repro.ts (original main99 discovery)`

[Original command output](logs/behavior-1.log)

### current-duplicate-clipboard-fragment

green — passed; exit 0; expected exit 0.

New mainf0e/head741 public real Host/Command/Kernel/Session/History composition passed109 tests422 assertions, retaining indexed mapping translation and strict exceptions with the new Kernel identity ownership.

Command: `bun test packages/plugin-duplicate-selection/tests packages/plugin-clipboard/tests packages/canvas-fragment/tests`

[Original command output](logs/behavior-2.log)

### current-affected-consumers

check — passed; exit 0; expected exit 0.

Actual selected consumers, types/declarations/builds, real Example browser suites and documentation passed at current synchronized source, exit0. Old base01c results were not reused.

Command: `bun run check:affected --base f0e3fc12e3118b9a3b3d9502940b22f516302b13`

[Original command output](logs/behavior-3.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
