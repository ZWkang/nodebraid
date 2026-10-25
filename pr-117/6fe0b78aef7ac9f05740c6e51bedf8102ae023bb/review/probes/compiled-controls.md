# Original compiled public reproduction and repaired controls

The original main program and the exact reviewed-source program below are real saved files. The only probe-body edit is its output path. Package resolution uses actual compiled exported barrels and shared Runtime/Service-token identity; the public in-memory Renderer is not native browser proof.

## Original main c709 (behavioral red)

### delete-selection-repro.ts

SHA256: `6823d9bc79cd324d9dccc33dbc5cfdb10b2d82e358dccf4b3047ef06ed4bc2f9`

```typescript
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {nodeId,edgeId,type CanvasSnapshot,type CanvasCommit} from '@nodebraid/kernel';
import {commandPlugin,commandService,type CommandService} from '@nodebraid/plugin-command';
import {kernelPlugin,kernelService,type KernelService} from '@nodebraid/plugin-kernel';
import {portPlugin} from '@nodebraid/plugin-port';
import {createRendererPlugin} from '@nodebraid/plugin-renderer';
import {sessionPlugin,sessionService,type SessionService} from '@nodebraid/plugin-session';
import {interactionPlugin,deleteSelectionCommand,type DeleteSelectionInput} from '@nodebraid/plugin-interaction';
import {createPluginHost,definePlugin} from '@nodebraid/runtime-cordis';
import type {CanvasRenderer,HitResult,RendererDocumentUpdate,RendererInputListener,ScreenPoint} from '@nodebraid/renderer-api';
import type {SessionSnapshot} from '@nodebraid/session-api';
class ProbeRenderer implements CanvasRenderer{
 disposed=false;
 updateDocument(_u:RendererDocumentUpdate):void{}
 updateSession(_s:SessionSnapshot):void{}
 updateInteraction():void{}
 subscribeInput(_l:RendererInputListener):()=>void{return()=>{};}
 hitTest(_p:ScreenPoint):HitResult|null{return null;}
 capturePointer(_id:number):void{}
 releasePointer(_id:number):void{}
 focus():void{}
 async dispose():Promise<void>{this.disposed=true;}
}
const a=nodeId('a'),b=nodeId('b'),e=edgeId('ab');
const rows:Record<string,unknown>[]=[];
for(const kind of ['node','edge'] as const)for(const mode of ['stable-current','stable-stale','changing-collection-root','changing-index','custom-map','custom-edge-iterator'] as const){
 const host=createPluginHost(),renderer=new ProbeRenderer();let commands:CommandService|undefined,kernel:KernelService|undefined,session:SessionService|undefined;
 const consumer=definePlugin({requires:{commands:commandService,kernel:kernelService,session:sessionService},setup(c){commands=c.services.commands;kernel=c.services.kernel;session=c.services.session;}});
 const installs=[host.install(kernelPlugin),host.install(portPlugin),host.install(commandPlugin),host.install(sessionPlugin),host.install(createRendererPlugin(()=>renderer)),host.install(interactionPlugin),host.install(consumer)];
 try{
  await Promise.all(installs.map(i=>i.whenActive()));assert.ok(commands&&kernel&&session);
  kernel.transact(tx=>{tx.nodes.add({id:a,type:'task',position:{x:0,y:0},data:new Map([['a',1]])});tx.nodes.add({id:b,type:'task',position:{x:100,y:0},data:null});tx.edges.add({id:e,type:'link',source:{nodeId:a},target:{nodeId:b},data:null});});
  session.setSelection(kind==='node'?{nodeIds:[a],edgeIds:[]}:{nodeIds:[],edgeIds:[e]});const selection=session.getSnapshot().selection;
  const old:CanvasSnapshot=kernel.read().snapshot;
  for(const x of [10,0])kernel.transact(tx=>{if(kind==='node'){const n=tx.query.getNode(a);assert.ok(n);tx.nodes.replace(a,{...n,position:{x,y:0}});}else{const edge=tx.query.getEdge(e);assert.ok(edge);tx.edges.replace(e,{...edge,type:x===10?'changed':'link'});}});
  const before=kernel.read(),current=before.snapshot;
  const oldValues=kind==='node'?old.nodes:old.edges,newValues=kind==='node'?current.nodes:current.edges;
  assert.deepEqual(oldValues[0],newValues[0]);assert.notEqual(oldValues[0],newValues[0]);
  let rootReads=0,indexReads=0,mapCalls=0,iteratorCalls=0,evidenceReads=0,revisionReads=0;
  const collection=[...oldValues];
  if(mode==='changing-index')Object.defineProperty(collection,0,{get(){indexReads++;return indexReads===1?oldValues[0]:newValues[0];}});
  if(mode==='custom-map')Object.defineProperty(collection,'map',{value(callback:(value:unknown,index:number,array:unknown[])=>unknown){mapCalls++;return Array.prototype.map.call(newValues,callback);}});
  if(mode==='custom-edge-iterator'&&kind==='edge')Object.defineProperty(collection,Symbol.iterator,{value:function*(){iteratorCalls++;yield*current.edges;}});
  Object.freeze(collection);
  function captureCollection(){rootReads++;return mode==='changing-collection-root'?(rootReads<=2?oldValues:newValues):collection;}
  const shell:CanvasSnapshot=Object.freeze({
   get revision(){revisionReads++;return old.revision;},
   get nodes(){return kind==='node'?captureCollection() as CanvasSnapshot['nodes']:old.nodes;},
   get edges(){return kind==='edge'?captureCollection() as CanvasSnapshot['edges']:old.edges;}
  });
  const input:DeleteSelectionInput={selection,get evidence(){evidenceReads++;return mode==='stable-current'?current:mode==='stable-stale'?old:shell;}};
  let rejected=false,error:unknown,commit:CanvasCommit|null|undefined;
  try{commit=await commands.execute(deleteSelectionCommand,input);}catch(err){rejected=true;error=err;}
  const after=kernel.read(),errorCode=error&&typeof error==='object'?Reflect.get(error,'code'):undefined;
  const targetDeleted=kind==='node'?after.query.getNode(a)===undefined:after.query.getEdge(e)===undefined;
  if(mode==='stable-current'){assert.equal(rejected,false);assert.ok(commit);assert.equal(targetDeleted,true);}
  if(mode==='stable-stale'){assert.equal(rejected,true);assert.equal(errorCode,'STALE_SELECTION');assert.equal(after,before);}
  rows.push({kind,mode,rootReads,indexReads,mapCalls,iteratorCalls,revisionReads,evidenceReads,rejected,errorCode:errorCode??null,targetDeleted,revision:after.snapshot.revision,viewPreserved:after===before,frozenSnapshots:Object.isFrozen(old)&&Object.isFrozen(current),frozenCollection:Object.isFrozen(collection)});
 }finally{await host.dispose();assert.equal(renderer.disposed,true);}
}
writeFileSync("/Users/zhou/.codex/local-workflows/nodebraid/runs/20261025T223222-discovery-delete-selection-evidence-collections/observations.json",JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows));
for(const row of rows){if(['changing-collection-root','changing-index','custom-map'].includes(String(row.mode))||(row.kind==='edge'&&row.mode==='custom-edge-iterator')){assert.equal(row.errorCode,'STALE_SELECTION',String(row.kind)+'/'+String(row.mode)+' must reject the first stale entity evidence');assert.equal(row.viewPreserved,true);}}
```

### build-and-run.ts

SHA256: `74f722625260a5d1ff4141cc0ed986776d41dcb85f1036f8d8cea8c203d9d584`

```typescript
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdirSync,realpathSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow',out="/Users/zhou/.codex/local-workflows/nodebraid/runs/20261025T223222-discovery-delete-selection-evidence-collections";
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),'c709c10461f04de9489aa5e8a6cf527164d22afc');
assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}),'');
mkdirSync(out+'/build');
const resolved:Record<string,string>={};
const result=await Bun.build({entrypoints:[out+'/delete-selection-repro.ts'],outdir:out+'/build',target:'bun',plugins:[{name:'actual-public-package-exports',setup(builder){builder.onResolve({filter:/^@nodebraid\//},args=>{const path=realpathSync(Bun.resolveSync(args.path,root));assert.ok(path.startsWith(root+'/packages/')&&path.endsWith('/dist/index.js'));resolved[args.path]=path;return{path};});}}]});
assert.equal(result.success,true,result.logs.map(String).join('\n'));assert.equal(result.outputs.length,1);
writeFileSync(out+'/resolved-public-entries.json',JSON.stringify({head:'c709c10461f04de9489aa5e8a6cf527164d22afc',resolved,entryHashes:Object.fromEntries(Object.entries(resolved).map(([name,path])=>[name,createHash('sha256').update(readFileSync(path)).digest('hex')])),buildOutput:result.outputs[0]!.path,bundleSharesRuntimeAndServiceTokenIdentity:true,reusedBuildProvenance:'/Users/zhou/.codex/local-workflows/nodebraid/runs/eeeb218c-ccdf-4b8e-951a-250aca1b6ccb/main-public-build.log'},null,2)+'\n');
await import(result.outputs[0]!.path);
```

### tsconfig.json

SHA256: `378d59830786892430177e9ab7ef8d53ea9fd1225f1363c3d3d719368f1c68f1`

```json
{
  "extends": "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/tsconfig.base.json",
  "compilerOptions": {
    "typeRoots": [
      "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/node_modules/@types"
    ],
    "paths": {
      "@nodebraid/plugin-history": [
        "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/plugin-history/dist/index.d.ts"
      ],
      "@nodebraid/renderer-api": [
        "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/renderer-api/dist/index.d.ts"
      ],
      "@nodebraid/plugin-layout": [
        "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/plugin-layout/dist/index.d.ts"
      ],
      "@nodebraid/port-api": [
        "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/port-api/dist/index.d.ts"
      ],
      "@nodebraid/core": [
        "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/core/dist/index.d.ts"
      ],
      "@nodebraid/plugin-port": [
        "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/plugin-port/dist/index.d.ts"
      ],
      "@nodebraid/layout-dagre": [
        "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/layout-dagre/dist/index.d.ts"
      ],
      "@nodebraid/plugin-session": [
        "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/plugin-session/dist/index.d.ts"
      ],
      "@nodebraid/preset-basic": [
        "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/preset-basic/dist/index.d.ts"
      ],
      "@nodebraid/layout-elk": [
        "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/layout-elk/dist/index.d.ts"
      ],
      "@nodebraid/plugin-command": [
        "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/plugin-command/dist/index.d.ts"
      ],
      "@nodebraid/plugin-interaction": [
        "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/plugin-interaction/dist/index.d.ts"
      ],
      "@nodebraid/session-api": [
        "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/session-api/dist/index.d.ts"
      ],
      "@nodebraid/plugin-clipboard": [
        "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/plugin-clipboard/dist/index.d.ts"
      ],
      "@nodebraid/plugin-renderer": [
        "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/plugin-renderer/dist/index.d.ts"
      ],
      "@nodebraid/adapter-react": [
        "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/adapter-react/dist/index.d.ts"
      ],
      "@nodebraid/plugin-kernel": [
        "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/plugin-kernel/dist/index.d.ts"
      ],
      "@nodebraid/layout-api": [
        "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/layout-api/dist/index.d.ts"
      ],
      "@nodebraid/runtime-cordis": [
        "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/runtime-cordis/dist/index.d.ts"
      ],
      "@nodebraid/diagnostics": [
        "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/diagnostics/dist/index.d.ts"
      ],
      "@nodebraid/renderer-svg": [
        "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/renderer-svg/dist/index.d.ts"
      ],
      "@nodebraid/interaction-api": [
        "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/interaction-api/dist/index.d.ts"
      ],
      "@nodebraid/plugin-duplicate-selection": [
        "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/plugin-duplicate-selection/dist/index.d.ts"
      ],
      "@nodebraid/canvas-fragment": [
        "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/canvas-fragment/dist/index.d.ts"
      ],
      "@nodebraid/kernel": [
        "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/kernel/dist/index.d.ts"
      ]
    }
  },
  "files": [
    "/Users/zhou/.codex/local-workflows/nodebraid/runs/20261025T223222-discovery-delete-selection-evidence-collections/delete-selection-repro.ts",
    "/Users/zhou/.codex/local-workflows/nodebraid/runs/20261025T223222-discovery-delete-selection-evidence-collections/build-and-run.ts"
  ],
  "include": []
}
```

### resolved-public-entries.json

SHA256: `cc0a476e9b6c3ff2f5000e83d7e322bc656148c4430b86bf85c2bd4f4b31d628`

```json
{
  "head": "c709c10461f04de9489aa5e8a6cf527164d22afc",
  "resolved": {
    "@nodebraid/kernel": "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/kernel/dist/index.js",
    "@nodebraid/plugin-command": "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/plugin-command/dist/index.js",
    "@nodebraid/plugin-kernel": "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/plugin-kernel/dist/index.js",
    "@nodebraid/plugin-port": "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/plugin-port/dist/index.js",
    "@nodebraid/plugin-renderer": "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/plugin-renderer/dist/index.js",
    "@nodebraid/plugin-session": "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/plugin-session/dist/index.js",
    "@nodebraid/plugin-interaction": "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/plugin-interaction/dist/index.js",
    "@nodebraid/runtime-cordis": "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/runtime-cordis/dist/index.js",
    "@nodebraid/diagnostics": "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/diagnostics/dist/index.js",
    "@nodebraid/renderer-api": "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/renderer-api/dist/index.js",
    "@nodebraid/interaction-api": "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/interaction-api/dist/index.js"
  },
  "entryHashes": {
    "@nodebraid/kernel": "c9ff8d863bd1c07313f11443fbf1c8773ff320d6edb4d5b0d18e35cd1b429f92",
    "@nodebraid/plugin-command": "1d7f5330d190f6308aca64385aef47729efd99c86e8cf7486efa7d138e5895de",
    "@nodebraid/plugin-kernel": "6a8360764dcc17d0cdc449d77f86cdce959a8d69ca30e3e1394c96327b26aa70",
    "@nodebraid/plugin-port": "0f7b2354c858d54f1957f8b73e19d3087c935b46d2b0c4147e018eb89a9b1e50",
    "@nodebraid/plugin-renderer": "77d678ea8e4fbb41631b56daac145c0a532bc7b4f07a9361092d0366458cfb66",
    "@nodebraid/plugin-session": "dd5518501483e57a960156de2e4f3e60384d4523f7930dc40ee9d94a1d28ed3d",
    "@nodebraid/plugin-interaction": "be7340694ba387bbd1d3bd52cd733803df6d7dac5efa97055ff65806746521e0",
    "@nodebraid/runtime-cordis": "c51e03769fd58eee903f81f5556ad3ac653917eab47c6dd6226d5e8c1972d5f4",
    "@nodebraid/diagnostics": "438fb75caf4a4ff7e7e73dd3b13a9c188a47448b0892e8b3f7fa3158f6886ac9",
    "@nodebraid/renderer-api": "e11c931a0082e17755436efecb49079f00db4dae619d382bd60a74f8fe977e7f",
    "@nodebraid/interaction-api": "ee72f90e5774574b57c8bdf729610b79e0bc0c9a6d6300b055a853aa68e2bd6f"
  },
  "buildOutput": "/Users/zhou/.codex/local-workflows/nodebraid/runs/20261025T223222-discovery-delete-selection-evidence-collections/build/delete-selection-repro.js",
  "bundleSharesRuntimeAndServiceTokenIdentity": true,
  "reusedBuildProvenance": "/Users/zhou/.codex/local-workflows/nodebraid/runs/eeeb218c-ccdf-4b8e-951a-250aca1b6ccb/main-public-build.log"
}
```

## Reviewed 44cb source (green)

### delete-selection-repro.ts

SHA256: `a28033125209f3bc2849dd74924454546c24922af9a63ccdd0dafbaec9e6cf5e`

```typescript
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {nodeId,edgeId,type CanvasSnapshot,type CanvasCommit} from '@nodebraid/kernel';
import {commandPlugin,commandService,type CommandService} from '@nodebraid/plugin-command';
import {kernelPlugin,kernelService,type KernelService} from '@nodebraid/plugin-kernel';
import {portPlugin} from '@nodebraid/plugin-port';
import {createRendererPlugin} from '@nodebraid/plugin-renderer';
import {sessionPlugin,sessionService,type SessionService} from '@nodebraid/plugin-session';
import {interactionPlugin,deleteSelectionCommand,type DeleteSelectionInput} from '@nodebraid/plugin-interaction';
import {createPluginHost,definePlugin} from '@nodebraid/runtime-cordis';
import type {CanvasRenderer,HitResult,RendererDocumentUpdate,RendererInputListener,ScreenPoint} from '@nodebraid/renderer-api';
import type {SessionSnapshot} from '@nodebraid/session-api';
class ProbeRenderer implements CanvasRenderer{
 disposed=false;
 updateDocument(_u:RendererDocumentUpdate):void{}
 updateSession(_s:SessionSnapshot):void{}
 updateInteraction():void{}
 subscribeInput(_l:RendererInputListener):()=>void{return()=>{};}
 hitTest(_p:ScreenPoint):HitResult|null{return null;}
 capturePointer(_id:number):void{}
 releasePointer(_id:number):void{}
 focus():void{}
 async dispose():Promise<void>{this.disposed=true;}
}
const a=nodeId('a'),b=nodeId('b'),e=edgeId('ab');
const rows:Record<string,unknown>[]=[];
for(const kind of ['node','edge'] as const)for(const mode of ['stable-current','stable-stale','changing-collection-root','changing-index','custom-map','custom-edge-iterator'] as const){
 const host=createPluginHost(),renderer=new ProbeRenderer();let commands:CommandService|undefined,kernel:KernelService|undefined,session:SessionService|undefined;
 const consumer=definePlugin({requires:{commands:commandService,kernel:kernelService,session:sessionService},setup(c){commands=c.services.commands;kernel=c.services.kernel;session=c.services.session;}});
 const installs=[host.install(kernelPlugin),host.install(portPlugin),host.install(commandPlugin),host.install(sessionPlugin),host.install(createRendererPlugin(()=>renderer)),host.install(interactionPlugin),host.install(consumer)];
 try{
  await Promise.all(installs.map(i=>i.whenActive()));assert.ok(commands&&kernel&&session);
  kernel.transact(tx=>{tx.nodes.add({id:a,type:'task',position:{x:0,y:0},data:new Map([['a',1]])});tx.nodes.add({id:b,type:'task',position:{x:100,y:0},data:null});tx.edges.add({id:e,type:'link',source:{nodeId:a},target:{nodeId:b},data:null});});
  session.setSelection(kind==='node'?{nodeIds:[a],edgeIds:[]}:{nodeIds:[],edgeIds:[e]});const selection=session.getSnapshot().selection;
  const old:CanvasSnapshot=kernel.read().snapshot;
  for(const x of [10,0])kernel.transact(tx=>{if(kind==='node'){const n=tx.query.getNode(a);assert.ok(n);tx.nodes.replace(a,{...n,position:{x,y:0}});}else{const edge=tx.query.getEdge(e);assert.ok(edge);tx.edges.replace(e,{...edge,type:x===10?'changed':'link'});}});
  const before=kernel.read(),current=before.snapshot;
  const oldValues=kind==='node'?old.nodes:old.edges,newValues=kind==='node'?current.nodes:current.edges;
  assert.deepEqual(oldValues[0],newValues[0]);assert.notEqual(oldValues[0],newValues[0]);
  let rootReads=0,indexReads=0,mapCalls=0,iteratorCalls=0,evidenceReads=0,revisionReads=0;
  const collection=[...oldValues];
  if(mode==='changing-index')Object.defineProperty(collection,0,{get(){indexReads++;return indexReads===1?oldValues[0]:newValues[0];}});
  if(mode==='custom-map')Object.defineProperty(collection,'map',{value(callback:(value:unknown,index:number,array:unknown[])=>unknown){mapCalls++;return Array.prototype.map.call(newValues,callback);}});
  if(mode==='custom-edge-iterator'&&kind==='edge')Object.defineProperty(collection,Symbol.iterator,{value:function*(){iteratorCalls++;yield*current.edges;}});
  Object.freeze(collection);
  function captureCollection(){rootReads++;return mode==='changing-collection-root'?(rootReads<=2?oldValues:newValues):collection;}
  const shell:CanvasSnapshot=Object.freeze({
   get revision(){revisionReads++;return old.revision;},
   get nodes(){return kind==='node'?captureCollection() as CanvasSnapshot['nodes']:old.nodes;},
   get edges(){return kind==='edge'?captureCollection() as CanvasSnapshot['edges']:old.edges;}
  });
  const input:DeleteSelectionInput={selection,get evidence(){evidenceReads++;return mode==='stable-current'?current:mode==='stable-stale'?old:shell;}};
  let rejected=false,error:unknown,commit:CanvasCommit|null|undefined;
  try{commit=await commands.execute(deleteSelectionCommand,input);}catch(err){rejected=true;error=err;}
  const after=kernel.read(),errorCode=error&&typeof error==='object'?Reflect.get(error,'code'):undefined;
  const targetDeleted=kind==='node'?after.query.getNode(a)===undefined:after.query.getEdge(e)===undefined;
  if(mode==='stable-current'){assert.equal(rejected,false);assert.ok(commit);assert.equal(targetDeleted,true);}
  if(mode==='stable-stale'){assert.equal(rejected,true);assert.equal(errorCode,'STALE_SELECTION');assert.equal(after,before);}
  rows.push({kind,mode,rootReads,indexReads,mapCalls,iteratorCalls,revisionReads,evidenceReads,rejected,errorCode:errorCode??null,targetDeleted,revision:after.snapshot.revision,viewPreserved:after===before,frozenSnapshots:Object.isFrozen(old)&&Object.isFrozen(current),frozenCollection:Object.isFrozen(collection)});
 }finally{await host.dispose();assert.equal(renderer.disposed,true);}
}
writeFileSync("/Users/zhou/.codex/local-workflows/nodebraid/runs/69ec7983-4d6a-41ab-8bb3-479a18d4850e/compiled-controls/observations.json",JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows));
for(const row of rows){if(['changing-collection-root','changing-index','custom-map'].includes(String(row.mode))||(row.kind==='edge'&&row.mode==='custom-edge-iterator')){assert.equal(row.errorCode,'STALE_SELECTION',String(row.kind)+'/'+String(row.mode)+' must reject the first stale entity evidence');assert.equal(row.viewPreserved,true);}}
```

### build-and-run.ts

SHA256: `b166007ff44e8ff5c3855df129d7d6b44d87de5b35ec1fde9b4e708a632fc7f3`

```typescript
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdirSync,realpathSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow',out="/Users/zhou/.codex/local-workflows/nodebraid/runs/69ec7983-4d6a-41ab-8bb3-479a18d4850e/compiled-controls";
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),'44cb1ba67a358bfdcaaa2f0351cbbca15fc77315');
assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}),'');
mkdirSync(out+'/build');
const resolved:Record<string,string>={};
const result=await Bun.build({entrypoints:[out+'/delete-selection-repro.ts'],outdir:out+'/build',target:'bun',plugins:[{name:'actual-public-package-exports',setup(builder){builder.onResolve({filter:/^@nodebraid\//},args=>{const path=realpathSync(Bun.resolveSync(args.path,root));assert.ok(path.startsWith(root+'/packages/')&&path.endsWith('/dist/index.js'));resolved[args.path]=path;return{path};});}}]});
assert.equal(result.success,true,result.logs.map(String).join('\n'));assert.equal(result.outputs.length,1);
writeFileSync(out+'/resolved-public-entries.json',JSON.stringify({head:'44cb1ba67a358bfdcaaa2f0351cbbca15fc77315',resolved,entryHashes:Object.fromEntries(Object.entries(resolved).map(([name,path])=>[name,createHash('sha256').update(readFileSync(path)).digest('hex')])),buildOutput:result.outputs[0]!.path,bundleSharesRuntimeAndServiceTokenIdentity:true,reusedBuildProvenance:'/Users/zhou/.codex/local-workflows/nodebraid/runs/69ec7983-4d6a-41ab-8bb3-479a18d4850e/affected.log'},null,2)+'\n');
await import(result.outputs[0]!.path);
```

### tsconfig.json

SHA256: `9e8d9e24aeb403352f263f47dda1e19afc98d852323bf8ecac61161d039095f0`

```json
{
  "extends": "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/tsconfig.base.json",
  "compilerOptions": {
    "typeRoots": [
      "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/node_modules/@types"
    ],
    "paths": {
      "@nodebraid/plugin-history": [
        "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/plugin-history/dist/index.d.ts"
      ],
      "@nodebraid/renderer-api": [
        "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/renderer-api/dist/index.d.ts"
      ],
      "@nodebraid/plugin-layout": [
        "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/plugin-layout/dist/index.d.ts"
      ],
      "@nodebraid/port-api": [
        "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/port-api/dist/index.d.ts"
      ],
      "@nodebraid/core": [
        "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/core/dist/index.d.ts"
      ],
      "@nodebraid/plugin-port": [
        "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/plugin-port/dist/index.d.ts"
      ],
      "@nodebraid/layout-dagre": [
        "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/layout-dagre/dist/index.d.ts"
      ],
      "@nodebraid/plugin-session": [
        "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/plugin-session/dist/index.d.ts"
      ],
      "@nodebraid/preset-basic": [
        "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/preset-basic/dist/index.d.ts"
      ],
      "@nodebraid/layout-elk": [
        "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/layout-elk/dist/index.d.ts"
      ],
      "@nodebraid/plugin-command": [
        "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/plugin-command/dist/index.d.ts"
      ],
      "@nodebraid/plugin-interaction": [
        "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/plugin-interaction/dist/index.d.ts"
      ],
      "@nodebraid/session-api": [
        "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/session-api/dist/index.d.ts"
      ],
      "@nodebraid/plugin-clipboard": [
        "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/plugin-clipboard/dist/index.d.ts"
      ],
      "@nodebraid/plugin-renderer": [
        "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/plugin-renderer/dist/index.d.ts"
      ],
      "@nodebraid/adapter-react": [
        "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/adapter-react/dist/index.d.ts"
      ],
      "@nodebraid/plugin-kernel": [
        "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/plugin-kernel/dist/index.d.ts"
      ],
      "@nodebraid/layout-api": [
        "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/layout-api/dist/index.d.ts"
      ],
      "@nodebraid/runtime-cordis": [
        "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/runtime-cordis/dist/index.d.ts"
      ],
      "@nodebraid/diagnostics": [
        "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/diagnostics/dist/index.d.ts"
      ],
      "@nodebraid/renderer-svg": [
        "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/renderer-svg/dist/index.d.ts"
      ],
      "@nodebraid/interaction-api": [
        "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/interaction-api/dist/index.d.ts"
      ],
      "@nodebraid/plugin-duplicate-selection": [
        "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/plugin-duplicate-selection/dist/index.d.ts"
      ],
      "@nodebraid/canvas-fragment": [
        "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/canvas-fragment/dist/index.d.ts"
      ],
      "@nodebraid/kernel": [
        "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/kernel/dist/index.d.ts"
      ]
    }
  },
  "files": [
    "/Users/zhou/.codex/local-workflows/nodebraid/runs/69ec7983-4d6a-41ab-8bb3-479a18d4850e/compiled-controls/delete-selection-repro.ts",
    "/Users/zhou/.codex/local-workflows/nodebraid/runs/69ec7983-4d6a-41ab-8bb3-479a18d4850e/compiled-controls/build-and-run.ts"
  ],
  "include": []
}
```

### resolved-public-entries.json

SHA256: `d7983bba797114559849b8b92d038c0ae89571517b29edb7a078e73dadd0fe5a`

```json
{
  "head": "44cb1ba67a358bfdcaaa2f0351cbbca15fc77315",
  "resolved": {
    "@nodebraid/kernel": "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/kernel/dist/index.js",
    "@nodebraid/plugin-command": "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/plugin-command/dist/index.js",
    "@nodebraid/plugin-kernel": "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/plugin-kernel/dist/index.js",
    "@nodebraid/plugin-port": "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/plugin-port/dist/index.js",
    "@nodebraid/plugin-renderer": "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/plugin-renderer/dist/index.js",
    "@nodebraid/plugin-session": "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/plugin-session/dist/index.js",
    "@nodebraid/plugin-interaction": "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/plugin-interaction/dist/index.js",
    "@nodebraid/runtime-cordis": "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/runtime-cordis/dist/index.js",
    "@nodebraid/diagnostics": "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/diagnostics/dist/index.js",
    "@nodebraid/renderer-api": "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/renderer-api/dist/index.js",
    "@nodebraid/interaction-api": "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/interaction-api/dist/index.js"
  },
  "entryHashes": {
    "@nodebraid/kernel": "c9ff8d863bd1c07313f11443fbf1c8773ff320d6edb4d5b0d18e35cd1b429f92",
    "@nodebraid/plugin-command": "1d7f5330d190f6308aca64385aef47729efd99c86e8cf7486efa7d138e5895de",
    "@nodebraid/plugin-kernel": "6a8360764dcc17d0cdc449d77f86cdce959a8d69ca30e3e1394c96327b26aa70",
    "@nodebraid/plugin-port": "0f7b2354c858d54f1957f8b73e19d3087c935b46d2b0c4147e018eb89a9b1e50",
    "@nodebraid/plugin-renderer": "77d678ea8e4fbb41631b56daac145c0a532bc7b4f07a9361092d0366458cfb66",
    "@nodebraid/plugin-session": "dd5518501483e57a960156de2e4f3e60384d4523f7930dc40ee9d94a1d28ed3d",
    "@nodebraid/plugin-interaction": "be7340694ba387bbd1d3bd52cd733803df6d7dac5efa97055ff65806746521e0",
    "@nodebraid/runtime-cordis": "c51e03769fd58eee903f81f5556ad3ac653917eab47c6dd6226d5e8c1972d5f4",
    "@nodebraid/diagnostics": "438fb75caf4a4ff7e7e73dd3b13a9c188a47448b0892e8b3f7fa3158f6886ac9",
    "@nodebraid/renderer-api": "e11c931a0082e17755436efecb49079f00db4dae619d382bd60a74f8fe977e7f",
    "@nodebraid/interaction-api": "ee72f90e5774574b57c8bdf729610b79e0bc0c9a6d6300b055a853aa68e2bd6f"
  },
  "buildOutput": "/Users/zhou/.codex/local-workflows/nodebraid/runs/69ec7983-4d6a-41ab-8bb3-479a18d4850e/compiled-controls/build/delete-selection-repro.js",
  "bundleSharesRuntimeAndServiceTokenIdentity": true,
  "reusedBuildProvenance": "/Users/zhou/.codex/local-workflows/nodebraid/runs/69ec7983-4d6a-41ab-8bb3-479a18d4850e/affected.log"
}
```

## compiled-provenance.json

SHA256: `04c0d496bc6c189c00b97a9e4ea2d6506a614f631520a7ad27facd7b5c64254a`

```json
{
  "originalSource": "/Users/zhou/.codex/local-workflows/nodebraid/runs/20261025T223222-discovery-delete-selection-evidence-collections/delete-selection-repro.ts",
  "originalSha256": "6823d9bc79cd324d9dccc33dbc5cfdb10b2d82e358dccf4b3047ef06ed4bc2f9",
  "currentSource": "/Users/zhou/.codex/local-workflows/nodebraid/runs/69ec7983-4d6a-41ab-8bb3-479a18d4850e/compiled-controls/delete-selection-repro.ts",
  "currentSha256": "a28033125209f3bc2849dd74924454546c24922af9a63ccdd0dafbaec9e6cf5e",
  "onlyProgramChange": "output destination path;12case body/assertions identical",
  "originalMain": "c709c10461f04de9489aa5e8a6cf527164d22afc",
  "checkedLocalHead": "44cb1ba67a358bfdcaaa2f0351cbbca15fc77315",
  "typecheckExit": 0,
  "originalRedExit": 1,
  "currentGreenExit": 0,
  "cases": 12,
  "publicSourceResolution": "/Users/zhou/.codex/local-workflows/nodebraid/runs/69ec7983-4d6a-41ab-8bb3-479a18d4850e/compiled-controls/resolved-public-entries.json",
  "inMemoryRendererScope": "Real Host/Kernel/Command/Session/Interaction; not native/browser proof"
}
```

## fixture-correction.json

SHA256: `83ec0c52554f00004848258547d863668232f8094be258dd2d4417bfd912f99f`

```json
{
  "originalLog": "/Users/zhou/.codex/local-workflows/nodebraid/runs/69ec7983-4d6a-41ab-8bb3-479a18d4850e/public-green-expanded.log",
  "originalTest": "/Users/zhou/.codex/local-workflows/nodebraid/runs/69ec7983-4d6a-41ab-8bb3-479a18d4850e/expanded-fixture-before-correction.ts.txt",
  "cause": "Edge fixture assigned index0 after defining it getter-only, before Edge admission. TypeError was correctly preserved.",
  "correction": "Remove premature Nodes-field write. Getter for Edge index1 mutates earlier plain index0 only after its value is admitted. Original STALE_SELECTION and exact View/Session/History assertions retained. No production/assertion changes."
}
```


## Presentation adapter correction

The first appendix adapter expected a nonexistent markdown field in report.json. It failed before modifying either generated report. The raw failure is preserved below. The correction uses the existing report.md artifact and original report.json schema; source, checks, original review bodies, request and receipts remain unchanged. This was a local report adapter error, not a product or online CI repair.

```text
Traceback (most recent call last):
  File "/Users/zhou/.codex/local-workflows/nodebraid/runs/69ec7983-4d6a-41ab-8bb3-479a18d4850e/add-source-appendix.py", line 28, in <module>
    report['markdown']+=addition
    ~~~~~~^^^^^^^^^^^^
KeyError: 'markdown'

```
