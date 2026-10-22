# Verification report

Run: e917bc1d-c2a0-4628-a04c-bb205faae8ff · ZWkang/nodebraid · issue #84

## Reviewed and published source

- Review base: `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`
- Independently prepared append parent: `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`
- Published head: `071b3490a44bda5176e15841700e3bc47afda3ce`
- Reviewed local head: `f963eb19fc691ce21a60e92ba3cd6b09042e4c52`
- Tree: `1c34b75138a968e79597081f5128f3ee0a59b4b4`
- Complete binary patch SHA-256: `3e55c16602f7f28e1bf3c04cb4a8d23949a567c57c04763a7d78665da9e1a528`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

Repair Issue84 factory-time Interaction/Connection ownership on the existing public Basic Canvas Composition seam. Capture one consistent configuration at createBasicCanvasPlugin, copy/freeze the captured Connection shell, preserve valid/default/malformed config and original failure/lifecycle contracts. Source: https://github.com/ZWkang/nodebraid/issues/84

### public-regression-and-minimal-repair

Preserve real compiled public red and ordinary snapshot control. Add one existing Host/Composition readiness regression before implementation; repair only shared config capture and retain property/error/default controls. Relevant public consumers and affected checks pass.

Dependencies: none

### independent-review

Independent Standards with ponytail-review and Spec inspect exact complete head/tree/patch and original Issue/ADR/public contract, with no remaining findings.

Dependencies: public-regression-and-minimal-repair

### formal-engineering-check

Versioned deployed-main agents:run verify executes actual full bun run check once after targeted checks/reviews; preserve actual log, exit and stable source.

Dependencies: independent-review

### publish-and-current-head-acceptance

Actual GitHub source tree and first parent match independently prepared base/parent; create one delivery PR to main. Exact-current-head CI, complete feedback/mergeability and full report/media publication/immutable readback pass before ready.

Dependencies: formal-engineering-check

### main-integration-acceptance

After actual final review/merge, verify fetched main integration and complete Issue acceptance; keep Issue84 open until then.

Dependencies: publish-and-current-head-acceptance

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: Basic Canvas captures Interaction.connection once and excludes it from the remaining property copy. The same captured value determines nested copying and is retained for later Child Interaction activation.

Verdict: passed.

Reviewed identity:

- Base: 1c85d79db1e275e59f84a9bb77d1fe75c0a582e6
- Head: f963eb19fc691ce21a60e92ba3cd6b09042e4c52
- Tree: 1c34b75138a968e79597081f5128f3ee0a59b4b4
- Binary patch SHA256: 3e55c16602f7f28e1bf3c04cb4a8d23949a567c57c04763a7d78665da9e1a528

Hard standards: No violations found in the complete two-file patch. AGENTS.md and CONTRIBUTING.md require public behavioral regressions and original failure exposure; the retained readiness red records the real rejected activation. ADR0066 preserves application-owned Host/Renderer and Child Composition ownership; ADR0068 retains Interaction's single validation/gesture authority. ADR0075/0081 composition boundaries remain unchanged.

Supported inherited and non-enumerable Connection properties are still captured and copied. Absent/undefined Connection retains defaults; malformed values reach Interaction's existing INVALID_CONFIG path. Other property-copy behavior and top-level unknown-option checks remain unchanged. Original Connection getter and Renderer failures retain their identities. No documented valid contract was found to change.

Judgment / ponytail: No actionable Fowler smell or correctness, safety, load, speed or testing finding. Object rest removes the repeated external read without adding policy, state or abstraction. Reviewed creation-time normalization, Interaction resolution/runtime use, Child readiness and rollback, reverse cleanup, Core re-export and Examples factory caller. Assumed load: isolated per-Canvas Hosts, including repeated installations from one stable Plugin definition.

Actual checks at this head:

- Verified clean tree, commit history, exact head/tree/hash, prepared-task/inspection identity and complete.patch byte-for-byte against Git.
- Read the full production helper, existing readiness/lifecycle tests and all new readiness additions, relevant ADRs/principles and original source with empty comments/blockers.
- `git diff --check`: passed.
- `bun test packages/preset-basic/tests`: 20 passed, 0 failed, 57 assertions. This includes fresh-Host property controls, defaults, malformed config, asynchronous readiness, Provider conflict/rollback and cleanup failures.

Not checked: broader affected consumers, TypeScript checks, builds, full engineering gate, real browser/Connection Gesture input, current-head CI, publication or remote evidence readback. The existing test Renderer is a public adapter fixture, not browser evidence.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: **passed**

独立审查完整两文件补丁、103 行新增 readiness 回归、原 Issue #84 全文/空讨论与真实依赖、独立 prepared plan、ADR0066/0068/0075/0081，以及 factory → Child Composition → Interaction validation/Renderer readiness 调用链。未发现规格遗漏、错误实现或未请求的扩张。

满足“the Connection value used to decide ownership must be the same value retained”：解构只读取一次 Connection，rest 保留其余配置的既有 own-enumerable 复制语义，record Connection 从同一捕获值复制/冻结；首次 absent 值不能被后续 getter 替换为借用 shell。后续应用 mutation 和 fresh Host installation 不改变 factory 配置；原有 inherited/non-enumerable Connection、默认配置及原始 getter 异常保持。malformed/unknown 配置仍由既有 Interaction 校验表达，Composition 等待全部 Child active，Provider conflict、rollback、Renderer 错误身份和逆序 cleanup 路径未改。无 API、依赖、accessor ban、cap 或 fallback 新增。

本轮实际执行 `bun test packages/preset-basic/tests`：20 pass、0 fail、57 assertions；使用真实 Host/Composition 和现有公共 CanvasRenderer adapter，验证范围是 readiness/lifecycle，不宣称浏览器输入证据。`git diff --check` 通过；实际 commit 列表、head/tree、完整 binary patch、保存的 inspection/complete.patch 与干净工作树均核对。

未独立运行连接消费者整套、affected、类型/构建、browser 或 full engineering gate；未执行当前 head 的 compiled public probe、远端 CI、报告/媒体发布及回读、main 集成验收。其他执行者的结果未计为本轮实际命令。

- base: `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`
- head: `f963eb19fc691ce21a60e92ba3cd6b09042e4c52`
- tree: `1c34b75138a968e79597081f5128f3ee0a59b4b4`
- raw binary patch SHA256: `3e55c16602f7f28e1bf3c04cb4a8d23949a567c57c04763a7d78665da9e1a528`


## Behavior evidence

### original-main-public-red

red — passed; exit 1; expected exit 1.

Original actual compiled public main1c85 Host/Composition probe: ordinary snapshot control remainsactive, changing getter retains a borrowed Connection and fails after caller mutation. Expected assertionexit1; historical original defect, not current-head execution.

Command: `bun preset-connection-repro.ts (original clean main1c85)`

[Original command output](logs/behavior-1.log)

### tdd-public-readiness-red

red — passed; exit 1; expected exit 1.

Before changing production helper, new public Host readiness regression rejected instead of retaining captured config. Actual original red patch preserved; expectedexit1.

Command: `bun test packages/preset-basic/tests/readiness.test.ts --test-name-pattern 'before a caller getter changes' (before repair)`

[Original command output](logs/behavior-2.log)

### tdd-public-readiness-green

green — passed; exit 0; expected exit 0.

Same public regression passed after single capture; one caller getter read and active Composition. Actual working-tree green before final controls/commit.

Command: `bun test packages/preset-basic/tests/readiness.test.ts --test-name-pattern 'before a caller getter changes' (after repair)`

[Original command output](logs/behavior-3.log)

### initial-test-type-failure

check — failed; exit 1; expected exit 0.

Initial source tests passed, but test-only always-throwing getter inferredvoid and package typecheck failedTS2322. Original failure retained; next record fixes its type without runtime/condition/assertion change.

Command: `bun run --filter '@nodebraid/preset-basic' typecheck (before explicit never return)`

[Original command output](logs/behavior-4.log)

### initial-affected-type-failure

check — failed; exit 1; expected exit 0.

First actual affected attempt failed at the same test getter TS2322 before browser stage; retained unchanged.

Command: `bun run check:affected --base 1c85d79db1e275e59f84a9bb77d1fe75c0a582e6 (initial test inference failure)`

[Original command output](logs/behavior-5.log)

### corrected-public-test-types

check — passed; exit 0; expected exit 0.

Explicit never annotation accurately models the getter that always throws. Package public typecheck passes with unchanged runtime and assertions.

Command: `bun run --filter '@nodebraid/preset-basic' typecheck:self`

[Original command output](logs/behavior-6.log)

### current-compiled-public-green

green — passed; exit 0; expected exit 0.

Actual compiled public packages on pinnedf963eb19fc691ce21a60e92ba3cd6b09042e4c52 create active Composition in both ordinary and changing-getter cases after caller mutation; changinggetter readexactlyonce.

Command: `bun current-public-probe.ts`

[Original command output](logs/behavior-7.log)

### current-connected-public-services

green — passed; exit 0; expected exit 0.

Actual pinned currenthead public Composition/Interaction/Runtime/Renderer suites passed194tests845assertions, including20Composition tests57assertions, fresh Host config/property/exception/validation controls.

Command: `bun test packages/preset-basic/tests packages/plugin-interaction/tests packages/runtime-cordis/tests packages/plugin-renderer/tests`

[Original command output](logs/behavior-8.log)

### affected-public-consumers

check — passed; exit 0; expected exit 0.

After the test-only never annotation, affectedcheck passed public dependents, types/artifacts, realExamples browser andDocumentation. Exact source files were then committed unchanged byhooks. This is the real developmentgate, separate from formal fullcheck.

Command: `bun run check:affected --base 1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`

[Original command output](logs/behavior-9.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
