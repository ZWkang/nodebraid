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
const session = `cflow-renderer-svg-contract-${process.pid}`;

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
  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket01()', {
    callerContentPreserved: true,
    targetChildOrder: ['defs', 'g'],
    projectionClass: 'cflow-renderer-svg',
    layerClasses: ['cflow-renderer-svg__edges', 'cflow-renderer-svg__nodes'],
    node: {
      tagName: 'rect',
      id: 'node-a',
      x: '10',
      y: '20',
      width: '80',
      height: '40',
    },
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgInteractionProjectionFirstNode()', {
    previewPosition: { x: '80', y: '90' },
    documentPosition: { x: 10, y: 20 },
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgInteractionProjectionClear()', {
    previewX: '80',
    restoredX: '10',
    preservedNodeIdentity: true,
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgInteractionProjectionReplacement()', {
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

  await assertBrowserScenario('globalThis.__cflowRendererSvgInteractionProjectionReset()', {
    nodeX: '30',
    stableHit: {
      type: 'node',
      nodeId: 'reset-interaction-node',
      worldPoint: { x: 40, y: 30 },
    },
    formerPreviewHit: { type: 'canvas', worldPoint: { x: 100, y: 100 } },
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgInteractionProjectionEdge()', {
    sourceX: '120',
    sourceY: '110',
    targetX: '240',
    targetY: '120',
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgViewportInteractionProjection()', {
    previewTransform: 'matrix(2 0 0 2 40 50)',
    sessionViewport: { x: 10, y: 20, zoom: 2 },
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgViewportInteractionInvalidation()', {
    transform: 'matrix(2 0 0 2 200 100)',
    hit: { type: 'canvas', worldPoint: { x: 0, y: 0 } },
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgInteractionProjectionHit()', {
    hit: { type: 'node', nodeId: 'interaction-hit-node', worldPoint: { x: 100, y: 100 } },
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgInteractionProjectionIsolation()', {
    nodeX: '80',
    hit: { type: 'node', nodeId: 'interaction-isolation-node', worldPoint: { x: 100, y: 100 } },
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgInteractionProjectionBaselineMismatch()', {
    error: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INTERACTION_OUT_OF_SYNC',
      details: { issue: 'NODE_POSITION_MISMATCH' },
    },
    projectionUnchanged: true,
    nodeX: '10',
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgInteractionProjectionDuplicateNode()', {
    error: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_INTERACTION_PROJECTION',
      details: { issue: 'DUPLICATE_NODE' },
    },
    projectionUnchanged: true,
    nodeX: '10',
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgInteractionProjectionInvalidPosition()', {
    error: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_INTERACTION_PROJECTION',
      details: { issue: 'INVALID_NODE_POSITION', field: 'position.x' },
    },
    projectionUnchanged: true,
    nodeX: '10',
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgInteractionProjectionOrder()', {
    error: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_INTERACTION_PROJECTION',
      details: { issue: 'NON_CANONICAL_NODE_ORDER' },
    },
    projectionUnchanged: true,
    nodeX: '10',
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgInteractionProjectionEmpty()', {
    error: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_INTERACTION_PROJECTION',
      details: { issue: 'EMPTY_NODE_DRAG' },
    },
    projectionUnchanged: true,
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgInteractionProjectionUnknownType()', {
    error: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_INTERACTION_PROJECTION',
      details: { issue: 'INVALID_PROJECTION_TYPE' },
    },
    projectionUnchanged: true,
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgInteractionProjectionInvalidViewport()', {
    error: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_INTERACTION_PROJECTION',
      details: { issue: 'INVALID_VIEWPORT', field: 'viewport.x' },
    },
    projectionUnchanged: true,
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgInteractionProjectionMalformedShape()', {
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

  await assertBrowserScenario('globalThis.__cflowRendererSvgInteractionProjectionRollback()', {
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

  await assertBrowserScenario('globalThis.__cflowRendererSvgRuntimeInteractionProjection()', {
    previewX: '80',
    restoredX: '10',
  });

  await evaluateBrowserScenario('globalThis.__cflowRendererSvgSetupSelectionInteraction()');
  await runAgentBrowser(['click', '[data-cflow-node-id="selection-node"]']);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadSelectionInteraction()', {
    nodeIds: ['selection-node'],
    edgeIds: [],
  });
  await runAgentBrowser(['click', '[data-cflow-edge-id="selection-edge"]']);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadSelectionInteraction()', {
    nodeIds: [],
    edgeIds: ['selection-edge'],
  });
  await runAgentBrowser(['click', '#selection-interaction-target']);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadSelectionInteraction()', {
    nodeIds: [],
    edgeIds: [],
  });
  await runAgentBrowser(['click', '[data-cflow-node-id="selection-node"]']);
  await dispatchShiftClick(340, 120);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadSelectionInteraction()', {
    nodeIds: ['selection-node', 'selection-target-node'],
    edgeIds: [],
  });
  await dispatchMouseDown(160, 120);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadSelectionInteraction()', {
    nodeIds: ['selection-node', 'selection-target-node'],
    edgeIds: [],
  });
  await dispatchMouseUp(160, 120);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadSelectionInteraction()', {
    nodeIds: ['selection-node'],
    edgeIds: [],
  });
  await dispatchShiftClick(250, 120);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadSelectionInteraction()', {
    nodeIds: ['selection-node'],
    edgeIds: ['selection-edge'],
  });
  await dispatchShiftClick(200, 150);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadSelectionInteraction()', {
    nodeIds: ['selection-node'],
    edgeIds: ['selection-edge'],
  });
  await evaluateBrowserScenario('globalThis.__cflowRendererSvgTeardownSelectionInteraction()');

  await evaluateBrowserScenario('globalThis.__cflowRendererSvgSetupNodeDragInteraction()');
  await dispatchMouseDown(160, 120);
  await dispatchMouseMove(200, 160);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadNodeDragInteraction()', {
    previewPosition: { x: '160', y: '140' },
    documentPosition: { x: 120, y: 100 },
  });
  await dispatchMouseUp(200, 160);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadNodeDragInteraction()', {
    previewPosition: { x: '160', y: '140' },
    documentPosition: { x: 160, y: 140 },
  });
  await evaluateBrowserScenario('globalThis.__cflowRendererSvgUndoNodeDragInteraction()');
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadNodeDragInteraction()', {
    previewPosition: { x: '120', y: '100' },
    documentPosition: { x: 120, y: 100 },
  });
  await evaluateBrowserScenario('globalThis.__cflowRendererSvgRedoNodeDragInteraction()');
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadNodeDragInteraction()', {
    previewPosition: { x: '160', y: '140' },
    documentPosition: { x: 160, y: 140 },
  });
  await evaluateBrowserScenario('globalThis.__cflowRendererSvgPrepareMultiNodeDragInteraction()');
  await dispatchMouseDown(200, 160);
  await dispatchMouseMove(240, 200);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadMultiNodeDragInteraction()', {
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
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadMultiNodeDragInteraction()', {
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
  await evaluateBrowserScenario('globalThis.__cflowRendererSvgUpdateNodeDragDataExternally()');
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadCompatibleNodeDragInteraction()', {
    previewNode: { x: '240', y: '220', width: '100', height: '60' },
    documentNode: {
      position: { x: 200, y: 180 },
      size: { width: 100, height: 60 },
      data: { label: 'updated' },
    },
  });
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadNodeDragInteractionEvents()', []);
  await dispatchMouseUp(280, 240);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadCompatibleNodeDragInteraction()', {
    previewNode: { x: '240', y: '220', width: '100', height: '60' },
    documentNode: {
      position: { x: 240, y: 220 },
      size: { width: 100, height: 60 },
      data: { label: 'updated' },
    },
  });
  await dispatchMouseDown(280, 240);
  await dispatchMouseMove(320, 280);
  await evaluateBrowserScenario('globalThis.__cflowRendererSvgMoveNodeDragExternally()');
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadNodeDragInteractionEvents()', [
    {
      name: 'cflow.plugin.interaction.gesture.cancelled',
      level: 'info',
      attributes: { gestureType: 'node-drag', reason: 'stale' },
    },
  ]);
  await dispatchMouseUp(280, 240);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadMultiNodeDragInteraction()', {
    previewPositions: [
      { id: 'drag-node', x: '260', y: '180' },
      { id: 'drag-node-b', x: '380', y: '180' },
    ],
    documentPositions: [
      { id: 'drag-node', x: 260, y: 180 },
      { id: 'drag-node-b', x: 380, y: 180 },
    ],
  });
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadNodeDragInteractionEvents()', [
    {
      name: 'cflow.plugin.interaction.gesture.cancelled',
      level: 'info',
      attributes: { gestureType: 'node-drag', reason: 'stale' },
    },
  ]);
  await evaluateBrowserScenario('globalThis.__cflowRendererSvgTeardownNodeDragInteraction()');

  await evaluateBrowserScenario('globalThis.__cflowRendererSvgSetupViewportPanInteraction()');
  await dispatchMouseDown(50, 200);
  await dispatchMouseMove(100, 250);
  await dispatchWheel(100, 250, 100);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 50 50)',
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteractionEvents()', [
    {
      name: 'cflow.plugin.interaction.input.rejected',
      level: 'info',
      attributes: { inputType: 'wheel', gestureType: 'viewport-pan', reason: 'active-gesture' },
    },
  ]);
  await dispatchMouseUp(100, 250);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 50 50)',
    viewport: { x: 50, y: 50, zoom: 1 },
  });
  await dispatchWheel(200, 150, 100);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(0.818730753078 0 0 0.818730753078 77.190387038303 68.126924692202)',
    viewport: {
      x: 77.190387,
      y: 68.126925,
      zoom: 0.818731,
    },
  });
  await evaluateBrowserScenario('globalThis.__cflowRendererSvgResetViewportPanInteraction()');
  await dispatchSpaceKey('keyDown');
  await dispatchMouseDown(160, 120);
  await dispatchMouseMove(190, 140);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 30 20)',
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  await dispatchSpaceKey('keyUp');
  await dispatchMouseUp(190, 140);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 30 20)',
    viewport: { x: 30, y: 20, zoom: 1 },
  });
  await evaluateBrowserScenario('globalThis.__cflowRendererSvgResetViewportPanInteraction()');
  await dispatchMiddleDown(160, 120);
  await dispatchMiddleMove(190, 140);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 30 20)',
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  await dispatchMiddleUp(190, 140);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 30 20)',
    viewport: { x: 30, y: 20, zoom: 1 },
  });
  await evaluateBrowserScenario('globalThis.__cflowRendererSvgResetViewportPanInteraction()');
  await dispatchMouseDown(50, 200);
  await dispatchMouseMove(100, 250);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 50 50)',
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  await dispatchPointerCancel(100, 250);
  await dispatchMouseUp(100, 250);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 0 0)',
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteractionEvents()', [
    {
      name: 'cflow.plugin.interaction.gesture.cancelled',
      level: 'info',
      attributes: { gestureType: 'viewport-pan', reason: 'pointer-cancel' },
    },
  ]);
  await evaluateBrowserScenario('globalThis.__cflowRendererSvgResetViewportPanInteraction()');
  await dispatchMouseDown(50, 200);
  await dispatchMouseMove(100, 250);
  await releaseViewportPanPointerCapture();
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 0 0)',
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  await dispatchMouseUp(100, 250);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteractionEvents()', [
    {
      name: 'cflow.plugin.interaction.gesture.cancelled',
      level: 'info',
      attributes: { gestureType: 'viewport-pan', reason: 'pointer-cancel' },
    },
  ]);
  await evaluateBrowserScenario('globalThis.__cflowRendererSvgResetViewportPanInteraction()');
  await dispatchMouseDown(50, 200);
  await dispatchMouseMove(100, 250);
  assert.equal(await dispatchAdditionalPointerDown(), false);
  await dispatchAdditionalPointerMoveAndUp();
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 50 50)',
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteractionEvents()', [
    {
      name: 'cflow.plugin.interaction.pointer.rejected',
      level: 'info',
      attributes: { inputType: 'pointer.down', gestureType: 'viewport-pan', reason: 'additional-pointer' },
    },
  ]);
  await dispatchMouseMove(130, 280);
  await dispatchMouseUp(130, 280);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 80 80)',
    viewport: { x: 80, y: 80, zoom: 1 },
  });
  await evaluateBrowserScenario('globalThis.__cflowRendererSvgResetViewportPanInteraction()');
  await dispatchMouseDown(50, 200);
  await dispatchMouseMove(450, 350);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 400 150)',
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  await dispatchMouseUp(450, 350);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 400 150)',
    viewport: { x: 400, y: 150, zoom: 1 },
  });
  await evaluateBrowserScenario('globalThis.__cflowRendererSvgResetViewportPanInteraction()');
  await evaluateBrowserScenario(`document.querySelector('#viewport-pan-interaction-target').focus()`);
  await dispatchSpaceKey('keyDown');
  await evaluateBrowserScenario(`document.querySelector('#viewport-pan-interaction-target').blur()`);
  await dispatchMouseDown(160, 120);
  await dispatchMouseMove(190, 140);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 0 0)',
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  await dispatchPointerCancel(190, 140);
  await dispatchMouseUp(190, 140);
  await evaluateBrowserScenario('globalThis.__cflowRendererSvgResetViewportPanInteraction()');
  await dispatchMouseDown(50, 200);
  await dispatchMouseMove(100, 250);
  await evaluateBrowserScenario('globalThis.__cflowRendererSvgSetViewportPanExternally()');
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(2 0 0 2 200 100)',
    viewport: { x: 200, y: 100, zoom: 2 },
  });
  await dispatchMouseUp(100, 250);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(2 0 0 2 200 100)',
    viewport: { x: 200, y: 100, zoom: 2 },
  });
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteractionEvents()', [
    {
      name: 'cflow.plugin.interaction.gesture.cancelled',
      level: 'info',
      attributes: { gestureType: 'viewport-pan', reason: 'stale' },
    },
  ]);
  await evaluateBrowserScenario('globalThis.__cflowRendererSvgResetViewportPanInteraction()');
  await dispatchMouseDown(50, 200);
  await dispatchMouseMove(100, 250);
  await assertBrowserScenario('globalThis.__cflowRendererSvgHasViewportPanPointerCapture()', true);
  await evaluateBrowserScenario('globalThis.__cflowRendererSvgDisposeViewportPanInteraction()');
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 0 0)',
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  await assertBrowserScenario('globalThis.__cflowRendererSvgHasViewportPanPointerCapture()', false);
  await dispatchMouseUp(100, 250);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteractionEvents()', [
    {
      name: 'cflow.plugin.interaction.gesture.cancelled',
      level: 'info',
      attributes: { gestureType: 'viewport-pan', reason: 'lifecycle' },
    },
  ]);
  await evaluateBrowserScenario('globalThis.__cflowRendererSvgTeardownViewportPanInteraction()');

  await evaluateBrowserScenario('globalThis.__cflowRendererSvgSetupViewportPanInteraction(true)');
  await dispatchMouseDown(50, 200);
  await dispatchMouseMove(60, 200);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 0 0)',
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  await dispatchMouseMove(80, 200);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(1 0 0 1 30 0)',
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  await dispatchMouseUp(80, 200);
  await evaluateBrowserScenario('globalThis.__cflowRendererSvgResetViewportPanInteraction()');
  await dispatchWheel(200, 150, 100);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(0.5 0 0 0.5 100 75)',
    viewport: { x: 100, y: 75, zoom: 0.5 },
  });
  await dispatchWheel(200, 150, -1000);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadViewportPanInteraction()', {
    transform: 'matrix(2 0 0 2 -200 -150)',
    viewport: { x: -200, y: -150, zoom: 2 },
  });
  await evaluateBrowserScenario('globalThis.__cflowRendererSvgTeardownViewportPanInteraction()');

  await evaluateBrowserScenario('globalThis.__cflowRendererSvgSetupInteractionProjectionInput()');
  await runAgentBrowser(['click', '#interaction-projection-input-target']);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReadInteractionProjectionInput()', {
    type: 'pointer.down',
    pointerId: 1,
    pointerType: 'mouse',
    screenPoint: { x: 200, y: 150 },
    worldPoint: { x: 80, y: 50 },
    button: 'primary',
    pressedButtons: ['primary'],
    modifiers: { alt: false, control: false, meta: false, shift: false },
  });
  await evaluateBrowserScenario('globalThis.__cflowRendererSvgTeardownInteractionProjectionInput()');

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket02FirstEdge()', {
    layerClasses: ['cflow-renderer-svg__edges', 'cflow-renderer-svg__nodes'],
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

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket02PortError()', {
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

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket02SelfLoopError()', {
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

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket02MissingSizeError()', {
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

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket03FirstCommit()', {
    preservedNodeIdentity: true,
    node: {
      x: '30',
      y: '50',
      width: '120',
      height: '70',
    },
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket03AddRemove()', {
    nodeIds: ['node-a', 'node-c', 'node-d'],
    edgeIds: ['edge-a', 'edge-d'],
    preservedNodeIdentity: true,
    preservedEdgeIdentity: true,
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket03EdgeReplace()', {
    preservedEdgeIdentity: true,
    x2: '320',
    y2: '215',
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket03Continuity()', {
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

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket04DerivedEdge()', {
    preservedEdgeIdentity: true,
    x1: '150',
    y1: '80',
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket04BeforeMismatch()', {
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

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket04ChangeSetMismatch()', {
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

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket04SnapshotOrder()', {
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

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket04BaselineIsolation()', {
    mutableShellWasIsolated: true,
    dataOnlyPreservedIdentity: true,
    dataOnlyPreservedDom: true,
    nextCommitX: '50',
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket04SnapshotGraph()', {
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

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket05RollbackSuccess()', {
    sameErrorIdentity: true,
    errorName: 'Error',
    errorMessage: 'injected attribute failure',
    rollbackX: '10',
    recoveredX: '30',
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket05RollbackFailure()', {
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

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket05LayerRollback()', {
    sameErrorIdentity: true,
    rollbackNodeIds: ['layer-b', 'layer-c'],
    restoredBIdentity: true,
    restoredCIdentity: true,
    recoveredNodeIds: ['layer-a', 'layer-c'],
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket06SessionProjection()', {
    transform: 'matrix(1 0 0 1 10 5)',
    selected: 'true',
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket06BeforeBaseline()', {
    error: {
      name: 'RendererError',
      domain: 'renderer',
      code: 'INVALID_SESSION_SNAPSHOT',
      details: { issue: 'DOCUMENT_BASELINE_MISSING' },
    },
    transform: null,
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket06SessionValidation()', {
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

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket06ResizeProjection()', {
    before: 'matrix(0.5 0 0 0.5 0 0)',
    after: 'matrix(1 0 0 0.5 0 0)',
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket06SessionCoherence()', {
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
  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket06TargetUnavailable()', {
    detached: targetUnavailableError,
    zeroSize: targetUnavailableError,
    singular: targetUnavailableError,
    selectedAfterFailures: 'true',
    recoveredTransform: 'matrix(2 0 0 2 5 6)',
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket07FirstHits()', {
    node: { type: 'node', nodeId: 'node-c', worldPoint: { x: 10, y: 10 } },
    edge: { type: 'edge', edgeId: 'edge-a', worldPoint: { x: 100, y: 20 } },
    canvas: { type: 'canvas', worldPoint: { x: 100, y: 100 } },
    outside: null,
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket07Tolerance()', {
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
    'globalThis.__cflowRendererSvgTicket08SetupPointer()',
  );
  await runAgentBrowser(['click', '#ticket-08-pointer-target']);
  const noModifiers = { alt: false, control: false, meta: false, shift: false };
  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket08ReadPointer()', [
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
  await runAgentBrowser(['eval', 'globalThis.__cflowRendererSvgTicket08TeardownPointer()', '--json']);

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket08WheelKeyboardPolicy()', {
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

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket09InputOrder()', {
    order: ['first:pointer.down', 'second:pointer.down', 'first:pointer.move', 'third:pointer.move'],
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket09Focus()', {
    addedTabIndex: '-1',
    active: true,
    scrollY: 0,
    restoredTabIndex: null,
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgInteractionFocusInput()', {
    inputTypes: ['focus.gained', 'focus.lost'],
  });

  await evaluateBrowserScenario('globalThis.__cflowRendererSvgTicket09SetupCapture()');
  await dispatchCapturedPointerSequence();
  const invalidPointer = (pointerId: number) => ({
    name: 'RendererError',
    domain: 'renderer',
    code: 'INVALID_POINTER',
    details: { pointerId },
  });
  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket09ReadCapture()', {
    unknownBefore: invalidPointer(999),
    sawDown: true,
    sawOutsideMove: true,
    sawUp: true,
    capturedDuringDown: true,
    capturedDuringUp: true,
    capturedAfterUp: false,
    afterUpError: invalidPointer(1),
  });
  await runAgentBrowser(['eval', 'globalThis.__cflowRendererSvgTicket09TeardownCapture()', '--json']);

  await evaluateBrowserScenario('globalThis.__cflowRendererSvgReviewSetupPointerCleanup()');
  await dispatchFaultedPointerCleanupSequence();
  const targetUnavailable = {
    name: 'SvgRendererError',
    domain: 'renderer.svg',
    code: 'TARGET_UNAVAILABLE',
    details: {},
  };
  await assertBrowserScenario('globalThis.__cflowRendererSvgReviewReadPointerCleanup()', {
    nativeError: targetUnavailable,
    capturedAfterFailedUp: false,
    captureAfterFailedUp: invalidPointer(1),
    releaseAfterFailedUp: invalidPointer(1),
    recapturedOnNextDown: true,
    capturedAfterNextUp: false,
    captureAfterNextUp: invalidPointer(1),
  });
  await evaluateBrowserScenario('globalThis.__cflowRendererSvgReviewTeardownPointerCleanup()');

  await evaluateBrowserScenario('globalThis.__cflowRendererSvgReviewSetupPointerCleanup(true)');
  await dispatchFaultedPointerCleanupSequence(false);
  await assertBrowserScenario('globalThis.__cflowRendererSvgReviewFinishPointerDoubleFailure()', {
    aggregateName: 'AggregateError',
    aggregateMessage: 'SVG Renderer Pointer handling and cleanup both failed.',
    aggregateErrorCount: 2,
    handlingError: targetUnavailable,
    includesCleanupError: true,
    captureAfterFailedUp: invalidPointer(1),
    releaseAfterFailedUp: invalidPointer(1),
    reservationReusable: true,
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket09InputFaults()', {
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
  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket10DisposeLifecycle()', {
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

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket10DisposeFailure()', {
    aggregateName: 'AggregateError',
    aggregateMessage: 'SVG Renderer cleanup failed.',
    aggregateErrorCount: 2,
    includesListenerError: true,
    includesProjectionError: true,
    tabIndexRestored: true,
    projectionRetained: true,
    reservationError: targetOccupied,
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket11RuntimeIntegration()', {
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

  await evaluateBrowserScenario('globalThis.__cflowRendererSvgTicket11SetupRuntimeCapture()');
  await dispatchCapturedPointerSequence();
  await assertBrowserScenario('globalThis.__cflowRendererSvgTicket11ReadRuntimeCapture()', {
    capturedThroughService: true,
    sawOutsideMove: true,
    capturedDuringUp: true,
    releasedThroughService: true,
    capturedAfterUp: false,
  });
  await evaluateBrowserScenario('globalThis.__cflowRendererSvgTicket11TeardownRuntimeCapture()');

  await assertBrowserScenario('globalThis.__cflowRendererSvgReviewTargetAtomicCommit()', {
    error: {
      name: 'SvgRendererError',
      domain: 'renderer.svg',
      code: 'TARGET_UNAVAILABLE',
      details: {},
    },
    xAfterRejection: '10',
    recoveredX: '30',
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgReviewOperationRefresh()', {
    before: 'matrix(1 0 0 1 0 0)',
    afterHitTest: 'matrix(0.5 0 0 0.5 0 0)',
    afterInput: 'matrix(0.25 0 0 0.25 0 0)',
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgReviewOwnerRealm()', {
    nodeId: 'iframe-node',
    projectionClass: 'cflow-renderer-svg',
  });

  const invalidConfig = (field: string) => ({
    name: 'SvgRendererError',
    domain: 'renderer.svg',
    code: 'INVALID_CONFIG',
    details: { field },
  });
  await assertBrowserScenario('globalThis.__cflowRendererSvgReviewUnknownConfig()', {
    root: invalidConfig('surprise'),
    input: invalidConfig('input.surprise'),
    policy: invalidConfig('input.pointer.surprise'),
    targetUnchanged: true,
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgReviewMalformedUpdates()', {
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
  await assertBrowserScenario('globalThis.__cflowRendererSvgReviewMalformedChangeEvidence()', {
    nodePosition: rejectedCommitEvidence,
    edgeSource: rejectedCommitEvidence,
    missingNodeData: rejectedCommitEvidence,
    missingEdgeData: rejectedCommitEvidence,
    emptyChanges: rejectedCommitEvidence,
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgReviewCommitSessionRollback()', {
    sameErrorIdentity: true,
    rollbackX: '10',
    rollbackTransform: 'matrix(2 0 0 2 10 20)',
    recoveredX: '30',
    recoveredTransform: 'matrix(1 0 0 1 5 10)',
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgReviewResetAtomicity()', {
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

  await assertBrowserScenario('globalThis.__cflowRendererSvgReviewResizeObserverError()', {
    sameErrorIdentity: true,
    rollbackTransform: 'matrix(0.5 0 0 0.5 0 0)',
    successfulResizeTransform: 'matrix(0.666666666667 0 0 0.5 0 0)',
    recoveredTransform: 'matrix(0.666666666667 0 0 0.5 0 0)',
  });

  await assertBrowserScenario('globalThis.__cflowRendererSvgReviewResizeObserverRollbackFailure()', {
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

  await assertBrowserScenario('globalThis.__cflowRendererSvgReviewResizeObserverMultipleErrors()', {
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
    await evaluateBrowserScenario('globalThis.__cflowRendererSvgReviewMakePointerTargetSingular()');
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: 350,
      y: 50,
      button: 'left',
      buttons: 0,
      clickCount: 1,
    });
    await evaluateBrowserScenario('globalThis.__cflowRendererSvgReviewFinishFaultedPointerUp()');
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
