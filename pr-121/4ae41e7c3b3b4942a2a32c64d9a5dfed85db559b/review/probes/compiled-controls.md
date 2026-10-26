# Reproducible direct Kernel Endpoint controls

Original failing and reviewed passing controls use real compiled public exports. The case body, inputs and assertions are the same; only the observation head metadata is adapted to the execution source. Exact derivation and artifact identities are included.

## Original fetched main b58f (red)

### kernel-endpoint-probe.ts

SHA256: d33cac92aedf8161feb03770f84878ca0a0cbc7a787bcb3e645fabdbe35091b9

```typescript
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createCanvasKernel, nodeId, edgeId, type EdgeEndpoint, type CanvasEdge, type CanvasCommit } from '@nodebraid/kernel';
const out=import.meta.dir+'/..';
const observations:Record<string,unknown>[]=[];
for(const writer of ['add','replace'] as const) for(const side of ['source','target'] as const) {
 for(const mode of ['stable-present','stable-absent','changing-present','first-empty','later-throws','absent-later-throws'] as const) {
  const kernel=createCanvasKernel(),a=nodeId('a'),b=nodeId('b'),id=edgeId('edge'),data=new Map([['opaque',17n]]);
  kernel.transact(tx=>{
   tx.nodes.add({id:a,type:'task',position:{x:0,y:0},data:null});
   tx.nodes.add({id:b,type:'task',position:{x:10,y:0},data:null});
   if(writer==='replace')tx.edges.add({id,type:'flow',source:{nodeId:a,portId:'before-source'},target:{nodeId:b,portId:'before-target'},data});
  });
  const before=kernel.read(),original=new Error('Later portId read must not run');
  const first=mode==='stable-absent'||mode==='absent-later-throws'?undefined:mode==='first-empty'?'':'first-port';
  let reads=0;
  const endpoint:EdgeEndpoint={nodeId:side==='source'?a:b,get portId():string|undefined{
   reads++;if(reads===1)return first;
   if(mode==='later-throws'||mode==='absent-later-throws')throw original;
   return mode==='changing-present'||mode==='first-empty'?'replacement-port':first;
  }};
  const edge:CanvasEdge={id,type:'flow',source:side==='source'?endpoint:{nodeId:a,portId:'stable-source'},target:side==='target'?endpoint:{nodeId:b,portId:'stable-target'},data};
  let commit:CanvasCommit|null|undefined,thrown:unknown,caught=false;
  try {commit=kernel.transact(tx=>writer==='add'?tx.edges.add(edge):tx.edges.replace(id,edge));} catch(error){caught=true;thrown=error;}
  const saved=kernel.read().query.getEdge(id);
  const retained=!caught&&saved?.[side].portId===first;
  const expected=retained&&!caught&&reads===1;
  if(!caught){assert.ok(commit);assert.equal(saved?.data,data);assert.equal(Object.isFrozen(saved?.source),true);assert.equal(Object.isFrozen(saved?.target),true);assert.equal(before.query.getEdge(id)?.[side].portId,writer==='replace'?'before-'+side:undefined);}
  else assert.equal(kernel.read(),before);
  observations.push({writer,side,mode,reads,first:first??null,actual:saved?.[side].portId??null,caught,originalLaterThrow:thrown===original,retained,expected,viewUnchangedOnFailure:!caught||kernel.read()===before});
 }
}
writeFileSync(out+'/observations.json',JSON.stringify({head:'b58f1b17ab5ce3d64780c329cf0af1703b86a4e3',cases:observations.length,observations},null,2)+'\n');
console.log(JSON.stringify({cases:observations.length,expectedPassed:observations.filter(x=>x.expected).length,observations}));
assert.equal(observations.every(x=>x.expected),true,'Direct Edge Writers must retain the first optional Endpoint portId and avoid a later read or its exception.');
```

### build-and-run.ts

SHA256: 64627d41b709ad62bcc32726727fc55669bf0fbb195585438e2b626a03153c4a

```typescript
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, realpathSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = '/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow';
const out = import.meta.dir;
const head = 'b58f1b17ab5ce3d64780c329cf0af1703b86a4e3';
const previous = '/Users/zhou/.codex/local-workflows/nodebraid/runs/2690b62a-d6a9-4970-8e20-1a6d3369d34e/main-public-probe/resolved-public-entries.json';
const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
assert.equal(git('rev-parse', 'HEAD'), head);
assert.equal(git('rev-parse', 'origin/main'), head);
assert.equal(git('status', '--porcelain'), '');
const prior: { head: string; entryHashes: Record<string, string> } = JSON.parse(readFileSync(previous, 'utf8'));
assert.equal(prior.head, head);
const resolved: Record<string, string> = {};
mkdirSync(out + '/build');
const result = await Bun.build({
  entrypoints: [out + '/kernel-endpoint-probe.ts'], outdir: out + '/build', target: 'bun',
  plugins: [{
    name: 'real-public-package-exports',
    setup(builder) {
      builder.onResolve({ filter: /^@nodebraid\// }, args => {
        const path = realpathSync(Bun.resolveSync(args.path, root));
        assert.ok(path.startsWith(root + '/packages/') && path.endsWith('/dist/index.js'));
        assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), prior.entryHashes[args.path], 'Public artifact changed since actual fresh main build: ' + args.path);
        resolved[args.path] = path; return { path };
      });
    },
  }],
});
assert.equal(result.success, true, result.logs.map(String).join('\n'));
assert.equal(result.outputs.length, 1);
writeFileSync(out + '/compiled-provenance.json', JSON.stringify({
  head, tree: git('rev-parse', 'HEAD^{tree}'), scriptBlob: git('rev-parse', 'HEAD:scripts/local-agent.ts'),
  resolved, publicHashes: Object.fromEntries(Object.entries(resolved).map(([name, path]) => [name, createHash('sha256').update(readFileSync(path)).digest('hex')])),
  bundle: result.outputs[0]!.path, bundleSHA256: createHash('sha256').update(readFileSync(result.outputs[0]!.path)).digest('hex'),
  reusedBuildManifest: previous,
  reusedBuildLog: '/Users/zhou/.codex/local-workflows/nodebraid/runs/2690b62a-d6a9-4970-8e20-1a6d3369d34e/main-public-build.log',
  scope: 'New bounded inputs through actual compiled public exports at the exact same main; no rebuild or repeated full verification.'
}, null, 2) + '\n');
await import(result.outputs[0]!.path);
assert.equal(git('rev-parse', 'HEAD'), head);
assert.equal(git('status', '--porcelain'), '');
```

### tsconfig.json

SHA256: 9cfc12067542071279bd00c68cae639c2c03bebd9640c0971618762dfbc9cdf5

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
    "/Users/zhou/.codex/local-workflows/nodebraid/runs/20261026T045355-discovery-kernel-endpoint-values/kernel-endpoint-probe.ts",
    "/Users/zhou/.codex/local-workflows/nodebraid/runs/20261026T045355-discovery-kernel-endpoint-values/build-and-run.ts"
  ],
  "include": []
}
```

### compiled-provenance.json

SHA256: c4c7dc3fa6fabc4178d7d8997366452f3b8d266e9150836538d8b31b0fc82419

```json
{
  "head": "b58f1b17ab5ce3d64780c329cf0af1703b86a4e3",
  "tree": "f7cc6c61b670b49c3d2cfe4079471d7df9adaf58",
  "scriptBlob": "944a158e8f3cbbaf968fe90a32dd3e1913ef1b6c",
  "resolved": {
    "@nodebraid/kernel": "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/kernel/dist/index.js",
    "@nodebraid/diagnostics": "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/diagnostics/dist/index.js"
  },
  "publicHashes": {
    "@nodebraid/kernel": "c9ff8d863bd1c07313f11443fbf1c8773ff320d6edb4d5b0d18e35cd1b429f92",
    "@nodebraid/diagnostics": "438fb75caf4a4ff7e7e73dd3b13a9c188a47448b0892e8b3f7fa3158f6886ac9"
  },
  "bundle": "/Users/zhou/.codex/local-workflows/nodebraid/runs/20261026T045355-discovery-kernel-endpoint-values/build/kernel-endpoint-probe.js",
  "bundleSHA256": "7fc84de4edb00fe5db217502083bf07f673b85bfafc8c4a5e9c8695b87b409a2",
  "reusedBuildManifest": "/Users/zhou/.codex/local-workflows/nodebraid/runs/2690b62a-d6a9-4970-8e20-1a6d3369d34e/main-public-probe/resolved-public-entries.json",
  "reusedBuildLog": "/Users/zhou/.codex/local-workflows/nodebraid/runs/2690b62a-d6a9-4970-8e20-1a6d3369d34e/main-public-build.log",
  "scope": "New bounded inputs through actual compiled public exports at the exact same main; no rebuild or repeated full verification."
}
```

### observations.json

SHA256: ffa8f2d40477ef68396f3a021e30ec1c9f80e519c1f2c251cb9661453c7b184b

```json
{
  "head": "b58f1b17ab5ce3d64780c329cf0af1703b86a4e3",
  "cases": 24,
  "observations": [
    {
      "writer": "add",
      "side": "source",
      "mode": "stable-present",
      "reads": 2,
      "first": "first-port",
      "actual": "first-port",
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": false,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "add",
      "side": "source",
      "mode": "stable-absent",
      "reads": 1,
      "first": null,
      "actual": null,
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "add",
      "side": "source",
      "mode": "changing-present",
      "reads": 2,
      "first": "first-port",
      "actual": "replacement-port",
      "caught": false,
      "originalLaterThrow": false,
      "retained": false,
      "expected": false,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "add",
      "side": "source",
      "mode": "first-empty",
      "reads": 2,
      "first": "",
      "actual": "replacement-port",
      "caught": false,
      "originalLaterThrow": false,
      "retained": false,
      "expected": false,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "add",
      "side": "source",
      "mode": "later-throws",
      "reads": 2,
      "first": "first-port",
      "actual": null,
      "caught": true,
      "originalLaterThrow": true,
      "retained": false,
      "expected": false,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "add",
      "side": "source",
      "mode": "absent-later-throws",
      "reads": 1,
      "first": null,
      "actual": null,
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "add",
      "side": "target",
      "mode": "stable-present",
      "reads": 2,
      "first": "first-port",
      "actual": "first-port",
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": false,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "add",
      "side": "target",
      "mode": "stable-absent",
      "reads": 1,
      "first": null,
      "actual": null,
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "add",
      "side": "target",
      "mode": "changing-present",
      "reads": 2,
      "first": "first-port",
      "actual": "replacement-port",
      "caught": false,
      "originalLaterThrow": false,
      "retained": false,
      "expected": false,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "add",
      "side": "target",
      "mode": "first-empty",
      "reads": 2,
      "first": "",
      "actual": "replacement-port",
      "caught": false,
      "originalLaterThrow": false,
      "retained": false,
      "expected": false,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "add",
      "side": "target",
      "mode": "later-throws",
      "reads": 2,
      "first": "first-port",
      "actual": null,
      "caught": true,
      "originalLaterThrow": true,
      "retained": false,
      "expected": false,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "add",
      "side": "target",
      "mode": "absent-later-throws",
      "reads": 1,
      "first": null,
      "actual": null,
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "replace",
      "side": "source",
      "mode": "stable-present",
      "reads": 2,
      "first": "first-port",
      "actual": "first-port",
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": false,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "replace",
      "side": "source",
      "mode": "stable-absent",
      "reads": 1,
      "first": null,
      "actual": null,
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "replace",
      "side": "source",
      "mode": "changing-present",
      "reads": 2,
      "first": "first-port",
      "actual": "replacement-port",
      "caught": false,
      "originalLaterThrow": false,
      "retained": false,
      "expected": false,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "replace",
      "side": "source",
      "mode": "first-empty",
      "reads": 2,
      "first": "",
      "actual": "replacement-port",
      "caught": false,
      "originalLaterThrow": false,
      "retained": false,
      "expected": false,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "replace",
      "side": "source",
      "mode": "later-throws",
      "reads": 2,
      "first": "first-port",
      "actual": "before-source",
      "caught": true,
      "originalLaterThrow": true,
      "retained": false,
      "expected": false,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "replace",
      "side": "source",
      "mode": "absent-later-throws",
      "reads": 1,
      "first": null,
      "actual": null,
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "replace",
      "side": "target",
      "mode": "stable-present",
      "reads": 2,
      "first": "first-port",
      "actual": "first-port",
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": false,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "replace",
      "side": "target",
      "mode": "stable-absent",
      "reads": 1,
      "first": null,
      "actual": null,
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "replace",
      "side": "target",
      "mode": "changing-present",
      "reads": 2,
      "first": "first-port",
      "actual": "replacement-port",
      "caught": false,
      "originalLaterThrow": false,
      "retained": false,
      "expected": false,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "replace",
      "side": "target",
      "mode": "first-empty",
      "reads": 2,
      "first": "",
      "actual": "replacement-port",
      "caught": false,
      "originalLaterThrow": false,
      "retained": false,
      "expected": false,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "replace",
      "side": "target",
      "mode": "later-throws",
      "reads": 2,
      "first": "first-port",
      "actual": "before-target",
      "caught": true,
      "originalLaterThrow": true,
      "retained": false,
      "expected": false,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "replace",
      "side": "target",
      "mode": "absent-later-throws",
      "reads": 1,
      "first": null,
      "actual": null,
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    }
  ]
}
```

## Independently reviewed local source (green)

### kernel-endpoint-probe.ts

SHA256: 211813be10458de2e45b0e50ca60f8f99e28f407fad34c189d7ea4bd2f80cabf

```typescript
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createCanvasKernel, nodeId, edgeId, type EdgeEndpoint, type CanvasEdge, type CanvasCommit } from '@nodebraid/kernel';
const out=import.meta.dir+'/..';
const observations:Record<string,unknown>[]=[];
for(const writer of ['add','replace'] as const) for(const side of ['source','target'] as const) {
 for(const mode of ['stable-present','stable-absent','changing-present','first-empty','later-throws','absent-later-throws'] as const) {
  const kernel=createCanvasKernel(),a=nodeId('a'),b=nodeId('b'),id=edgeId('edge'),data=new Map([['opaque',17n]]);
  kernel.transact(tx=>{
   tx.nodes.add({id:a,type:'task',position:{x:0,y:0},data:null});
   tx.nodes.add({id:b,type:'task',position:{x:10,y:0},data:null});
   if(writer==='replace')tx.edges.add({id,type:'flow',source:{nodeId:a,portId:'before-source'},target:{nodeId:b,portId:'before-target'},data});
  });
  const before=kernel.read(),original=new Error('Later portId read must not run');
  const first=mode==='stable-absent'||mode==='absent-later-throws'?undefined:mode==='first-empty'?'':'first-port';
  let reads=0;
  const endpoint:EdgeEndpoint={nodeId:side==='source'?a:b,get portId():string|undefined{
   reads++;if(reads===1)return first;
   if(mode==='later-throws'||mode==='absent-later-throws')throw original;
   return mode==='changing-present'||mode==='first-empty'?'replacement-port':first;
  }};
  const edge:CanvasEdge={id,type:'flow',source:side==='source'?endpoint:{nodeId:a,portId:'stable-source'},target:side==='target'?endpoint:{nodeId:b,portId:'stable-target'},data};
  let commit:CanvasCommit|null|undefined,thrown:unknown,caught=false;
  try {commit=kernel.transact(tx=>writer==='add'?tx.edges.add(edge):tx.edges.replace(id,edge));} catch(error){caught=true;thrown=error;}
  const saved=kernel.read().query.getEdge(id);
  const retained=!caught&&saved?.[side].portId===first;
  const expected=retained&&!caught&&reads===1;
  if(!caught){assert.ok(commit);assert.equal(saved?.data,data);assert.equal(Object.isFrozen(saved?.source),true);assert.equal(Object.isFrozen(saved?.target),true);assert.equal(before.query.getEdge(id)?.[side].portId,writer==='replace'?'before-'+side:undefined);}
  else assert.equal(kernel.read(),before);
  observations.push({writer,side,mode,reads,first:first??null,actual:saved?.[side].portId??null,caught,originalLaterThrow:thrown===original,retained,expected,viewUnchangedOnFailure:!caught||kernel.read()===before});
 }
}
writeFileSync(out+'/observations.json',JSON.stringify({head:'7c80696d1b8aa54233c89842fff15b6bfddd9575',cases:observations.length,observations},null,2)+'\n');
console.log(JSON.stringify({cases:observations.length,expectedPassed:observations.filter(x=>x.expected).length,observations}));
assert.equal(observations.every(x=>x.expected),true,'Direct Edge Writers must retain the first optional Endpoint portId and avoid a later read or its exception.');
```

### build-and-run.ts

SHA256: 0e4b0fa8f84bcdfd417bb29dd872a6e847ae5dfe0909f143c2f32aac3f6be7c3

```typescript
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,realpathSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root="/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow",out=import.meta.dir,head="7c80696d1b8aa54233c89842fff15b6bfddd9575";
const git=(...args:string[])=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
assert.equal(git('rev-parse','HEAD'),head);assert.equal(git('status','--porcelain'),'');mkdirSync(out+'/build');
const resolved:Record<string,string>={};
const result=await Bun.build({entrypoints:[out+'/kernel-endpoint-probe.ts'],outdir:out+'/build',target:'bun',plugins:[{name:'actual-public-package-exports',setup(builder){builder.onResolve({filter:/^@nodebraid\//},args=>{const path=realpathSync(Bun.resolveSync(args.path,root));assert.ok(path.startsWith(root+'/packages/')&&path.endsWith('/dist/index.js'));resolved[args.path]=path;return {path};});}}]});
assert.equal(result.success,true,result.logs.map(String).join('\n'));assert.equal(result.outputs.length,1);
writeFileSync(out+'/compiled-provenance.json',JSON.stringify({head,tree:git('rev-parse','HEAD^{tree}'),resolved,hashes:Object.fromEntries(Object.entries(resolved).map(([name,path])=>[name,createHash('sha256').update(readFileSync(path)).digest('hex')])),buildLog:out+'/../public-kernel-build.log',bundle:result.outputs[0]!.path,bundleSHA256:createHash('sha256').update(readFileSync(result.outputs[0]!.path)).digest('hex')},null,2)+'\n');
await import(result.outputs[0]!.path);
```

### tsconfig.json

SHA256: 9330f3e4c9557c8d124bd44584180fb56d1325a9aa2383038d5826e440b45781

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
    "/Users/zhou/.codex/local-workflows/nodebraid/runs/e1a42bd4-ea60-468b-9da7-4c156c1df78c/compiled-controls/kernel-endpoint-probe.ts",
    "/Users/zhou/.codex/local-workflows/nodebraid/runs/e1a42bd4-ea60-468b-9da7-4c156c1df78c/compiled-controls/build-and-run.ts"
  ],
  "include": []
}
```

### compiled-provenance.json

SHA256: 7316a25638ec298ba9b0031839dfc1e4a544264ef26a1191fd6bc2bef133a6c4

```json
{
  "head": "7c80696d1b8aa54233c89842fff15b6bfddd9575",
  "tree": "3f189e61617cd7e4d8d2fc061cc7bb91aae3563e",
  "resolved": {
    "@nodebraid/kernel": "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/kernel/dist/index.js",
    "@nodebraid/diagnostics": "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/diagnostics/dist/index.js"
  },
  "hashes": {
    "@nodebraid/kernel": "c9ff8d863bd1c07313f11443fbf1c8773ff320d6edb4d5b0d18e35cd1b429f92",
    "@nodebraid/diagnostics": "438fb75caf4a4ff7e7e73dd3b13a9c188a47448b0892e8b3f7fa3158f6886ac9"
  },
  "buildLog": "/Users/zhou/.codex/local-workflows/nodebraid/runs/e1a42bd4-ea60-468b-9da7-4c156c1df78c/compiled-controls/../public-kernel-build.log",
  "bundle": "/Users/zhou/.codex/local-workflows/nodebraid/runs/e1a42bd4-ea60-468b-9da7-4c156c1df78c/compiled-controls/build/kernel-endpoint-probe.js",
  "bundleSHA256": "ff995c77f778c2df0f139274fc11f9f75ff285e15ca771b8fc56cfefa4c4aaa6"
}
```

### observations.json

SHA256: 03c83c1d3c81fef40b371518aa3668bd1dd2850984aa1df339657ea8488bf3cf

```json
{
  "head": "7c80696d1b8aa54233c89842fff15b6bfddd9575",
  "cases": 24,
  "observations": [
    {
      "writer": "add",
      "side": "source",
      "mode": "stable-present",
      "reads": 1,
      "first": "first-port",
      "actual": "first-port",
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "add",
      "side": "source",
      "mode": "stable-absent",
      "reads": 1,
      "first": null,
      "actual": null,
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "add",
      "side": "source",
      "mode": "changing-present",
      "reads": 1,
      "first": "first-port",
      "actual": "first-port",
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "add",
      "side": "source",
      "mode": "first-empty",
      "reads": 1,
      "first": "",
      "actual": "",
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "add",
      "side": "source",
      "mode": "later-throws",
      "reads": 1,
      "first": "first-port",
      "actual": "first-port",
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "add",
      "side": "source",
      "mode": "absent-later-throws",
      "reads": 1,
      "first": null,
      "actual": null,
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "add",
      "side": "target",
      "mode": "stable-present",
      "reads": 1,
      "first": "first-port",
      "actual": "first-port",
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "add",
      "side": "target",
      "mode": "stable-absent",
      "reads": 1,
      "first": null,
      "actual": null,
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "add",
      "side": "target",
      "mode": "changing-present",
      "reads": 1,
      "first": "first-port",
      "actual": "first-port",
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "add",
      "side": "target",
      "mode": "first-empty",
      "reads": 1,
      "first": "",
      "actual": "",
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "add",
      "side": "target",
      "mode": "later-throws",
      "reads": 1,
      "first": "first-port",
      "actual": "first-port",
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "add",
      "side": "target",
      "mode": "absent-later-throws",
      "reads": 1,
      "first": null,
      "actual": null,
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "replace",
      "side": "source",
      "mode": "stable-present",
      "reads": 1,
      "first": "first-port",
      "actual": "first-port",
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "replace",
      "side": "source",
      "mode": "stable-absent",
      "reads": 1,
      "first": null,
      "actual": null,
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "replace",
      "side": "source",
      "mode": "changing-present",
      "reads": 1,
      "first": "first-port",
      "actual": "first-port",
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "replace",
      "side": "source",
      "mode": "first-empty",
      "reads": 1,
      "first": "",
      "actual": "",
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "replace",
      "side": "source",
      "mode": "later-throws",
      "reads": 1,
      "first": "first-port",
      "actual": "first-port",
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "replace",
      "side": "source",
      "mode": "absent-later-throws",
      "reads": 1,
      "first": null,
      "actual": null,
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "replace",
      "side": "target",
      "mode": "stable-present",
      "reads": 1,
      "first": "first-port",
      "actual": "first-port",
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "replace",
      "side": "target",
      "mode": "stable-absent",
      "reads": 1,
      "first": null,
      "actual": null,
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "replace",
      "side": "target",
      "mode": "changing-present",
      "reads": 1,
      "first": "first-port",
      "actual": "first-port",
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "replace",
      "side": "target",
      "mode": "first-empty",
      "reads": 1,
      "first": "",
      "actual": "",
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "replace",
      "side": "target",
      "mode": "later-throws",
      "reads": 1,
      "first": "first-port",
      "actual": "first-port",
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    },
    {
      "writer": "replace",
      "side": "target",
      "mode": "absent-later-throws",
      "reads": 1,
      "first": null,
      "actual": null,
      "caught": false,
      "originalLaterThrow": false,
      "retained": true,
      "expected": true,
      "viewUnchangedOnFailure": true
    }
  ]
}
```

## Exact source derivation

```json
{
  "originalSource": "/Users/zhou/.codex/local-workflows/nodebraid/runs/20261026T045355-discovery-kernel-endpoint-values/kernel-endpoint-probe.ts",
  "originalSHA256": "d33cac92aedf8161feb03770f84878ca0a0cbc7a787bcb3e645fabdbe35091b9",
  "executionSHA256": "211813be10458de2e45b0e50ca60f8f99e28f407fad34c189d7ea4bd2f80cabf",
  "onlyChange": "Observation metadata head literal changed from original main to actual reviewed local source; every input, expected result and assertion unchanged."
}
```

