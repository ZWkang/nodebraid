# Original public compiled controls

These are the exact saved programs executed before and after the repair. Only explicit repository/head/output/build-provenance parameters differ; test expectations remain unchanged. The Renderer is an application-owned in-memory public Provider, not native-browser proof. Original red/current green command outcomes and observations remain in the linked behavior logs.

## Original fetched main before repair

### delete-selection-repro.ts

SHA256: f18aa79e7ee5ad69ac14facbc073ab943bb568fca350345076b5249512872b8b

```typescript
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {nodeId,type CanvasSnapshot,type CanvasCommit} from '@nodebraid/kernel';
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

const a=nodeId('a'),b=nodeId('b');const rows:Record<string,unknown>[]=[];
for(const mode of ['stable-a','stable-b','changing-selection-root','changing-nodeIds-root','custom-nodeIds-iterator'] as const){
 const host=createPluginHost(),renderer=new ProbeRenderer();let commands:CommandService|undefined,kernel:KernelService|undefined,session:SessionService|undefined;
 const consumer=definePlugin({requires:{commands:commandService,kernel:kernelService,session:sessionService},setup(c){commands=c.services.commands;kernel=c.services.kernel;session=c.services.session;}});
 const installs=[host.install(kernelPlugin),host.install(portPlugin),host.install(commandPlugin),host.install(sessionPlugin),host.install(createRendererPlugin(()=>renderer)),host.install(interactionPlugin),host.install(consumer)];
 try{
  await Promise.all(installs.map(i=>i.whenActive()));assert.ok(commands&&kernel&&session);
  kernel.transact(tx=>{for(const [id,x] of [[a,0],[b,100]] as const)tx.nodes.add({id,type:'task',position:{x,y:0},data:null});});
  session.setSelection({nodeIds:[a],edgeIds:[]});const first=session.getSnapshot().selection;
  session.setSelection({nodeIds:[b],edgeIds:[]});const later=session.getSnapshot().selection;
  const evidence:CanvasSnapshot=kernel.read().snapshot;let selectionReads=0,nodeIdsReads=0,iteratorCalls=0,evidenceReads=0;
  const custom=[a];Object.defineProperty(custom,Symbol.iterator,{value:function*(){iteratorCalls++;yield b;}});Object.freeze(custom);
  const collectionSelection:SessionSnapshot['selection']=Object.freeze({
    get nodeIds(){nodeIdsReads++;return mode==='custom-nodeIds-iterator'?custom:nodeIdsReads===1?first.nodeIds:later.nodeIds;},
    edgeIds:first.edgeIds
  });
  const input:DeleteSelectionInput={
    get selection(){selectionReads++;return mode==='stable-a'?first:mode==='stable-b'?later:mode==='changing-selection-root'?(selectionReads===1?first:later):collectionSelection;},
    get evidence(){evidenceReads++;return evidence;}
  };
  const before=kernel.read();let rejected=false,error:unknown,commit:CanvasCommit|null|undefined;
  try{commit=await commands.execute(deleteSelectionCommand,input);}catch(e){rejected=true;error=e;}
  const after=kernel.read(),errorCode=error&&typeof error==='object'?Reflect.get(error,'code'):undefined;
  const aDeleted=after.query.getNode(a)===undefined,bDeleted=after.query.getNode(b)===undefined;
  if(mode==='stable-a'){assert.equal(rejected,false);assert.ok(commit);assert.equal(aDeleted,true);assert.equal(bDeleted,false);}
  if(mode==='stable-b'){assert.equal(rejected,false);assert.ok(commit);assert.equal(aDeleted,false);assert.equal(bDeleted,true);}
  rows.push({mode,selectionReads,nodeIdsReads,iteratorCalls,evidenceReads,rejected,errorCode:errorCode??null,aDeleted,bDeleted,revision:after.snapshot.revision,viewChanged:after!==before,session:session.getSnapshot().selection,actualFrozenSelections:Object.isFrozen(first)&&Object.isFrozen(later),frozenIndexedArray:Object.isFrozen(custom),indexedNodeId:custom[0]});
 }finally{await host.dispose();assert.equal(renderer.disposed,true);}
}
writeFileSync("/Users/zhou/.codex/local-workflows/nodebraid/runs/20261025T213022-discovery-delete-selection-selection/selection-observations.json",JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows));
for(const row of rows.slice(2)){assert.equal(row.aDeleted,true,String(row.mode)+' must delete the first admitted Selection target a');assert.equal(row.bDeleted,false,String(row.mode)+' must retain unselected b');}
```

### build-and-run.ts

SHA256: 4a0416b7fc39fbee2de69800c6972d822d025c94f19cfc36e953a07a66ebc4cb

```typescript
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdirSync,realpathSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow',out="/Users/zhou/.codex/local-workflows/nodebraid/runs/20261025T213022-discovery-delete-selection-selection";
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),'3ebb9bf51df19825ce98b3371075885dfa496fdf');
assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}),'');
mkdirSync(out+'/build');
const resolved:Record<string,string>={};
const result=await Bun.build({entrypoints:[out+'/delete-selection-repro.ts'],outdir:out+'/build',target:'bun',plugins:[{name:'actual-public-package-exports',setup(builder){builder.onResolve({filter:/^@nodebraid\//},args=>{const path=realpathSync(Bun.resolveSync(args.path,root));assert.ok(path.startsWith(root+'/packages/')&&path.endsWith('/dist/index.js'));resolved[args.path]=path;return{path};});}}]});
assert.equal(result.success,true,result.logs.map(String).join('\n'));assert.equal(result.outputs.length,1);
writeFileSync(out+'/resolved-public-entries.json',JSON.stringify({head:'3ebb9bf51df19825ce98b3371075885dfa496fdf',resolved,entryHashes:Object.fromEntries(Object.entries(resolved).map(([name,path])=>[name,createHash('sha256').update(readFileSync(path)).digest('hex')])),buildOutput:result.outputs[0]!.path,bundleSharesRuntimeAndServiceTokenIdentity:true,reusedBuildProvenance:'/Users/zhou/.codex/local-workflows/nodebraid/runs/c3f119c7-4435-4a0c-9802-eca0875153c5/main-public-build.log'},null,2)+'\n');
await import(result.outputs[0]!.path);
```

### tsconfig.json

SHA256: 0280758e6ece400218497167af85e1ec0994c4592a787c9fb1cbae18bf05799b

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
    "/Users/zhou/.codex/local-workflows/nodebraid/runs/20261025T213022-discovery-delete-selection-selection/delete-selection-repro.ts",
    "/Users/zhou/.codex/local-workflows/nodebraid/runs/20261025T213022-discovery-delete-selection-selection/build-and-run.ts"
  ],
  "include": []
}
```

### resolved-public-entries.json

SHA256: 2c4579bf19ca4588830c49e9a2d28e657ddae1d901fc2625b5a0eb944ce2bbf2

```json
{
  "head": "3ebb9bf51df19825ce98b3371075885dfa496fdf",
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
  "buildOutput": "/Users/zhou/.codex/local-workflows/nodebraid/runs/20261025T213022-discovery-delete-selection-selection/build/delete-selection-repro.js",
  "bundleSharesRuntimeAndServiceTokenIdentity": true,
  "reusedBuildProvenance": "/Users/zhou/.codex/local-workflows/nodebraid/runs/c3f119c7-4435-4a0c-9802-eca0875153c5/main-public-build.log"
}
```

## Reviewed repaired source

### delete-selection-repro.ts

SHA256: b4908cd847dd4b17a8357d66cf23ac8696dadfd6832f3e8121384fdcc9599333

```typescript
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {nodeId,type CanvasSnapshot,type CanvasCommit} from '@nodebraid/kernel';
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

const a=nodeId('a'),b=nodeId('b');const rows:Record<string,unknown>[]=[];
for(const mode of ['stable-a','stable-b','changing-selection-root','changing-nodeIds-root','custom-nodeIds-iterator'] as const){
 const host=createPluginHost(),renderer=new ProbeRenderer();let commands:CommandService|undefined,kernel:KernelService|undefined,session:SessionService|undefined;
 const consumer=definePlugin({requires:{commands:commandService,kernel:kernelService,session:sessionService},setup(c){commands=c.services.commands;kernel=c.services.kernel;session=c.services.session;}});
 const installs=[host.install(kernelPlugin),host.install(portPlugin),host.install(commandPlugin),host.install(sessionPlugin),host.install(createRendererPlugin(()=>renderer)),host.install(interactionPlugin),host.install(consumer)];
 try{
  await Promise.all(installs.map(i=>i.whenActive()));assert.ok(commands&&kernel&&session);
  kernel.transact(tx=>{for(const [id,x] of [[a,0],[b,100]] as const)tx.nodes.add({id,type:'task',position:{x,y:0},data:null});});
  session.setSelection({nodeIds:[a],edgeIds:[]});const first=session.getSnapshot().selection;
  session.setSelection({nodeIds:[b],edgeIds:[]});const later=session.getSnapshot().selection;
  const evidence:CanvasSnapshot=kernel.read().snapshot;let selectionReads=0,nodeIdsReads=0,iteratorCalls=0,evidenceReads=0;
  const custom=[a];Object.defineProperty(custom,Symbol.iterator,{value:function*(){iteratorCalls++;yield b;}});Object.freeze(custom);
  const collectionSelection:SessionSnapshot['selection']=Object.freeze({
    get nodeIds(){nodeIdsReads++;return mode==='custom-nodeIds-iterator'?custom:nodeIdsReads===1?first.nodeIds:later.nodeIds;},
    edgeIds:first.edgeIds
  });
  const input:DeleteSelectionInput={
    get selection(){selectionReads++;return mode==='stable-a'?first:mode==='stable-b'?later:mode==='changing-selection-root'?(selectionReads===1?first:later):collectionSelection;},
    get evidence(){evidenceReads++;return evidence;}
  };
  const before=kernel.read();let rejected=false,error:unknown,commit:CanvasCommit|null|undefined;
  try{commit=await commands.execute(deleteSelectionCommand,input);}catch(e){rejected=true;error=e;}
  const after=kernel.read(),errorCode=error&&typeof error==='object'?Reflect.get(error,'code'):undefined;
  const aDeleted=after.query.getNode(a)===undefined,bDeleted=after.query.getNode(b)===undefined;
  if(mode==='stable-a'){assert.equal(rejected,false);assert.ok(commit);assert.equal(aDeleted,true);assert.equal(bDeleted,false);}
  if(mode==='stable-b'){assert.equal(rejected,false);assert.ok(commit);assert.equal(aDeleted,false);assert.equal(bDeleted,true);}
  rows.push({mode,selectionReads,nodeIdsReads,iteratorCalls,evidenceReads,rejected,errorCode:errorCode??null,aDeleted,bDeleted,revision:after.snapshot.revision,viewChanged:after!==before,session:session.getSnapshot().selection,actualFrozenSelections:Object.isFrozen(first)&&Object.isFrozen(later),frozenIndexedArray:Object.isFrozen(custom),indexedNodeId:custom[0]});
 }finally{await host.dispose();assert.equal(renderer.disposed,true);}
}
writeFileSync("/Users/zhou/.codex/local-workflows/nodebraid/runs/eeeb218c-ccdf-4b8e-951a-250aca1b6ccb/compiled-current/selection-observations.json",JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows));
for(const row of rows.slice(2)){assert.equal(row.aDeleted,true,String(row.mode)+' must delete the first admitted Selection target a');assert.equal(row.bDeleted,false,String(row.mode)+' must retain unselected b');}
```

### build-and-run.ts

SHA256: 47146dac749ac22abbd29093474d6874f940fb895092c7350e6890f69ec8be69

```typescript
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdirSync,realpathSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow',out="/Users/zhou/.codex/local-workflows/nodebraid/runs/eeeb218c-ccdf-4b8e-951a-250aca1b6ccb/compiled-current";
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),'0399f1d4cdafa6590d188056b4da19de29af60ab');
assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}),'');
mkdirSync(out+'/build');
const resolved:Record<string,string>={};
const result=await Bun.build({entrypoints:[out+'/delete-selection-repro.ts'],outdir:out+'/build',target:'bun',plugins:[{name:'actual-public-package-exports',setup(builder){builder.onResolve({filter:/^@nodebraid\//},args=>{const path=realpathSync(Bun.resolveSync(args.path,root));assert.ok(path.startsWith(root+'/packages/')&&path.endsWith('/dist/index.js'));resolved[args.path]=path;return{path};});}}]});
assert.equal(result.success,true,result.logs.map(String).join('\n'));assert.equal(result.outputs.length,1);
writeFileSync(out+'/resolved-public-entries.json',JSON.stringify({head:'0399f1d4cdafa6590d188056b4da19de29af60ab',resolved,entryHashes:Object.fromEntries(Object.entries(resolved).map(([name,path])=>[name,createHash('sha256').update(readFileSync(path)).digest('hex')])),buildOutput:result.outputs[0]!.path,bundleSharesRuntimeAndServiceTokenIdentity:true,reusedBuildProvenance:'/Users/zhou/.codex/local-workflows/nodebraid/runs/eeeb218c-ccdf-4b8e-951a-250aca1b6ccb/affected.log'},null,2)+'\n');
await import(result.outputs[0]!.path);
```

### tsconfig.json

SHA256: a727a70a97898514f4ca94b7f637aebe395f4eab0af71bbd905173e02cbcc1d9

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
    "/Users/zhou/.codex/local-workflows/nodebraid/runs/eeeb218c-ccdf-4b8e-951a-250aca1b6ccb/compiled-current/delete-selection-repro.ts",
    "/Users/zhou/.codex/local-workflows/nodebraid/runs/eeeb218c-ccdf-4b8e-951a-250aca1b6ccb/compiled-current/build-and-run.ts"
  ],
  "include": []
}
```

### resolved-public-entries.json

SHA256: 3d37daccd6a86eec98cf210a605840894a6f7dc618b4aeb0504da5882d490261

```json
{
  "head": "0399f1d4cdafa6590d188056b4da19de29af60ab",
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
  "buildOutput": "/Users/zhou/.codex/local-workflows/nodebraid/runs/eeeb218c-ccdf-4b8e-951a-250aca1b6ccb/compiled-current/build/delete-selection-repro.js",
  "bundleSharesRuntimeAndServiceTokenIdentity": true,
  "reusedBuildProvenance": "/Users/zhou/.codex/local-workflows/nodebraid/runs/eeeb218c-ccdf-4b8e-951a-250aca1b6ccb/affected.log"
}
```
