# Verification report

Run: d9321820-432d-4549-a487-9f6713c30beb · ZWkang/nodebraid · issue #122

## Reviewed and published source

- Review base: `fc70eecccec5bb2f4173908b2829c5e3f75afbdf`
- Independently prepared append parent: `fc70eecccec5bb2f4173908b2829c5e3f75afbdf`
- Published head: `727b5e05c56d2706cc8aa1d06d2d80ff53d62c51`
- Reviewed local head: `01743ed7d1e516aea6876f2bb891473b8a98f351`
- Tree: `995191f91615636ed8d413d91cf050f9baa3329e`
- Complete binary patch SHA-256: `d583d225fb5e5e22d1a65506d33f3f54d943e249d44dcabd4a8954a8082df2e3`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

## Confirmed defect

At main `fc70eecccec5bb2f4173908b2829c5e3f75afbdf`, the synchronous public SVG Renderer Factory rereads each optional hit tolerance while checking presence, finiteness, sign and later storing it. A typed numeric getter can therefore replace its first invalid value with a later valid value.

A separately typechecked program was bundled from the actual public package exports and executed in real Chromium through the repository's locked agent-browser. All six changing-getter cases (two tolerance fields × first Infinity/NaN/negative value, later zero) incorrectly created a Renderer, appended its projection and added tabindex. Each getter was read four times. Four constant controls correctly rejected negative values and accepted zero. The public assertion requiring INVALID_CONFIG exits 1; the independent TypeScript check with browser DOM libraries exits 0.

For example, with an existing connected measurable SVG target:

```ts
import { createSvgRenderer } from '@nodebraid/renderer-svg';

let reads = 0;
const renderer = createSvgRenderer({
  target,
  get edgeHitTolerance() {
    return ++reads === 1 ? Infinity : 0;
  },
});
// Current result: a Renderer is created after four reads.
// Expected: INVALID_CONFIG for the first non-finite value, before target mutation.
```

The same failure occurs for connectionAnchorHitTolerance. The original browser entry, compiled artifact identities, observations and red log are retained in investigation `20261026T070355-discovery-svg-config-capture`. Its initial external TypeScript configuration lacked DOM libraries; that fixture-only configuration failure is retained separately and was corrected before any browser execution.

## Existing contract and cause

[ADR0053](https://github.com/ZWkang/nodebraid/blob/fc70eecccec5bb2f4173908b2829c5e3f75afbdf/docs/adr/0053-hit-test-semantic-svg-geometry.md), [ADR0057](https://github.com/ZWkang/nodebraid/blob/fc70eecccec5bb2f4173908b2829c5e3f75afbdf/docs/adr/0057-keep-the-svg-provider-api-narrow-and-synchronous.md) and the published SVG module contract define non-negative finite CSS-pixel tolerances. Existing defaults are 4 for Edge and 8 for Connection Anchor.

The shared owner is [svg-config.ts](https://github.com/ZWkang/nodebraid/blob/fc70eecccec5bb2f4173908b2829c5e3f75afbdf/packages/renderer-svg/src/svg-config.ts). Its only caller, createSvgRenderer, rereads the original values after validation.

## Acceptance

- Capture each optional tolerance once, validate that captured value and use it for the created Renderer. Retain first zero, positive and absent values and existing defaults.
- Reject first Infinity, NaN and negative values as INVALID_CONFIG before projection, tabindex or Target reservation changes. A later getter result must not rescue an invalid first value or replace a valid first value.
- Preserve own/inherited/non-enumerable readable properties, original getter receiver and first external thrown-value identity. Do not inspect later values unnecessarily.
- Use real browser public Factory/Hit Test controls to prove accepted Edge and Connection Anchor tolerances affect geometry as configured. Keep existing Target validation, unknown-key validation, input policy, CSS-pixel semantics, lifecycle and caller-owned Target behavior.
- Fix only the tolerance capture/validation/use path. No new public API, accessor prohibition, input policy change, dependencies, cap, retry or fallback.
- Preserve the original compiled red and prove green; add a browser regression before implementation, run affected and relevant checks, independent Standards with ponytail-review and Spec, one formal full engineering check, exact remote tree/first-parent publication, current-head CI, complete report/all mapped native preview readback.
- Keep this Issue open through actual main integration and whole-Issue acceptance.

## Deduplication

Complete all-state collections were read through their final short pages: 121 Issue/PR records and 62 PR records. Searches of titles and full bodies for the tolerance fields, svg-config, SVG capture/reread and tolerance symptoms found no existing matching delivery. Previous Basic Canvas Interaction-policy, Connection-option, Clipboard and Duplicate option captures concern different ownership paths and do not change this SVG Factory.


### public-red

Original real Chromium compiled10 controls and a repository public browser tracer fail before source fix; retain original raw source, bad DOM-lib fixture config and red logs.

Dependencies: none

### capture-svg-tolerances

One shared capture/validation owner returns accepted numeric tolerances to the only caller; retain first finite/zero/undefined value, first failure, receiver and existing defaults/Target and input validation semantics.

Dependencies: public-red

### integration-and-independent-review

Original compiled10, real public Factory/Hit Test regressions, full SVG browser and affected consumers pass; exact head/tree/full patch independently pass Standards+ponytail and Spec.

Dependencies: capture-svg-tolerances

### formal-engineering-check

Pinned main agents:run verify performs this delivery attempt's sole formal full bun run check after both reviews; preserve every failure.

Dependencies: integration-and-independent-review

### publish-current-head

Exact actual remote tree/first-parent publication, current head CI, complete paginated feedback and full original reports/all mapped native previews pass immutable byte readback.

Dependencies: formal-engineering-check

### authorized-merge

Current deployed main protocol, live strict protection and current source/review/check/feedback/tickets/presentation gates permit immediate normal expected-head merge; read actual merge result.

Dependencies: publish-current-head

### main-integration-acceptance

Fresh fetched main includes actual merge; original compiled10/public SVG browser behavior plus whole main CI and integration prove Issue acceptance before publishing summary and closing.

Dependencies: authorized-merge

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: captures each SVG hit tolerance once. The same accepted numbers reach Hit Test, including zero and the existing defaults.

- Base: `fc70eecccec5bb2f4173908b2829c5e3f75afbdf`
- Head: `01743ed7d1e516aea6876f2bb891473b8a98f351`
- Tree: `995191f91615636ed8d413d91cf050f9baa3329e`
- Binary patch SHA256: `d583d225fb5e5e22d1a65506d33f3f54d943e249d44dcabd4a8954a8082df2e3`
- Task digest: `3ed103ffd5797103c7db42b728885e35e9c670a69a748c6d428d88dd547d5717`

Reviewed the complete four-file patch, full Issue122 request and empty discussion, independent plan, retained tracer red/green, and all 48 new browser-case definitions. Canonical `git diff --binary BASE HEAD` matches `full-source.patch` bytewise. Commit list, clean checkout, sole parent, identities and whitespace passed independent checks before and after testing.

Hard documented standards: no violations found. Under ADR0053/0057 and Boundary Discipline, `svg-config.ts` remains the single acceptance owner; its only caller now stores the returned numbers. Unknown keys and Target validation still precede tolerances; Edge tolerance precedes Connection Anchor tolerance, followed by input policies and Target geometry/reservation. Invalid first values fail before DOM changes. Own, inherited and non-enumerable getters keep their receiver; thrown values propagate unchanged under ADR0029. Defaults remain 4 and 8 CSS pixels.

Judgment-only Fowler smells: no concrete finding. The private return shape joins values that must travel together and removes caller rereads without extra policy, dependency or abstraction.

Ponytail assessment: correct, safe, tested and lean for one synchronous Factory call per isolated SVG Target. Traced Factory, reservation/cleanup, Hit Test geometry, Runtime/Preset and Example consumers. Browser regressions assert actual geometry, original thrown values and unchanged/reusable Targets rather than private calls. Existing lifecycle assertions remain.

Independent command: `bun test packages/renderer-api/tests packages/renderer-svg/tests packages/preset-basic/tests packages/plugin-renderer/tests packages/plugin-interaction/tests packages/plugin-history/tests` exited 0: **343 tests, 2343 assertions**. Current compiled configuration and caller also passed static checks for one read per tolerance and the retained defaults. Full raw output is in `standards-tests.log`.

Not independently run: browser cases, TypeScript, builds, affected/full engineering checks, remote CI or publication/main acceptance. Coordinator results are not counted as reviewer execution.

**Verdict: passed. Looks good. Ship.**


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: passed

base: fc70eecccec5bb2f4173908b2829c5e3f75afbdf
head: 01743ed7d1e516aea6876f2bb891473b8a98f351
tree: 995191f91615636ed8d413d91cf050f9baa3329e
binary patch SHA256: d583d225fb5e5e22d1a65506d33f3f54d943e249d44dcabd4a8954a8082df2e3
taskDigest: 3ed103ffd5797103c7db42b728885e35e9c670a69a748c6d428d88dd547d5717

独立读回 [Issue122](https://github.com/ZWkang/nodebraid/issues/122) 全文、labels 与全部评论；最终读回为 2026-10-26 07:31:42 UTC，open、bug/ready-for-agent，评论0，正文与 prepared request 一致。审查当前规则/CONTEXT、ADR0053/0057/0046、Renderer 契约、完整四文件补丁和全部48个浏览器回归输入；追踪 validateConfig→Factory→hitTestProjection 及 Target reservation/disposal。Git 原始补丁与 full-source.patch 字节一致，inspection/prepared 身份匹配。

未发现验收遗漏、范围扩张或错误实现。针对 “Capture each optional tolerance once, validate that captured value and use it for the created Renderer”，校验 owner 分别保留首值并返回已接受数值，唯一 Factory caller 不再读取原字段；0/正值保留，undefined 使用既有4/8默认值。首 Infinity/NaN/负值及外部 getter 抛值在 projection/tabindex/reservation 修改前直接失败，原 receiver、继承/非枚举属性和验证顺序保留。Target、unknown-key、input policy、CSS-pixel、生命周期和公共导出未变。

48场景通过公共 Factory、真实已连接 SVG Target 和 Hit Test 观察行为，并验证失败后 Target 内容及可重用性；Edge 的3/5像素距离能区分0/4/6容差，Anchor 的5/√50距离能区分0/6/8容差。断言可检测只验证但未使用首值的错误，不依赖私有 helper。

产物稳定后，本轮独立执行 `bun test packages/renderer-api/tests packages/renderer-svg/tests packages/plugin-renderer/tests packages/plugin-interaction/tests packages/plugin-history/tests`：296 pass、0 fail、2196 assertions，21文件，exit0；`git diff --check BASE...HEAD` exit0。前后 HEAD/tree/patch/clean 未变，核对当前 dist 捕获和 Factory 使用路径。原 compiled10 的6个误接受/4个常量控制、tracer red 及48场景 green 日志只作读取核验，不算本人执行。完整命令和原始输出在 spec-tests.log。

未独立执行 build、browser、affected、正式 full check、原 compiled10 或远端发布/CI/媒体/merge/main 验收；公共 Bun 通过不替代实际浏览器和后续交付证据。


## Behavior evidence

### original-compiled-red

red — passed; exit 1; expected exit 1.

Six first-invalid changing tolerance inputs incorrectly create a Renderer on original main fc70; four static controls pass. Real Chromium behavior assertion exits1.

Command: `bun browser-probe.ts`

[Original command output](logs/behavior-1.log)

### public-tracer-red

red — passed; exit 1; expected exit 1.

Repository public Factory tracer rejects the invalid first Infinity only after this repair; original code returns no error, reads4 and modifies Target.

Command: `bun packages/renderer-svg/browser-tests/renderer-contract.browser.ts`

[Original command output](logs/behavior-2.log)

### public-tracer-green

green — passed; exit 0; expected exit 0.

Precommit minimal-fix tracer and complete SVG suite pass. This is retained precommit evidence; exact committed-head coverage is recorded separately.

Command: `bun packages/renderer-svg/browser-tests/renderer-contract.browser.ts`

[Original command output](logs/behavior-3.log)

### original-program-typecheck

check — passed; exit 0; expected exit 0.

Original main public ten-input browser program typechecks after explicitly including DOM libraries. Initial configuration failure is retained separately and is not product red.

Command: `tsc --noEmit -p tsconfig.json`

[Original command output](logs/behavior-4.log)

### compiled-program-green-typecheck

check — passed; exit 0; expected exit 0.

Byte-identical public ten-input entry is typechecked against the actual reviewed worktree package declarations; only runner metadata/roots differ.

Command: `tsc --noEmit -p original-compiled-green/tsconfig.json`

[Original command output](logs/behavior-5.log)

### compiled-program-green

green — passed; exit 0; expected exit 0.

Exact reviewed01743ed tree: all six first-invalid inputs reject after one read without mutation, four constant controls pass. Original program/assertions unchanged.

Command: `bun original-compiled-green/browser-probe.ts`

[Original command output](logs/behavior-6.log)

### complete-affected

check — passed; exit 0; expected exit 0.

Exact committed source affected build/types/public tests and actual Examples Basic SVG/Clipboard/Document plus complete SVG suite and48 capture/Hit Test cases pass.

Command: `bun run check:affected --base fc70eecccec5bb2f4173908b2829c5e3f75afbdf`

[Original command output](logs/behavior-7.log)

### independent-standards

check — passed; exit 0; expected exit 0.

Independent exact-head Standards+ponytail review and its separate343tests/2343assertions pass; browser evidence is read, not counted as reviewer execution.

Command: `bun test packages/renderer-api/tests packages/renderer-svg/tests packages/preset-basic/tests packages/plugin-renderer/tests packages/plugin-interaction/tests packages/plugin-history/tests`

[Original command output](logs/behavior-8.log)

### independent-spec

check — passed; exit 0; expected exit 0.

Independent exact-head Spec review and separate296tests/2196assertions pass; browser evidence is read, not counted as reviewer execution.

Command: `bun test packages/renderer-api/tests packages/renderer-svg/tests packages/plugin-renderer/tests packages/plugin-interaction/tests packages/plugin-history/tests`

[Original command output](logs/behavior-9.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.

## Reproducible source appendix

[Original compiled10 red, byte-identical reviewed green program, actual artifacts, derivation and retained execution-history limits](probes/compiled-controls.md). The independent original Markdown, request and verification/publication receipts remain unchanged. The48-case full SVG regression separately verifies default/zero/positive CSS-pixel Hit Test geometry, own/inherited/non-enumerable receiver behavior, original failures and Target reuse.
