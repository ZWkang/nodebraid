# Reproducible Document first-failure controls

These are the actual saved source files for the original main failure and exact reviewed-source controls. The probe body changes only its output destination. Both use real compiled public exports; no private helper or mocked success path.

## Original main c7d7 (red)

### document-array-probe.ts

SHA256: `da0399cacb146b84803c390db2a26d7e38c8e8dda491847d3a5dedd9f0a3e6ce`

```typescript
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createCanvasKernel,nodeId,edgeId,type CanvasSnapshot} from '@nodebraid/kernel';
import {serializeCanvasDocument,deserializeCanvasDocument,type CanvasDocumentDataCodec} from '@nodebraid/document';
const k=createCanvasKernel(),n=nodeId('node'),e=edgeId('edge');
k.transact(tx=>{tx.nodes.add({id:n,type:'task',position:{x:0,y:0},data:'opaque-node'});tx.edges.add({id:e,type:'link',source:{nodeId:n},target:{nodeId:n},data:'opaque-edge'});});
const before=k.read(),rows:Record<string,unknown>[]=[];
const codec:CanvasDocumentDataCodec={format:'probe/text-v1',encode(value){assert.equal(typeof value,'string');return value as string;},decode(text){return text;}};
assert.deepEqual(deserializeCanvasDocument(serializeCanvasDocument(before.snapshot,codec),codec).nodes,before.snapshot.nodes);
for(const field of ['nodes','edges'] as const)for(const length of [1,4294967296,Infinity])for(const mode of ['malformed-first','throwing-first'] as const){
 const marker=new Error('original '+field+' index read failure');let indices=0,lengthReads=0,codecCalls=0;
 const values=new Proxy([...before.snapshot[field]],{get(target,key,receiver){if(key==='length'){lengthReads++;return length;}if(key==='0'){indices++;if(mode==='throwing-first')throw marker;return null;}if(key==='1')throw new Error('First entity must fail before any later read');return Reflect.get(target,key,receiver);}});
 const source={...before.snapshot,[field]:values} as CanvasSnapshot;
 let rejected=false,error:unknown;
 try{serializeCanvasDocument(source,{...codec,encode(value){codecCalls++;return codec.encode(value);}});}catch(value){rejected=true;error=value;}
 assert.equal(rejected,true);assert.equal(codecCalls,0);assert.equal(k.read(),before);
 const domain=error&&typeof error==='object'?Reflect.get(error,'domain'):undefined,code=error&&typeof error==='object'?Reflect.get(error,'code'):undefined;
 rows.push({field,length:String(length),mode,lengthReads,indices,codecCalls,name:error instanceof Error?error.name:typeof error,domain:domain??null,code:code??null,originalThrownValuePreserved:error===marker});
}
writeFileSync("/Users/zhou/.codex/local-workflows/nodebraid/runs/20261026T032824-discovery-document-codec-inputs/observations.json",JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows));
for(const row of rows){assert.equal(row.indices,1,String(row.field)+'/'+String(row.length)+' must reach the first entity before allocation can mask its validation/read failure');if(row.mode==='throwing-first')assert.equal(row.originalThrownValuePreserved,true);else{assert.equal(row.domain,'document');assert.equal(row.code,'INVALID_DOCUMENT');}}
```

### build-and-run.ts

SHA256: `2cd94a345149cb8579867c76e29c04e878f3f0f5a0903e922f5a1199494165ca`

```typescript
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdirSync,realpathSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow',out="/Users/zhou/.codex/local-workflows/nodebraid/runs/20261026T032824-discovery-document-codec-inputs";
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),'c7d7f1b8c5a729a1e127bf6a1a080a1487b4471d');
assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}),'');
mkdirSync(out+'/build');
const resolved:Record<string,string>={};
const result=await Bun.build({entrypoints:[out+'/document-array-probe.ts'],outdir:out+'/build',target:'bun',plugins:[{name:'actual-public-package-exports',setup(builder){builder.onResolve({filter:/^@nodebraid\//},args=>{const path=realpathSync(Bun.resolveSync(args.path,root));assert.ok(path.startsWith(root+'/packages/')&&path.endsWith('/dist/index.js'));resolved[args.path]=path;return{path};});}}]});
assert.equal(result.success,true,result.logs.map(String).join('\n'));assert.equal(result.outputs.length,1);
writeFileSync(out+'/resolved-public-entries.json',JSON.stringify({head:'c7d7f1b8c5a729a1e127bf6a1a080a1487b4471d',resolved,entryHashes:Object.fromEntries(Object.entries(resolved).map(([name,path])=>[name,createHash('sha256').update(readFileSync(path)).digest('hex')])),buildOutput:result.outputs[0]!.path,bundleSharesRuntimeAndServiceTokenIdentity:true,reusedBuildProvenance:'/Users/zhou/.codex/local-workflows/nodebraid/runs/69ec7983-4d6a-41ab-8bb3-479a18d4850e/main-public-build.log'},null,2)+'\n');
await import(result.outputs[0]!.path);
```

### tsconfig.json

SHA256: `7f88f6cc7a97d3b77605ef7e24dd71732d8aba1326fdbc14c3cf50c475a8947f`

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
      ],
      "@nodebraid/document": [
        "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/document/dist/index.d.ts"
      ]
    }
  },
  "files": [
    "/Users/zhou/.codex/local-workflows/nodebraid/runs/20261026T032824-discovery-document-codec-inputs/document-array-probe.ts",
    "/Users/zhou/.codex/local-workflows/nodebraid/runs/20261026T032824-discovery-document-codec-inputs/build-and-run.ts"
  ],
  "include": []
}
```

### resolved-public-entries.json

SHA256: `4c5534e9058265bd41534f45f15835246dd9ca4e5e2492fcb425c56dd8470402`

```json
{
  "head": "c7d7f1b8c5a729a1e127bf6a1a080a1487b4471d",
  "resolved": {
    "@nodebraid/kernel": "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/kernel/dist/index.js",
    "@nodebraid/document": "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/document/dist/index.js",
    "@nodebraid/diagnostics": "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/diagnostics/dist/index.js"
  },
  "entryHashes": {
    "@nodebraid/kernel": "c9ff8d863bd1c07313f11443fbf1c8773ff320d6edb4d5b0d18e35cd1b429f92",
    "@nodebraid/document": "21c0fafbdff0b4ffc5602a207f4da815dc3bbb8569ea46238ba236fd49702c81",
    "@nodebraid/diagnostics": "438fb75caf4a4ff7e7e73dd3b13a9c188a47448b0892e8b3f7fa3158f6886ac9"
  },
  "buildOutput": "/Users/zhou/.codex/local-workflows/nodebraid/runs/20261026T032824-discovery-document-codec-inputs/build/document-array-probe.js",
  "bundleSharesRuntimeAndServiceTokenIdentity": true,
  "reusedBuildProvenance": "/Users/zhou/.codex/local-workflows/nodebraid/runs/69ec7983-4d6a-41ab-8bb3-479a18d4850e/main-public-build.log"
}
```

## Reviewed0255 source (green)

### document-array-probe.ts

SHA256: `bb60e17f1eab0daf841b6d312e0eef320c859b97d096f15ae8dd7b06264a9138`

```typescript
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createCanvasKernel,nodeId,edgeId,type CanvasSnapshot} from '@nodebraid/kernel';
import {serializeCanvasDocument,deserializeCanvasDocument,type CanvasDocumentDataCodec} from '@nodebraid/document';
const k=createCanvasKernel(),n=nodeId('node'),e=edgeId('edge');
k.transact(tx=>{tx.nodes.add({id:n,type:'task',position:{x:0,y:0},data:'opaque-node'});tx.edges.add({id:e,type:'link',source:{nodeId:n},target:{nodeId:n},data:'opaque-edge'});});
const before=k.read(),rows:Record<string,unknown>[]=[];
const codec:CanvasDocumentDataCodec={format:'probe/text-v1',encode(value){assert.equal(typeof value,'string');return value as string;},decode(text){return text;}};
assert.deepEqual(deserializeCanvasDocument(serializeCanvasDocument(before.snapshot,codec),codec).nodes,before.snapshot.nodes);
for(const field of ['nodes','edges'] as const)for(const length of [1,4294967296,Infinity])for(const mode of ['malformed-first','throwing-first'] as const){
 const marker=new Error('original '+field+' index read failure');let indices=0,lengthReads=0,codecCalls=0;
 const values=new Proxy([...before.snapshot[field]],{get(target,key,receiver){if(key==='length'){lengthReads++;return length;}if(key==='0'){indices++;if(mode==='throwing-first')throw marker;return null;}if(key==='1')throw new Error('First entity must fail before any later read');return Reflect.get(target,key,receiver);}});
 const source={...before.snapshot,[field]:values} as CanvasSnapshot;
 let rejected=false,error:unknown;
 try{serializeCanvasDocument(source,{...codec,encode(value){codecCalls++;return codec.encode(value);}});}catch(value){rejected=true;error=value;}
 assert.equal(rejected,true);assert.equal(codecCalls,0);assert.equal(k.read(),before);
 const domain=error&&typeof error==='object'?Reflect.get(error,'domain'):undefined,code=error&&typeof error==='object'?Reflect.get(error,'code'):undefined;
 rows.push({field,length:String(length),mode,lengthReads,indices,codecCalls,name:error instanceof Error?error.name:typeof error,domain:domain??null,code:code??null,originalThrownValuePreserved:error===marker});
}
writeFileSync("/Users/zhou/.codex/local-workflows/nodebraid/runs/2690b62a-d6a9-4970-8e20-1a6d3369d34e/compiled-controls/observations.json",JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows));
for(const row of rows){assert.equal(row.indices,1,String(row.field)+'/'+String(row.length)+' must reach the first entity before allocation can mask its validation/read failure');if(row.mode==='throwing-first')assert.equal(row.originalThrownValuePreserved,true);else{assert.equal(row.domain,'document');assert.equal(row.code,'INVALID_DOCUMENT');}}
```

### build-and-run.ts

SHA256: `3d811a18e8e84dc17d41c9c21a72fbee51d33cc701ab0c4fdd08b8ea5907af0a`

```typescript
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdirSync,realpathSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow',out="/Users/zhou/.codex/local-workflows/nodebraid/runs/2690b62a-d6a9-4970-8e20-1a6d3369d34e/compiled-controls";
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),'0255b60bb4e4404328ec4458a4f38ae64f035bc3');
assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}),'');
mkdirSync(out+'/build');
const resolved:Record<string,string>={};
const result=await Bun.build({entrypoints:[out+'/document-array-probe.ts'],outdir:out+'/build',target:'bun',plugins:[{name:'actual-public-package-exports',setup(builder){builder.onResolve({filter:/^@nodebraid\//},args=>{const path=realpathSync(Bun.resolveSync(args.path,root));assert.ok(path.startsWith(root+'/packages/')&&path.endsWith('/dist/index.js'));resolved[args.path]=path;return{path};});}}]});
assert.equal(result.success,true,result.logs.map(String).join('\n'));assert.equal(result.outputs.length,1);
writeFileSync(out+'/resolved-public-entries.json',JSON.stringify({head:'0255b60bb4e4404328ec4458a4f38ae64f035bc3',resolved,entryHashes:Object.fromEntries(Object.entries(resolved).map(([name,path])=>[name,createHash('sha256').update(readFileSync(path)).digest('hex')])),buildOutput:result.outputs[0]!.path,bundleSharesRuntimeAndServiceTokenIdentity:true,reusedBuildProvenance:'/Users/zhou/.codex/local-workflows/nodebraid/runs/2690b62a-d6a9-4970-8e20-1a6d3369d34e/affected.log'},null,2)+'\n');
await import(result.outputs[0]!.path);
```

### tsconfig.json

SHA256: `5f80280972b5080c3dd9d5f4102c7776aa24b9764beede8964b31a3f7c1a8d47`

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
      ],
      "@nodebraid/document": [
        "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/document/dist/index.d.ts"
      ]
    }
  },
  "files": [
    "/Users/zhou/.codex/local-workflows/nodebraid/runs/2690b62a-d6a9-4970-8e20-1a6d3369d34e/compiled-controls/document-array-probe.ts",
    "/Users/zhou/.codex/local-workflows/nodebraid/runs/2690b62a-d6a9-4970-8e20-1a6d3369d34e/compiled-controls/build-and-run.ts"
  ],
  "include": []
}
```

### resolved-public-entries.json

SHA256: `49d957e2987b4e91c7e0d15a751fa36165a0bf1ef2b934895e8bdc6f88599586`

```json
{
  "head": "0255b60bb4e4404328ec4458a4f38ae64f035bc3",
  "resolved": {
    "@nodebraid/kernel": "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/kernel/dist/index.js",
    "@nodebraid/document": "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/document/dist/index.js",
    "@nodebraid/diagnostics": "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/diagnostics/dist/index.js"
  },
  "entryHashes": {
    "@nodebraid/kernel": "c9ff8d863bd1c07313f11443fbf1c8773ff320d6edb4d5b0d18e35cd1b429f92",
    "@nodebraid/document": "21c0fafbdff0b4ffc5602a207f4da815dc3bbb8569ea46238ba236fd49702c81",
    "@nodebraid/diagnostics": "438fb75caf4a4ff7e7e73dd3b13a9c188a47448b0892e8b3f7fa3158f6886ac9"
  },
  "buildOutput": "/Users/zhou/.codex/local-workflows/nodebraid/runs/2690b62a-d6a9-4970-8e20-1a6d3369d34e/compiled-controls/build/document-array-probe.js",
  "bundleSharesRuntimeAndServiceTokenIdentity": true,
  "reusedBuildProvenance": "/Users/zhou/.codex/local-workflows/nodebraid/runs/2690b62a-d6a9-4970-8e20-1a6d3369d34e/affected.log"
}
```

## Provenance

```json
{
  "originalMain": "c7d7f1b8c5a729a1e127bf6a1a080a1487b4471d",
  "reviewedLocalHead": "0255b60bb4e4404328ec4458a4f38ae64f035bc3",
  "programBodyOnlyChange": "output destination path",
  "typecheckExit": 0,
  "originalRedExit": 1,
  "currentGreenExit": 0,
  "cases": 12,
  "source": "/Users/zhou/.codex/local-workflows/nodebraid/runs/2690b62a-d6a9-4970-8e20-1a6d3369d34e/compiled-controls/document-array-probe.ts",
  "entryHashes": "/Users/zhou/.codex/local-workflows/nodebraid/runs/2690b62a-d6a9-4970-8e20-1a6d3369d34e/compiled-controls/resolved-public-entries.json"
}
```

