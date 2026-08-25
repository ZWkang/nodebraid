// Drives the complete public SVG Renderer contract through agent-browser and CDP.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface AgentBrowserJson<Result> {
  readonly success: boolean;
  readonly data: Readonly<{ result: Result }> | null;
  readonly error: unknown;
}

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = resolve(packageRoot, '../..');
const outputDirectory = resolve(repositoryRoot, '.tmp/renderer-svg-browser');
const bundlePath = resolve(outputDirectory, 'renderer-contract.js');
const agentBrowser = resolve(repositoryRoot, 'node_modules/.bin/agent-browser');
const session = `nodebraid-renderer-svg-contract-${process.pid}`;

await mkdir(outputDirectory, { recursive: true });
const build = await Bun.build({
  entrypoints: [resolve(packageRoot, 'browser-tests/renderer-contract.entry.ts')],
  target: 'browser',
  format: 'iife',
});
if (!build.success) {
  throw new AggregateError(build.logs, 'SVG Renderer browser contract entry failed to build.');
}
const bundle = build.outputs[0];
if (!bundle) throw new Error('SVG Renderer browser contract build produced no output.');
await Bun.write(bundlePath, bundle);

const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/renderer-contract.js') {
      return new Response(Bun.file(bundlePath), {
        headers: { 'content-type': 'text/javascript; charset=utf-8' },
      });
    }
    return new Response(
      `<!doctype html>
      <html>
        <head><style>html, body { margin: 0; } #target { display: block; }</style></head>
        <body>
          <svg id="target" width="400" height="300">
            <defs data-caller-owned="true"></defs>
          </svg>
          <script src="/renderer-contract.js"></script>
        </body>
      </html>`,
      { headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  },
});

try {
  await runAgentBrowser(['open', server.url.href]);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket01()', {
    callerContentPreserved: true,
    targetChildOrder: ['defs', 'g'],
    projectionClass: 'nodebraid-renderer-svg',
    layerClasses: [
      'nodebraid-renderer-svg__edges',
      'nodebraid-renderer-svg__nodes',
      'nodebraid-renderer-svg__interaction',
    ],
    node: {
      tagName: 'rect',
      id: 'node-a',
      x: '10',
      y: '20',
      width: '80',
      height: '40',
    },
  });
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgConnectionAnchors()', {
    layerClasses: [
      'nodebraid-renderer-svg__edges',
      'nodebraid-renderer-svg__nodes',
      'nodebraid-renderer-svg__interaction',
    ],
    anchors: [
      { nodeId: 'anchor-node', role: 'target', cx: '20', cy: '50' },
      { nodeId: 'anchor-node', role: 'source', cx: '100', cy: '50' },
    ],
    sourceHit: {
      type: 'connection-anchor',
      nodeId: 'anchor-node',
      role: 'source',
      worldPoint: { x: 100, y: 50 },
    },
  });
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgConnectionProjectionRollback()', {
    sameErrorIdentity: true,
    receivedName: 'Error',
    receivedMessage: 'injected Connection Preview update failure',
    aggregateErrorCount: 0,
    x2: '150',
    y2: '140',
  });
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgConnectionProjectionEvidence()', {
    copiedX2: '150',
    baselineError: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INTERACTION_OUT_OF_SYNC',
      details: { issue: 'CONNECTION_ANCHOR_UNAVAILABLE' },
    },
  });
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgConnectionAnchorLinearCommit()', {
    boundedIdentityReads: true,
    anchorCount: 200,
    edgeCount: 1,
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgInteractionProjectionFirstNode()', {
    previewPosition: { x: '80', y: '90' },
    documentPosition: { x: 10, y: 20 },
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgInteractionProjectionClear()', {
    previewX: '80',
    restoredX: '10',
    preservedNodeIdentity: true,
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgInteractionProjectionReplacement()', {
    afterNodeReplacement: {
      nodeAX: '10',
      nodeBX: '260',
      formerNodeAHit: { type: 'canvas', worldPoint: { x: 100, y: 100 } },
    },
    afterViewportReplacement: {
      nodeAX: '10',
      nodeBX: '200',
      transform: 'matrix(2 0 0 2 40 50)',
    },
    afterNodeFromViewport: {
      nodeAX: '90',
      nodeBX: '200',
      transform: 'matrix(2 0 0 2 10 20)',
    },
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgInteractionProjectionReset()', {
    nodeX: '30',
    stableHit: {
      type: 'node',
      nodeId: 'reset-interaction-node',
      worldPoint: { x: 40, y: 30 },
    },
    formerPreviewHit: { type: 'canvas', worldPoint: { x: 100, y: 100 } },
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgInteractionProjectionEdge()', {
    sourceX: '120',
    sourceY: '110',
    targetX: '240',
    targetY: '120',
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgViewportInteractionProjection()', {
    previewTransform: 'matrix(2 0 0 2 40 50)',
    sessionViewport: { x: 10, y: 20, zoom: 2 },
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgViewportInteractionInvalidation()', {
    transform: 'matrix(2 0 0 2 200 100)',
    hit: { type: 'canvas', worldPoint: { x: 0, y: 0 } },
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgInteractionProjectionHit()', {
    hit: { type: 'node', nodeId: 'interaction-hit-node', worldPoint: { x: 100, y: 100 } },
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgInteractionProjectionIsolation()', {
    nodeX: '80',
    hit: { type: 'node', nodeId: 'interaction-isolation-node', worldPoint: { x: 100, y: 100 } },
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgInteractionProjectionBaselineMismatch()', {
    error: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INTERACTION_OUT_OF_SYNC',
      details: { issue: 'NODE_POSITION_MISMATCH' },
    },
    projectionUnchanged: true,
    nodeX: '10',
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgInteractionProjectionDuplicateNode()', {
    error: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_INTERACTION_PROJECTION',
      details: { issue: 'DUPLICATE_NODE' },
    },
    projectionUnchanged: true,
    nodeX: '10',
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgInteractionProjectionInvalidPosition()', {
    error: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_INTERACTION_PROJECTION',
      details: { issue: 'INVALID_NODE_POSITION', field: 'position.x' },
    },
    projectionUnchanged: true,
    nodeX: '10',
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgInteractionProjectionOrder()', {
    error: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_INTERACTION_PROJECTION',
      details: { issue: 'NON_CANONICAL_NODE_ORDER' },
    },
    projectionUnchanged: true,
    nodeX: '10',
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgInteractionProjectionEmpty()', {
    error: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_INTERACTION_PROJECTION',
      details: { issue: 'EMPTY_NODE_DRAG' },
    },
    projectionUnchanged: true,
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgInteractionProjectionUnknownType()', {
    error: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_INTERACTION_PROJECTION',
      details: { issue: 'INVALID_PROJECTION_TYPE' },
    },
    projectionUnchanged: true,
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgInteractionProjectionInvalidViewport()', {
    error: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_INTERACTION_PROJECTION',
      details: { issue: 'INVALID_VIEWPORT', field: 'viewport.x' },
    },
    projectionUnchanged: true,
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgInteractionProjectionInvalidBoxSelection()', {
    error: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_INTERACTION_PROJECTION',
      details: { issue: 'INVALID_BOX_SELECTION_RECT', field: 'rect.width' },
    },
    projectionUnchanged: true,
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgInteractionProjectionMalformedShape()', {
    errors: [
      {
        name: 'RendererError',
        domain: 'renderer',
        code: 'INVALID_INTERACTION_PROJECTION',
        details: { issue: 'INVALID_PROJECTION_STRUCTURE', field: 'nodes' },
      },
      {
        name: 'RendererError',
        domain: 'renderer',
        code: 'INVALID_INTERACTION_PROJECTION',
        details: { issue: 'INVALID_PROJECTION_STRUCTURE', field: 'nodes[0].nodeId' },
      },
      {
        name: 'RendererError',
        domain: 'renderer',
        code: 'INVALID_INTERACTION_PROJECTION',
        details: { issue: 'INVALID_PROJECTION_STRUCTURE', field: 'nodes[0].nodeId' },
      },
      {
        name: 'RendererError',
        domain: 'renderer',
        code: 'INVALID_INTERACTION_PROJECTION',
        details: { issue: 'INVALID_PROJECTION_STRUCTURE', field: 'baseViewport' },
      },
    ],
    nodeX: '30',
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgInteractionProjectionRollback()', {
    sameErrorIdentity: true,
    rollbackX: '80',
    rollbackTransform: 'matrix(2 0 0 2 10 20)',
    hit: {
      type: 'node',
      nodeId: 'interaction-rollback-node',
      worldPoint: { x: 80, y: 90 },
    },
    clearedX: '10',
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgRuntimeInteractionProjection()', {
    previewX: '80',
    restoredX: '10',
  });

  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgSetupSelectionInteraction()');
  await runAgentBrowser(['click', '[data-nodebraid-node-id="selection-node"]']);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadSelectionInteraction()', {
    nodeIds: ['selection-node'],
    edgeIds: [],
  });
  await runAgentBrowser(['click', '[data-nodebraid-edge-id="selection-edge"]']);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadSelectionInteraction()', {
    nodeIds: [],
    edgeIds: ['selection-edge'],
  });
  await runAgentBrowser(['click', '#selection-interaction-target']);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadSelectionInteraction()', {
    nodeIds: [],
    edgeIds: [],
  });
  await runAgentBrowser(['click', '[data-nodebraid-node-id="selection-node"]']);
  await dispatchShiftClick(340, 120);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadSelectionInteraction()', {
    nodeIds: ['selection-node', 'selection-target-node'],
    edgeIds: [],
  });
  await dispatchMouseDown(160, 120);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadSelectionInteraction()', {
    nodeIds: ['selection-node', 'selection-target-node'],
    edgeIds: [],
  });
  await dispatchMouseUp(160, 120);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadSelectionInteraction()', {
    nodeIds: ['selection-node'],
    edgeIds: [],
  });
  await dispatchShiftClick(250, 120);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadSelectionInteraction()', {
    nodeIds: ['selection-node'],
    edgeIds: ['selection-edge'],
  });
  await dispatchShiftClick(200, 150);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadSelectionInteraction()', {
    nodeIds: ['selection-node'],
    edgeIds: ['selection-edge'],
  });
  await dispatchMouseDown(40, 40);
  await dispatchMouseMove(390, 160);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadBoxSelectionInteraction()', {
    revision: 1,
    selection: { nodeIds: ['selection-node'], edgeIds: ['selection-edge'] },
    marquee: { x: '40', y: '40', width: '350', height: '120' },
  });
  await dispatchMouseUp(390, 160);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadBoxSelectionInteraction()', {
    revision: 1,
    selection: { nodeIds: ['selection-node', 'selection-target-node'], edgeIds: [] },
    marquee: null,
  });
  const controlModifier = 2;
  const metaModifier = 4;
  for (const modifiers of [controlModifier, metaModifier]) {
    await dispatchMouseDown(20, 280);
    await dispatchMouseUp(20, 280);
    await dispatchMouseDown(160, 120);
    await dispatchMouseUp(160, 120);
    await dispatchModifiedMouseDrag(390, 160, 280, 80, modifiers);
    await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadBoxSelectionInteraction()', {
      revision: 1,
      selection: { nodeIds: ['selection-node', 'selection-target-node'], edgeIds: [] },
      marquee: null,
    });
  }
  await dispatchMouseDown(20, 280);
  await dispatchMouseUp(20, 280);
  await dispatchMouseDown(40, 40);
  await dispatchMouseMove(200, 80);
  await dispatchMouseUp(390, 160);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadBoxSelectionInteraction()', {
    revision: 1,
    selection: { nodeIds: ['selection-node', 'selection-target-node'], edgeIds: [] },
    marquee: null,
  });
  await dispatchMouseDown(20, 280);
  await dispatchMouseMove(22, 282);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadBoxSelectionInteraction()', {
    revision: 1,
    selection: { nodeIds: ['selection-node', 'selection-target-node'], edgeIds: [] },
    marquee: null,
  });
  await dispatchSelectionPointerCancel(22, 282);
  await dispatchMouseDown(20, 120);
  await dispatchMouseMove(200, 120);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadBoxSelectionInteraction()', {
    revision: 1,
    selection: { nodeIds: ['selection-node', 'selection-target-node'], edgeIds: [] },
    marquee: { x: '20', y: '120', width: '180', height: '0' },
  });
  await dispatchMouseUp(200, 120);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadBoxSelectionInteraction()', {
    revision: 1,
    selection: { nodeIds: ['selection-node'], edgeIds: [] },
    marquee: null,
  });
  await dispatchMouseDown(160, 120);
  await dispatchMouseUp(160, 120);
  await dispatchShiftClick(340, 120);
  await dispatchMouseDown(40, 40);
  await dispatchMouseMove(250, 160);
  await dispatchSelectionEscape();
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadBoxSelectionInteraction()', {
    revision: 1,
    selection: { nodeIds: ['selection-node', 'selection-target-node'], edgeIds: [] },
    marquee: null,
  });
  await dispatchMouseUp(250, 160);
  await dispatchMouseDown(40, 40);
  await dispatchMouseMove(250, 160);
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgSetSelectionViewport(50, 20, 2)');
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadBoxSelectionInteraction()', {
    revision: 1,
    selection: { nodeIds: ['selection-node', 'selection-target-node'], edgeIds: [] },
    marquee: null,
  });
  await dispatchMouseUp(250, 160);
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgSetSelectionViewport(0, 0, 1)');
  await dispatchMouseDown(20, 280);
  await dispatchMouseUp(20, 280);
  await dispatchMouseDown(160, 120);
  await dispatchMouseUp(160, 120);
  const shiftModifier = 8;
  await dispatchModifiedMouseDown(390, 160, shiftModifier);
  await dispatchModifiedMouseMove(280, 80, shiftModifier);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadBoxSelectionInteraction()', {
    revision: 1,
    selection: { nodeIds: ['selection-node'], edgeIds: [] },
    marquee: { x: '280', y: '80', width: '110', height: '80' },
  });
  await dispatchModifiedMouseUp(280, 80, shiftModifier);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadBoxSelectionInteraction()', {
    revision: 1,
    selection: { nodeIds: ['selection-node', 'selection-target-node'], edgeIds: [] },
    marquee: null,
  });
  await dispatchMouseDown(20, 280);
  await dispatchMouseUp(20, 280);
  await dispatchMouseDown(40, 40);
  await dispatchMouseMove(250, 160);
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgMoveSelectionTarget(220, 100)');
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadBoxSelectionInteraction()', {
    revision: 2,
    selection: { nodeIds: [], edgeIds: [] },
    marquee: { x: '40', y: '40', width: '210', height: '120' },
  });
  await dispatchMouseUp(250, 160);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadBoxSelectionInteraction()', {
    revision: 2,
    selection: { nodeIds: ['selection-node', 'selection-target-node'], edgeIds: [] },
    marquee: null,
  });
  await dispatchMouseDown(40, 40);
  await dispatchMouseMove(400, 160);
  await evaluateBrowserScenario(`globalThis.__nodebraidRendererSvgDeleteSelectionNode('selection-node')`);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadBoxSelectionInteraction()', {
    revision: 3,
    selection: { nodeIds: ['selection-target-node'], edgeIds: [] },
    marquee: { x: '40', y: '40', width: '360', height: '120' },
  });
  await dispatchMouseUp(400, 160);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadBoxSelectionInteraction()', {
    revision: 3,
    selection: { nodeIds: ['selection-target-node'], edgeIds: [] },
    marquee: null,
  });
  await dispatchMouseDown(40, 40);
  await dispatchMouseMove(400, 200);
  await dispatchSelectionPointerCancel(400, 200);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadBoxSelectionInteraction()', {
    revision: 3,
    selection: { nodeIds: ['selection-target-node'], edgeIds: [] },
    marquee: null,
  });
  await dispatchMouseUp(400, 200);
  await dispatchMouseDown(40, 40);
  await dispatchMouseMove(400, 200);
  await releaseSelectionPointerCapture();
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadBoxSelectionInteraction()', {
    revision: 3,
    selection: { nodeIds: ['selection-target-node'], edgeIds: [] },
    marquee: null,
  });
  await dispatchMouseUp(400, 200);
  await dispatchMouseDown(40, 40);
  await dispatchMouseMove(400, 200);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgDisposeSelectionInteraction()', {
    installationStatus: 'disposed',
    rootPresent: true,
    marqueePresent: false,
    pointerCaptured: false,
  });
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgTeardownSelectionInteraction()');

  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgSetupSelectionInteraction()');
  await dispatchMouseDown(40, 40);
  await dispatchMouseMove(390, 160);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgLoseSelectionRenderer()', {
    installationStatus: 'pending',
    rootPresent: false,
    marqueePresent: false,
    pointerCaptured: false,
  });
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgTeardownSelectionInteraction()');

  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgSetupNodeDragInteraction()');
  await dispatchMouseDown(160, 120);
  await dispatchMouseMove(200, 160);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadNodeDragInteraction()', {
    previewPosition: { x: '160', y: '140' },
    documentPosition: { x: 120, y: 100 },
  });
  await dispatchMouseUp(200, 160);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadNodeDragInteraction()', {
    previewPosition: { x: '160', y: '140' },
    documentPosition: { x: 160, y: 140 },
  });
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgUndoNodeDragInteraction()');
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadNodeDragInteraction()', {
    previewPosition: { x: '120', y: '100' },
    documentPosition: { x: 120, y: 100 },
  });
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgRedoNodeDragInteraction()');
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadNodeDragInteraction()', {
    previewPosition: { x: '160', y: '140' },
    documentPosition: { x: 160, y: 140 },
  });
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgPrepareMultiNodeDragInteraction()');
  await dispatchMouseDown(200, 160);
  await dispatchMouseMove(240, 200);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadMultiNodeDragInteraction()', {
    previewPositions: [
      { id: 'drag-node', x: '200', y: '180' },
      { id: 'drag-node-b', x: '340', y: '140' },
    ],
    documentPositions: [
      { id: 'drag-node', x: 160, y: 140 },
      { id: 'drag-node-b', x: 300, y: 100 },
    ],
  });
  await dispatchMouseUp(240, 200);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadMultiNodeDragInteraction()', {
    previewPositions: [
      { id: 'drag-node', x: '200', y: '180' },
      { id: 'drag-node-b', x: '340', y: '140' },
    ],
    documentPositions: [
      { id: 'drag-node', x: 200, y: 180 },
      { id: 'drag-node-b', x: 340, y: 140 },
    ],
  });
  await dispatchMouseDown(240, 200);
  await dispatchMouseMove(280, 240);
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgUpdateNodeDragDataExternally()');
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadCompatibleNodeDragInteraction()', {
    previewNode: { x: '240', y: '220', width: '100', height: '60' },
    documentNode: {
      position: { x: 200, y: 180 },
      size: { width: 100, height: 60 },
      data: { label: 'updated' },
    },
  });
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadNodeDragInteractionEvents()', []);
  await dispatchMouseUp(280, 240);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadCompatibleNodeDragInteraction()', {
    previewNode: { x: '240', y: '220', width: '100', height: '60' },
    documentNode: {
      position: { x: 240, y: 220 },
      size: { width: 100, height: 60 },
      data: { label: 'updated' },
    },
  });
  await dispatchMouseDown(280, 240);
  await dispatchMouseMove(320, 280);
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgMoveNodeDragExternally()');
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadNodeDragInteractionEvents()', [
    {
      name: 'nodebraid.plugin.interaction.gesture.cancelled',
      level: 'info',
      attributes: { gestureType: 'node-drag', reason: 'stale' },
    },
  ]);
  await dispatchMouseUp(280, 240);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadMultiNodeDragInteraction()', {
    previewPositions: [
      { id: 'drag-node', x: '260', y: '180' },
      { id: 'drag-node-b', x: '380', y: '180' },
    ],
    documentPositions: [
      { id: 'drag-node', x: 260, y: 180 },
      { id: 'drag-node-b', x: 380, y: 180 },
    ],
  });
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadNodeDragInteractionEvents()', [
    {
      name: 'nodebraid.plugin.interaction.gesture.cancelled',
      level: 'info',
      attributes: { gestureType: 'node-drag', reason: 'stale' },
    },
  ]);
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgTeardownNodeDragInteraction()');

  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgSetupConnectionInteraction()');
  await dispatchMouseDown(120, 120);
  await dispatchMouseMove(180, 160);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadConnectionInteraction()', {
    revision: 1,
    edgeIds: [],
    preview: { x1: '120', y1: '120', x2: '180', y2: '160', target: 'none' },
  });
  await dispatchMouseMove(240, 120);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadConnectionInteraction()', {
    revision: 1,
    edgeIds: [],
    preview: { x1: '120', y1: '120', x2: '240', y2: '120', target: 'valid' },
  });
  await dispatchMouseUp(240, 120);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadConnectionInteraction()', {
    revision: 2,
    edgeIds: ['connected-edge'],
    preview: null,
  });
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgUndoConnectionInteraction()');
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadConnectionInteraction()', {
    revision: 3,
    edgeIds: [],
    preview: null,
  });
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgRedoConnectionInteraction()');
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadConnectionInteraction()', {
    revision: 4,
    edgeIds: ['connected-edge'],
    preview: null,
  });
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgTeardownConnectionInteraction()');

  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgSetupConnectionInteraction()');
  await dispatchMouseDown(120, 120);
  await dispatchMouseMove(40, 120);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadConnectionInteraction()', {
    revision: 1,
    edgeIds: [],
    preview: { x1: '120', y1: '120', x2: '40', y2: '120', target: 'invalid' },
  });
  await dispatchConnectionEscape();
  await dispatchMouseUp(40, 120);
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgTeardownConnectionInteraction()');

  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgSetupConnectionInteraction()');
  await dispatchMouseDown(120, 120);
  await dispatchMouseMove(180, 160);
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgUpdateConnectionGeometry()');
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadConnectionInteraction()', {
    revision: 2,
    edgeIds: [],
    preview: { x1: '160', y1: '150', x2: '180', y2: '160', target: 'none' },
  });
  await dispatchConnectionEscape();
  await dispatchMouseUp(180, 160);
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgTeardownConnectionInteraction()');

  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgSetupConnectionInteraction(false)');
  await dispatchMouseDown(120, 120);
  await dispatchMouseUp(120, 120);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadConnectionSelection()', ['connection-source']);
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgTeardownConnectionInteraction()');

  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgSetupConnectionInteraction()');
  await dispatchShiftClick(120, 120);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadConnectionSelection()', ['connection-source']);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadConnectionInteraction()', {
    revision: 1,
    edgeIds: [],
    preview: null,
  });
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgTeardownConnectionInteraction()');

  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgSetupConnectionInteraction()');
  await dispatchConnectionKey('keydown', ' ', 'Space');
  await dispatchMouseDown(120, 120);
  await dispatchMouseMove(180, 160);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadConnectionInteraction()', {
    revision: 1,
    edgeIds: [],
    preview: null,
  });
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadConnectionViewport()', { x: 0, y: 0, zoom: 1 });
  await dispatchMouseUp(180, 160);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadConnectionViewport()', { x: 60, y: 40, zoom: 1 });
  await dispatchConnectionKey('keyup', ' ', 'Space');
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgTeardownConnectionInteraction()');

  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgSetupConnectionInteraction()');
  await dispatchMiddleDown(120, 120);
  await dispatchMiddleMove(180, 160);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadConnectionInteraction()', {
    revision: 1,
    edgeIds: [],
    preview: null,
  });
  await dispatchMiddleUp(180, 160);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadConnectionViewport()', { x: 60, y: 40, zoom: 1 });
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgTeardownConnectionInteraction()');

  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgSetupConnectionInteraction()');
  await dispatchConnectionPointer('pointerdown', 77, 'pen', 120, 120);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadConnectionInteraction()', {
    revision: 1,
    edgeIds: [],
    preview: null,
  });
  await dispatchConnectionPointer('pointerup', 77, 'pen', 120, 120);
  await dispatchConnectionPointer('pointerdown', 78, 'touch', 120, 120);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadConnectionInteraction()', {
    revision: 1,
    edgeIds: [],
    preview: null,
  });
  await dispatchConnectionPointer('pointerup', 78, 'touch', 120, 120);
  await dispatchMouseDown(120, 120);
  await dispatchMouseMove(180, 160);
  await dispatchConnectionPointer('pointercancel', 1, 'mouse', 180, 160);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadConnectionInteraction()', {
    revision: 1,
    edgeIds: [],
    preview: null,
  });
  await dispatchMouseDown(120, 120);
  await dispatchMouseMove(180, 160);
  await dispatchConnectionLostCapture(1, 180, 160);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadConnectionInteraction()', {
    revision: 1,
    edgeIds: [],
    preview: null,
  });
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgTeardownConnectionInteraction()');

  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgSetupConnectionInteraction()');
  await dispatchMouseDown(120, 120);
  await dispatchMouseMove(240, 120);
  await dispatchConnectionEscape();
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadConnectionInteraction()', {
    revision: 1,
    edgeIds: [],
    preview: null,
  });
  await dispatchMouseUp(240, 120);
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgTeardownConnectionInteraction()');

  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgSetupConnectionInteraction()');
  await dispatchMouseDown(120, 120);
  await dispatchMouseMove(240, 120);
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgDeleteConnectionTarget()');
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadConnectionInteraction()', {
    revision: 2,
    edgeIds: [],
    preview: { x1: '120', y1: '120', x2: '240', y2: '120', target: 'none' },
  });
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgDeleteConnectionSource()');
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadConnectionInteraction()', {
    revision: 3,
    edgeIds: [],
    preview: null,
  });
  await dispatchMouseUp(240, 120);
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgTeardownConnectionInteraction()');

  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgSetupViewportPanInteraction()');
  await dispatchMiddleDown(50, 200);
  await dispatchMiddleMove(100, 250);
  await dispatchWheel(100, 250, 100);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 50 50)',
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteractionEvents()', [
    {
      name: 'nodebraid.plugin.interaction.input.rejected',
      level: 'info',
      attributes: { inputType: 'wheel', gestureType: 'viewport-pan', reason: 'active-gesture' },
    },
  ]);
  await dispatchMiddleUp(100, 250);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 50 50)',
    viewport: { x: 50, y: 50, zoom: 1 },
  });
  await dispatchWheel(200, 150, 100);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(0.818730753078 0 0 0.818730753078 77.190387038303 68.126924692202)',
    viewport: {
      x: 77.190387,
      y: 68.126925,
      zoom: 0.818731,
    },
  });
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgResetViewportPanInteraction()');
  await dispatchSpaceKey('keyDown');
  await dispatchMouseDown(160, 120);
  await dispatchMouseMove(190, 140);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 30 20)',
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  await dispatchSpaceKey('keyUp');
  await dispatchMouseUp(190, 140);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 30 20)',
    viewport: { x: 30, y: 20, zoom: 1 },
  });
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgResetViewportPanInteraction()');
  await dispatchMiddleDown(160, 120);
  await dispatchMiddleMove(190, 140);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 30 20)',
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  await dispatchMiddleUp(190, 140);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 30 20)',
    viewport: { x: 30, y: 20, zoom: 1 },
  });
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgResetViewportPanInteraction()');
  await dispatchMiddleDown(50, 200);
  await dispatchMiddleMove(100, 250);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 50 50)',
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  await dispatchPointerCancel(100, 250);
  await dispatchMiddleUp(100, 250);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 0 0)',
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteractionEvents()', [
    {
      name: 'nodebraid.plugin.interaction.gesture.cancelled',
      level: 'info',
      attributes: { gestureType: 'viewport-pan', reason: 'pointer-cancel' },
    },
  ]);
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgResetViewportPanInteraction()');
  await dispatchMiddleDown(50, 200);
  await dispatchMiddleMove(100, 250);
  await releaseViewportPanPointerCapture();
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 0 0)',
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  await dispatchMiddleUp(100, 250);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteractionEvents()', [
    {
      name: 'nodebraid.plugin.interaction.gesture.cancelled',
      level: 'info',
      attributes: { gestureType: 'viewport-pan', reason: 'pointer-cancel' },
    },
  ]);
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgResetViewportPanInteraction()');
  await dispatchMiddleDown(50, 200);
  await dispatchMiddleMove(100, 250);
  assert.equal(await dispatchAdditionalPointerDown(), false);
  await dispatchAdditionalPointerMoveAndUp();
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 50 50)',
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteractionEvents()', [
    {
      name: 'nodebraid.plugin.interaction.pointer.rejected',
      level: 'info',
      attributes: { inputType: 'pointer.down', gestureType: 'viewport-pan', reason: 'additional-pointer' },
    },
  ]);
  await dispatchMiddleMove(130, 280);
  await dispatchMiddleUp(130, 280);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 80 80)',
    viewport: { x: 80, y: 80, zoom: 1 },
  });
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgResetViewportPanInteraction()');
  await dispatchMiddleDown(50, 200);
  await dispatchMiddleMove(450, 350);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 400 150)',
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  await dispatchMiddleUp(450, 350);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 400 150)',
    viewport: { x: 400, y: 150, zoom: 1 },
  });
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgResetViewportPanInteraction()');
  await evaluateBrowserScenario(`document.querySelector('#viewport-pan-interaction-target').focus()`);
  await dispatchSpaceKey('keyDown');
  await evaluateBrowserScenario(`document.querySelector('#viewport-pan-interaction-target').blur()`);
  await dispatchMouseDown(160, 120);
  await dispatchMouseMove(190, 140);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 0 0)',
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  await dispatchPointerCancel(190, 140);
  await dispatchMouseUp(190, 140);
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgResetViewportPanInteraction()');
  await dispatchMiddleDown(50, 200);
  await dispatchMiddleMove(100, 250);
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgSetViewportPanExternally()');
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(2 0 0 2 200 100)',
    viewport: { x: 200, y: 100, zoom: 2 },
  });
  await dispatchMiddleUp(100, 250);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(2 0 0 2 200 100)',
    viewport: { x: 200, y: 100, zoom: 2 },
  });
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteractionEvents()', [
    {
      name: 'nodebraid.plugin.interaction.gesture.cancelled',
      level: 'info',
      attributes: { gestureType: 'viewport-pan', reason: 'stale' },
    },
  ]);
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgResetViewportPanInteraction()');
  await dispatchMiddleDown(50, 200);
  await dispatchMiddleMove(100, 250);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgHasViewportPanPointerCapture()', true);
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgDisposeViewportPanInteraction()');
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 0 0)',
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgHasViewportPanPointerCapture()', false);
  await dispatchMiddleUp(100, 250);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteractionEvents()', [
    {
      name: 'nodebraid.plugin.interaction.gesture.cancelled',
      level: 'info',
      attributes: { gestureType: 'viewport-pan', reason: 'lifecycle' },
    },
  ]);
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgTeardownViewportPanInteraction()');

  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgSetupViewportPanInteraction(true)');
  await dispatchMiddleDown(50, 200);
  await dispatchMiddleMove(60, 200);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 0 0)',
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  await dispatchMiddleMove(80, 200);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 30 0)',
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  await dispatchMiddleUp(80, 200);
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgResetViewportPanInteraction()');
  await dispatchWheel(200, 150, 100);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(0.5 0 0 0.5 100 75)',
    viewport: { x: 100, y: 75, zoom: 0.5 },
  });
  await dispatchWheel(200, 150, -1000);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(2 0 0 2 -200 -150)',
    viewport: { x: -200, y: -150, zoom: 2 },
  });
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgTeardownViewportPanInteraction()');

  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgSetupInteractionProjectionInput()');
  await runAgentBrowser(['click', '#interaction-projection-input-target']);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReadInteractionProjectionInput()', {
    type: 'pointer.down',
    pointerId: 1,
    pointerType: 'mouse',
    screenPoint: { x: 200, y: 150 },
    worldPoint: { x: 80, y: 50 },
    button: 'primary',
    pressedButtons: ['primary'],
    modifiers: { alt: false, control: false, meta: false, shift: false },
  });
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgTeardownInteractionProjectionInput()');

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket02FirstEdge()', {
    layerClasses: [
      'nodebraid-renderer-svg__edges',
      'nodebraid-renderer-svg__nodes',
      'nodebraid-renderer-svg__interaction',
    ],
    edgeIds: ['edge-a', 'edge-b'],
    nodeIds: ['node-a', 'node-b', 'node-c'],
    edge: {
      tagName: 'line',
      id: 'edge-a',
      x1: '50',
      y1: '40',
      x2: '250',
      y2: '130',
    },
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket02PortError()', {
    error: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_DOCUMENT_UPDATE',
      details: {
        issue: 'UNSUPPORTED_PORT_GEOMETRY',
        edgeId: 'port-edge',
        endpoint: 'source',
        portId: 'out',
      },
    },
    projectionUnchanged: true,
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket02SelfLoopError()', {
    error: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_DOCUMENT_UPDATE',
      details: {
        issue: 'UNSUPPORTED_SELF_LOOP',
        edgeId: 'loop-edge',
      },
    },
    projectionUnchanged: true,
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket02MissingSizeError()', {
    error: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_DOCUMENT_UPDATE',
      details: {
        issue: 'MISSING_NODE_SIZE',
        nodeId: 'unsized-node',
      },
    },
    projectionUnchanged: true,
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket03FirstCommit()', {
    preservedNodeIdentity: true,
    node: {
      x: '30',
      y: '50',
      width: '120',
      height: '70',
    },
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket03AddRemove()', {
    nodeIds: ['node-a', 'node-c', 'node-d'],
    edgeIds: ['edge-a', 'edge-d'],
    preservedNodeIdentity: true,
    preservedEdgeIdentity: true,
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket03EdgeReplace()', {
    preservedEdgeIdentity: true,
    x2: '320',
    y2: '215',
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket03Continuity()', {
    withoutBaseline: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'DOCUMENT_OUT_OF_SYNC',
      details: { expectedRevision: null, receivedRevision: 0 },
    },
    duplicate: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'DOCUMENT_OUT_OF_SYNC',
      details: { expectedRevision: 2, receivedRevision: 1 },
    },
    gap: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'DOCUMENT_OUT_OF_SYNC',
      details: { expectedRevision: 2, receivedRevision: 3 },
    },
    resetReplacedNodeIdentity: true,
    resetX: '40',
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket04DerivedEdge()', {
    preservedEdgeIdentity: true,
    x1: '150',
    y1: '80',
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket04BeforeMismatch()', {
    error: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'DOCUMENT_OUT_OF_SYNC',
      details: {
        issue: 'BASELINE_CONTENT_MISMATCH',
        expectedRevision: 1,
        receivedRevision: 1,
      },
    },
    projectionUnchanged: true,
    nodeX: '10',
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket04ChangeSetMismatch()', {
    error: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_DOCUMENT_UPDATE',
      details: {
        issue: 'CHANGE_SET_MISMATCH',
        beforeRevision: 1,
        revision: 2,
      },
    },
    projectionUnchanged: true,
    nodeX: '10',
    recoveredX: '30',
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket04SnapshotOrder()', {
    error: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_DOCUMENT_UPDATE',
      details: {
        issue: 'INVALID_DOCUMENT_SNAPSHOT',
        field: 'nodes',
        reason: 'NON_CANONICAL_IDS',
      },
    },
    projectionUnchanged: true,
    nodeX: null,
    recoveredNodeIds: ['node-a', 'node-b'],
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket04BaselineIsolation()', {
    mutableShellWasIsolated: true,
    dataOnlyPreservedIdentity: true,
    dataOnlyPreservedDom: true,
    nextCommitX: '50',
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket04SnapshotGraph()', {
    duplicate: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_DOCUMENT_UPDATE',
      details: {
        issue: 'INVALID_DOCUMENT_SNAPSHOT',
        field: 'nodes',
        reason: 'NON_CANONICAL_IDS',
      },
    },
    missingEndpoint: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_DOCUMENT_UPDATE',
      details: {
        issue: 'INVALID_DOCUMENT_SNAPSHOT',
        field: 'edges',
        reason: 'MISSING_EDGE_ENDPOINT',
      },
    },
    parentCycle: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_DOCUMENT_UPDATE',
      details: {
        issue: 'INVALID_DOCUMENT_SNAPSHOT',
        field: 'nodes',
        reason: 'PARENT_CYCLE',
      },
    },
    projectionUnchanged: true,
    recoveredNodeIds: ['graph-a', 'graph-b'],
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket05RollbackSuccess()', {
    sameErrorIdentity: true,
    errorName: 'Error',
    errorMessage: 'injected attribute failure',
    rollbackX: '10',
    recoveredX: '30',
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket05RollbackFailure()', {
    aggregateName: 'AggregateError',
    aggregateMessage: 'SVG Renderer Projection update and DOM rollback both failed.',
    aggregateErrorCount: 3,
    includesPrimaryError: true,
    includesRollbackYError: true,
    includesRollbackXError: true,
    blockedCommit: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'DOCUMENT_OUT_OF_SYNC',
      details: {
        issue: 'PROJECTION_ROLLBACK_FAILED',
        expectedRevision: 1,
        receivedRevision: 1,
      },
    },
    blockedSession: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'DOCUMENT_OUT_OF_SYNC',
      details: { issue: 'PROJECTION_ROLLBACK_FAILED', expectedRevision: 1 },
    },
    blockedInput: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'DOCUMENT_OUT_OF_SYNC',
      details: { issue: 'PROJECTION_ROLLBACK_FAILED', expectedRevision: 1 },
    },
    inputCount: 0,
    resetX: '30',
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket05LayerRollback()', {
    sameErrorIdentity: true,
    rollbackNodeIds: ['layer-b', 'layer-c'],
    restoredBIdentity: true,
    restoredCIdentity: true,
    recoveredNodeIds: ['layer-a', 'layer-c'],
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket06SessionProjection()', {
    transform: 'matrix(1 0 0 1 10 5)',
    selected: 'true',
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket06BeforeBaseline()', {
    error: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_SESSION_SNAPSHOT',
      details: { issue: 'DOCUMENT_BASELINE_MISSING' },
    },
    transform: null,
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket06SessionValidation()', {
    dangling: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_SESSION_SNAPSHOT',
      details: { issue: 'SELECTION_ENTITY_MISSING', entity: 'node', id: 'missing-node' },
    },
    nonCanonical: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_SESSION_SNAPSHOT',
      details: { issue: 'NON_CANONICAL_SELECTION', field: 'nodeIds' },
    },
    duplicate: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_SESSION_SNAPSHOT',
      details: { issue: 'DUPLICATE_SELECTION_ID', field: 'nodeIds', id: 'session-a' },
    },
    invalidZoom: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_SESSION_SNAPSHOT',
      details: { issue: 'INVALID_VIEWPORT', field: 'zoom' },
    },
    transform: 'matrix(2 0 0 2 10 20)',
    selectedA: 'true',
    selectedB: null,
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket06ResizeProjection()', {
    before: 'matrix(0.5 0 0 0.5 0 0)',
    after: 'matrix(1 0 0 0.5 0 0)',
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket06SessionCoherence()', {
    error: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_SESSION_SNAPSHOT',
      details: { issue: 'SELECTION_ENTITY_MISSING', entity: 'node', id: 'selected-delete-node' },
    },
    nodeRemainedAfterRejection: true,
    nodeRemovedAfterSessionUpdate: true,
  });

  const targetUnavailableError = {
    name: 'SvgRendererError',
    domain: 'renderer.svg',
    code: 'TARGET_UNAVAILABLE',
    details: {},
  };
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket06TargetUnavailable()', {
    detached: targetUnavailableError,
    zeroSize: targetUnavailableError,
    singular: targetUnavailableError,
    selectedAfterFailures: 'true',
    recoveredTransform: 'matrix(2 0 0 2 5 6)',
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket07FirstHits()', {
    node: { type: 'node', nodeId: 'node-c', worldPoint: { x: 10, y: 10 } },
    edge: { type: 'edge', edgeId: 'edge-a', worldPoint: { x: 100, y: 20 } },
    canvas: { type: 'canvas', worldPoint: { x: 100, y: 100 } },
    outside: null,
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket07Tolerance()', {
    defaultNear: { type: 'canvas', worldPoint: { x: 100, y: 25 } },
    configuredNear: { type: 'edge', edgeId: 'edge-b', worldPoint: { x: 100, y: 25 } },
    reverseOrder: { type: 'edge', edgeId: 'edge-b', worldPoint: { x: 100, y: 20 } },
    invalidPoint: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_SCREEN_POINT',
      details: { field: 'x' },
    },
  });

  await evaluateBrowserScenario<Readonly<{ x: number; y: number }>>(
    'globalThis.__nodebraidRendererSvgTicket08SetupPointer()',
  );
  await runAgentBrowser(['click', '#ticket-08-pointer-target']);
  const noModifiers = { alt: false, control: false, meta: false, shift: false };
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket08ReadPointer()', [
    {
      type: 'pointer.move',
      pointerId: 1,
      pointerType: 'mouse',
      screenPoint: { x: 200, y: 150 },
      worldPoint: { x: 95, y: 65 },
      button: null,
      pressedButtons: [],
      modifiers: noModifiers,
    },
    {
      type: 'pointer.down',
      pointerId: 1,
      pointerType: 'mouse',
      screenPoint: { x: 200, y: 150 },
      worldPoint: { x: 95, y: 65 },
      button: 'primary',
      pressedButtons: ['primary'],
      modifiers: noModifiers,
    },
    { type: 'focus.gained' },
    {
      type: 'pointer.up',
      pointerId: 1,
      pointerType: 'mouse',
      screenPoint: { x: 200, y: 150 },
      worldPoint: { x: 95, y: 65 },
      button: 'primary',
      pressedButtons: [],
      modifiers: noModifiers,
    },
  ]);
  await runAgentBrowser(['eval', 'globalThis.__nodebraidRendererSvgTicket08TeardownPointer()', '--json']);

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket08WheelKeyboardPolicy()', {
    inputs: [
      {
        type: 'wheel',
        screenPoint: { x: 50, y: 60 },
        worldPoint: { x: 20, y: 20 },
        deltaX: 2,
        deltaY: 3,
        modifiers: { alt: false, control: false, meta: false, shift: true },
      },
      {
        type: 'wheel',
        screenPoint: { x: 50, y: 60 },
        worldPoint: { x: 20, y: 20 },
        deltaX: 16,
        deltaY: 32,
        modifiers: { alt: false, control: false, meta: false, shift: false },
      },
      {
        type: 'wheel',
        screenPoint: { x: 50, y: 60 },
        worldPoint: { x: 20, y: 20 },
        deltaX: 0,
        deltaY: 300,
        modifiers: { alt: false, control: false, meta: false, shift: false },
      },
      { type: 'focus.gained' },
      {
        type: 'key.down',
        key: 'a',
        code: 'KeyA',
        repeat: true,
        modifiers: { alt: true, control: false, meta: false, shift: false },
      },
      {
        type: 'key.up',
        key: 'a',
        code: 'KeyA',
        repeat: false,
        modifiers: { alt: false, control: false, meta: false, shift: false },
      },
    ],
    wheelDispatchResults: [false, false, false],
    keyboardDispatchResults: [true, true],
    contextMenuDispatchResult: false,
    bubbled: { wheel: 0, keyboard: 0, contextMenu: 0 },
    touchAction: 'pan-x',
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket09InputOrder()', {
    order: ['first:pointer.down', 'second:pointer.down', 'first:pointer.move', 'third:pointer.move'],
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket09Focus()', {
    addedTabIndex: '-1',
    active: true,
    scrollY: 0,
    restoredTabIndex: null,
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgInteractionFocusInput()', {
    inputTypes: ['focus.gained', 'focus.lost'],
  });

  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgTicket09SetupCapture()');
  await dispatchCapturedPointerSequence();
  const invalidPointer = (pointerId: number) => ({
    name: 'RendererError',
    domain: 'renderer',
    code: 'INVALID_POINTER',
    details: { pointerId },
  });
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket09ReadCapture()', {
    unknownBefore: invalidPointer(999),
    sawDown: true,
    sawOutsideMove: true,
    sawUp: true,
    capturedDuringDown: true,
    capturedDuringUp: true,
    capturedAfterUp: false,
    afterUpError: invalidPointer(1),
  });
  await runAgentBrowser(['eval', 'globalThis.__nodebraidRendererSvgTicket09TeardownCapture()', '--json']);

  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgReviewSetupPointerCleanup()');
  await dispatchFaultedPointerCleanupSequence();
  const targetUnavailable = {
    name: 'SvgRendererError',
    domain: 'renderer.svg',
    code: 'TARGET_UNAVAILABLE',
    details: {},
  };
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReviewReadPointerCleanup()', {
    nativeError: targetUnavailable,
    capturedAfterFailedUp: false,
    captureAfterFailedUp: invalidPointer(1),
    releaseAfterFailedUp: invalidPointer(1),
    recapturedOnNextDown: true,
    capturedAfterNextUp: false,
    captureAfterNextUp: invalidPointer(1),
  });
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgReviewTeardownPointerCleanup()');

  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgReviewSetupPointerCleanup(true)');
  await dispatchFaultedPointerCleanupSequence(false);
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReviewFinishPointerDoubleFailure()', {
    aggregateName: 'AggregateError',
    aggregateMessage: 'SVG Renderer Pointer handling and cleanup both failed.',
    aggregateErrorCount: 2,
    handlingError: targetUnavailable,
    includesCleanupError: true,
    captureAfterFailedUp: invalidPointer(1),
    releaseAfterFailedUp: invalidPointer(1),
    reservationReusable: true,
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket09InputFaults()', {
    order: [
      'first:pointer.down',
      'second:pointer.down',
      'third:pointer.down',
      'first:pointer.move',
      'second:pointer.move',
      'third:pointer.move',
    ],
    errorEventCount: 1,
    aggregateName: 'AggregateError',
    aggregateErrorCount: 2,
    includesFirstError: true,
    includesSecondError: true,
  });

  const rendererDisposed = {
    name: 'RendererError',
    domain: 'renderer',
    code: 'RENDERER_DISPOSED',
    details: {},
  };
  const targetOccupied = {
    name: 'SvgRendererError',
    domain: 'renderer.svg',
    code: 'TARGET_OCCUPIED',
    details: {},
  };
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket10DisposeLifecycle()', {
    activeDuplicate: targetOccupied,
    cleanupWindowDuplicate: targetOccupied,
    sameDisposePromise: true,
    staleUpdate: rendererDisposed,
    staleFocus: rendererDisposed,
    staleSubscribe: rendererDisposed,
    inputsAfterDisposeCall: 0,
    callerContentPreserved: true,
    projectionRemoved: true,
    tabIndexPreserved: '7',
    targetReusable: true,
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket10DisposeFailure()', {
    aggregateName: 'AggregateError',
    aggregateMessage: 'SVG Renderer cleanup failed.',
    aggregateErrorCount: 2,
    includesListenerError: true,
    includesProjectionError: true,
    tabIndexRestored: true,
    projectionRetained: true,
    reservationError: targetOccupied,
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket11RuntimeIntegration()', {
    initialNodeCount: 0,
    node: { x: '0', selected: 'true' },
    transform: 'matrix(2 0 0 2 10 20)',
    hit: { type: 'node', nodeId: 'runtime-node', worldPoint: { x: 5, y: 5 } },
    activeAfterFocus: true,
    forwardedInput: {
      type: 'wheel',
      screenPoint: { x: 20, y: 30 },
      worldPoint: { x: 5, y: 5 },
      deltaX: 16,
      deltaY: 32,
      modifiers: { alt: false, control: false, meta: false, shift: false },
    },
    resyncedNodeIds: ['runtime-node', 'runtime-second-node'],
    syncFaultCodes: ['DOCUMENT_OUT_OF_SYNC'],
    projectionRemoved: true,
    staleService: {
      name: 'RendererPluginError',
      domain: 'plugin.renderer',
      code: 'SERVICE_DISPOSED',
      details: {},
    },
  });

  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgTicket11SetupRuntimeCapture()');
  await dispatchCapturedPointerSequence();
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgTicket11ReadRuntimeCapture()', {
    capturedThroughService: true,
    sawOutsideMove: true,
    capturedDuringUp: true,
    releasedThroughService: true,
    capturedAfterUp: false,
  });
  await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgTicket11TeardownRuntimeCapture()');

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReviewTargetAtomicCommit()', {
    error: {
      name: 'SvgRendererError',
      domain: 'renderer.svg',
      code: 'TARGET_UNAVAILABLE',
      details: {},
    },
    xAfterRejection: '10',
    recoveredX: '30',
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReviewOperationRefresh()', {
    before: 'matrix(1 0 0 1 0 0)',
    afterHitTest: 'matrix(0.5 0 0 0.5 0 0)',
    afterInput: 'matrix(0.25 0 0 0.25 0 0)',
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReviewOwnerRealm()', {
    nodeId: 'iframe-node',
    projectionClass: 'nodebraid-renderer-svg',
  });

  const invalidConfig = (field: string) => ({
    name: 'SvgRendererError',
    domain: 'renderer.svg',
    code: 'INVALID_CONFIG',
    details: { field },
  });
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReviewUnknownConfig()', {
    root: invalidConfig('surprise'),
    input: invalidConfig('input.surprise'),
    policy: invalidConfig('input.pointer.surprise'),
    targetUnchanged: true,
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReviewMalformedUpdates()', {
    nullUpdate: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_DOCUMENT_UPDATE',
      details: { issue: 'INVALID_DOCUMENT_UPDATE' },
    },
    invalidQuery: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_DOCUMENT_UPDATE',
      details: { issue: 'INVALID_DOCUMENT_SNAPSHOT', field: 'query', reason: 'INVALID_QUERY' },
    },
    nullCommit: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_DOCUMENT_UPDATE',
      details: { issue: 'INVALID_DOCUMENT_COMMIT' },
    },
    projectionUnchanged: true,
  });

  const invalidCommitEvidence = {
    name: 'RendererError',
    domain: 'renderer',
    code: 'INVALID_DOCUMENT_UPDATE',
    details: { issue: 'INVALID_DOCUMENT_COMMIT' },
  };
  const rejectedCommitEvidence = {
    error: invalidCommitEvidence,
    projectionUnchanged: true,
    recoveredX: '30',
  };
  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReviewMalformedChangeEvidence()', {
    nodePosition: rejectedCommitEvidence,
    edgeSource: rejectedCommitEvidence,
    missingNodeData: rejectedCommitEvidence,
    missingEdgeData: rejectedCommitEvidence,
    emptyChanges: rejectedCommitEvidence,
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReviewCommitSessionRollback()', {
    sameErrorIdentity: true,
    rollbackX: '10',
    rollbackTransform: 'matrix(2 0 0 2 10 20)',
    recoveredX: '30',
    recoveredTransform: 'matrix(1 0 0 1 5 10)',
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReviewResetAtomicity()', {
    layerSameErrorIdentity: true,
    layerNodeIdentityRestored: true,
    layerEdgeIdentityRestored: true,
    layerRollbackX: '10',
    layerRecoveredX: '30',
    sessionSameErrorIdentity: true,
    sessionNodeIdentityRestored: true,
    sessionRollbackX: '10',
    sessionRollbackTransform: 'matrix(2 0 0 2 10 20)',
    sessionRecoveredX: '30',
    sessionRecoveredTransform: 'matrix(1 0 0 1 5 10)',
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReviewResizeObserverError()', {
    sameErrorIdentity: true,
    rollbackTransform: 'matrix(0.5 0 0 0.5 0 0)',
    successfulResizeTransform: 'matrix(0.666666666667 0 0 0.5 0 0)',
    recoveredTransform: 'matrix(0.666666666667 0 0 0.5 0 0)',
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReviewResizeObserverRollbackFailure()', {
    aggregateName: 'AggregateError',
    aggregateMessage: 'SVG Renderer Projection update and DOM rollback both failed.',
    aggregateErrorCount: 2,
    includesPrimaryError: true,
    includesRollbackError: true,
    blockedSession: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'DOCUMENT_OUT_OF_SYNC',
      details: { issue: 'PROJECTION_ROLLBACK_FAILED', expectedRevision: 0 },
    },
    recoveredTransform: 'matrix(1 0 0 0.5 0 0)',
  });

  await assertBrowserScenario('globalThis.__nodebraidRendererSvgReviewResizeObserverMultipleErrors()', {
    aggregateName: 'AggregateError',
    aggregateMessage: 'Multiple SVG Renderer ResizeObserver updates failed.',
    aggregateErrorCount: 2,
    includesFirstError: true,
    includesSecondError: true,
    recoveredTransform: 'matrix(0.666666666667 0 0 0.5 0 0)',
  });
} finally {
  await runAgentBrowser(['close']);
  await server.stop(true);
}

async function runAgentBrowser(arguments_: readonly string[]): Promise<string> {
  const process = Bun.spawn([agentBrowser, '--session', session, ...arguments_], {
    cwd: repositoryRoot,
    env: processEnv(),
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  assert.equal(exitCode, 0, stderr || stdout);
  return stdout.trim();
}

async function evaluateBrowserScenario<Result = unknown>(expression: string): Promise<Result> {
  const output = await runAgentBrowser(['eval', expression, '--json']);
  const response = JSON.parse(output) as AgentBrowserJson<Result>;
  assert.equal(response.success, true, JSON.stringify(response.error));
  assert.ok(response.data, `Browser scenario returned no data: ${expression}`);
  return response.data.result;
}

async function assertBrowserScenario<Result>(expression: string, expected: Result): Promise<void> {
  assert.deepEqual(await evaluateBrowserScenario<Result>(expression), expected);
}

async function dispatchCapturedPointerSequence(): Promise<void> {
  await withRendererPageCdp(async (send) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 100, y: 100, buttons: 0 });
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: 100,
      y: 100,
      button: 'left',
      buttons: 1,
      clickCount: 1,
    });
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: 350,
      y: 50,
      button: 'left',
      buttons: 1,
    });
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: 350,
      y: 50,
      button: 'left',
      buttons: 0,
      clickCount: 1,
    });
  });
}

async function dispatchShiftClick(x: number, y: number): Promise<void> {
  await withRendererPageCdp(async (send) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0, modifiers: 8 });
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button: 'left',
      buttons: 1,
      clickCount: 1,
      modifiers: 8,
    });
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x,
      y,
      button: 'left',
      buttons: 0,
      clickCount: 1,
      modifiers: 8,
    });
  });
}

async function dispatchModifiedMouseDrag(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  modifiers: number,
): Promise<void> {
  await dispatchModifiedMouseDown(startX, startY, modifiers);
  await dispatchModifiedMouseMove(endX, endY, modifiers);
  await dispatchModifiedMouseUp(endX, endY, modifiers);
}

async function dispatchModifiedMouseDown(x: number, y: number, modifiers: number): Promise<void> {
  await withRendererPageCdp(async (send) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0, modifiers });
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button: 'left',
      buttons: 1,
      clickCount: 1,
      modifiers,
    });
  });
}

async function dispatchModifiedMouseMove(x: number, y: number, modifiers: number): Promise<void> {
  await withRendererPageCdp(async (send) => {
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x,
      y,
      button: 'left',
      buttons: 1,
      modifiers,
    });
  });
}

async function dispatchModifiedMouseUp(x: number, y: number, modifiers: number): Promise<void> {
  await withRendererPageCdp(async (send) => {
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x,
      y,
      button: 'left',
      buttons: 0,
      clickCount: 1,
      modifiers,
    });
  });
}

async function dispatchSelectionEscape(): Promise<void> {
  await evaluateBrowserScenario(
    `document.querySelector('#selection-interaction-target').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }))`,
  );
}

async function dispatchSelectionPointerCancel(x: number, y: number): Promise<void> {
  await evaluateBrowserScenario(
    `document.querySelector('#selection-interaction-target').dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, pointerType: 'mouse', clientX: ${x}, clientY: ${y}, bubbles: true }))`,
  );
}

async function releaseSelectionPointerCapture(): Promise<void> {
  await evaluateBrowserScenario(
    `new Promise((resolve) => {
      const target = document.querySelector('#selection-interaction-target');
      target.releasePointerCapture(1);
      target.dispatchEvent(new PointerEvent('lostpointercapture', { pointerId: 1, pointerType: 'mouse' }));
      requestAnimationFrame(() => resolve(true));
    })`,
  );
}

async function dispatchMouseDown(x: number, y: number): Promise<void> {
  await withRendererPageCdp(async (send) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 });
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button: 'left',
      buttons: 1,
      clickCount: 1,
    });
  });
}

async function dispatchMouseUp(x: number, y: number): Promise<void> {
  await withRendererPageCdp(async (send) => {
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x,
      y,
      button: 'left',
      buttons: 0,
      clickCount: 1,
    });
  });
}

async function dispatchMouseMove(x: number, y: number): Promise<void> {
  await withRendererPageCdp(async (send) => {
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x,
      y,
      button: 'left',
      buttons: 1,
    });
  });
}

async function dispatchWheel(x: number, y: number, deltaY: number): Promise<void> {
  await withRendererPageCdp(async (send) => {
    await send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x,
      y,
      deltaX: 0,
      deltaY,
    });
  });
}

async function dispatchSpaceKey(type: 'keyDown' | 'keyUp'): Promise<void> {
  const domType = type === 'keyDown' ? 'keydown' : 'keyup';
  await evaluateBrowserScenario(
    `document.querySelector('#viewport-pan-interaction-target').dispatchEvent(new KeyboardEvent('${domType}', { key: ' ', code: 'Space', bubbles: true }))`,
  );
}

async function dispatchConnectionEscape(): Promise<void> {
  await evaluateBrowserScenario(
    `document.querySelector('#connection-interaction-target').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }))`,
  );
}

async function dispatchConnectionKey(type: 'keydown' | 'keyup', key: string, code: string): Promise<void> {
  await evaluateBrowserScenario(
    `(() => { const target = document.querySelector('#connection-interaction-target'); target.focus(); return target.dispatchEvent(new KeyboardEvent('${type}', { key: '${key}', code: '${code}', bubbles: true })); })()`,
  );
}

async function dispatchConnectionPointer(
  type: 'pointerdown' | 'pointerup' | 'pointercancel',
  pointerId: number,
  pointerType: 'mouse' | 'pen' | 'touch',
  x: number,
  y: number,
): Promise<void> {
  await evaluateBrowserScenario(`document.querySelector('#connection-interaction-target').dispatchEvent(new PointerEvent('${type}', {
    pointerId: ${pointerId}, pointerType: '${pointerType}', clientX: ${x}, clientY: ${y}, button: 0, buttons: ${type === 'pointerup' ? 0 : 1}, bubbles: true
  }))`);
}

async function dispatchConnectionLostCapture(pointerId: number, x: number, y: number): Promise<void> {
  await evaluateBrowserScenario(`document.querySelector('#connection-interaction-target').dispatchEvent(new PointerEvent('lostpointercapture', {
    pointerId: ${pointerId}, pointerType: 'mouse', clientX: ${x}, clientY: ${y}, bubbles: true
  }))`);
}

async function dispatchMiddleDown(x: number, y: number): Promise<void> {
  await withRendererPageCdp(async (send) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 });
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button: 'middle',
      buttons: 4,
      clickCount: 1,
    });
  });
}

async function dispatchMiddleMove(x: number, y: number): Promise<void> {
  await withRendererPageCdp(async (send) => {
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x,
      y,
      button: 'middle',
      buttons: 4,
    });
  });
}

async function dispatchMiddleUp(x: number, y: number): Promise<void> {
  await withRendererPageCdp(async (send) => {
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x,
      y,
      button: 'middle',
      buttons: 0,
      clickCount: 1,
    });
  });
}

async function dispatchPointerCancel(x: number, y: number): Promise<void> {
  await evaluateBrowserScenario(
    `document.querySelector('#viewport-pan-interaction-target').dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, pointerType: 'mouse', clientX: ${x}, clientY: ${y}, bubbles: true }))`,
  );
}

async function releaseViewportPanPointerCapture(): Promise<void> {
  await evaluateBrowserScenario(
    `new Promise((resolve) => {
      const target = document.querySelector('#viewport-pan-interaction-target');
      target.releasePointerCapture(1);
      target.dispatchEvent(new PointerEvent('lostpointercapture', {
        pointerId: 1,
        pointerType: 'mouse',
      }));
      requestAnimationFrame(() => resolve(true));
    })`,
  );
}

async function dispatchAdditionalPointerDown(): Promise<boolean> {
  return evaluateBrowserScenario<boolean>(
    `(() => {
      const target = document.querySelector('#viewport-pan-interaction-target');
      target.dispatchEvent(new PointerEvent('pointerdown', {
        pointerId: 2,
        pointerType: 'touch',
        clientX: 250,
        clientY: 200,
        button: 0,
        buttons: 1,
        bubbles: true,
      }));
      return target.hasPointerCapture(2);
    })()`,
  );
}

async function dispatchAdditionalPointerMoveAndUp(): Promise<void> {
  await evaluateBrowserScenario(
    `(() => {
      const target = document.querySelector('#viewport-pan-interaction-target');
      target.dispatchEvent(new PointerEvent('pointermove', {
        pointerId: 2,
        pointerType: 'touch',
        clientX: 280,
        clientY: 230,
        buttons: 1,
        bubbles: true,
      }));
      target.dispatchEvent(new PointerEvent('pointerup', {
        pointerId: 2,
        pointerType: 'touch',
        clientX: 280,
        clientY: 230,
        button: 0,
        bubbles: true,
      }));
      return true;
    })()`,
  );
}

async function dispatchFaultedPointerCleanupSequence(retryPointer = true): Promise<void> {
  await withRendererPageCdp(async (send) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 100, y: 100, buttons: 0 });
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: 100,
      y: 100,
      button: 'left',
      buttons: 1,
      clickCount: 1,
    });
    await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgReviewMakePointerTargetSingular()');
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: 350,
      y: 50,
      button: 'left',
      buttons: 0,
      clickCount: 1,
    });
    await evaluateBrowserScenario('globalThis.__nodebraidRendererSvgReviewFinishFaultedPointerUp()');
    if (!retryPointer) return;
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 100, y: 100, buttons: 0 });
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: 100,
      y: 100,
      button: 'left',
      buttons: 1,
      clickCount: 1,
    });
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: 100,
      y: 100,
      button: 'left',
      buttons: 0,
      clickCount: 1,
    });
  });
}

type PageCdpSend = (method: string, params?: Readonly<Record<string, unknown>>) => Promise<unknown>;

async function withRendererPageCdp(run: (send: PageCdpSend) => Promise<void>): Promise<void> {
  const cdpOutput = await runAgentBrowser(['get', 'cdp-url', '--json']);
  const cdpResponse = JSON.parse(cdpOutput) as Readonly<{
    success: boolean;
    data: Readonly<{ cdpUrl: string }> | null;
    error: unknown;
  }>;
  assert.equal(cdpResponse.success, true, JSON.stringify(cdpResponse.error));
  const cdpUrl = cdpResponse.data?.cdpUrl;
  assert.ok(cdpUrl);
  const socket = new WebSocket(cdpUrl);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener('open', () => resolve(), { once: true });
    socket.addEventListener('error', () => reject(new Error('Failed to connect to agent-browser CDP.')), {
      once: true,
    });
  });
  let nextId = 1;
  const pending = new Map<
    number,
    Readonly<{
      resolve: (result: unknown) => void;
      reject: (error: Error) => void;
    }>
  >();
  socket.addEventListener('message', (event) => {
    if (typeof event.data !== 'string') return;
    const message = JSON.parse(event.data) as Readonly<{
      id?: number;
      result?: unknown;
      error?: Readonly<{ message?: string }>;
    }>;
    if (message.id === undefined) return;
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(message.error.message ?? 'CDP command failed.'));
    else waiter.resolve(message.result);
  });
  const send = (
    method: string,
    params: Readonly<Record<string, unknown>> = {},
    sessionId?: string,
  ): Promise<unknown> => {
    const id = nextId;
    nextId += 1;
    const result = new Promise<unknown>((resolve, reject) => pending.set(id, { resolve, reject }));
    socket.send(JSON.stringify({ id, method, params, ...(sessionId === undefined ? {} : { sessionId }) }));
    return result;
  };
  try {
    const targetResult = (await send('Target.getTargets')) as Readonly<{
      targetInfos: readonly Readonly<{ targetId: string; type: string; url: string }>[];
    }>;
    const page = targetResult.targetInfos.find(
      (targetInfo) => targetInfo.type === 'page' && targetInfo.url.startsWith(server.url.origin),
    );
    assert.ok(page, 'Expected the renderer browser-test page CDP target.');
    const attachment = (await send('Target.attachToTarget', {
      targetId: page.targetId,
      flatten: true,
    })) as Readonly<{ sessionId: string }>;
    const pageSession = attachment.sessionId;
    await run((method, params = {}) => send(method, params, pageSession));
  } finally {
    socket.close();
  }
}

function processEnv(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}
