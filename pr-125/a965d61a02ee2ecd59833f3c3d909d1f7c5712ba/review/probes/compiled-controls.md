# Trusted native SVG DOM policy controls

Original failing main and reviewed passing source use the byte-identical typed eight-input entry and unchanged CDP native input/assertions. These are genuine trusted Chromium Wheel inputs and actual public package exports, not injected DOM Events or fake Renderer/Disposition behavior. Only runner root/head/declaration metadata changes to the actual execution source.

## Original fetched main7c61 (red)

### wheel-policy-probe.entry.ts

SHA256: 1605b0a94b8803aef7639c661245fea49ff6a337c2cfd3f3be83ff446136ac31

```typescript
import {createSvgRenderer,type SvgDomEventPolicy} from '@nodebraid/renderer-svg';
import {createCanvasKernel} from '@nodebraid/kernel';
import type {CanvasRenderer,RendererInput} from '@nodebraid/renderer-api';
type Flag='preventDefault'|'stopPropagation';
type Mode='first-true'|'first-absent'|'constant-true'|'constant-false';
let current: {renderer:CanvasRenderer;target:SVGSVGElement;outer:HTMLDivElement;stop:()=>void;ready:Promise<void>;getResult:()=>unknown}|undefined;
Reflect.set(globalThis,'__nodebraidPrepareWheelPolicy',(flag:Flag,mode:Mode)=>{
 if(current)throw new Error('Previous owned case was not cleaned up.');
 const outer=document.createElement('div');outer.style.position='fixed';outer.style.inset='0';document.body.append(outer);
 const target=document.createElementNS('http://www.w3.org/2000/svg','svg');target.setAttribute('width','400');target.setAttribute('height','300');outer.append(target);
 const policy:SvgDomEventPolicy={preventDefault:false,stopPropagation:false};let reads=0,receiverCorrect=true;
 if(mode.startsWith('constant'))Object.defineProperty(policy,flag,{enumerable:true,value:mode==='constant-true'});
 else Object.defineProperty(policy,flag,{enumerable:true,get(){receiverCorrect&&=this===policy;reads++;return reads===1?(mode==='first-true'?true:undefined):mode!=='first-true';}});
 const renderer=createSvgRenderer({target,input:{wheel:policy}});
 const kernel=createCanvasKernel();renderer.updateDocument({type:'reset',view:kernel.read()});renderer.updateSession({selection:{nodeIds:[],edgeIds:[]},viewport:{x:0,y:0,zoom:1}});
 const inputs:RendererInput[]=[];const stop=renderer.subscribeInput(input=>{inputs.push(input);});
 let resolve!:()=>void;const ready=new Promise<void>(r=>{resolve=r;});
 let targetEvent:unknown,bubbled=0;
 target.addEventListener('wheel',event=>{targetEvent={isTrusted:event.isTrusted,defaultPrevented:event.defaultPrevented,cancelBubble:event.cancelBubble};resolve();},{passive:true});
 outer.addEventListener('wheel',()=>{bubbled++;},{passive:true});
 current={renderer,target,outer,stop,ready,getResult:()=>({flag,mode,reads,receiverCorrect,targetEvent,bubbled,wheelInputs:inputs.filter(i=>i.type==='wheel').length})};
 const bounds=target.getBoundingClientRect();return {x:bounds.left+80,y:bounds.top+80};
});
Reflect.set(globalThis,'__nodebraidReadWheelPolicy',async()=>{
 if(!current)throw new Error('Expected current owned Renderer case.');
 await current.ready;await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
 return current.getResult();
});
Reflect.set(globalThis,'__nodebraidCleanupWheelPolicy',async()=>{
 if(!current)throw new Error('Expected a case to clean up.');
 const owned=current;current=undefined;owned.stop();await owned.renderer.dispose();owned.outer.remove();
});
```

### compiled-provenance.json

SHA256: c7b16e6e7942a3f1ce0a60f0a0f351a86de9bc7903c73bd1fdcd989aea38c087

```json
{
  "head": "7c61407b01a5b02f15ea17660790d6742713400c",
  "tree": "995191f91615636ed8d413d91cf050f9baa3329e",
  "resolved": {
    "@nodebraid/renderer-svg": "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/renderer-svg/dist/index.js",
    "@nodebraid/kernel": "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/kernel/dist/index.js",
    "@nodebraid/diagnostics": "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/diagnostics/dist/index.js",
    "@nodebraid/renderer-api": "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/renderer-api/dist/index.js",
    "@nodebraid/port-api": "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/port-api/dist/index.js"
  },
  "publicExportSHA256": {
    "@nodebraid/renderer-svg": "7e52fdf53d182112509b6f05e45be953f2e35071228c9c1f772a0671670687cd",
    "@nodebraid/kernel": "c9ff8d863bd1c07313f11443fbf1c8773ff320d6edb4d5b0d18e35cd1b429f92",
    "@nodebraid/diagnostics": "438fb75caf4a4ff7e7e73dd3b13a9c188a47448b0892e8b3f7fa3158f6886ac9",
    "@nodebraid/renderer-api": "e11c931a0082e17755436efecb49079f00db4dae619d382bd60a74f8fe977e7f",
    "@nodebraid/port-api": "8ba54d04f150cd9baf850c66c5fd4836cfecec90e072ca0d394f48b1d312542e"
  },
  "bundle": "/Users/zhou/.codex/local-workflows/nodebraid/runs/20261026T084642-discovery-svg-wheel-policy-capture/wheel-policy-probe.js",
  "bundleSHA256": "e0117a8f1d2e03fc9f4ed46eeddfb452d5d01c330b04cb198b9b09fc7dd1a3ec",
  "entrySHA256": "1605b0a94b8803aef7639c661245fea49ff6a337c2cfd3f3be83ff446136ac31"
}
```

### observations.json

SHA256: 63438ac69f6719653dbb2b4e8c1fc5870e57f6c742cf78a3a61c2e42cec6bb81

```json
{
  "head": "7c61407b01a5b02f15ea17660790d6742713400c",
  "session": "nodebraid-svg-wheel-policy-60959",
  "url": "http://127.0.0.1:58697/",
  "observations": [
    {
      "bubbled": 1,
      "flag": "preventDefault",
      "mode": "first-true",
      "reads": 3,
      "receiverCorrect": true,
      "targetEvent": {
        "cancelBubble": false,
        "defaultPrevented": false,
        "isTrusted": true
      },
      "wheelInputs": 1
    },
    {
      "bubbled": 1,
      "flag": "preventDefault",
      "mode": "first-absent",
      "reads": 2,
      "receiverCorrect": true,
      "targetEvent": {
        "cancelBubble": false,
        "defaultPrevented": true,
        "isTrusted": true
      },
      "wheelInputs": 1
    },
    {
      "bubbled": 1,
      "flag": "preventDefault",
      "mode": "constant-true",
      "reads": 0,
      "receiverCorrect": true,
      "targetEvent": {
        "cancelBubble": false,
        "defaultPrevented": true,
        "isTrusted": true
      },
      "wheelInputs": 1
    },
    {
      "bubbled": 1,
      "flag": "preventDefault",
      "mode": "constant-false",
      "reads": 0,
      "receiverCorrect": true,
      "targetEvent": {
        "cancelBubble": false,
        "defaultPrevented": false,
        "isTrusted": true
      },
      "wheelInputs": 1
    },
    {
      "bubbled": 1,
      "flag": "stopPropagation",
      "mode": "first-true",
      "reads": 3,
      "receiverCorrect": true,
      "targetEvent": {
        "cancelBubble": false,
        "defaultPrevented": false,
        "isTrusted": true
      },
      "wheelInputs": 1
    },
    {
      "bubbled": 0,
      "flag": "stopPropagation",
      "mode": "first-absent",
      "reads": 2,
      "receiverCorrect": true,
      "targetEvent": {
        "cancelBubble": true,
        "defaultPrevented": false,
        "isTrusted": true
      },
      "wheelInputs": 1
    },
    {
      "bubbled": 0,
      "flag": "stopPropagation",
      "mode": "constant-true",
      "reads": 0,
      "receiverCorrect": true,
      "targetEvent": {
        "cancelBubble": true,
        "defaultPrevented": false,
        "isTrusted": true
      },
      "wheelInputs": 1
    },
    {
      "bubbled": 1,
      "flag": "stopPropagation",
      "mode": "constant-false",
      "reads": 0,
      "receiverCorrect": true,
      "targetEvent": {
        "cancelBubble": false,
        "defaultPrevented": false,
        "isTrusted": true
      },
      "wheelInputs": 1
    }
  ]
}
```

## Reviewed local sourcefc1f409 (green)

### wheel-policy-probe.entry.ts

SHA256: 1605b0a94b8803aef7639c661245fea49ff6a337c2cfd3f3be83ff446136ac31

```typescript
import {createSvgRenderer,type SvgDomEventPolicy} from '@nodebraid/renderer-svg';
import {createCanvasKernel} from '@nodebraid/kernel';
import type {CanvasRenderer,RendererInput} from '@nodebraid/renderer-api';
type Flag='preventDefault'|'stopPropagation';
type Mode='first-true'|'first-absent'|'constant-true'|'constant-false';
let current: {renderer:CanvasRenderer;target:SVGSVGElement;outer:HTMLDivElement;stop:()=>void;ready:Promise<void>;getResult:()=>unknown}|undefined;
Reflect.set(globalThis,'__nodebraidPrepareWheelPolicy',(flag:Flag,mode:Mode)=>{
 if(current)throw new Error('Previous owned case was not cleaned up.');
 const outer=document.createElement('div');outer.style.position='fixed';outer.style.inset='0';document.body.append(outer);
 const target=document.createElementNS('http://www.w3.org/2000/svg','svg');target.setAttribute('width','400');target.setAttribute('height','300');outer.append(target);
 const policy:SvgDomEventPolicy={preventDefault:false,stopPropagation:false};let reads=0,receiverCorrect=true;
 if(mode.startsWith('constant'))Object.defineProperty(policy,flag,{enumerable:true,value:mode==='constant-true'});
 else Object.defineProperty(policy,flag,{enumerable:true,get(){receiverCorrect&&=this===policy;reads++;return reads===1?(mode==='first-true'?true:undefined):mode!=='first-true';}});
 const renderer=createSvgRenderer({target,input:{wheel:policy}});
 const kernel=createCanvasKernel();renderer.updateDocument({type:'reset',view:kernel.read()});renderer.updateSession({selection:{nodeIds:[],edgeIds:[]},viewport:{x:0,y:0,zoom:1}});
 const inputs:RendererInput[]=[];const stop=renderer.subscribeInput(input=>{inputs.push(input);});
 let resolve!:()=>void;const ready=new Promise<void>(r=>{resolve=r;});
 let targetEvent:unknown,bubbled=0;
 target.addEventListener('wheel',event=>{targetEvent={isTrusted:event.isTrusted,defaultPrevented:event.defaultPrevented,cancelBubble:event.cancelBubble};resolve();},{passive:true});
 outer.addEventListener('wheel',()=>{bubbled++;},{passive:true});
 current={renderer,target,outer,stop,ready,getResult:()=>({flag,mode,reads,receiverCorrect,targetEvent,bubbled,wheelInputs:inputs.filter(i=>i.type==='wheel').length})};
 const bounds=target.getBoundingClientRect();return {x:bounds.left+80,y:bounds.top+80};
});
Reflect.set(globalThis,'__nodebraidReadWheelPolicy',async()=>{
 if(!current)throw new Error('Expected current owned Renderer case.');
 await current.ready;await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
 return current.getResult();
});
Reflect.set(globalThis,'__nodebraidCleanupWheelPolicy',async()=>{
 if(!current)throw new Error('Expected a case to clean up.');
 const owned=current;current=undefined;owned.stop();await owned.renderer.dispose();owned.outer.remove();
});
```

### compiled-provenance.json

SHA256: 8b555cb835ed4160a81b2827a097e3e1b0be6c8dd551feccd6588b54870ad11e

```json
{
  "head": "fc1f409583d81458a49005ab28bf7d18469fc873",
  "tree": "1f9cdfbdf57a5edc5ba6a5866a056aa76fa79622",
  "resolved": {
    "@nodebraid/renderer-svg": "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/renderer-svg/dist/index.js",
    "@nodebraid/kernel": "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/kernel/dist/index.js",
    "@nodebraid/diagnostics": "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/diagnostics/dist/index.js",
    "@nodebraid/renderer-api": "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/renderer-api/dist/index.js",
    "@nodebraid/port-api": "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/port-api/dist/index.js"
  },
  "publicExportSHA256": {
    "@nodebraid/renderer-svg": "7e52fdf53d182112509b6f05e45be953f2e35071228c9c1f772a0671670687cd",
    "@nodebraid/kernel": "c9ff8d863bd1c07313f11443fbf1c8773ff320d6edb4d5b0d18e35cd1b429f92",
    "@nodebraid/diagnostics": "438fb75caf4a4ff7e7e73dd3b13a9c188a47448b0892e8b3f7fa3158f6886ac9",
    "@nodebraid/renderer-api": "e11c931a0082e17755436efecb49079f00db4dae619d382bd60a74f8fe977e7f",
    "@nodebraid/port-api": "8ba54d04f150cd9baf850c66c5fd4836cfecec90e072ca0d394f48b1d312542e"
  },
  "bundle": "/Users/zhou/.codex/local-workflows/nodebraid/runs/b2f5a1d4-c627-4a20-bec0-a61ad2376c9f/original-compiled-green/wheel-policy-probe.js",
  "bundleSHA256": "49e275a1c6d7dec86fb41d77f94532fa42c4f25b3734be22e9f038e4b2b0c344",
  "entrySHA256": "1605b0a94b8803aef7639c661245fea49ff6a337c2cfd3f3be83ff446136ac31"
}
```

### observations.json

SHA256: 38d93b7d6dce399380b9fbe7aafd8bd3a477e9e79dec1343bfcb2c18fc4ec789

```json
{
  "head": "fc1f409583d81458a49005ab28bf7d18469fc873",
  "session": "nodebraid-svg-wheel-policy-18438",
  "url": "http://127.0.0.1:64023/",
  "observations": [
    {
      "bubbled": 1,
      "flag": "preventDefault",
      "mode": "first-true",
      "reads": 1,
      "receiverCorrect": true,
      "targetEvent": {
        "cancelBubble": false,
        "defaultPrevented": true,
        "isTrusted": true
      },
      "wheelInputs": 1
    },
    {
      "bubbled": 1,
      "flag": "preventDefault",
      "mode": "first-absent",
      "reads": 1,
      "receiverCorrect": true,
      "targetEvent": {
        "cancelBubble": false,
        "defaultPrevented": false,
        "isTrusted": true
      },
      "wheelInputs": 1
    },
    {
      "bubbled": 1,
      "flag": "preventDefault",
      "mode": "constant-true",
      "reads": 0,
      "receiverCorrect": true,
      "targetEvent": {
        "cancelBubble": false,
        "defaultPrevented": true,
        "isTrusted": true
      },
      "wheelInputs": 1
    },
    {
      "bubbled": 1,
      "flag": "preventDefault",
      "mode": "constant-false",
      "reads": 0,
      "receiverCorrect": true,
      "targetEvent": {
        "cancelBubble": false,
        "defaultPrevented": false,
        "isTrusted": true
      },
      "wheelInputs": 1
    },
    {
      "bubbled": 0,
      "flag": "stopPropagation",
      "mode": "first-true",
      "reads": 1,
      "receiverCorrect": true,
      "targetEvent": {
        "cancelBubble": true,
        "defaultPrevented": false,
        "isTrusted": true
      },
      "wheelInputs": 1
    },
    {
      "bubbled": 1,
      "flag": "stopPropagation",
      "mode": "first-absent",
      "reads": 1,
      "receiverCorrect": true,
      "targetEvent": {
        "cancelBubble": false,
        "defaultPrevented": false,
        "isTrusted": true
      },
      "wheelInputs": 1
    },
    {
      "bubbled": 0,
      "flag": "stopPropagation",
      "mode": "constant-true",
      "reads": 0,
      "receiverCorrect": true,
      "targetEvent": {
        "cancelBubble": true,
        "defaultPrevented": false,
        "isTrusted": true
      },
      "wheelInputs": 1
    },
    {
      "bubbled": 1,
      "flag": "stopPropagation",
      "mode": "constant-false",
      "reads": 0,
      "receiverCorrect": true,
      "targetEvent": {
        "cancelBubble": false,
        "defaultPrevented": false,
        "isTrusted": true
      },
      "wheelInputs": 1
    }
  ]
}
```

## Exact execution derivation

```json
{
  "original": "/Users/zhou/.codex/local-workflows/nodebraid/runs/20261026T084642-discovery-svg-wheel-policy-capture",
  "green": "/Users/zhou/.codex/local-workflows/nodebraid/runs/b2f5a1d4-c627-4a20-bec0-a61ad2376c9f/original-compiled-green",
  "entryByteIdentical": true,
  "entrySHA256": "1605b0a94b8803aef7639c661245fea49ff6a337c2cfd3f3be83ff446136ac31",
  "changes": "Only runner root/head and declaration roots change to actual reviewed source; native input program, eight fixtures, CDP helper and assertions unchanged.",
  "originalExit": 1,
  "greenExit": 0,
  "typecheckExit": 0,
  "allEightNativeTrusted": true
}
```

## Repository tracer retention

The original repository native tracer bundle, tracked patch, initially untracked fixture source and assertion log were retained before the minimal implementation. The hashes below identify the actual red files. Expanded current-source regressions are separately executed, not substituted for red history.

```json
{
  "redBundle": "/Users/zhou/.codex/local-workflows/nodebraid/runs/b2f5a1d4-c627-4a20-bec0-a61ad2376c9f/public-tracer-red.bundle.js",
  "redBundleSHA256": "861a1fbc3f9d26f8fc685ec546e236ec2e90a222c78037d1ec258442638f6547",
  "redHelperSource": "/Users/zhou/.codex/local-workflows/nodebraid/runs/b2f5a1d4-c627-4a20-bec0-a61ad2376c9f/tracer-policy-fixture.ts",
  "redHelperSHA256": "9a9017d913e5387ef2128a28d216f262406d1dbef113f46ef76dfa8f0c8e78e9",
  "redTrackedPatch": "/Users/zhou/.codex/local-workflows/nodebraid/runs/b2f5a1d4-c627-4a20-bec0-a61ad2376c9f/public-tracer.patch",
  "retention": "Original tracked tracer patch, then-untracked fixture source, real red bundle/log all preserved before implementation."
}
```

### Original tracer public fixture

```typescript
import { createCanvasKernel } from '@nodebraid/kernel';
import type { CanvasRenderer, RendererInput } from '@nodebraid/renderer-api';
import { createSvgRenderer, type SvgDomEventPolicy } from '../src';

export type PolicyFlag = 'preventDefault' | 'stopPropagation';
export type PolicyMode = 'first-true' | 'first-absent' | 'constant-true' | 'constant-false';
interface NativePolicyResult {
  readonly flag: PolicyFlag;
  readonly mode: PolicyMode;
  readonly reads: number;
  readonly receiverCorrect: boolean;
  readonly targetEvent: { readonly isTrusted: boolean; readonly defaultPrevented: boolean; readonly cancelBubble: boolean } | undefined;
  readonly bubbled: number;
  readonly wheelInputs: number;
}
let current: {
  readonly renderer: CanvasRenderer;
  readonly outer: HTMLDivElement;
  readonly stop: () => void;
  readonly ready: Promise<void>;
  readonly read: () => NativePolicyResult;
} | undefined;

export function setupWheelPolicy(flag: PolicyFlag, mode: PolicyMode): { x: number; y: number } {
  if (current) throw new Error('Previous policy case was not cleaned up.');
  const outer = document.createElement('div');
  outer.style.position = 'fixed';
  outer.style.inset = '0';
  document.body.append(outer);
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  outer.append(target);
  const policy: SvgDomEventPolicy = { preventDefault: false, stopPropagation: false };
  let reads = 0;
  let receiverCorrect = true;
  if (mode.startsWith('constant')) Object.defineProperty(policy, flag, { enumerable: true, value: mode === 'constant-true' });
  else Object.defineProperty(policy, flag, {
    enumerable: true,
    get() {
      receiverCorrect &&= this === policy;
      reads += 1;
      return reads === 1 ? (mode === 'first-true' ? true : undefined) : mode !== 'first-true';
    },
  });
  const renderer = createSvgRenderer({ target, input: { wheel: policy } });
  const kernel = createCanvasKernel();
  renderer.updateDocument({ type: 'reset', view: kernel.read() });
  renderer.updateSession({ selection: { nodeIds: [], edgeIds: [] }, viewport: { x: 0, y: 0, zoom: 1 } });
  const inputs: RendererInput[] = [];
  const stop = renderer.subscribeInput((input) => { inputs.push(input); });
  let resolve!: () => void;
  const ready = new Promise<void>((complete) => { resolve = complete; });
  let targetEvent: NativePolicyResult['targetEvent'];
  let bubbled = 0;
  target.addEventListener('wheel', (event) => {
    targetEvent = { isTrusted: event.isTrusted, defaultPrevented: event.defaultPrevented, cancelBubble: event.cancelBubble };
    resolve();
  }, { passive: true });
  outer.addEventListener('wheel', () => { bubbled += 1; }, { passive: true });
  current = { renderer, outer, stop, ready, read: () => ({ flag, mode, reads, receiverCorrect, targetEvent, bubbled, wheelInputs: inputs.filter((input) => input.type === 'wheel').length }) };
  const bounds = target.getBoundingClientRect();
  return { x: bounds.left + 80, y: bounds.top + 80 };
}

export async function readWheelPolicy(): Promise<NativePolicyResult> {
  if (!current) throw new Error('Expected a policy case.');
  await current.ready;
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  return current.read();
}

export async function cleanupWheelPolicy(): Promise<void> {
  if (!current) throw new Error('Expected a policy case to clean up.');
  const owned = current;
  current = undefined;
  owned.stop();
  await owned.renderer.dispose();
  owned.outer.remove();
}
```

## Scope

The72 new trusted native cases cover four input families, two flags, three first values and three property forms. The72 constructor cases cover malformed JavaScript boolean values and original falsey/Symbol getter failures with ordering and unchanged/reusable Targets. Existing48 numeric-tolerance regressions remain. Public native handlers, dynamic Disposition, focus/capture/touch-action and cleanup are preserved. No live online product CI/review code-repair event was triggered or manufactured. Other SVG reflection/projection/native lifecycle seams remain pending.

