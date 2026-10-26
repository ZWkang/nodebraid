# Verification report

Run: b2f5a1d4-c627-4a20-bec0-a61ad2376c9f · ZWkang/nodebraid · issue #124

## Reviewed and published source

- Review base: `7c61407b01a5b02f15ea17660790d6742713400c`
- Independently prepared append parent: `7c61407b01a5b02f15ea17660790d6742713400c`
- Published head: `a965d61a02ee2ecd59833f3c3d909d1f7c5712ba`
- Reviewed local head: `fc1f409583d81458a49005ab28bf7d18469fc873`
- Tree: `1f9cdfbdf57a5edc5ba6a5866a056aa76fa79622`
- Complete binary patch SHA-256: `85b8929187344b51c73005ac3fdf9a153872a3cd13e8315b05849474187ca509`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

## Confirmed defect

At main `7c61407b01a5b02f15ea17660790d6742713400c`, SVG DOM event policy normalization rereads each optional boolean during presence/type validation and again while copying it. A valid typed getter can therefore change the static policy that reaches native input handling.

A separately typechecked program bundles the actual public exports and drives **eight genuine trusted Chromium Wheel inputs through CDP**. The Renderer publishes one real Wheel Input for every case. Four constant true/false controls pass. All four changing-getter cases apply a later value:

- `preventDefault`: first true/later false leaves the native event unprevented; first undefined/later true unexpectedly prevents it.
- `stopPropagation`: first true/later false bubbles to the outer element; first undefined/later true unexpectedly stops bubbling.
- Present first values are read three times; absent first values twice. Original receivers remain correct.

The public behavior assertion exits 1; TypeScript exits 0. No injected DOM Events, patched event methods, fake Renderer, missing baseline or application Disposition listener substitutes for native handling. The isolated browser uses the repository's locked agent-browser and the existing owned-page CDP helper. Raw entry, bundle, commands, trusted event observations and failure log are retained in `20261026T084642-discovery-svg-wheel-policy-capture`.

## Existing contract and cause

[ADR0052](https://github.com/ZWkang/nodebraid/blob/7c61407b01a5b02f15ea17660790d6742713400c/docs/adr/0052-integrate-svg-input-with-browser-primitives.md) defines static per-family `preventDefault`/`stopPropagation`, defaulting to false. Dynamic subscription Disposition is a separate existing seam.

[`normalizeDomEventPolicy`](https://github.com/ZWkang/nodebraid/blob/7c61407b01a5b02f15ea17660790d6742713400c/packages/renderer-svg/src/svg-config.ts) is the shared copy/validation owner for pointer, wheel, keyboard and contextMenu. It checks an original property and later rereads it for the accepted policy object; native handlers then correctly apply that wrong captured value.

## Acceptance

- Capture each of the two optional boolean fields once at the shared owner and use that same value for validation and the static snapshot. Retain first true, false and undefined with the existing false default.
- Preserve pointer/wheel/keyboard/contextMenu behavior, own/inherited/non-enumerable readable fields, original receiver and original first thrown-value identity. Later values or exceptions must not replace a valid first value.
- Preserve unknown-key and object validation, preventDefault-before-stopPropagation validation/error precedence and no Target mutation/reservation on constructor failure. Do not read a later field after the first invalid field fails.
- Real trusted native input proves both configured controls across the existing input families; preserve ordinary subscription delivery, dynamic Disposition, focus/capture semantics, touch-action behavior and input cleanup.
- Fix only shared boolean policy capture. No change to the already repaired numeric tolerances, Target mapping, public API, policy defaults, dependencies, caps, retries or fallback.
- Preserve original compiled/native eight-case red and prove green, add a public browser tracer before source implementation, complete related/affected checks and independent Standards with ponytail-review plus Spec, then one formal full check, exact remote tree/first-parent publication, current-head CI, full original reports/all mapped scenes and immutable byte readback.
- Keep this Issue open through actual main integration and whole-Issue acceptance.

## Deduplication

Complete all-state collections were read through their final short pages: 123 Issue/PR records and 63 PR records. Title/body checks for the two fields, DOM-policy normalizer, boolean-policy capture/getters/rereads found no matching delivery. #122/#123 explicitly repaired only the two numeric SVG hit tolerances and excluded input policy changes. #120 concerns Kernel Endpoint Port copying. These are different owners/fields; their completed work is retained.


### public-red

Original eight trusted native Wheel inputs and a repository browser tracer fail against the unchanged baseline; original code/observations/bundles/logs retained.

Dependencies: none

### capture-dom-event-policy

Shared boolean normalizer captures both flags once and validates/uses that value, preserving true/false/undefined/defaults, receiver, first errors and validation order; no other input or tolerance policy change.

Dependencies: public-red

### integration-and-independent-review

Original native compiled8 and expanded public constructor/native input cases, related/affected checks and independent Standards+ponytail/Spec pass with exact full source identity.

Dependencies: capture-dom-event-policy

### formal-engineering-check

Pinned main agents:run verify performs this attempt's sole formal full bun run check after both reviews; retain original failures.

Dependencies: integration-and-independent-review

### publish-current-head

Actual remote tree/first parent, current head CI, trusted main evidence publisher and full original reports/all five native mapped scenes pass complete immutable readback and feedback checks.

Dependencies: formal-engineering-check

### authorized-merge

Current deployed main protocol, live strict protection and all current source/review/check/feedback/ticket/presentation gates permit immediate normal expected-head merge; read actual result.

Dependencies: publish-current-head

### main-integration-acceptance

Fresh actual main build, original trusted native8 and public browser behavior/related tests plus full main CI/Deploy complete whole Issue acceptance before summary publication and closure.

Dependencies: authorized-merge

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: captures each DOM event policy flag once. Validation and native event handling use that same first value, with the existing false defaults.

- Base: `7c61407b01a5b02f15ea17660790d6742713400c`
- Head: `fc1f409583d81458a49005ab28bf7d18469fc873`
- Tree: `1f9cdfbdf57a5edc5ba6a5866a056aa76fa79622`
- Binary patch SHA256: `85b8929187344b51c73005ac3fdf9a153872a3cd13e8315b05849474187ca509`
- Task digest: `5031468a8004d7ef6de02b03a79a56344343a461dc89c607bf114cda97f392d8`

Reviewed the complete four-file patch, including the entire new 201-line fixture, all 72 native-input and 72 constructor-failure case definitions, full Issue124 request, empty discussion, independent plan and retained tracer red/green. Canonical `git diff --binary BASE HEAD` matches `full-source.patch` bytewise. Source identities, sole parent, clean checkout and whitespace were independently checked before and after tests.

Hard documented standards: no violations found. `normalizeDomEventPolicy` remains the shared owner for all four input families, consistent with Boundary Discipline and ADR0052/0057. Object/unknown-key checks still precede field reads. Each field is read, validated and stored before the next field; invalid values and original thrown values stop immediately, preserving ADR0029 and constructor failure precedence before Target mutation/reservation. True, false, undefined, inherited/non-enumerable fields and original receivers retain their intended meaning.

Judgment-only Fowler smells: no concrete finding. The small private accepted object removes rereads without another policy layer, public API, dependency or fallback. Numeric tolerance handling is unchanged.

Ponytail assessment: correct, safe and lean for synchronous construction of isolated SVG Targets. Traced all four native handlers, dynamic subscription Disposition, semantic delivery, focus/capture and disposal. Browser fixtures observe native prevention/bubbling, trusted inputs, semantic delivery and Target reuse; they do not substitute synthetic DOM Events or a fake Renderer.

Independent command: `bun test packages/renderer-api/tests packages/renderer-svg/tests packages/preset-basic/tests packages/plugin-renderer/tests packages/plugin-interaction/tests packages/plugin-history/tests` exited 0: **343 tests, 2343 assertions**. Current compiled policy code also passed static single-read/accepted-value checks. Full raw output is retained in `standards-tests.log`.

Not independently run: native/browser cases, TypeScript, builds, affected/full engineering checks, remote CI or publication/main acceptance. The Bun result proves the selected public contracts; coordinator browser results are separate evidence.

**Verdict: passed. Looks good. Ship.**


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: passed

base: 7c61407b01a5b02f15ea17660790d6742713400c
head: fc1f409583d81458a49005ab28bf7d18469fc873
tree: 1f9cdfbdf57a5edc5ba6a5866a056aa76fa79622
binary patch SHA256: 85b8929187344b51c73005ac3fdf9a153872a3cd13e8315b05849474187ca509
taskDigest: 5031468a8004d7ef6de02b03a79a56344343a461dc89c607bf114cda97f392d8

独立读回 [Issue124](https://github.com/ZWkang/nodebraid/issues/124) 全文、labels 和完整评论；最终读回为 2026-10-26 09:20:50 UTC，open、bug/ready-for-agent，评论0，正文与 prepared request 一致。核对当前规则/CONTEXT、ADR0052/0057/0029、Renderer Factory/Input 契约、prepared 计划及完整四文件补丁；审查全部新 fixture、72原生输入与72构造失败场景。Git 原始补丁与 full-source.patch 字节一致，inspection/prepared 身份匹配。

未发现缺失、范围扩张或错误实现。针对 “Capture each of the two optional boolean fields once at the shared owner”，每个字段只取值一次，用同一值校验并写入自有静态策略；首 true/false 保留，undefined 仍默认 false。object/unknown-key 检查在前，preventDefault 先于 stopPropagation；首无效值立即失败，不读取后一字段。普通/继承/非枚举 getter receiver 与首抛值保留。Factory 在策略归一化后才变更或保留 Target，失败后的内容与可重用性有公共断言。数值容差、公共 API、静态默认值和原生 handlers/Disposition/focus/capture/touch-action/cleanup 路径未改。

新 fixture 通过现有 CDP helper 驱动 Pointer/Wheel/Keyboard/Context Menu，要求 isTrusted、目标 defaultPrevented/cancelBubble、父级冒泡和真实订阅投递。没有注入 Event、替换事件方法或通过动态 Disposition 伪造静态策略效果；true/false/absent 控制可区分正确首值与错误后值，构造矩阵也验证首失败优先与 Target reuse。既有48个数值容差场景保留。

产物稳定后，独立执行 `bun test packages/renderer-api/tests packages/renderer-svg/tests packages/plugin-renderer/tests packages/plugin-interaction/tests packages/plugin-history/tests`：296 pass、0 fail、2196 assertions，21文件，exit0；`git diff --check BASE...HEAD` exit0。前后 HEAD/tree/patch/clean 未变，当前 dist 单次捕获路径已核对。历史 native8 源码/受信事件观察、tracer red/green 与扩展浏览器日志仅作读取核验，不算本人执行。完整命令和原始输出见 spec-tests.log。

未独立执行 build、browser、affected、formal full check、原 compiled8、远端发布/CI/媒体/merge 或 main 整项验收；本轮 Spec 结论不替代这些交付证据。


## Behavior evidence

### original-native-red

red — passed; exit 1; expected exit 1.

Original main native8: all8 inputs trusted,4 constant controls pass,4 changing valid typed getters apply later booleans; behavior assertion exits1.

Command: `bun browser-probe.ts`

[Original command output](logs/behavior-1.log)

### public-tracer-red

red — passed; exit 1; expected exit 1.

Repository trusted Wheel tracer observes unprevented first-true event and3reads before the normalizer edit. Original red bundle/source/patch retained.

Command: `bun packages/renderer-svg/browser-tests/renderer-contract.browser.ts`

[Original command output](logs/behavior-2.log)

### public-tracer-green

green — passed; exit 0; expected exit 0.

Precommit minimal-fix tracer and entire SVG suite pass; retained as precommit evidence, not a replacement for exact committed-head checks.

Command: `bun packages/renderer-svg/browser-tests/renderer-contract.browser.ts`

[Original command output](logs/behavior-3.log)

### original-typecheck

check — passed; exit 0; expected exit 0.

Original typed native-input program passes TypeScript with actual browser declarations.

Command: `tsc --noEmit -p tsconfig.json`

[Original command output](logs/behavior-4.log)

### green-typecheck

check — passed; exit 0; expected exit 0.

Byte-identical original eight-input entry typechecks against the reviewed worktree declarations; only runner metadata/roots differ.

Command: `tsc --noEmit -p original-compiled-green/tsconfig.json`

[Original command output](logs/behavior-5.log)

### compiled-native-green

green — passed; exit 0; expected exit 0.

Actual reviewed fc1f409: all8 real native Wheel observations trusted; all first booleans/defaults applied after one captured read,4 constant controls intact.

Command: `bun original-compiled-green/browser-probe.ts`

[Original command output](logs/behavior-6.log)

### complete-affected

check — passed; exit 0; expected exit 0.

Exact committed source affected build/type/public tests,72 trusted native +72 constructor cases, existing48 tolerances and all Examples/Clipboard/Document suites pass.

Command: `bun run check:affected --base 7c61407b01a5b02f15ea17660790d6742713400c`

[Original command output](logs/behavior-7.log)

### independent-standards

check — passed; exit 0; expected exit 0.

Independent exact-source Standards+ponytail and343tests/2343assertions pass. Native evidence is read, not counted as reviewer execution.

Command: `bun test packages/renderer-api/tests packages/renderer-svg/tests packages/preset-basic/tests packages/plugin-renderer/tests packages/plugin-interaction/tests packages/plugin-history/tests`

[Original command output](logs/behavior-8.log)

### independent-spec

check — passed; exit 0; expected exit 0.

Independent exact-source Spec and296tests/2196assertions pass; full original Markdown saved.

Command: `bun test packages/renderer-api/tests packages/renderer-svg/tests packages/plugin-renderer/tests packages/plugin-interaction/tests packages/plugin-history/tests`

[Original command output](logs/behavior-9.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.

## Reproducible source appendix

[Original trusted native8 red, byte-identical reviewed green entry, actual artifact identities and preserved repository tracer source/bundle hashes](probes/compiled-controls.md). Full original independent Markdown, request, checks, behavior logs and verification/publication receipts remain unchanged. Native scene previews supplement, and do not replace, the focused input-policy regressions.
