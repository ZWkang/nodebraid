# Verification report

Run: d28eba0c-b3ca-4c2d-8e51-6f247099a1a3 · ZWkang/nodebraid · issue #84

## Reviewed and published source

- Review base: `45ac648f687b969463aec6a5ffde89b573e55052`
- Independently prepared append parent: `071b3490a44bda5176e15841700e3bc47afda3ce`
- Published head: `bca341cfc0082ef3319158405c8954013fe4e525`
- Reviewed local head: `f8d35f08ecf5f4b5ae26f4d291ebb38ee998ec49`
- Tree: `8ef16925fedfaf3ec393a939252f70f63aaa8e39`
- Complete binary patch SHA-256: `3e55c16602f7f28e1bf3c04cb4a8d23949a567c57c04763a7d78665da9e1a528`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

## Confirmed defect

On fetched main `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`, Basic Canvas can retain a caller-owned nested Connection object after `createBasicCanvasPlugin()` has returned.

A real compiled public-package Host/Composition probe compares two cases. In both, the application mutates `connection.materializeEdge` to an invalid value **after** creating the Plugin but **before** installing it:

- Ordinary `{ interaction: { connection } }`: Composition becomes active, as expected from the existing creation-time snapshot contract.
- A legal `interaction.connection` getter returns `undefined` on its first read and a valid mutable Connection object on its second read. Creation reads it twice and keeps the second object by reference; subsequent caller mutation makes Composition fail with `InteractionError / INVALID_CONFIG`.

Actual outcome:
```json
{"control":{"readsAtCreation":0,"state":"active","error":null},"actual":{"readsAtCreation":2,"state":"failed","error":{"domain":"interaction","code":"INVALID_CONFIG","message":"Interaction connection materializeEdge must be a function."}}}
```

The public assertion requiring the captured configuration to remain independent exits 1. Existing Basic Canvas tests pass (15 tests / 44 assertions). The original compiled-package source/output are retained in run `20261022T055513-discovery` (`preset-connection-repro.ts`, `preset-connection-red.log`).

## Contract and cause

[ADR 0066](https://github.com/ZWkang/nodebraid/blob/1c85d79db1e275e59f84a9bb77d1fe75c0a582e6/docs/adr/0066-publish-a-backend-neutral-basic-canvas-composition.md) establishes the application-owned Renderer/Host and child Composition boundary. Existing public [readiness regressions](https://github.com/ZWkang/nodebraid/blob/1c85d79db1e275e59f84a9bb77d1fe75c0a582e6/packages/preset-basic/tests/readiness.test.ts) explicitly require Interaction and nested Connection options to be snapshotted when the Plugin is created. Interaction remains the validation and input/gesture authority under ADR 0068.

In [snapshotInteractionConfig](https://github.com/ZWkang/nodebraid/blob/1c85d79db1e275e59f84a9bb77d1fe75c0a582e6/packages/preset-basic/src/preset-basic-plugin.ts), the first `accepted.connection` read decides whether to copy/freeze the nested shell, but spreading `accepted` reads the property again. When the first value is absent, a later object is inserted without an owned snapshot.

## Acceptance

- Capture a consistent Interaction configuration at Composition creation; the Connection value used to decide ownership must be the same value retained. Caller getters must not replace it during copying.
- Preserve owned, frozen Connection options across later caller mutation and fresh Host installations. Retain the existing absent/default configuration and public lifecycle/readiness behavior.
- Preserve malformed/unknown options, original getter/Renderer/Interaction failures, validation ownership and order, supported property semantics, Provider conflict/rollback and reverse cleanup. Add no API, dependency, accessor ban, cap, retry or fallback.
- Add a public Host/Composition regression that fails before the repair and passes afterward, plus relevant stable/getter/default and original-error controls. Reuse the existing public Renderer adapter; it is not browser input evidence.
- Run relevant Composition and connected Interaction/Runtime/Renderer checks, independent Standards + ponytail-review / Spec, full engineering verification, actual current-head CI and complete report/media publication/readback.
- Keep this Issue open until actual main integration and final acceptance.

## Deduplication

Complete all-state metadata through the final short pages (83 Issues/PRs, 43 PRs) found no existing Composition Connection snapshot repair. #76 concerns Session mutators; #74 concerns Duplicate mappings; neither repairs this factory-time ownership boundary.

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

What this change does: Basic Canvas captures the Connection option once when creating the Plugin. It copies and freezes that captured value for later Host installations instead of reading the caller’s getter again.

Verdict: passed. Looks good. Ship.

Reviewed identity:

- Base: `45ac648f687b969463aec6a5ffde89b573e55052`
- Head: `f8d35f08ecf5f4b5ae26f4d291ebb38ee998ec49`
- Tree: `8ef16925fedfaf3ec393a939252f70f63aaa8e39`
- Binary patch SHA256: `3e55c16602f7f28e1bf3c04cb4a8d23949a567c57c04763a7d78665da9e1a528`

Hard standards: no violations found. Read the complete two-file patch, all added readiness cases, Issue #84 with its empty discussion/blockers, prepared plan and supplied PR #85 context with complete empty comments/reviews/threads. Applied current AGENTS, CONTRIBUTING, CONTEXT, tracker/discussion rules, code-review and applicable principle guidance.

The factory keeps ownership of its captured configuration. Interaction still owns configuration validation and gesture behavior. Absent defaults, inherited/non-enumerable Connection properties, malformed values and original getter failures retain their intended treatment. Traced Examples → Composition → Child Installations → current Interaction capture and Session owned inputs, plus Renderer readiness and Runtime rollback/cleanup. This remains consistent with ADR0066/0068/0069 and ADR0028/0029.

Judgment checks: no concrete Fowler smell found. Under one isolated Host per Canvas, reused across fresh installations as documented, the destructuring change is small and sufficient. It introduces no new abstraction, public interface, dependency, cap or fallback.

Independent checks: waited until dependency construction finished, then ran `bun test packages/preset-basic/tests packages/plugin-interaction/tests packages/plugin-session/tests packages/plugin-renderer/tests`: 105 tests / 440 assertions passed at this head. Coverage includes changing getters, inherited/non-enumerable Connection, multiple Hosts, defaults, original errors, current Interaction recovery, Session capture/FIFO, Provider conflicts and reverse cleanup. Renderer fixtures prove API/lifecycle behavior, not native browser input.

Verified exact saved patch/hash, inspection/prepared-task binding, original remote head as first parent, captured main as second parent, clean worktree and `git diff --check`. Commands and raw results are in `standards-command-log.txt`.

Not checked: fresh builds or typecheck, native browsers, full engineering gate, live feedback refresh, current-head remote CI, publication or merge. Historical TDD and previous-head results remain historical. This report covers independent Standards and ponytail-review only.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: **passed**

独立重审完整 Preset Basic source/readiness 两文件补丁及全部新增回归、原 Issue #84 全文/空讨论/依赖、独立 prepared plan、AGENTS/CONTEXT、tracker/讨论/code-review、ADR0066/0068/0069/0028/0029 与 Composition → Interaction → Command/Kernel/Session/Renderer 链。未发现规格遗漏、错误实现或范围扩张。

满足“the Connection value used to decide ownership must be the same value retained”：factory 解构只读 Connection 一次，rest 保留其余 own-enumerable 配置，record Connection 从该值复制/冻结。后续 caller mutation 与 fresh Host 安装不能替换该 nested shell；absent/default、继承/非枚举 Connection、原始 getter/Renderer/Interaction 错误与既有校验顺序保持。Composition 等待全部 Child active，Provider conflict rollback 和 reverse cleanup 未改。与新 main 的 Interaction materializer 单次读取、Session ownership 兼容，无新 API、cache、accessor ban、cap 或 fallback。

本轮实际运行 `bun test packages/preset-basic/tests packages/plugin-interaction/tests packages/plugin-session/tests packages/plugin-renderer/tests`：105 pass、0 fail、440 assertions；`git diff --check` 通过。命令、head/tree 和原始输出在 `spec-review-commands.log`。核对完整 patch/inspection、干净源码及 merge parents 071b349/main45ac，身份一致；历史 TDD 与旧报告保持原身份。

当前 published 071b349 的完整 comments/reviews/threads 均空，无新增反馈；本地被审 head 尚未发布。公共 Recording Renderer 仅验证 seam/lifecycle，不代表 native browser。未独立执行 build、affected/docs 全套、full verify、新 head 远端 CI/反馈、报告发布回读或最终 merge/main 验收。

- base: `45ac648f687b969463aec6a5ffde89b573e55052`
- head: `f8d35f08ecf5f4b5ae26f4d291ebb38ee998ec49`
- tree: `8ef16925fedfaf3ec393a939252f70f63aaa8e39`
- binary patch SHA256: `3e55c16602f7f28e1bf3c04cb4a8d23949a567c57c04763a7d78665da9e1a528`


## Behavior evidence

### public-integration

green — passed; exit 0; expected exit 0.

Fresh current-head Preset Basic/Interaction/Session/Renderer public controls and regressions after main integration. Original TDD remains historical.

Command: `bun test packages/preset-basic/tests packages/plugin-interaction/tests packages/plugin-session/tests packages/plugin-renderer/tests`

[Original command output](logs/behavior-1.log)

### affected-integration

check — passed; exit 0; expected exit 0.

Fresh production/dev consumers, connected root composition tests, actual browser suites and documentation for integrated Interaction/Session and docs delta.

Command: `bun run check:affected --base 071b3490a44bda5176e15841700e3bc47afda3ce`

[Original command output](logs/behavior-2.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
