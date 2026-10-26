# SVG tolerance public browser controls

The original failing main and reviewed passing source use the byte-identical typed browser entry and unchanged behavioral assertions. The browser runner root/head/declaration/build-log metadata was adapted to the actual source; original and passing artifacts remain distinct. Both execute real Chromium and actual public package exports, without private SVG helper imports.

## Original fetched main fc70 (red)

### svg-config-probe.entry.ts

SHA256: 93a2f86cf03d303c2b765266af61d6382cc77ccd49abf1d8dd5276b3b6665f2c

```typescript
import {createSvgRenderer,type SvgRendererConfig} from '@nodebraid/renderer-svg';
import type {CanvasRenderer} from '@nodebraid/renderer-api';
async function run() {
  const observations:unknown[]=[];
  for(const field of ['edgeHitTolerance','connectionAnchorHitTolerance'] as const) {
    for(const first of [Infinity,NaN,-1]) {
      const target=document.createElementNS('http://www.w3.org/2000/svg','svg');target.setAttribute('width','400');target.setAttribute('height','300');
      const owned=document.createElementNS(target.namespaceURI,'defs');target.append(owned);document.body.append(target);
      let reads=0;const getter=()=>{reads++;return reads===1?first:0;};
      const config:SvgRendererConfig=field==='edgeHitTolerance'?{target,get edgeHitTolerance(){return getter();}}:{target,get connectionAnchorHitTolerance(){return getter();}};
      let renderer:CanvasRenderer|undefined,error:unknown;
      try {renderer=createSvgRenderer(config);}catch(caught){error=caught;}
      const shaped=typeof error==='object'&&error!==null
        ?{name:Reflect.get(error,'name'),code:Reflect.get(error,'code'),details:Reflect.get(error,'details')}:null;
      observations.push({kind:'changing-first-invalid',field,first:Number.isNaN(first)?'NaN':String(first),reads,created:renderer!==undefined,error:shaped,projectionAdded:target.querySelector('[data-nodebraid-renderer-svg-root]')!==null,tabIndexAdded:target.hasAttribute('tabindex'),callerContentPreserved:target.contains(owned)});
      if(renderer)await renderer.dispose();target.remove();
    }
    for(const constant of [-1,0]) {
      const target=document.createElementNS('http://www.w3.org/2000/svg','svg');target.setAttribute('width','400');target.setAttribute('height','300');document.body.append(target);
      const config:SvgRendererConfig={target,[field]:constant};let renderer:CanvasRenderer|undefined,error:unknown;
      try{renderer=createSvgRenderer(config);}catch(caught){error=caught;}
      observations.push({kind:'constant-control',field,constant,created:renderer!==undefined,errorCode:typeof error==='object'&&error!==null?Reflect.get(error,'code'):null});
      if(renderer)await renderer.dispose();target.remove();
    }
  }
  return {userAgent:navigator.userAgent,observations};
}
Reflect.set(globalThis,'__nodebraidSvgConfigDiscovery',run);
```

### compiled-provenance.json

SHA256: f00642b04e2c31baca84cad5e7953ffe563bdead1627f9a19e9c0534a47c7c48

```json
{
  "head": "fc70eecccec5bb2f4173908b2829c5e3f75afbdf",
  "tree": "3f189e61617cd7e4d8d2fc061cc7bb91aae3563e",
  "resolved": {
    "@nodebraid/renderer-svg": "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/renderer-svg/dist/index.js",
    "@nodebraid/diagnostics": "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/diagnostics/dist/index.js",
    "@nodebraid/renderer-api": "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/renderer-api/dist/index.js",
    "@nodebraid/port-api": "/Users/zhou/.codex/worktrees/issue-6-dagre-layout/cflow/packages/port-api/dist/index.js"
  },
  "hashes": {
    "@nodebraid/renderer-svg": "7e52fdf53d182112509b6f05e45be953f2e35071228c9c1f772a0671670687cd",
    "@nodebraid/diagnostics": "438fb75caf4a4ff7e7e73dd3b13a9c188a47448b0892e8b3f7fa3158f6886ac9",
    "@nodebraid/renderer-api": "e11c931a0082e17755436efecb49079f00db4dae619d382bd60a74f8fe977e7f",
    "@nodebraid/port-api": "8ba54d04f150cd9baf850c66c5fd4836cfecec90e072ca0d394f48b1d312542e"
  },
  "bundlePath": "/Users/zhou/.codex/local-workflows/nodebraid/runs/20261026T070355-discovery-svg-config-capture/svg-config-probe.js",
  "bundleSHA256": "0da12c6354e9f746e71826c898c1189c69ae03d645a25520cf2544d7265b3665",
  "existingSameMainBuildLog": "/Users/zhou/.codex/local-workflows/nodebraid/runs/e1a42bd4-ea60-468b-9da7-4c156c1df78c/main-public-build.log"
}
```

### observations.json

SHA256: 0a37983452effca95b824a7fd847dcb95faabce77b14ee09d2825a6935b1bbfb

```json
{
  "head": "fc70eecccec5bb2f4173908b2829c5e3f75afbdf",
  "session": "nodebraid-svg-config-discovery-34306",
  "url": "http://127.0.0.1:50592/",
  "observations": [
    {
      "callerContentPreserved": true,
      "created": true,
      "error": null,
      "field": "edgeHitTolerance",
      "first": "Infinity",
      "kind": "changing-first-invalid",
      "projectionAdded": true,
      "reads": 4,
      "tabIndexAdded": true
    },
    {
      "callerContentPreserved": true,
      "created": true,
      "error": null,
      "field": "edgeHitTolerance",
      "first": "NaN",
      "kind": "changing-first-invalid",
      "projectionAdded": true,
      "reads": 4,
      "tabIndexAdded": true
    },
    {
      "callerContentPreserved": true,
      "created": true,
      "error": null,
      "field": "edgeHitTolerance",
      "first": "-1",
      "kind": "changing-first-invalid",
      "projectionAdded": true,
      "reads": 4,
      "tabIndexAdded": true
    },
    {
      "constant": -1,
      "created": false,
      "errorCode": "INVALID_CONFIG",
      "field": "edgeHitTolerance",
      "kind": "constant-control"
    },
    {
      "constant": 0,
      "created": true,
      "errorCode": null,
      "field": "edgeHitTolerance",
      "kind": "constant-control"
    },
    {
      "callerContentPreserved": true,
      "created": true,
      "error": null,
      "field": "connectionAnchorHitTolerance",
      "first": "Infinity",
      "kind": "changing-first-invalid",
      "projectionAdded": true,
      "reads": 4,
      "tabIndexAdded": true
    },
    {
      "callerContentPreserved": true,
      "created": true,
      "error": null,
      "field": "connectionAnchorHitTolerance",
      "first": "NaN",
      "kind": "changing-first-invalid",
      "projectionAdded": true,
      "reads": 4,
      "tabIndexAdded": true
    },
    {
      "callerContentPreserved": true,
      "created": true,
      "error": null,
      "field": "connectionAnchorHitTolerance",
      "first": "-1",
      "kind": "changing-first-invalid",
      "projectionAdded": true,
      "reads": 4,
      "tabIndexAdded": true
    },
    {
      "constant": -1,
      "created": false,
      "errorCode": "INVALID_CONFIG",
      "field": "connectionAnchorHitTolerance",
      "kind": "constant-control"
    },
    {
      "constant": 0,
      "created": true,
      "errorCode": null,
      "field": "connectionAnchorHitTolerance",
      "kind": "constant-control"
    }
  ],
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/154.0.0.0 Safari/537.36"
}
```

## Reviewed local source01743ed (green)

### svg-config-probe.entry.ts

SHA256: 93a2f86cf03d303c2b765266af61d6382cc77ccd49abf1d8dd5276b3b6665f2c

```typescript
import {createSvgRenderer,type SvgRendererConfig} from '@nodebraid/renderer-svg';
import type {CanvasRenderer} from '@nodebraid/renderer-api';
async function run() {
  const observations:unknown[]=[];
  for(const field of ['edgeHitTolerance','connectionAnchorHitTolerance'] as const) {
    for(const first of [Infinity,NaN,-1]) {
      const target=document.createElementNS('http://www.w3.org/2000/svg','svg');target.setAttribute('width','400');target.setAttribute('height','300');
      const owned=document.createElementNS(target.namespaceURI,'defs');target.append(owned);document.body.append(target);
      let reads=0;const getter=()=>{reads++;return reads===1?first:0;};
      const config:SvgRendererConfig=field==='edgeHitTolerance'?{target,get edgeHitTolerance(){return getter();}}:{target,get connectionAnchorHitTolerance(){return getter();}};
      let renderer:CanvasRenderer|undefined,error:unknown;
      try {renderer=createSvgRenderer(config);}catch(caught){error=caught;}
      const shaped=typeof error==='object'&&error!==null
        ?{name:Reflect.get(error,'name'),code:Reflect.get(error,'code'),details:Reflect.get(error,'details')}:null;
      observations.push({kind:'changing-first-invalid',field,first:Number.isNaN(first)?'NaN':String(first),reads,created:renderer!==undefined,error:shaped,projectionAdded:target.querySelector('[data-nodebraid-renderer-svg-root]')!==null,tabIndexAdded:target.hasAttribute('tabindex'),callerContentPreserved:target.contains(owned)});
      if(renderer)await renderer.dispose();target.remove();
    }
    for(const constant of [-1,0]) {
      const target=document.createElementNS('http://www.w3.org/2000/svg','svg');target.setAttribute('width','400');target.setAttribute('height','300');document.body.append(target);
      const config:SvgRendererConfig={target,[field]:constant};let renderer:CanvasRenderer|undefined,error:unknown;
      try{renderer=createSvgRenderer(config);}catch(caught){error=caught;}
      observations.push({kind:'constant-control',field,constant,created:renderer!==undefined,errorCode:typeof error==='object'&&error!==null?Reflect.get(error,'code'):null});
      if(renderer)await renderer.dispose();target.remove();
    }
  }
  return {userAgent:navigator.userAgent,observations};
}
Reflect.set(globalThis,'__nodebraidSvgConfigDiscovery',run);
```

### compiled-provenance.json

SHA256: 589d85689bd48922849718609e8f17e30f36cd00b49547bd27511b3621649b82

```json
{
  "head": "01743ed7d1e516aea6876f2bb891473b8a98f351",
  "tree": "995191f91615636ed8d413d91cf050f9baa3329e",
  "resolved": {
    "@nodebraid/renderer-svg": "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/renderer-svg/dist/index.js",
    "@nodebraid/diagnostics": "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/diagnostics/dist/index.js",
    "@nodebraid/renderer-api": "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/renderer-api/dist/index.js",
    "@nodebraid/port-api": "/Users/zhou/.codex/worktrees/interaction-materializer-capture/cflow/packages/port-api/dist/index.js"
  },
  "hashes": {
    "@nodebraid/renderer-svg": "7e52fdf53d182112509b6f05e45be953f2e35071228c9c1f772a0671670687cd",
    "@nodebraid/diagnostics": "438fb75caf4a4ff7e7e73dd3b13a9c188a47448b0892e8b3f7fa3158f6886ac9",
    "@nodebraid/renderer-api": "e11c931a0082e17755436efecb49079f00db4dae619d382bd60a74f8fe977e7f",
    "@nodebraid/port-api": "8ba54d04f150cd9baf850c66c5fd4836cfecec90e072ca0d394f48b1d312542e"
  },
  "bundlePath": "/Users/zhou/.codex/local-workflows/nodebraid/runs/d9321820-432d-4549-a487-9f6713c30beb/original-compiled-green/svg-config-probe.js",
  "bundleSHA256": "345cd6ced07a339f143d54c198ee1a2ba69f980f353dd698db03ae5a45243f28",
  "buildLog": "/Users/zhou/.codex/local-workflows/nodebraid/runs/d9321820-432d-4549-a487-9f6713c30beb/affected.log"
}
```

### observations.json

SHA256: a2976250f7963c56c97dd53df0070eb7b8f8bb481d5056b1dac9b82c98348aa0

```json
{
  "head": "01743ed7d1e516aea6876f2bb891473b8a98f351",
  "session": "nodebraid-svg-config-discovery-88120",
  "url": "http://127.0.0.1:55860/",
  "observations": [
    {
      "callerContentPreserved": true,
      "created": false,
      "error": {
        "code": "INVALID_CONFIG",
        "details": {
          "field": "edgeHitTolerance"
        },
        "name": "SvgRendererError"
      },
      "field": "edgeHitTolerance",
      "first": "Infinity",
      "kind": "changing-first-invalid",
      "projectionAdded": false,
      "reads": 1,
      "tabIndexAdded": false
    },
    {
      "callerContentPreserved": true,
      "created": false,
      "error": {
        "code": "INVALID_CONFIG",
        "details": {
          "field": "edgeHitTolerance"
        },
        "name": "SvgRendererError"
      },
      "field": "edgeHitTolerance",
      "first": "NaN",
      "kind": "changing-first-invalid",
      "projectionAdded": false,
      "reads": 1,
      "tabIndexAdded": false
    },
    {
      "callerContentPreserved": true,
      "created": false,
      "error": {
        "code": "INVALID_CONFIG",
        "details": {
          "field": "edgeHitTolerance"
        },
        "name": "SvgRendererError"
      },
      "field": "edgeHitTolerance",
      "first": "-1",
      "kind": "changing-first-invalid",
      "projectionAdded": false,
      "reads": 1,
      "tabIndexAdded": false
    },
    {
      "constant": -1,
      "created": false,
      "errorCode": "INVALID_CONFIG",
      "field": "edgeHitTolerance",
      "kind": "constant-control"
    },
    {
      "constant": 0,
      "created": true,
      "errorCode": null,
      "field": "edgeHitTolerance",
      "kind": "constant-control"
    },
    {
      "callerContentPreserved": true,
      "created": false,
      "error": {
        "code": "INVALID_CONFIG",
        "details": {
          "field": "connectionAnchorHitTolerance"
        },
        "name": "SvgRendererError"
      },
      "field": "connectionAnchorHitTolerance",
      "first": "Infinity",
      "kind": "changing-first-invalid",
      "projectionAdded": false,
      "reads": 1,
      "tabIndexAdded": false
    },
    {
      "callerContentPreserved": true,
      "created": false,
      "error": {
        "code": "INVALID_CONFIG",
        "details": {
          "field": "connectionAnchorHitTolerance"
        },
        "name": "SvgRendererError"
      },
      "field": "connectionAnchorHitTolerance",
      "first": "NaN",
      "kind": "changing-first-invalid",
      "projectionAdded": false,
      "reads": 1,
      "tabIndexAdded": false
    },
    {
      "callerContentPreserved": true,
      "created": false,
      "error": {
        "code": "INVALID_CONFIG",
        "details": {
          "field": "connectionAnchorHitTolerance"
        },
        "name": "SvgRendererError"
      },
      "field": "connectionAnchorHitTolerance",
      "first": "-1",
      "kind": "changing-first-invalid",
      "projectionAdded": false,
      "reads": 1,
      "tabIndexAdded": false
    },
    {
      "constant": -1,
      "created": false,
      "errorCode": "INVALID_CONFIG",
      "field": "connectionAnchorHitTolerance",
      "kind": "constant-control"
    },
    {
      "constant": 0,
      "created": true,
      "errorCode": null,
      "field": "connectionAnchorHitTolerance",
      "kind": "constant-control"
    }
  ],
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/154.0.0.0 Safari/537.36"
}
```

## Derivation

```json
{
  "original": "/Users/zhou/.codex/local-workflows/nodebraid/runs/20261026T070355-discovery-svg-config-capture",
  "green": "/Users/zhou/.codex/local-workflows/nodebraid/runs/d9321820-432d-4549-a487-9f6713c30beb/original-compiled-green",
  "entryByteIdentical": true,
  "entrySHA256": "93a2f86cf03d303c2b765266af61d6382cc77ccd49abf1d8dd5276b3b6665f2c",
  "changes": "Only runner source root/head/build-log metadata and declaration roots changed to the actual new worktree/head. Runtime input program and assertions unchanged.",
  "originalBrowserExit": 1,
  "greenBrowserExit": 0,
  "greenTypecheckExit": 0,
  "artifactFiles": 628
}
```

## Execution history and limits

The initial external TypeScript configuration omitted DOM libraries; its original failure is preserved below and was corrected before browser execution. It is not product red. The repository tracer red bundle was overwritten by the normal subsequent harness build; its original assertion log and exact tracer patch are retained locally. The separate original compiled10 browser bundle above remains preserved with its original SHA.

Two local orchestration input/template mistakes were corrected before their dependent actions: missing top-level reconciliation pullRequests array, and non-async invocation of an await-based uploader. No formal verification/publication receipt, runtime input or assertion was rewritten, no product check rerun to hide a failure, and neither was a live online CI/review product repair.

### fixture-missing-dom.log

```text
../../../local-workflows/nodebraid/runs/20261026T070355-discovery-svg-config-capture/svg-config-probe.entry.ts(7,20): error TS2584: Cannot find name 'document'. Do you need to change your target library? Try changing the 'lib' compiler option to include 'dom'.
../../../local-workflows/nodebraid/runs/20261026T070355-discovery-svg-config-capture/svg-config-probe.entry.ts(8,19): error TS2584: Cannot find name 'document'. Do you need to change your target library? Try changing the 'lib' compiler option to include 'dom'.
../../../local-workflows/nodebraid/runs/20261026T070355-discovery-svg-config-capture/svg-config-probe.entry.ts(8,93): error TS2584: Cannot find name 'document'. Do you need to change your target library? Try changing the 'lib' compiler option to include 'dom'.
../../../local-workflows/nodebraid/runs/20261026T070355-discovery-svg-config-capture/svg-config-probe.entry.ts(19,20): error TS2584: Cannot find name 'document'. Do you need to change your target library? Try changing the 'lib' compiler option to include 'dom'.
../../../local-workflows/nodebraid/runs/20261026T070355-discovery-svg-config-capture/svg-config-probe.entry.ts(19,152): error TS2584: Cannot find name 'document'. Do you need to change your target library? Try changing the 'lib' compiler option to include 'dom'.
```

### reconcile-input-error.json

```json
{
  "error": "TypeError: undefined is not an object (evaluating 'pr of input.pullRequests')",
  "command": "agents:run reconcile",
  "exitCode": 1,
  "phase": "before prepare or branch mutation",
  "cause": "Coordinator omitted required top-level pullRequests:[] for this new Issue with no delivery PR.",
  "originalSource": "/Users/zhou/.codex/local-workflows/nodebraid/runs/d9321820-432d-4549-a487-9f6713c30beb/source.initial-missing-pr-array.json",
  "correction": "Added required empty actual delivery collection; raw Issue and body unchanged.",
  "productSourceChanged": false
}
```

### coordinator-uploader-invocation-error.json

```json
{
  "error": "SyntaxError: missing ) after argument list",
  "phase": "Compiling reused orchestration source with top-level await in a non-async Function constructor",
  "remoteWritesStarted": false,
  "correction": "Execute orchestration body inside an explicit async function. Formal verification and source unchanged; no check rerun."
}
```

No live online product CI/review code-repair event has been triggered or manufactured. Only declared scopes passed; remaining SVG input-policy/reflection/projection/native lifecycle boundaries stay queued. Native scene previews supplement these configuration tests and do not replace them.

