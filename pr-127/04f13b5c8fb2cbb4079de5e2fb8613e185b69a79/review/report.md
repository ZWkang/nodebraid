# Verification report

Run: b7113488-5488-4455-bdfe-9e19d3e9bd04 · ZWkang/nodebraid · issue #126

## Reviewed and published source

- Review base: `6fd2d016f6330cc422508b3e51229bea4be2cce0`
- Independently prepared append parent: `6fd2d016f6330cc422508b3e51229bea4be2cce0`
- Published head: `04f13b5c8fb2cbb4079de5e2fb8613e185b69a79`
- Reviewed local head: `1bdfa894f0e1081ef18dc8459108d127653f971b`
- Tree: `5db45010568a9ea7141005ce29ad0b4d12d20bc8`
- Complete binary patch SHA-256: `61009ea6271e44f300cab49c8be741e41190832bac705e384f590b2d34a6fdea`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## PR risk and merge route

Risk: medium. Route: quick-human.

- standards: medium — Compatible public framework behavior repair changes Shortcut normalization, matching keys and Command routing across Interaction, Duplicate and Clipboard consumers. packages/plugin-interaction/src paths impose the deployed medium floor; small size and passing checks do not qualify it as low. Focused human review remains required.
- spec: medium — 修改公共 framework src 的 Shortcut 值归一化及实际 Command 路由；命中 packages/*/src 的 medium 下限，需要重点人工审阅绑定/匹配与生命周期边界。
- packages/plugin-interaction/src/shortcut-runtime.ts: minimum medium risk.
- packages/plugin-interaction/src/shortcut-value.ts: minimum medium risk.

### standards risk: medium

Impact and reasoning: Compatible public framework behavior repair changes Shortcut normalization, matching keys and Command routing across Interaction, Duplicate and Clipboard consumers. packages/plugin-interaction/src paths impose the deployed medium floor; small size and passing checks do not qualify it as low. Focused human review remains required.

Evidence: Complete four-file canonical patch 61009ea6271e44f300cab49c8be741e41190832bac705e384f590b2d34a6fdea reviewed at head 1bdfa894f0e1081ef18dc8459108d127653f971b; independent public Bun command exited 0 with 451 tests and 2832 assertions, including real Host/Command matching and existing disposal/reactivation cases. Identity/canonical bytes/current compiled capture were checked before and after. Native browser/full engineering verification was not independently executed; early historical red diffs omit untracked preimages.

Rollback: Revert commit 1bdfa894f0e1081ef18dc8459108d127653f971b through normal review and recreate affected Runtime Activations to restore prior normalization. No stored schema or data migration is introduced. Reverting code does not reverse Commands that have already run; their effects require the application's existing recovery or History contract.

### spec risk: medium

Impact and reasoning: 修改公共 framework src 的 Shortcut 值归一化及实际 Command 路由；命中 packages/*/src 的 medium 下限，需要重点人工审阅绑定/匹配与生命周期边界。

Evidence: 完整四文件补丁、ADR0074 和注册/匹配/Disposition/disposal 调用链已独立审查；固定身份下独立公共组合452 tests/2792 assertions通过，原始输出在 spec-tests.log；现行 pr-risk blob596298db784c4f3424968cd05a3aca4a6471b1b3已核对。

Rollback: 以普通回退提交撤销 source commit1bdfa894f0e1081ef18dc8459108d127653f971b的四文件改动；无schema、依赖或数据迁移。回退会恢复getter重读缺陷，不能追溯撤销已执行的应用Command。

Automatic routing is a candidate only. The coordinator still checks current PR status, report publication, pre-merge acceptance and authorization immediately before a head-bound merge.

## Acceptance plan

## Confirmed defect

At main `6fd2d016f6330cc422508b3e51229bea4be2cce0`, Shortcut definition and binding normalization validate fields and later reread them when constructing the owned value. Typed getters can therefore replace validated values.

A strictly typechecked, compiled program uses the public package exports and six controls. Two constant controls pass; four changing-getter controls fail:

- `defineInteractionShortcut` reads `code` three times and returns an empty code after validating a nonempty code.
- It reads `modifierAlternatives` three times and returns an empty alternatives collection after validating a nonempty collection.
- A modifier field is read twice, so the returned immutable shortcut contains a later boolean.
- A real Plugin Host, Basic Composition, Command Service and Interaction Shortcut registration execute the later Command instead of the first Command supplied by the binding getter. Both Command tokens are real, separately registered public tokens.

The last control uses an explicitly recording Renderer with normalized Keyboard Input at the existing public seam. It is not a native browser or SVG gesture claim. The original entry, compiled red bundle, public dependency hashes, raw observations and exit-1 log are retained locally.

## Contract and cause

[ADR-0074](https://github.com/ZWkang/nodebraid/blob/6fd2d016f6330cc422508b3e51229bea4be2cce0/docs/adr/0074-compose-shortcuts-through-interaction-authority.md) defines a static, Activation-owned Shortcut Binding that routes normalized input to its typed Command.

[`defineInteractionShortcut`](https://github.com/ZWkang/nodebraid/blob/6fd2d016f6330cc422508b3e51229bea4be2cce0/packages/plugin-interaction/src/shortcut-value.ts) explicitly requires a nonempty code and modifier alternatives, but rereads those properties and modifier booleans after validation. [`acceptBinding`](https://github.com/ZWkang/nodebraid/blob/6fd2d016f6330cc422508b3e51229bea4be2cce0/packages/plugin-interaction/src/shortcut-runtime.ts) similarly rereads `binding.command` for its owned snapshot.

## Acceptance

- Capture each relevant field once at its existing normalization owner, validate and retain that same value: code, alternatives, modifier booleans, binding shortcut and Command.
- Retain original getter receivers, original thrown-value identity, existing `INVALID_SHORTCUT` classification and first-invalid-field/error order. Do not read later fields after an earlier invalid value fails.
- Public definitions never publish the empty code/alternatives that this reproduction currently produces; registration executes the originally captured Command and preserves captured modifier matching.
- Preserve ordinary matching, modifier alternatives, repeat/gesture arbitration, capability-unavailable handling, Disposition, conflict reservations, in-flight cancellation/disposal and reactivation.
- Keep current public APIs, defaults and array traversal/coercion policies. Do not add a Registry, retry, cap, fallback, new shortcut policy or unrelated Snapshot/Delete Selection change.
- Preserve the independent six-case compiled red evidence and demonstrate green; add public regression tracers before implementation, complete related/affected checks, independent Standards with ponytail-review and Spec/risk, then the formal full check and current-head publication/CI/report/evidence gates.
- Keep the Issue open through actual main integration and whole-Issue acceptance.

## Runnable public reproduction

After building the workspace, place this script at the repository root and run `NODEBRAID_PROBE_RESULTS=/tmp/nodebraid-shortcut-repro.json bun ./shortcut-repro.ts`. At the base above it exits 1: four changing-value cases fail and two constant controls pass. The original program was also independently typechecked and executed as a compiled public-import bundle.

```ts
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createBasicCanvasPlugin} from '@nodebraid/preset-basic';
import {createPluginHost,definePlugin} from '@nodebraid/runtime-cordis';
import {commandService,defineCommand} from '@nodebraid/plugin-command';
import {defineInteractionShortcut,interactionShortcutService,type InteractionShortcutBinding} from '@nodebraid/plugin-interaction';
import type {InteractionProjection} from '@nodebraid/interaction-api';
import type {SessionSnapshot} from '@nodebraid/session-api';
import type {CanvasRenderer,RendererDocumentUpdate,RendererInput,RendererInputListener,InputDisposition,HitResult,ScreenPoint,InputModifiers} from '@nodebraid/renderer-api';
const results:{name:string;passed:boolean;details:unknown}[]=[];
function record(name:string,passed:boolean,details:unknown){results.push({name,passed,details});writeFileSync(process.env.NODEBRAID_PROBE_RESULTS!,JSON.stringify(results,null,2)+'\n');}
const normal={alt:false,control:false,meta:false,shift:false};
{
 let reads=0;const input={get code(){reads++;return reads<3?'KeyP':'';},modifierAlternatives:[normal]};
 const result=defineInteractionShortcut(input);record('changing-code',result.code==='KeyP'&&reads===1,{reads,first:'KeyP',actual:result.code,nonempty:result.code.length>0});
}
{
 let reads=0;const input={code:'KeyP',get modifierAlternatives(){reads++;return reads<3?[normal]:[];}};
 const result=defineInteractionShortcut(input);record('changing-alternatives',result.modifierAlternatives.length===1&&reads===1,{reads,firstLength:1,actualLength:result.modifierAlternatives.length});
}
{
 let reads=0;const modifiers:InputModifiers={get alt(){reads++;return reads===1?false:true;},control:false,meta:false,shift:false};
 const result=defineInteractionShortcut({code:'KeyP',modifierAlternatives:[modifiers]});record('changing-modifier',result.modifierAlternatives[0]!.alt===false&&reads===1,{reads,first:false,actual:result.modifierAlternatives[0]!.alt});
}
{
 const result=defineInteractionShortcut({code:'KeyP',modifierAlternatives:[normal]});record('constant-definition',result.code==='KeyP'&&result.modifierAlternatives.length===1&&result.modifierAlternatives[0]!.alt===false,{code:result.code,alternatives:result.modifierAlternatives});
}
class RecordingRenderer implements CanvasRenderer{
 readonly listeners=new Set<RendererInputListener>();
 updateDocument(_update:RendererDocumentUpdate):void{}updateSession(_snapshot:SessionSnapshot):void{}updateInteraction(_projection:InteractionProjection|null):void{}
 subscribeInput(listener:RendererInputListener):()=>void{this.listeners.add(listener);return ()=>{this.listeners.delete(listener);};}
 hitTest(point:ScreenPoint):HitResult|null{return {type:'canvas',worldPoint:point};}
 capturePointer(_id:number):void{}releasePointer(_id:number):void{}focus():void{}
 async dispose():Promise<void>{this.listeners.clear();}
 emit(input:RendererInput):InputDisposition|undefined{let disposition:InputDisposition|undefined;for(const listener of this.listeners)disposition=listener(input)??disposition;return disposition;}
}
for(const changing of [true,false]){
 const renderer=new RecordingRenderer(),first=defineCommand<void,void>('probe.first'),later=defineCommand<void,void>('probe.later');
 const observed=Promise.withResolvers<string>();const calls:string[]=[];let reads=0;
 const host=createPluginHost();const composition=host.install(createBasicCanvasPlugin(()=>renderer));
 const consumer=host.install(definePlugin({requires:{commands:commandService,shortcuts:interactionShortcutService},setup(context){
  context.own(context.services.commands.register(first,()=>{calls.push('first');observed.resolve('first');}).dispose);
  context.own(context.services.commands.register(later,()=>{calls.push('later');observed.resolve('later');}).dispose);
  const binding:InteractionShortcutBinding<void>={shortcut:{code:'KeyP',modifierAlternatives:[normal]},get command(){reads++;return changing&&reads>=3?later:first;}};
  const registration=context.services.shortcuts.register(binding);context.own(()=>registration.dispose());
 }}));
 await Promise.all([composition.whenActive(),consumer.whenActive()]);
 const disposition=renderer.emit({type:'key.down',key:'p',code:'KeyP',repeat:false,modifiers:normal});
 assert.deepEqual(disposition,{defaultAction:'prevent'});const actual=await observed.promise;
 await host.dispose();assert.equal(renderer.listeners.size,0);
 record(changing?'changing-binding-command':'constant-binding-command',actual==='first'&&(!changing||reads===1),{reads,actual,calls,renderer:'explicit normalized-input public fixture; no native browser claim'});
}
console.log(JSON.stringify({controls:results.length,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed),source:'actual typed compiled public definition and Host/Command/Interaction seam'}));
assert.equal(results.length,6);
assert.ok(results.every(x=>x.passed),'Shortcut normalization must use the same captured values for validation and ownership.');
```

## Deduplication

Complete all-state collections were read through their final short pages: 125 Issue/PR records (100 + 25) and 64 PRs (20 + 20 + 20 + 4). No existing delivery covers these shared normalizers. Issue #35 / PR #36 repaired Duplicate Selection Behavior and Shortcut factory options; their actual five changed files are confined to `plugin-duplicate-selection`. Its completed implementation and empty discussions are preserved. The present failure is in shared `plugin-interaction` Shortcut value/binding ownership.

### public-red

Preserve original independent compiled6 red and add repository public Shortcut value/binding tracer red before source implementation.

Dependencies: none

### capture-shortcut-values

Existing value/binding owners validate and own the same once-captured fields; preserve receiver, first failure/invalid order, matching and lifecycle policies.

Dependencies: public-red

### integration-and-independent-review

Original byte-identical compiled6 green, expanded public regression/error/behavior tests, relevant/affected checks and independent Standards+ponytail/Spec with complete current risk pass at exact head/tree/patch.

Dependencies: capture-shortcut-values

### formal-engineering-check

Pinned current-main agents:run verify executes this delivery attempt's actual full bun run check once after both independent reviews; preserve every failed attempt.

Dependencies: integration-and-independent-review

### publish-current-head

Actual remote tree/first parent, current head CI, source-bound full original review/report/all mapped native scene publication/readback and complete feedback are verified.

Dependencies: formal-engineering-check

### required-review-and-authorized-merge

Apply deployed canonical risk route and actual applicable authorization; complete required human review where mandated, all pre-merge tickets/evidence/current strict gates, then only immediate normal expected-head merge and readback. Do not infer permission from risk labels or old receipts.

Dependencies: publish-current-head

### main-integration-acceptance

Fresh actual main whole-Issue acceptance, original compiled/public regressions and actual main CI/Deploy complete before authorized acceptance summary/Issue closure and archive.

Dependencies: required-review-and-authorized-merge

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: retains the first validated Shortcut fields and Command token. Definitions and matching use the same owned values.

- Base: `6fd2d016f6330cc422508b3e51229bea4be2cce0`
- Head: `1bdfa894f0e1081ef18dc8459108d127653f971b`
- Tree: `5db45010568a9ea7141005ce29ad0b4d12d20bc8`
- Binary patch SHA256: `61009ea6271e44f300cab49c8be741e41190832bac705e384f590b2d34a6fdea`
- Task digest: `99febd96154ef7db40a4451f336d1fa3a68344b3e0b1c4e92b19d56135b40d98`

Reviewed the complete four-file patch, full Issue126 and empty discussion, independent plan and TDD ledger. Canonical `git diff --binary BASE HEAD` matches `change.patch` bytewise. Identities, clean checkout, parent and whitespace passed checks before/after testing.

Hard standards: no violations found. Under ADR0074 and Boundary Discipline, existing value/binding owners capture before validation and reuse their results. Required modifiers remain required; invalid values stop later reads. Command validation still precedes Shortcut access. Original receivers and thrown values follow ADR0029. Frozen shells, existing array traversal, conflict reservations, repeat/gesture arbitration, Disposition, cancellation and reactivation remain intact.

Judgment-only Fowler smells: no concrete finding. The small sequential modifier loop preserves short circuits without a new abstraction or policy.

Ponytail assessment: correct, safe and lean for isolated per-Canvas Activations. Traced definition, registration, matching, Command dispatch/disposal, Interaction wiring and Duplicate/Clipboard factories. New public tests use real Host/Command services and the existing recording Renderer seam, without claiming native-browser coverage.

Independent command: `bun test packages/plugin-interaction/tests packages/plugin-duplicate-selection/tests packages/plugin-clipboard/tests packages/preset-basic/tests tests/layout-providers.test.ts` exited 0: **451 tests, 2832 assertions**. Compiled capture code also passed static checks; complete raw output is saved.

Risk: **medium**, per deployed `pr-risk` blob `596298db784c4f3424968cd05a3aca4a6471b1b3`. Public framework source changes matching and Command routing across consumers; its medium path floor requires focused human review. Evidence is the complete patch and independent public checks above. Rollback: revert this commit and create fresh Activations. No schema migration exists; a code revert cannot undo Commands already executed.

Not independently run: TypeScript, builds, browser/affected/full checks, original compiled-six reproduction or remote CI/publication. Historical code/alternatives red diffs omit then-untracked test preimages; retained logs are not reconstructed preimages.

**Verdict: passed. Looks good. Ship.** This review is not merge approval.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: passed

base: 6fd2d016f6330cc422508b3e51229bea4be2cce0
head: 1bdfa894f0e1081ef18dc8459108d127653f971b
tree: 5db45010568a9ea7141005ce29ad0b4d12d20bc8
binary patch SHA256: 61009ea6271e44f300cab49c8be741e41190832bac705e384f590b2d34a6fdea
taskDigest: 99febd96154ef7db40a4451f336d1fa3a68344b3e0b1c4e92b19d56135b40d98

独立读取 [Issue126](https://github.com/ZWkang/nodebraid/issues/126) 全文和完整评论；最终读回2026-10-26 13:17:41 UTC，open、bug/ready-for-agent，评论0，原始request未变。审查全部四文件、新197行测试、当前规范/CONTEXT、ADR0074、归一化→注册→匹配→Command/Disposition→disposal/reactivation调用链。原始补丁与change.patch字节一致，独立prepared/inspection身份匹配。

未发现遗漏、错误实现或范围扩张。对照 “validate and retain that same value”，code、alternatives根、四个required modifier及binding Command复用首值；binding shortcut只读一次。原receiver、首抛值、INVALID_SHORTCUT及command→shortcut、code→alternatives、alt→control→meta→shift的失败顺序保留，首无效字段后不读下一字段。临时false初始化不成为modifier缺省值，非法字段仍抛错。既有map/length/coercion/sparse策略保持，未加入索引规则；匹配、conflict reservation、repeat/gesture/capability/Disposition/cancellation/释放逻辑及API未扩张，Snapshot/Delete Selection不变。

本人在稳定产物上执行 `bun test packages/plugin-interaction/tests packages/plugin-duplicate-selection/tests packages/plugin-clipboard/tests packages/plugin-history/tests packages/core/tests`：452 pass、0 fail、2792 assertions，34文件，exit0；`git diff --check BASE...HEAD` exit0，前后HEAD/tree/patch/clean一致。原compiled6源码逐字节相同及bundle/公共入口哈希、TDD记录只作读取核验。早期code/alternatives红patch未包含当时untracked测试，未视为完整原始preimage。记录见spec-tests.log。

未本人执行build、类型检查、affected、compiled6、browser、formal full或远端CI/发布/媒体/merge/main验收；记录Renderer只证明规范化输入公共seam。Spec通过不等于人工批准或交付完成。

risk: {"level": "medium", "rationale": "修改公共 framework src 的 Shortcut 值归一化及实际 Command 路由；命中 packages/*/src 的 medium 下限，需要重点人工审阅绑定/匹配与生命周期边界。", "evidence": "完整四文件补丁、ADR0074 和注册/匹配/Disposition/disposal 调用链已独立审查；固定身份下独立公共组合452 tests/2792 assertions通过，原始输出在 spec-tests.log；现行 pr-risk blob596298db784c4f3424968cd05a3aca4a6471b1b3已核对。", "rollback": "以普通回退提交撤销 source commit1bdfa894f0e1081ef18dc8459108d127653f971b的四文件改动；无schema、依赖或数据迁移。回退会恢复getter重读缺陷，不能追溯撤销已执行的应用Command。"}


## Behavior evidence

### original-public-six-red

red — passed; exit 1; expected exit 1.

At immutable main6fd2 public artifacts, byte-preserved typed program reports4 changing-getter failures and2 constant controls. Normalized-input recording Renderer is explicit fixture, not native browser.

Command: `NODEBRAID_PROBE_RESULTS=/Users/zhou/.codex/local-workflows/nodebraid/runs/20261026T115845-discovery-shortcut-owned-values/observations.json bun /Users/zhou/.codex/local-workflows/nodebraid/runs/20261026T115845-discovery-shortcut-owned-values/build/shortcut-repro.js`

[Original command output](logs/behavior-1.log)

### original-public-six-green

green — passed; exit 0; expected exit 0.

The exact same entry bytes execute6/6 green against reviewed local1bdfa894 public dist. Published04f13b5c has the actual same reviewed tree and prepared first parent; no new execution at another SHA is claimed.

Command: `NODEBRAID_PROBE_RESULTS=/Users/zhou/.codex/local-workflows/nodebraid/runs/b7113488-5488-4455-bdfe-9e19d3e9bd04/original-green-observations.json bun /Users/zhou/.codex/local-workflows/nodebraid/runs/b7113488-5488-4455-bdfe-9e19d3e9bd04/original-green-build/original-shortcut-repro.js`

[Original command output](logs/behavior-2.log)

### repository-binding-red

red — passed; exit 1; expected exit 1.

Original real Host/Command tracer executes later Command instead of first. Raw failure log retained; early code/alternatives untracked file preimages are not claimed as separately captured.

Command: `bun test packages/plugin-interaction/tests/lifecycle.test.ts -t 'Shortcut Binding preserves the Command accepted from a caller getter'`

[Original command output](logs/behavior-3.log)

### repository-code-red

red — passed; exit 1; expected exit 1.

Original definition tracer publishes empty code. Raw failure log retained; early code/alternatives untracked file preimages are not claimed as separately captured.

Command: `bun test packages/plugin-interaction/tests/shortcut-values.test.ts`

[Original command output](logs/behavior-4.log)

### repository-alternatives-red

red — passed; exit 1; expected exit 1.

Original definition tracer publishes empty alternatives. Raw failure log retained; early code/alternatives untracked file preimages are not claimed as separately captured.

Command: `bun test packages/plugin-interaction/tests/shortcut-values.test.ts`

[Original command output](logs/behavior-5.log)

### repository-modifier-red

red — passed; exit 1; expected exit 1.

Original modifier tracer changes firstfalse to latertrue. Raw failure log retained; early code/alternatives untracked file preimages are not claimed as separately captured.

Command: `bun test packages/plugin-interaction/tests/shortcut-values.test.ts`

[Original command output](logs/behavior-6.log)

### repository-expanded-green

green — passed; exit 0; expected exit 0.

85 tests/287 assertions cover new Shortcut values and real matching/reservations alongside existing lifecycle cases. Later readonly test.each argument typing correction leaves values/assertions unchanged; affected/formal checks exercise committed correction.

Command: `bun test packages/plugin-interaction/tests/shortcut-values.test.ts packages/plugin-interaction/tests/lifecycle.test.ts`

[Original command output](logs/behavior-7.log)

### related-affected

check — passed; exit 0; expected exit 0.

Exact committed local1bdfa894 affected check covers7 consumers, actual Examples/SVG browser suites and docs verification/build. This is not the formal full check.

Command: `bun run check:affected --base 6fd2d016f6330cc422508b3e51229bea4be2cce0`

[Original command output](logs/behavior-8.log)

### independent-standards

check — passed; exit 0; expected exit 0.

Independent standards public check: 451 tests/2832 assertions. Original full report/risk retain scope and limits.

Command: `bun test packages/plugin-interaction/tests packages/plugin-duplicate-selection/tests packages/plugin-clipboard/tests packages/preset-basic/tests tests/layout-providers.test.ts`

[Original command output](logs/behavior-9.log)

### independent-spec

check — passed; exit 0; expected exit 0.

Independent spec public check: 452 tests/2792 assertions. Original full report/risk retain scope and limits.

Command: `bun test packages/plugin-interaction/tests packages/plugin-duplicate-selection/tests packages/plugin-clipboard/tests packages/plugin-history/tests packages/core/tests`

[Original command output](logs/behavior-10.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.

## Published source and evidence limits

[Source/preview scope and public rollback](notes/evidence-scope.md). [Byte-identical original typed public reproduction](repro/original-shortcut-repro.ts.txt). Original and green observations are adjacent.
