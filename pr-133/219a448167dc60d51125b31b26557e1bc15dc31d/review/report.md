# Verification report

Run: afa38d74-62c2-4a42-b32e-4e86c6b9b41f · ZWkang/nodebraid · issue #132

## Reviewed and published source

- Review base: `6fd2d016f6330cc422508b3e51229bea4be2cce0`
- Independently prepared append parent: `6fd2d016f6330cc422508b3e51229bea4be2cce0`
- Published head: `219a448167dc60d51125b31b26557e1bc15dc31d`
- Reviewed local head: `fe48ff7c2ffb7eef144f64b4699b042f6acdad19`
- Tree: `abaf6c01ef863fa36f4a7c760363a2d69c38290a`
- Complete binary patch SHA-256: `cdbfce62eb18609e954cb47469e7335d9e10d632604850a98da3a1367ca92c40`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## PR risk and merge route

Risk: medium. Route: quick-human.

- standards: medium — Complete Issue132 changes public Renderer implementation for ownership and validation of four Interaction geometry variants, affecting effective display, Hit Test and input state. The public-source minimum is medium and focused human review remains required. Small size, corrected regressions or green checks do not qualify this as low risk.
- spec: medium — 完整交付改变公共SVG Projection geometry ownership与Effective State/Hit/Input映射，命中public-src medium下限；数字关联及metadata复制来源均需重点人工审阅，修复与绿测不降为low。
- packages/renderer-svg/src/interaction-projection.ts: minimum medium risk.

### standards risk: medium

Impact and reasoning: Complete Issue132 changes public Renderer implementation for ownership and validation of four Interaction geometry variants, affecting effective display, Hit Test and input state. The public-source minimum is medium and focused human review remains required. Small size, corrected regressions or green checks do not qualify this as low risk.

Evidence: Independently re-read the complete base 6fd2d016f6330cc422508b3e51229bea4be2cce0 to head fe48ff7c2ffb7eef144f64b4699b042f6acdad19 patch cdbfce62eb18609e954cb47469e7335d9e10d632604850a98da3a1367ca92c40 and current connected code. Fresh public Bun suites passed 295 tests and 2167 assertions. A fresh pure-acceptor program passed six controls covering supplied map callback indices/equivalent clones and four original-versus-clone metadata exception controls. Both prior findings are closed by the current typed cache and copy-source logic. Source identities/canonical bytes/clean checkout checked before and after. No browser/full engineering result is attributed to this reviewer.

Rollback: Restore base 6fd2d016f6330cc422508b3e51229bea4be2cce0 by reverting the complete Issue132 delivery: fe48ff7c2ffb7eef144f64b4699b042f6acdad19, cf231f772e0f5431281fec172b8c2419e1cce370 and 3ae9d134d0ce7e20509905456f558841d745a05f in reverse order, or reverting their full mapped published delivery. Reverting only the last repair is insufficient. Dispose/recreate affected Renderer instances and resynchronize authoritative Document/Session projections. No schema migration is introduced. Code rollback does not undo application Commands already executed; those require existing application History or recovery.

### spec risk: medium

Impact and reasoning: 完整交付改变公共SVG Projection geometry ownership与Effective State/Hit/Input映射，命中public-src medium下限；数字关联及metadata复制来源均需重点人工审阅，修复与绿测不降为low。

Evidence: 完整base→fe48四路径、494行fixture/214输入及ADR0054/59/62/63调用链重审；本head新公共Bun296tests/2196assertions通过，内部index2、metadata4、四family×三形态12场景全actualExit0。main6fd2 risk blob596298db784c4f3424968cd05a3aca4a6471b1b3独立核实。

Rollback: 普通回退完整base6fd2→fe48交付，包括fe48ff7c2ffb7eef144f64b4699b042f6acdad19、cf231f772e0f5431281fec172b8c2419e1cce370、3ae9d134d0ce7e20509905456f558841d745a05f三提交或未来完整published映射；单回最后fix不足。无schema/数据迁移；依既有reset/dispose重建投影，代码回退不能撤销已执行应用Command。

Automatic routing is a candidate only. The coordinator still checks current PR status, report publication, pre-merge acceptance and authorization immediately before a head-bound merge.

## Acceptance plan

## Confirmed defect

At main `6fd2d016f6330cc422508b3e51229bea4be2cce0`, the public SVG Renderer validates declared Interaction Projection geometry and then snapshots it using own enumerable spreads. Valid inherited getters and non-enumerable own Point/Viewport/WorldRect values disappear before DOM projection.

A fresh strictly typechecked, publicly compiled program ran once in real Chromium: 12 controls, 8 failures and 4 ordinary-own-value controls passing. In each of Node Drag, Viewport Pan, Box Selection and Connection Preview, both inherited and hidden geometry shapes are accepted without throwing but render invalid values:

- Node Drag publishes Node x/y=`undefined` and incident Edge x1/y1=`NaN` instead of the finite candidate geometry.
- Viewport Pan publishes `matrix(NaN NaN NaN NaN NaN NaN)` instead of `matrix(2 0 0 2 20 30)`.
- Box Selection publishes `undefined` x/y/width/height instead of 5/6/70/80.
- Connection Preview publishes `undefined` x2/y2 instead of 330/140.

All original values satisfy the public readonly structural types. All four ordinary own-value counterparts render correctly and clear back to their original DOM, retaining Node element identity. All 12 leave the real Kernel View unchanged and dispose their owned Renderer/Target cleanly. The driver exits1 on the actual 4-versus-12 assertion. This is a public API plus real SVG DOM test; no native Pointer/Wheel/Keyboard events, Host/Command scheduling or whole-Renderer coverage is claimed.

## Contract and cause

[`InteractionProjection`](https://github.com/ZWkang/nodebraid/blob/6fd2d016f6330cc422508b3e51229bea4be2cce0/packages/interaction-api/src/contracts.ts) declares Point, Viewport and WorldRect geometry without an own/enumerability restriction. [ADR0059](https://github.com/ZWkang/nodebraid/blob/6fd2d016f6330cc422508b3e51229bea4be2cce0/docs/adr/0059-treat-interaction-projection-as-effective-renderer-state.md) requires synchronous all-or-throw acceptance of complete effective state; [ADR0062](https://github.com/ZWkang/nodebraid/blob/6fd2d016f6330cc422508b3e51229bea4be2cce0/docs/adr/0062-project-interaction-through-existing-svg-geometry.md) requires the finite candidate geometry to drive display, hit tests and Input mapping. [The shared acceptor](https://github.com/ZWkang/nodebraid/blob/6fd2d016f6330cc422508b3e51229bea4be2cce0/packages/renderer-svg/src/interaction-projection.ts) validates readable declared fields but drops them in later spread copies.

## Acceptance

- Preserve accepted declared Point x/y, Viewport x/y/zoom and WorldRect x/y/width/height in owned frozen Interaction Projection geometry for ordinary, inherited and non-enumerable fields across all four affected Projection variants.
- Capture the declared geometry values once with their original receivers; validate and project those same captured values. Preserve existing finite/positive/nonnegative rules, baseline compatibility and original first failures. Keep caller-owned values mutable and shallow, including existing enumerable-copy behavior for unrelated metadata; do not reinterpret application data.
- Keep existing validation phase/order, malformed/canonical arrays and IDs, anchors/Port semantics, all-or-throw DOM/accepted-state recovery, Selection/Viewport synchronization, public API/selectors and lifecycle/Input/Disposition policies. No default/coercion, plain-record/accessor prohibition, cap/retry/fallback or unrelated configuration/Binding policy.
- The exact original 12-case entry becomes green without overwriting its original red bundle. Add public regressions for once-read validated values, original receiver/error identity, state/DOM rollback and relevant hit/Input geometry. Distinguish public fixture input from native browser evidence.
- Complete affected checks and the existing independent Standards+ponytail/Spec/risk reviews, formal main-protocol full verification, exact normal publication/current-head CI and immutable full reports/media readback. Keep this Issue open through actual main whole-Issue acceptance.

## Reproduction

After building the public packages, bundle the following TypeScript entry for the browser and call `await globalThis.__nodebraidProjectionDiscovery()` in Chromium. The actual run first passed strict TSC and browser compilation, then returned `{controls:12,passed:4,failed:8}`; its driver asserted 12 passes and exited1. Each case uses the real public Kernel and SVG Renderer with its own connected Target, retaining actual DOM attributes in the result.

```ts
import {createCanvasKernel,nodeId,edgeId,type Point} from '@nodebraid/kernel';
import {createSvgRenderer} from '@nodebraid/renderer-svg';
import type {InteractionProjection,WorldRect} from '@nodebraid/interaction-api';
import type {Viewport} from '@nodebraid/session-api';
type Shape='own'|'inherited'|'non-enumerable';
type Family='node-drag'|'viewport-pan'|'box-selection'|'connection-preview';
interface Observation{family:Family;shape:Shape;passed:boolean;error:unknown;actual:Record<string,unknown>;baselineUnchanged:boolean;cleanup:boolean;nativeInputEventsDriven:0}
function point(shape:Shape,x:number,y:number):Point{
 class Inherited implements Point{get x(){return x;}get y(){return y;}}
 const own={x,y};if(shape==='non-enumerable')for(const key of ['x','y'])Object.defineProperty(own,key,{enumerable:false});
 return shape==='inherited'?new Inherited():own;
}
function viewport(shape:Shape,x:number,y:number,zoom:number):Viewport{
 class Inherited implements Viewport{get x(){return x;}get y(){return y;}get zoom(){return zoom;}}
 const own={x,y,zoom};if(shape==='non-enumerable')for(const key of ['x','y','zoom'])Object.defineProperty(own,key,{enumerable:false});
 return shape==='inherited'?new Inherited():own;
}
function rect(shape:Shape,x:number,y:number,width:number,height:number):WorldRect{
 class Inherited implements WorldRect{get x(){return x;}get y(){return y;}get width(){return width;}get height(){return height;}}
 const own={x,y,width,height};if(shape==='non-enumerable')for(const key of ['x','y','width','height'])Object.defineProperty(own,key,{enumerable:false});
 return shape==='inherited'?new Inherited():own;
}
function attr(target:SVGSVGElement,selector:string,names:readonly string[]):Record<string,string|null>{
 const element=target.querySelector(selector);return Object.fromEntries(names.map(name=>[name,element?.getAttribute(name)??null]));
}
function same(a:unknown,b:unknown):boolean{return JSON.stringify(a)===JSON.stringify(b);}
async function investigate(){
 const observations:Observation[]=[];globalThis.__nodebraidProjectionProgress=observations;
 for(const family of ['node-drag','viewport-pan','box-selection','connection-preview'] as const)for(const shape of ['own','inherited','non-enumerable'] as const){
  const target=document.createElementNS('http://www.w3.org/2000/svg','svg');target.setAttribute('width','400');target.setAttribute('height','300');
  const defs=document.createElementNS('http://www.w3.org/2000/svg','defs');defs.setAttribute('data-caller-owned','');target.append(defs);document.body.append(target);
  const renderer=createSvgRenderer({target}),kernel=createCanvasKernel(),a=nodeId('a'),b=nodeId('b'),e=edgeId('edge');
  kernel.transact(tx=>{tx.nodes.add({id:a,type:'task',position:{x:10,y:20},size:{width:80,height:40},data:null});tx.nodes.add({id:b,type:'task',position:{x:220,y:40},size:{width:100,height:60},data:null});tx.edges.add({id:e,type:'link',source:{nodeId:a},target:{nodeId:b},data:null});});
  const view=kernel.read();renderer.updateDocument({type:'reset',view});renderer.updateSession({selection:{nodeIds:[a],edgeIds:[]},viewport:{x:0,y:0,zoom:1}});
  const node=target.querySelector('[data-nodebraid-node-id="a"]');if(!node)throw new Error('Real SVG Node missing before the projection case.');
  const baseline=target.innerHTML;let projection:InteractionProjection;
  switch(family){
   case'node-drag':projection={type:family,nodes:[{nodeId:a,basePosition:point(shape,10,20),position:point(shape,80,90)}]};break;
   case'viewport-pan':projection={type:family,baseViewport:viewport(shape,0,0,1),viewport:viewport(shape,20,30,2)};break;
   case'box-selection':projection={type:family,rect:rect(shape,5,6,70,80)};break;
   case'connection-preview':projection={type:family,source:{nodeId:a,role:'source'},pointerWorldPoint:point(shape,330,140),target:{type:'none'}};break;
  }
  let error:unknown=null,actual:Record<string,unknown>={},passed=false,baselineUnchanged=false,cleanup=false;
  try{
   try{renderer.updateInteraction(projection);}catch(caught){error=caught instanceof Error?{name:caught.name,message:caught.message,code:Reflect.get(caught,'code')??null}:caught;}
   actual={node:attr(target,'[data-nodebraid-node-id="a"]',['x','y']),edge:attr(target,'[data-nodebraid-edge-id="edge"]',['x1','y1','x2','y2']),matrix:attr(target,'[data-nodebraid-renderer-svg-root]',['transform']),box:attr(target,'[data-nodebraid-box-selection]',['x','y','width','height']),connection:attr(target,'[data-nodebraid-connection-preview]',['x1','y1','x2','y2']),sourceNode:kernel.read().query.getNode(a)?.position};
   baselineUnchanged=kernel.read()===view&&same(kernel.read().query.getNode(a)?.position,{x:10,y:20});
   if(error===null)switch(family){
    case'node-drag':passed=same(actual.node,{x:'80',y:'90'})&&same(actual.edge,{x1:'120',y1:'110',x2:'270',y2:'70'});break;
    case'viewport-pan':passed=same(actual.matrix,{transform:'matrix(2 0 0 2 20 30)'});break;
    case'box-selection':passed=same(actual.box,{x:'5',y:'6',width:'70',height:'80'});break;
    case'connection-preview':passed=same(actual.connection,{x1:'90',y1:'40',x2:'330',y2:'140'});break;
   }
   if(passed){renderer.updateInteraction(null);passed=target.innerHTML===baseline&&target.querySelector('[data-nodebraid-node-id="a"]')===node;}
   passed=passed&&baselineUnchanged;
  }finally{await renderer.dispose();cleanup=target.childElementCount===1&&target.firstElementChild===defs&&!target.hasAttribute('tabindex');target.remove();}
  observations.push({family,shape,passed:passed&&cleanup,error,actual,baselineUnchanged,cleanup,nativeInputEventsDriven:0});
 }
 return {controls:observations.length,passed:observations.filter(x=>x.passed).length,failed:observations.filter(x=>!x.passed).length,observations,nativeInputEventsDriven:0,userAgent:navigator.userAgent,scope:'Typed public CanvasRenderer.updateInteraction and actual SVG DOM; no native input, Command/Host, arbitrary scheduling or whole Renderer claim.'};
}
declare global{var __nodebraidProjectionProgress:Observation[];var __nodebraidProjectionDiscovery:typeof investigate;}
globalThis.__nodebraidProjectionDiscovery=investigate;

```

## Deduplication

Complete current all-state collections contain 131 Issue/PR records (50+50+31) and 67 PRs (20+20+20+7). All titles and full bodies were checked for the acceptor path and Projection/geometry vocabulary. Relevant #122/#124 full bodies and discussions, and #123/#125 files/reviews/conversation/inline threads were read. Those completed deliveries fix constructor hit tolerances and DOM event-policy booleans in svg-config, not interaction-projection.ts geometry ownership. Existing #130/PR #131 concern Basic Connection callback snapshots, and #128/PR #129 Layout Capabilities, not this SVG Projection boundary. No existing canonical delivery implements this occurrence.


### public-red

Retain original strict compiled12 browser red8/control4 and a failing public SVG regression with complete source/binary preimages.

Dependencies: none

### capture-declared-geometry

Owned Projection geometry captures and validates Point/Viewport/WorldRect declared values once with original receivers and preserves error/copy/order/compatibility behavior.

Dependencies: public-red

### integration-and-independent-review

Original entry byte-identical12green plus value/error/DOM/Hits/Input/sync/rollback public regressions and affected checks pass; independent exact-head Standards+ponytail and Spec each full risk passed.

Dependencies: capture-declared-geometry

### formal-engineering-check

Only after both reviews pass canonical pinned main verify executes one real full bun run check with stable exact identity and original raw receipts.

Dependencies: integration-and-independent-review

### publish-current-head

One normal delivery PR/main Refs132, actual remote tree/firstparent bytes and actual current CI/dynamic all-mapped native scenes/full immutable reports/media readback.

Dependencies: formal-engineering-check

### required-review-and-authorized-merge

Preserve canonical main risk route and actual required human/specific authorization, complete current feedback/strict check/ticket/protection before any expected-head immediate merge; no bypass/self-approve/force/auto queue.

Dependencies: publish-current-head

### main-integration-acceptance

Actual fresh main whole-Issue public/compiled acceptance, tickets, real main CI/necessary Deploy and separate close authorization before summary/commentID+digest/archive/completed closure.

Dependencies: required-review-and-authorized-merge

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: retains validated Interaction geometry, including inherited and non-enumerable values. Node Drag now separates cached numbers from copy-phase metadata sources.

- Base: `6fd2d016f6330cc422508b3e51229bea4be2cce0`
- Head: `fe48ff7c2ffb7eef144f64b4699b042f6acdad19`
- Tree: `abaf6c01ef863fa36f4a7c760363a2d69c38290a`
- Binary patch SHA256: `cdbfce62eb18609e954cb47469e7335d9e10d632604850a98da3a1367ca92c40`
- Task digest: `931f3d5bf15180095ee77655c8da3308ac84817af0cf9e85a5726b0e509a25d3`

Re-read the complete four-file/three-commit patch, all 494 fixture lines and 214 browser-case definitions, saved Issue132/empty discussion and independent plan. Traced acceptance, preflight, DOM journal, effective Document/Session, Hit Test and input conversion. Canonical patch bytes, clean checkout and identities passed before/after checks.

Hard documented standards: no remaining violation found. ADR0054/0059/0062 preflight and effective-state ownership remain at the shared acceptor. Numeric values are captured and validated before projection. Node Drag retains eager coordinate evaluation; Point, Viewport and Rect keep their sequential failure order. Reflection preserves own enumerable strings/symbols, descriptor checks, receivers, original failures and shallow ownership, without rereading captured coordinates.

Both earlier P2 findings are closed. The cache uses validated semantic NodeIds, not caller map indices or candidate object identity. Its type retains numeric Point pairs only. Copying now enumerates the actual map candidate's Point sources, preserving unrelated metadata reads/errors when iteration yields independent clones. Existing array traversal and canonical/baseline checks remain unchanged.

Judgment-only Fowler smells: no concrete finding. Ponytail: correct, safe and lean for isolated SVG Targets; the common copying helper carries an actual shared contract without new policy, fallback or dependency.

Fresh independent `bun test packages/renderer-api/tests packages/renderer-svg/tests packages/plugin-renderer/tests packages/plugin-interaction/tests packages/plugin-session/tests` exited 0: **295 tests, 2167 assertions**. A separate fresh pure-acceptor program passed **6/6 controls** for callback indices, equivalent clones and both metadata-error directions/Point slots. These controls are not browser execution or strict TypeScript verification.

Risk: **medium**, under deployed `pr-risk` and the public-source floor. Geometry acceptance affects display, Hit Test and input; full-source review and fresh checks support focused human review, not automatic merging. Rollback must undo the complete Issue132 delivery: fe48ff7, cf231f7 and 3ae9d13 in reverse order, or their complete mapped publication, restore the base and recreate Renderers. Code rollback cannot undo application Commands already executed.

Not independently run: browsers, strict TypeScript, product builds, affected/full checks, original compiled12 or remote CI/publication/main acceptance.

**Verdict: passed. Looks good. Ship.** This is not merge approval.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: passed

base: 6fd2d016f6330cc422508b3e51229bea4be2cce0
head: fe48ff7c2ffb7eef144f64b4699b042f6acdad19
tree: abaf6c01ef863fa36f4a7c760363a2d69c38290a
binary patch SHA256: cdbfce62eb18609e954cb47469e7335d9e10d632604850a98da3a1367ca92c40
taskDigest: 931f3d5bf15180095ee77655c8da3308ac84817af0cf9e85a5726b0e509a25d3

独立重读 [Issue132](https://github.com/ZWkang/nodebraid/issues/132) 全文/完整评论；最终读回2026-10-27 08:25:06 UTC，open、bug/ready-for-agent，评论0，request未变。审查完整三提交四路径、494行fixture/214输入及acceptor→DOM Journal→Effective State/Hit/Input链，依据指定main规范/CONTEXT与ADR0054/59/62/63。实际完整补丁与本head归档字节一致。

未发现当前缺漏、scope creep或错误实现。NodeId缓存仅保存validated numeric pairs，不含Point source；原map candidate的basePosition/position仍作为metadata复制源。因而既不依赖callback index/candidate对象identity，又保留 “existing enumerable-copy behavior for unrelated metadata” 的原receiver、阶段、首异常与浅引用。四种Projection数字捕获/finite/positive/nonnegative及原eager/sequential错误顺序重新核对；无新array/ID/Anchor/Port/Input或默认/coercion/record策略。Renderer仍先完整accept，再用Journal投影，成功后替换accepted state。

本人在本head新执行：原index互换程序及等值iterator clone各退出0；独立metadata四场景均rawReads1/cloneReads0，raw异常严格保留原Error、clone异常不传播；四family×own/inherited/non-enumerable的12几何场景全部通过，数字只读一次、owned冻结、caller/metadata不冻结且Kernel不变。这18场景是内部acceptor边界核验，不冒称公共Renderer/DOM/browser。

另执行 `bun test packages/renderer-api/tests packages/renderer-svg/tests packages/plugin-renderer/tests packages/plugin-interaction/tests packages/plugin-history/tests`：296 pass、0 fail、2196 assertions，21文件，exit0；diff-check通过，前后HEAD/tree/patch/clean一致。未复用旧计数；全部程序与原始输出在spec-tests.log。fixture期望补全/工作树214记录不当作本head执行。

未本人运行build/typecheck/affected/browser/full、原12或远端CI/发布/媒体/merge/main验收；外部浏览器进度不代表本人执行或最终job回执。Spec通过不等于人工批准或交付完成。

risk: {"level": "medium", "rationale": "完整交付改变公共SVG Projection geometry ownership与Effective State/Hit/Input映射，命中public-src medium下限；数字关联及metadata复制来源均需重点人工审阅，修复与绿测不降为low。", "evidence": "完整base→fe48四路径、494行fixture/214输入及ADR0054/59/62/63调用链重审；本head新公共Bun296tests/2196assertions通过，内部index2、metadata4、四family×三形态12场景全actualExit0。main6fd2 risk blob596298db784c4f3424968cd05a3aca4a6471b1b3独立核实。", "rollback": "普通回退完整base6fd2→fe48交付，包括fe48ff7c2ffb7eef144f64b4699b042f6acdad19、cf231f772e0f5431281fec172b8c2419e1cce370、3ae9d134d0ce7e20509905456f558841d745a05f三提交或未来完整published映射；单回最后fix不足。无schema/数据迁移；依既有reset/dispose重建投影，代码回退不能撤销已执行应用Command。"}


## Behavior evidence

### original-public-compiled-twelve-red

red — passed; exit 1; expected exit 1.

Actual main6fd strictTSC and public browser bundle succeeded; real Chromium returned8 failed/4 own-value controls across four Projection families. Undefined/NaN DOM values are a product failure, not setup. All Kernel baselines/owned cleanup retained. No native Input is driven.

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/20261027T070907-svg-projection-maintenance/browser-probe.ts`

[Original command output](logs/behavior-1.log)

### repository-inherited-position-red

red — passed; exit 1; expected exit 1.

Initial repository public SVG tracer reports undefined x/y instead of80/90 before production repair. Full original tracked test/source preimages and binary patch plus red bundle retained.

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/afa38d74-62c2-4a42-b32e-4e86c6b9b41f/repository-tracer.ts`

[Original command output](logs/behavior-2.log)

### repository-first-tracer-green

green — passed; exit 0; expected exit 0.

Initial single Node Drag tracer becomes green after the first owner repair; this was a dirty working tree at base6fd with complete patch/bundle identity, not execution at a later commit.

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/afa38d74-62c2-4a42-b32e-4e86c6b9b41f/repository-tracer.ts`

[Original command output](logs/behavior-3.log)

### first-review-index-regression-red

red — passed; exit 1; expected exit 1.

At historical3ae9 a new strict typed public SVG program preserves IDs/order but caller map callback index swaps Node geometry in2 cases, including iterator clones. Same entry passes2/2 at main6fd. This is a genuine local review regression, not manufactured online CI failure.

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/afa38d74-62c2-4a42-b32e-4e86c6b9b41f/callback-index-repro/current/browser-probe.ts`

[Original command output](logs/behavior-4.log)

### repository-index-regression-red

red — passed; exit 1; expected exit 1.

Two added repository public Renderer regressions reproduce the exchanged geometry before the normal cf231 follow-up fix. Their independent original red bundle/source/patch remain retained.

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/afa38d74-62c2-4a42-b32e-4e86c6b9b41f/array-runner.ts`

[Original command output](logs/behavior-5.log)

### second-review-metadata-regression-red

red — passed; exit 1; expected exit 1.

At historicalcf231 public SVG4cases read iterator-clone metadata rather than raw map Point metadata, skipping an original Error or introducing an unrequested Error; same entry4/4passes at main6fd. Original comparative DOM/count/identity evidence is separate from current-head checks.

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/afa38d74-62c2-4a42-b32e-4e86c6b9b41f/metadata-copy-repro/current/browser-probe.ts`

[Original command output](logs/behavior-6.log)

### repository-copy-source-regression-red

red — passed; exit 1; expected exit 1.

Four public repository metadata-source regressions fail before fe48 fixes the phase ownership; numeric caching remains keyed by NodeId. Full raw red code/bundle and patch retained.

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/afa38d74-62c2-4a42-b32e-4e86c6b9b41f/metadata-runner.ts`

[Original command output](logs/behavior-7.log)

### current-byte-identical-twelve-green

green — passed; exit 0; expected exit 0.

At reviewed localfe48, byte-identical62647bc5... original entry strictly typechecks and all12 real Chromium public Renderer/DOM cases pass. Actual affected build generated these public dist modules. Publication maps its full tree to remote source; local execution is not renamed as remote execution.

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/afa38d74-62c2-4a42-b32e-4e86c6b9b41f/original-green/fe48ff7c2ffb7eef144f64b4699b042f6acdad19/browser-probe.ts`

[Original command output](logs/behavior-8.log)

### current-public-index-two-green

green — passed; exit 0; expected exit 0.

At localfe48 actualpublicdist the exact two comparative callback/index programs both pass, preserving semantic Node geometry and Kernel baseline. Strict TSC/browser receipts and cleanup retained.

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/afa38d74-62c2-4a42-b32e-4e86c6b9b41f/callback-index-repro/final-fe48/browser-probe.ts`

[Original command output](logs/behavior-9.log)

### current-public-metadata-four-green

green — passed; exit 0; expected exit 0.

At localfe48 actualpublicdist all4 metadata-source cases pass with rawReads1/cloneReads0 and strict original Error identity/atomic DOM. These are public API plus real browser DOM, not native Input.

Command: `bun /Users/zhou/.codex/local-workflows/nodebraid/runs/afa38d74-62c2-4a42-b32e-4e86c6b9b41f/metadata-copy-repro/final-fe48/browser-probe.ts`

[Original command output](logs/behavior-10.log)

### current-exact-head-affected

check — passed; exit 0; expected exit 0.

Exact localfe48 affected checks pass renderer-svg/examples and both real browser suites, including214 new public geometry controls plus existing native policy/tolerance/Examples/Clipboard/Document tests. This is separate from formal full.

Command: `bun run check:affected --base 6fd2d016f6330cc422508b3e51229bea4be2cce0`

[Original command output](logs/behavior-11.log)

### current-independent-standards

check — passed; exit 0; expected exit 0.

Fresh complete three-commit independent standards review passed with its own exact-head tests/risk. Any private acceptor controls are expressly not public Renderer/browser execution; full original Markdown remains unchanged.

Command: `bun test packages/renderer-api/tests packages/renderer-svg/tests packages/plugin-renderer/tests packages/plugin-interaction/tests packages/plugin-session/tests`

[Original command output](logs/behavior-12.log)

### current-independent-spec

check — passed; exit 0; expected exit 0.

Fresh complete three-commit independent spec review passed with its own exact-head tests/risk. Any private acceptor controls are expressly not public Renderer/browser execution; full original Markdown remains unchanged.

Command: `bun test packages/renderer-api/tests packages/renderer-svg/tests packages/plugin-renderer/tests packages/plugin-interaction/tests packages/plugin-history/tests`

[Original command output](logs/behavior-13.log)

### actual-published-linux-ci

check — passed; exit 0; expected exit 0.

Actual sourceCI40474611485/checks122089640345 at published219a448167dc60d51125b31b26557e1bc15dc31d passes 1280 tests/6571 assertions on Linux, with full native/browser/build/docs. Local formal is1280/6577, a separate real execution. PR Deploy skipped normally; it is not main integration acceptance.

Command: `bun run check`

[Original command output](logs/behavior-14.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
