# Verification report

Run: 260341e5-02b0-4105-8c3e-5e853fe9c973 · ZWkang/nodebraid · issue #130

## Reviewed and published source

- Review base: `6fd2d016f6330cc422508b3e51229bea4be2cce0`
- Independently prepared append parent: `6fd2d016f6330cc422508b3e51229bea4be2cce0`
- Published head: `1004efc36b3713de4926af97fc176d0be4baac9a`
- Reviewed local head: `878aecc6dfd02597016d26e3e3310a323e3974e8`
- Tree: `9d26a37eb77f17d1c7cae4c0e4c1a8a65cf5058d`
- Complete binary patch SHA-256: `577aab23d8747832f7a25239e8f36a548c755ba7ac84da31e0c875b47a77af44`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## PR risk and merge route

Risk: medium. Route: quick-human.

- standards: medium — Compatible public framework ownership repair changes Basic Composition's accepted nested Connection callback snapshot and therefore live Interaction readiness/materialization across inherited, non-enumerable and enumerable configurations. Public packages/preset-basic/src has the deployed medium path floor and requires focused human review; small diff or passing checks do not qualify it as low.
- spec: medium — 公共preset-basic实现修改Connection配置所有权与Composition激活/实际连线回调可用性，命中packages/*/src的medium路径下限；需重点人工审阅复制顺序、getter receiver与未绑定callback调用边界。
- packages/preset-basic/src/preset-basic-plugin.ts: minimum medium risk.

### standards risk: medium

Impact and reasoning: Compatible public framework ownership repair changes Basic Composition's accepted nested Connection callback snapshot and therefore live Interaction readiness/materialization across inherited, non-enumerable and enumerable configurations. Public packages/preset-basic/src has the deployed medium path floor and requires focused human review; small diff or passing checks do not qualify it as low.

Evidence: Complete two-file patch 577aab23d8747832f7a25239e8f36a548c755ba7ac84da31e0c875b47a77af44 reviewed at head 878aecc6dfd02597016d26e3e3310a323e3974e8, including all 356 new public-test lines and the connected Interaction/Gesture/Command/Kernel/History path. Independent public suites exited 0 with 404 tests and 2748 assertions. Current compiled nested capture, canonical patch, task identity, clean tree and parent checked before/after. Repository tracer red/green was inspected as implementer evidence; native browser/full engineering checks were not independently executed.

Rollback: Revert the complete Issue130 commit 878aecc6dfd02597016d26e3e3310a323e3974e8, or its complete mapped published commit, to restore base 6fd2d016f6330cc422508b3e51229bea4be2cce0, then recreate Composition/Host instances whose configuration snapshots already exist. No persistent schema migration is introduced. Code rollback does not undo application Commands already executed; their effects require the application's existing History or recovery contract.

### spec risk: medium

Impact and reasoning: 公共preset-basic实现修改Connection配置所有权与Composition激活/实际连线回调可用性，命中packages/*/src的medium路径下限；需重点人工审阅复制顺序、getter receiver与未绑定callback调用边界。

Evidence: 完整两文件/356行新公共测试、Basic→Interaction→Gesture→Create Edge→Kernel/History链独立核对；当前身份独立400tests/2727assertions通过，覆盖Host隔离、失败清理、原异常、连线Commit与UndoRedo。采用main6fd2/pr-risk blob596298db784c4f3424968cd05a3aca4a6471b1b3。

Rollback: 普通回退提交撤销878aecc6dfd02597016d26e3e3310a323e3974e8整项两文件或未来映射发布改动；无schema/依赖/数据迁移，会恢复继承/非枚举回调丢失缺陷，代码回退不撤销应用已执行的Command或已提交Edge。

Automatic routing is a candidate only. The coordinator still checks current PR status, report publication, pre-merge acceptance and authorization immediately before a head-bound merge.

## Acceptance plan

## Confirmed defect

At main `6fd2d016f6330cc422508b3e51229bea4be2cce0`, Basic Canvas Composition loses a valid `ConnectionConfig.materializeEdge` supplied as an inherited class method or a non-enumerable own function. Both configurations strictly satisfy the public `ConnectionConfig` type.

A strictly typechecked compiled public-package program creates actual Plugin Hosts and compares Basic Composition with manual installation of the same seven public Plugins. Two Basic cases fail to activate with `InteractionError / INVALID_CONFIG` (“materializeEdge must be a function”). Basic with an ordinary enumerable callback and all three manual controls become active. The source callback is still a function in every case. The compiled program exits1 with two failures and four passing controls.

The Renderer is an explicit implementation of the public CanvasRenderer seam. This reproduction tests real composition readiness and cleanup; it does not request a Connection Gesture, invoke materialization, or claim SVG/native browser behavior.

## Contract and cause

[The public ConnectionConfig](https://github.com/ZWkang/nodebraid/blob/6fd2d016f6330cc422508b3e51229bea4be2cce0/packages/plugin-interaction/src/contracts.ts) requires a readonly materializer function without an own/enumerable restriction. [The Interaction boundary](https://github.com/ZWkang/nodebraid/blob/6fd2d016f6330cc422508b3e51229bea4be2cce0/packages/plugin-interaction/src/interaction-config.ts) accepts these same inherited/non-enumerable callback values.

[Basic's nested snapshot](https://github.com/ZWkang/nodebraid/blob/6fd2d016f6330cc422508b3e51229bea4be2cce0/packages/preset-basic/src/preset-basic-plugin.ts) uses an own enumerable spread, omitting the required callback before the Interaction Plugin receives it. [ADR-0066](https://github.com/ZWkang/nodebraid/blob/6fd2d016f6330cc422508b3e51229bea4be2cce0/docs/adr/0066-publish-a-backend-neutral-basic-canvas-composition.md) makes Basic a backend-neutral composition of those existing Plugins; it must not invalidate their valid configuration by dropping a declared value.

## Acceptance

- Retain the first declared materializer function in the existing Basic nested Connection snapshot for own enumerable, inherited and non-enumerable properties.
- Read the Connection source and callback once with the getter's original receiver; keep the captured function stable after source mutation. Preserve existing callback invocation semantics.
- Preserve existing shallow own enumerable copying, original reflection/read errors and ordering, unknown/malformed configuration rejection and caller-owned data. Do not add a default callback, coercion, binding policy, accessor/record restriction, Registry, cap, retry or fallback.
- The original six readiness controls become green. Add public regressions and actual Connection Command/Gesture controls for captured callback identity, valid Edge creation and History without claiming normalized fixture input is native browser input.
- Preserve numeric Interaction options, Renderer/Child readiness and cleanup, provider conflicts, Host isolation, gestures/Disposition/cancellation and existing public APIs/dependencies.
- Complete related/affected checks, independent Standards with ponytail-review and Spec/risk, formal full verification, exact publication/current-head CI and immutable complete report/media readback.
- Keep the canonical Issue open through actual main integration and whole-Issue acceptance.

## Runnable public reproduction

After building public packages, save this program as basic-connection-repro.ts at the repository root and run:

```sh
NODEBRAID_BASIC_REPRO_RESULTS=/tmp/nodebraid-basic-connection-repro.json bun basic-connection-repro.ts
```

```ts
import assert from 'node:assert/strict';import process from 'node:process';import {writeFileSync} from 'node:fs';
import {createPluginHost,type PluginInstallation} from '@nodebraid/runtime-cordis';
import {edgeId,type CanvasEdge} from '@nodebraid/kernel';
import {kernelPlugin} from '@nodebraid/plugin-kernel';import {portPlugin} from '@nodebraid/plugin-port';import {commandPlugin} from '@nodebraid/plugin-command';import {sessionPlugin} from '@nodebraid/plugin-session';
import {createRendererPlugin} from '@nodebraid/plugin-renderer';import {interactionPlugin,InteractionError,type ConnectionConfig,type ConnectionMaterializationInput} from '@nodebraid/plugin-interaction';import {historyPlugin} from '@nodebraid/plugin-history';import {createBasicCanvasPlugin} from '@nodebraid/preset-basic';
import type {CanvasRenderer,RendererInputListener,RendererDocumentUpdate,HitResult,ScreenPoint} from '@nodebraid/renderer-api';import type {SessionSnapshot} from '@nodebraid/session-api';import type {InteractionProjection} from '@nodebraid/interaction-api';
class PublicRenderer implements CanvasRenderer{
 readonly listeners=new Set<RendererInputListener>();disposed=false;
 updateDocument(_update:RendererDocumentUpdate):void{}updateSession(_snapshot:SessionSnapshot):void{}updateInteraction(_projection:InteractionProjection|null):void{}
 subscribeInput(listener:RendererInputListener):()=>void{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};}
 hitTest(_point:ScreenPoint):HitResult|null{return null;}capturePointer(_id:number):void{}releasePointer(_id:number):void{}focus():void{}
 async dispose():Promise<void>{this.disposed=true;this.listeners.clear();}
}
const results:Record<string,unknown>[]=[];const out=process.env.NODEBRAID_BASIC_REPRO_RESULTS;assert.ok(out);
for(const basic of [true,false])for(const shape of ['prototype-method','nonenumerable-own','enumerable-own'] as const){
 let materializeCalls=0,factoryCalls=0;const opaque={caller:Symbol(shape)};
 const materialize=(input:ConnectionMaterializationInput):CanvasEdge=>{materializeCalls++;return{id:edgeId('connection-'+shape),type:'probe',source:input.source,target:input.target,data:opaque};};
 class Inherited implements ConnectionConfig{materializeEdge(input:ConnectionMaterializationInput):CanvasEdge{return materialize(input);}}
 const own:ConnectionConfig={materializeEdge:materialize};if(shape==='nonenumerable-own')Object.defineProperty(own,'materializeEdge',{enumerable:false});
 const connection:ConnectionConfig=shape==='prototype-method'?new Inherited():own;assert.equal(typeof connection.materializeEdge,'function');
 const renderer=new PublicRenderer(),config:{targetId:string}={targetId:shape},host=createPluginHost();
 const factory=(received:Readonly<{targetId:string}>):CanvasRenderer=>{assert.equal(received,config);factoryCalls++;return renderer;};
 let installations:PluginInstallation[],parent:PluginInstallation|undefined;
 if(basic){parent=host.install(createBasicCanvasPlugin(factory,{interaction:{connection}}),config);installations=[parent];}
 else{installations=[host.install(kernelPlugin),host.install(portPlugin),host.install(commandPlugin),host.install(sessionPlugin),host.install(createRendererPlugin(factory),config),host.install(interactionPlugin,{connection}),host.install(historyPlugin)];}
 try{
  const result=await Promise.all(installations.map(x=>x.whenActive())).then(()=>({ok:true as const}),error=>({ok:false as const,error}));
  if(result.ok)assert.ok(installations.every(x=>x.getSnapshot().status==='active'));
  else{assert.ok(parent);const state=parent.getSnapshot();assert.equal(state.status,'failed');if(state.status==='failed')assert.equal(state.error,result.error);}
  assert.equal(materializeCalls,0,'No Connection Gesture is requested in this public readiness reproduction');
  results.push({basic,shape,passed:result.ok,sourceCallbackType:typeof connection.materializeEdge,status:parent?.getSnapshot().status??(result.ok?'all-manual-children-active':'failure'),factoryCalls,materializeCalls,error:result.ok?null:{name:result.error instanceof Error?result.error.name:null,code:result.error instanceof InteractionError?result.error.code:null,message:result.error instanceof Error?result.error.message:null},renderer:'explicit public Renderer fixture; no native/browser/connection gesture claim'});
  writeFileSync(out,JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results.at(-1)));
 }finally{await host.dispose();assert.ok(installations.every(x=>x.getSnapshot().status==='disposed'));}
}
const failed=results.filter(x=>!x.passed).length;console.log(JSON.stringify({controls:results.length,failed,passed:results.length-failed,publicTypedConnectionConfigs:true,actualHostComposition:true}));if(failed)process.exitCode=1;
```

## Deduplication

Complete current all-state collections contain 129 Issue/PR records (50 + 50 + 29) and 66 PRs (20 + 20 + 20 + 6). Full related #35/#84/#86/#100 bodies and discussions, and #36/#85/#87/#101 changed files, reviews and inline threads were read. #84/#85 capture the outer Connection value; #86/#87 retain the callback accepted by direct Interaction validation; #100/#101 retain four numeric Interaction fields. The current failure drops the required nested callback during Basic's enumerable copy, before Interaction receives it. This occurrence is not implemented by those completed deliveries. Existing #128/PR #129 concern Layout Capabilities, not Basic Connection configuration.


### public-red

Preserve original strict compiled6 readiness red2/controls4 and a repository public Basic Composition regression that fails before production change.

Dependencies: none

### capture-declared-materializer

Existing Basic Connection snapshot preserves the once-read inherited/nonenumerable/own callback and own-copy/error/order/shallow ownership; no new binding or validation/default policies.

Dependencies: public-red

### integration-and-independent-review

Expanded value/getter/error/Connection Gesture/Command/History controls and original byte-identical6green pass with related/affected checks. Independent Standards+ponytail and Spec each full exact-head risk pass.

Dependencies: capture-declared-materializer

### formal-engineering-check

Only after both axes pass, canonical pinned main agents:run verify executes the real full bun run check; retain each actual failure/correction without weakening assertions.

Dependencies: integration-and-independent-review

### publish-current-head

Normal branch/one PR to main Refs130, actual remote tree/ordered first parent and current sourceCI, all dynamic mapped scenes/full raw reports immutable publication and full byte/hash/Gitblob readback.

Dependencies: formal-engineering-check

### required-review-and-authorized-merge

Canonical fetched-main risk route plus actual required human/specific authorization and all current strict discussion/check/ticket gates before immediate expected-head merge/readback. No self-approve/force/bypass/auto queue.

Dependencies: publish-current-head

### main-integration-acceptance

Actual merged source inherited by fresh main; whole-Issue public/compiled acceptance and actual main CI/required Deploy before separately authorized summary/commentID+digest/readback/archive/completed close.

Dependencies: required-review-and-authorized-merge

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: retains the first declared Connection materializer in Basic Composition's nested snapshot. Inherited and non-enumerable callbacks now reach the existing Interaction validator.

- Base: `6fd2d016f6330cc422508b3e51229bea4be2cce0`
- Head: `878aecc6dfd02597016d26e3e3310a323e3974e8`
- Tree: `9d26a37eb77f17d1c7cae4c0e4c1a8a65cf5058d`
- Binary patch SHA256: `577aab23d8747832f7a25239e8f36a548c755ba7ac84da31e0c875b47a77af44`
- Task digest: `b9606e650c81c842e3fa05a8a55b591810f6db4b16fc7fbadcd51a41945af227`

Reviewed the complete two-file patch, all 356 new test lines, full Issue130/empty discussion, independent plan and retained repository tracer red/green. Canonical patch bytes, source identities, clean checkout, parent and whitespace passed independent checks before/after testing.

Hard documented standards: no violations found. Under ADR0066 and Boundary Discipline, Composition preserves the supplied value rather than reinterpreting Interaction policy. Own enumerable copying and reflection failures still occur first; an absent copied callback is then read once with its original receiver. Caller objects stay mutable, while the nested snapshot stays frozen. Unknown fields and malformed/invalid values still reach Interaction's existing validation. Numeric options, child readiness and cleanup retain their previous owners.

Traced Interaction normalization, Connection Gesture completion, the bare materializer invocation, Create Edge Command, Kernel Transaction and History. No new callback binding, default, coercion or lifecycle policy is introduced. The new tests check exact thrown values, first-invalid preservation, fresh Hosts, one materialization/Commit, opaque data identity, Undo/Redo and cleanup.

Judgment-only Fowler smells: no concrete finding. Ponytail: correctly owned, safe and lean for isolated per-Canvas Hosts. The small conditional copy fixes the shared boundary without another abstraction; tests use actual Runtime services and a recording public Renderer seam, not native-browser claims.

Independent command: `bun test packages/preset-basic/tests packages/plugin-interaction/tests packages/plugin-history/tests packages/plugin-renderer/tests packages/plugin-session/tests` exited 0: **404 tests, 2748 assertions**. The current compiled nested capture also passed static inspection. Complete raw output is retained.

Risk: **medium** under canonical `pr-risk`: public framework configuration ownership changes which valid callbacks reach live Interaction. The full patch and fresh public checks support focused human review; green tests do not lower the path floor. Rollback: revert the entire `878aecc` delivery to the base and recreate Composition instances. No schema migration exists; code rollback does not undo application Commands already executed.

Not independently run: TypeScript, builds, browsers, affected/full checks, original compiled-six program or remote CI/publication/main acceptance.

**Verdict: passed. Looks good. Ship.** This is not merge approval.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: passed

base: 6fd2d016f6330cc422508b3e51229bea4be2cce0
head: 878aecc6dfd02597016d26e3e3310a323e3974e8
tree: 9d26a37eb77f17d1c7cae4c0e4c1a8a65cf5058d
binary patch SHA256: 577aab23d8747832f7a25239e8f36a548c755ba7ac84da31e0c875b47a77af44
taskDigest: b9606e650c81c842e3fa05a8a55b591810f6db4b16fc7fbadcd51a41945af227

独立读取 [Issue130](https://github.com/ZWkang/nodebraid/issues/130) 全文/完整评论；最终读回2026-10-27 06:39:52 UTC，open、bug/ready-for-agent，评论0，prepared request未变。审查全部两文件、356行新测试、当前main规范/CONTEXT/pr-risk、ADR0066/0068/0069，以及Basic factory→Child readiness→Interaction Config→Gesture→Create Edge Command→Kernel/History。实际完整Git补丁与归档diff.patch字节一致。

未发现缺漏、范围扩张或错误实现。对照 “Retain the first declared materializer function in the existing Basic nested Connection snapshot”，原own-enumerable浅复制后，仅在copy未拥有声明字段时读取原source的materializeEdge；outer source和callback各捕获一次，getter receiver保持。冻结owned shell、保留函数引用，不冻结caller或执行bind；Runtime仍以原方式直接调用callback。反射先于补读、原抛值、unknown/malformed转交既有Interaction验证、numeric选项/Renderer config identity/Child清理均保持，无默认callback/API/策略扩张。

公共回归覆盖三种property形态、source mutation后fresh Hosts、getter及reflection异常、首非法值拒绝、unknown字段、真实规范化Pointer Input→Edge Commit、opaque data、Capture/Preview释放与History UndoRedo。它们使用明确的公共Renderer fixture，不是native browser证明。

本人新进程执行 `bun test packages/preset-basic/tests packages/plugin-interaction/tests packages/plugin-history/tests packages/plugin-renderer/tests packages/plugin-command/tests packages/core/tests`：400 pass、0 fail、2727 assertions，31文件，exit0；diff-check通过，前后HEAD/tree/patch/clean一致。原typed compiled6源码逐字节相同、bundle/入口哈希及红绿记录只作读取核验，不算本人执行；完整原始命令/输出见spec-tests.log。

未本人运行build/typecheck/affected/browser/formal full、原compiled6或远端CI/发布/媒体/merge/main验收；Spec通过不等于人工批准或整项完成。

risk: {"level": "medium", "rationale": "公共preset-basic实现修改Connection配置所有权与Composition激活/实际连线回调可用性，命中packages/*/src的medium路径下限；需重点人工审阅复制顺序、getter receiver与未绑定callback调用边界。", "evidence": "完整两文件/356行新公共测试、Basic→Interaction→Gesture→Create Edge→Kernel/History链独立核对；当前身份独立400tests/2727assertions通过，覆盖Host隔离、失败清理、原异常、连线Commit与UndoRedo。采用main6fd2/pr-risk blob596298db784c4f3424968cd05a3aca4a6471b1b3。", "rollback": "普通回退提交撤销878aecc6dfd02597016d26e3e3310a323e3974e8整项两文件或未来映射发布改动；无schema/依赖/数据迁移，会恢复继承/非枚举回调丢失缺陷，代码回退不撤销应用已执行的Command或已提交Edge。"}


## Behavior evidence

### original-public-compiled-six-red

red — passed; exit 1; expected exit 1.

At actual main6fd2 strictTSC and bundle succeeded. Original compiled public readiness6 then truly exited1: inherited and hidden Basic callbacks are dropped; enumerable Basic and all three manual same-seven-Plugin controls pass. No Gesture/materialization/native browser in this readiness fixture. Original source/bundle retained.

Command: `NODEBRAID_BASIC_REPRO_RESULTS=/Users/zhou/.codex/local-workflows/nodebraid/runs/20261027T055106-maintenance-and-basic-options/observations.json bun /Users/zhou/.codex/local-workflows/nodebraid/runs/20261027T055106-maintenance-and-basic-options/build/basic-connection-repro.js`

[Original command output](logs/behavior-1.log)

### repository-public-tracer-red

red — passed; exit 1; expected exit 1.

The initial public Basic Composition prototype-method tracer truly failed INVALID_CONFIG before production change. Complete untracked test/source preimages and binary patch retained.

Command: `bun test packages/preset-basic/tests/connection-values.test.ts`

[Original command output](logs/behavior-2.log)

### repository-public-tracer-green

green — passed; exit 0; expected exit 0.

The same initial single regression becomes active and cleans up after the minimal owner repair.

Command: `bun test packages/preset-basic/tests/connection-values.test.ts`

[Original command output](logs/behavior-3.log)

### expanded-public-owned-values

green — passed; exit 0; expected exit 0.

30 regressions/289 assertions pass: three getter shapes, mutation-stable callback, two independent Hosts per shape, actual normalized Pointer Input→Connection Command→one Edge Commit→Undo/Redo, raw falsey throws/first-invalid callback/ownKeys order/unknown config. Renderer is explicitly a public recording fixture, not SVG/native Input.

Command: `bun test packages/preset-basic/tests/connection-values.test.ts`

[Original command output](logs/behavior-4.log)

### original-byte-identical-six-green

green — passed; exit 0; expected exit 0.

Original entry bytes c37298f7d6a4016d74f443442418b66554f0dcd4fbb6fde4b5ce00c3fc4f002c strictly typecheck/bundle/execute at local878aecc. All six readiness controls pass. Publication maps that local tree to actual remote head; local execution is not attributed to remote SHA.

Command: `NODEBRAID_BASIC_REPRO_RESULTS=/Users/zhou/.codex/local-workflows/nodebraid/runs/260341e5-02b0-4105-8c3e-5e853fe9c973/original-green/observations.json bun /Users/zhou/.codex/local-workflows/nodebraid/runs/260341e5-02b0-4105-8c3e-5e853fe9c973/original-green/build/basic-connection-repro.js`

[Original command output](logs/behavior-5.log)

### current-head-affected

check — passed; exit 0; expected exit 0.

Current reviewed local878aecc affected checks pass three consumers core/examples/preset-basic, root layout-provider tests, real Examples browser suites and docs. Targeted check is separate from formal full.

Command: `bun run check:affected --base 6fd2d016f6330cc422508b3e51229bea4be2cce0`

[Original command output](logs/behavior-6.log)

### independent-standards

check — passed; exit 0; expected exit 0.

Fresh independent standards review passed; exact-head risk medium and full original Markdown retained. Actual counts and scope are in the report, not human approval.

Command: `bun test packages/preset-basic/tests packages/plugin-interaction/tests packages/plugin-history/tests packages/plugin-renderer/tests packages/plugin-session/tests`

[Original command output](logs/behavior-7.log)

### independent-spec

check — passed; exit 0; expected exit 0.

Fresh independent spec review passed; exact-head risk medium and full original Markdown retained. Actual counts and scope are in the report, not human approval.

Command: `bun test packages/preset-basic/tests packages/plugin-interaction/tests packages/plugin-history/tests packages/plugin-renderer/tests packages/plugin-command/tests packages/core/tests`

[Original command output](logs/behavior-8.log)

### actual-source-linux-ci

check — passed; exit 0; expected exit 0.

Actual published-head sourceCI 40463366463 checks job 122052912319 succeeds with 1310 tests/6860 assertions on Linux; local full is a different execution. React/SVG/Examples/Document/Clipboard/build/docs and the source preview complete; PR Deploy skipped normally.

Command: `bun run check`

[Original command output](logs/behavior-9.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
