# Verification report

Run: 2aa5d5ae-63b3-4786-af05-2cd494424635 · ZWkang/nodebraid · issue #80

## Reviewed and published source

- Review base: `710038f0ed0cfc830580241ca1e90fca5f50677e`
- Independently prepared append parent: `710038f0ed0cfc830580241ca1e90fca5f50677e`
- Published head: `d5c8d597a50ff7f1671e28853975f8af2f1bb605`
- Reviewed local head: `9a188bfe2cdd34ec3d95a075ade752dc9ac3c97c`
- Tree: `0747337c09e331739d840a875e3065efdbeed6f2`
- Complete binary patch SHA-256: `e21467a1cc71cf2f808cc8004fbf9462cfbaf0e8aac02db1115c4ef75927fa4e`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

Retain the Host ID and Diagnostic Event fields accepted at the Runtime diagnostics ownership boundary, using existing public Host/Plugin diagnostics seams and preserving explicit error/Fault semantics. Source: https://github.com/ZWkang/nodebraid/issues/80

### host-id-capture

Original public compiled red retained. Add first public Host regression, observe behavioral red, capture accepted Host ID once and preserve defaults/bounded errors/read exceptions.

Dependencies: none

### event-field-capture

Public real active Plugin regressions red/green for Event name/level and accepted Sink-failure context. Retain owned normalized attributes, original optional errors, short-circuit validation and disabled-event behavior; no new public API/caps/fallback.

Dependencies: host-id-capture

### related-checks-and-independent-review

Affected Runtime/Diagnostics and consumers pass; independent Standards+ponytail-review and Spec review exact head/tree/patch, then main710 agents:run verify runs real complete check with stable source.

Dependencies: event-field-capture

### publication-current-head-acceptance

Exact remote tree/first-parent match independent prepared source; one existing delivery Issue/one main PR, current-head CI, complete feedback, report/preview publication and immutable readback pass.

Dependencies: related-checks-and-independent-review

### main-integration-acceptance

Human final review, actual fetched main integration and whole-Issue public acceptance remain pending before authorized closure.

Dependencies: publication-current-head-acceptance

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: Runtime diagnostics retains the Host ID and Event fields it validates. Fault reporting also captures its name once, so invalid attributes or field-read errors cannot cause another name read while constructing failure context.

Verdict: passed.

Reviewed identity:

- Base: 710038f0ed0cfc830580241ca1e90fca5f50677e
- Head: 9a188bfe2cdd34ec3d95a075ade752dc9ac3c97c
- Tree: 0747337c09e331739d840a875e3065efdbeed6f2
- Binary patch SHA256: e21467a1cc71cf2f808cc8004fbf9462cfbaf0e8aac02db1115c4ef75927fa4e

Hard standards: No remaining violations found in the complete two-file patch. AGENTS.md and CONTRIBUTING.md require regression evidence and visible original failures. Boundary Discipline and ADR0028/0029/0030 keep field acceptance in Runtime, diagnostics observational, and external failure identity intact. Known-field construction matches the public interfaces without changing exports or dependencies.

Fault reporting correction: The failure branch no longer reads caller fields. Public regressions demonstrate that invalid attributes preserve the accepted name and original Fault; invalid names retain their first value; and a first name or attributes read failure reaches the Reporter alongside the original Fault. Missing name context is explicitly described without retrying the getter.

Judgment / ponytail: No actionable Fowler smell, correctness, safety, load, speed or testing finding. Local captures introduce no persistent state or abstraction. Ordinary validation order, disabled-event optional-error behavior, frozen attributes, raw error identity and asynchronous Sink context remain intact.

Connected code checked: Host construction, Installation/Activation scopes and lifecycle events, PluginDiagnostics.emit/reportFault, Fault Reporter isolation, error deduplication, DiagnosticEventInput and normalization, and Kernel/Session/History/Renderer and Examples consumers. Assumed load: an isolated Host per Canvas Runtime with external callbacks.

Actual checks at this head:

- Verified exact commits, tree, complete binary patch hash, full new test file and clean working tree.
- `git diff --check`: passed.
- `bun test packages/runtime-cordis/tests packages/diagnostics/tests`: 158 passed, 0 failed, 606 assertions, including all 27 new cases.

Not checked: affected consumers, typecheck, builds, browsers, full engineering gate, remote CI, publication or remote report readback. This review does not establish delivery readiness.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: **passed**

已对新身份完整两文件补丁重新独立审查，核对 Issue80 原文/空讨论、prepared plan、ADR0028/0029/0030及公共 Host/Plugin→emit/reportFault→Sink/FaultReporter 调用链；未发现剩余验收遗漏、错误实现或范围扩张。

先前 P2 已修复：reportFault 在既有 try 内单次捕获 name，正常与输入失败路径均复用该值；属性非法或首次 name/attributes 读取失败时，现有 fault-reporting.fault 聚合保留 original Fault 和实际输入错误，Reporter 不再被后续 name getter 中断。未取得 name 时仅报告安全类型上下文，不伪造成功。Host ID/name/level 捕获、首个非法值、原始 known-field 异常、attributes/error 归属、disabled ordinary-event 的 error 懒读、sequence/scopes、Sink/async Sink 与去重语义保持，没有新增 API、cap、fallback 或 accessor 禁令。

实际执行：`bun test packages/runtime-cordis/tests packages/diagnostics/tests`，158 pass、0 fail、606 assertions。另以新身份重跑原真实 no-sink public probe，退出0：reads=1、Reporter调用1、原 Fault 保留、无后续读取异常。新脚本 review-report-fault-green-probe.ts、原始 review-report-fault-green.log及身份/退出码 JSON 已分别保存；原6cf red/probe/报告未改写。`git diff --check` 通过，工作树干净。

未运行 build、types、browser、full check/verify、远端发布、当前 head CI 或报告/媒体回读；运行中的 affected 消费者检查未计为通过。定向通过和 Spec pass 不代表完整交付或 main 验收完成。

- base: `710038f0ed0cfc830580241ca1e90fca5f50677e`
- head: `9a188bfe2cdd34ec3d95a075ade752dc9ac3c97c`
- tree: `0747337c09e331739d840a875e3065efdbeed6f2`
- raw binary patch SHA256: `e21467a1cc71cf2f808cc8004fbf9462cfbaf0e8aac02db1115c4ef75927fa4e`


## Behavior evidence

### original-main710-public-red

red — passed; exit 1; expected exit 1.

Real compiled public Host/active Plugin probe at original fetched main710 publishes empty Host ID/name and fatal level after validation. Historical source remains main710, not a receipt for fixed source.

Command: `bun runtime-diagnostic-capture-repro.ts (discovery20261022T012928-maintenance, main710)`

[Original command output](logs/behavior-1.log)

### host-id-red

red — passed; exit 1; expected exit 1.

First vertical public Host regression before Host ID capture: expected accepted-host, received empty. Genuine behavior failure after dependencies were ready.

Command: `bun test packages/runtime-cordis/tests/diagnostic-input-values.test.ts (Host slice before fix)`

[Original command output](logs/behavior-2.log)

### host-id-green

green — passed; exit 0; expected exit 0.

Host slice passed after capturing the accepted ID once.

Command: `bun test packages/runtime-cordis/tests/diagnostic-input-values.test.ts (Host slice after fix)`

[Original command output](logs/behavior-3.log)

### event-name-red

red — passed; exit 1; expected exit 1.

Next vertical public active Plugin regression: accepted.event was replaced by an empty name.

Command: `bun test packages/runtime-cordis/tests/diagnostic-input-values.test.ts (Event name before fix)`

[Original command output](logs/behavior-4.log)

### event-name-green

green — passed; exit 0; expected exit 0.

Owned accepted event name retained after replacing the caller spread with explicit known-field construction. Intermediate attempt that still consumed the name twice remains separately logged.

Command: `bun test packages/runtime-cordis/tests/diagnostic-input-values.test.ts (Event name fixed)`

[Original command output](logs/behavior-5.log)

### event-level-red

red — passed; exit 1; expected exit 1.

Next vertical public regression: accepted info level was replaced by fatal.

Command: `bun test packages/runtime-cordis/tests/diagnostic-input-values.test.ts (Event level before fix)`

[Original command output](logs/behavior-6.log)

### event-level-green

green — passed; exit 0; expected exit 0.

Event level slice passed after validating and constructing from the same captured value.

Command: `bun test packages/runtime-cordis/tests/diagnostic-input-values.test.ts (Event level fixed)`

[Original command output](logs/behavior-7.log)

### public-input-safety

green — passed; exit 0; expected exit 0.

Historical pre-review source6cf: that fixed source public Host/Plugin coverage:23 tests/63 assertions. Includes first-invalid/bounded errors, defaults, original known-field exceptions, no sequence gap, attribute ownership/original error, synchronous and asynchronous Sink fault context, and disabled-event error laziness.

Command: `bun test packages/runtime-cordis/tests/diagnostic-input-values.test.ts`

[Original command output](logs/behavior-8.log)

### runtime-diagnostics-related

green — passed; exit 0; expected exit 0.

Historical pre-review source6cf: that Runtime and Diagnostics public suites:154 passed/588 assertions. Existing lifecycle, failure/cleanup traversal, diagnostics and value contracts retained.

Command: `bun test packages/runtime-cordis/tests packages/diagnostics/tests`

[Original command output](logs/behavior-9.log)

### runtime-types

check — passed; exit 0; expected exit 0.

Historical pre-review source6cf: that Runtime type check passed. Initial widened test getter annotation error was corrected and preserved, not counted as behavioral red.

Command: `bun run --filter '@nodebraid/runtime-cordis' typecheck:self`

[Original command output](logs/behavior-10.log)

### compiled-public-green

green — passed; exit 0; expected exit 0.

Historical pre-review source6cf: Freshly built fixed public Runtime barrel returns exactly accepted-host/accepted.event/info, one read each and frozen outputs.

Command: `bun runtime-diagnostic-capture-probe.ts (fixed worktree compiled public barrel)`

[Original command output](logs/behavior-11.log)

### affected-consumers

check — passed; exit 0; expected exit 0.

Historical pre-review source6cf: Actual selected affected mode completed with exit0, including consuming packages, root public compositions, real React/SVG/Examples browser suites and documentation. This is not the formal full check.

Command: `bun run check:affected --base 710038f0ed0cfc830580241ca1e90fca5f50677e`

[Original command output](logs/behavior-12.log)

### independent-spec-report-fault-red

red — passed; exit 1; expected exit 1.

Independent Spec review on exact6cf found reportFault invalid-attributes path re-read the accepted name and lost original Fault; actual public probe/read identities and original changes-requested report retained.

Command: `bun review-report-fault-probe.ts (pinned6cf)`

[Original command output](logs/behavior-13.log)

### report-fault-regression-red

red — passed; exit 1; expected exit 1.

Added public regression before correction: original Fault was not delivered because name second-read marker escaped.

Command: `bun test packages/runtime-cordis/tests/diagnostic-input-values.test.ts (before reportFault fix)`

[Original command output](logs/behavior-14.log)

### report-fault-fixed-probe

green — passed; exit 0; expected exit 0.

Actual fixed9a public Host/Plugin probe: name read once, Reporter called once, original Fault retained alongside attributes contract error.

Command: `bun report-fault-fixed-public-probe.ts (pinned9a)`

[Original command output](logs/behavior-15.log)

### runtime-diagnostics-after-review

green — passed; exit 0; expected exit 0.

Fixed post-review Runtime/Diagnostics public suites158tests606assertions, including27new input/Fault regression tests and existing lifecycle/error contracts.

Command: `bun test packages/runtime-cordis/tests packages/diagnostics/tests`

[Original command output](logs/behavior-16.log)

### runtime-types-after-review

check — passed; exit 0; expected exit 0.

Post-review Runtime types passed.

Command: `bun run --filter @nodebraid/runtime-cordis typecheck:self`

[Original command output](logs/behavior-17.log)

### compiled-public-after-review

green — passed; exit 0; expected exit 0.

Fresh fixed9a compiled public Runtime retains original accepted Host ID, name and level, one read each.

Command: `bun runtime-diagnostic-capture-probe.ts`

[Original command output](logs/behavior-18.log)

### affected-consumers-after-review

check — passed; exit 0; expected exit 0.

Actual post-review fixed9a affected selection passed, including real consuming public tests/browser/Examples/documentation. Earlier6cf affected result remains historical.

Command: `bun run check:affected --base 710038f0ed0cfc830580241ca1e90fca5f50677e`

[Original command output](logs/behavior-19.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
