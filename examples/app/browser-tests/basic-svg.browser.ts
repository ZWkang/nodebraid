import assert from 'node:assert/strict';
import { resolve } from 'node:path';

import {
  CdpClient,
  createAgentBrowserRunner,
  createProductionAppServer,
  readAgentBrowserCdpUrl,
  type CdpSend,
} from './browser-test-harness';

interface AgentBrowserJson<Result> {
  readonly success: boolean;
  readonly data: Readonly<{ result: Result }> | null;
  readonly error: unknown;
}

const applicationRoot = resolve(import.meta.dir, '..');
const repositoryRoot = resolve(applicationRoot, '../..');
const agentBrowser = resolve(repositoryRoot, 'node_modules/.bin/agent-browser');
const session = `nodebraid-basic-svg-example-${process.pid}`;
const runAgentBrowser = createAgentBrowserRunner(agentBrowser, repositoryRoot, session);

const server = await createProductionAppServer(applicationRoot);

try {
  await runAgentBrowser(['open', `${server.url.origin}/basic-svg?lang=en`]);
  await runAgentBrowser(['set', 'viewport', '1280', '960']);
  const result = await evaluateBrowserScenario(`
    new Promise((resolve, reject) => {
      const deadline = Date.now() + 5000;
      const read = () => {
        const status = document.querySelector('[data-example-status]')?.getAttribute('data-example-status');
        if (status === 'ready') {
          resolve({
            heading: document.querySelector('h1')?.textContent,
            status,
            nodeCount: document.querySelectorAll('[data-nodebraid-node-id]').length,
            controls: Array.from(document.querySelectorAll('[data-example-control]'), (element) =>
              element.getAttribute('aria-label'),
            ),
            metrics: Object.fromEntries(
              Array.from(document.querySelectorAll('[data-example-metric]'), (element) => [
                element.getAttribute('data-example-metric'),
                element.textContent,
              ]),
            ),
          });
          return;
        }
        if (Date.now() >= deadline) {
          reject(new Error('Examples Application did not become ready.'));
          return;
        }
        setTimeout(read, 25);
      };
      read();
    })
  `);
  assert.deepEqual(result, {
    heading: 'Basic SVG Canvas',
    status: 'ready',
    nodeCount: 3,
    controls: [
      'Undo',
      'Redo',
      'Auto layout',
      'Zoom in',
      'Zoom out',
      'Fit view',
      'Reset view',
      'Export document',
      'Import document',
      'Reset example',
      'Disable clipboard shortcuts',
      'Disable duplicate shortcut',
    ],
    metrics: {
      revision: '1',
      nodes: '3',
      edges: '1',
      selection: 'None',
      zoom: '1.00×',
      history: 'Undo / —',
      'clipboard-failure': 'None',
    },
  });

  assert.deepEqual(
    await evaluateBrowserScenario(`Array.from(document.querySelectorAll('[data-site-navigation] a'), (link) => ({
      label: link.textContent,
      id: link.getAttribute('data-site-navigation-item'),
      target: link.origin === location.origin ? link.pathname + link.search : link.href,
    }))`),
    [
      { id: 'documentation', label: 'Documentation', target: 'https://zwkang.github.io/nodebraid/en/' },
      {
        id: 'capabilities',
        label: 'Capabilities',
        target: 'https://zwkang.github.io/nodebraid/en/capabilities/',
      },
      { id: 'modules', label: 'Modules', target: 'https://zwkang.github.io/nodebraid/en/modules/' },
      { id: 'interactive-example', label: 'Interactive Example', target: '/basic-svg?lang=en' },
      { id: 'github', label: 'GitHub', target: 'https://github.com/ZWkang/nodebraid' },
    ],
  );
  await runAgentBrowser(['click', '[aria-label="切换到中文"]']);
  assert.deepEqual(await waitForPageCopy({ heading: '基础 SVG 画布', firstControl: '撤销', lang: 'zh' }), {
    heading: '基础 SVG 画布',
    firstControl: '撤销',
    lang: 'zh',
  });
  assert.equal(await evaluateBrowserScenario(`document.querySelector('[aria-label="自动布局"]') !== null`), true);
  await runAgentBrowser(['click', '[aria-label="Switch to English"]']);
  assert.deepEqual(await waitForPageCopy({ heading: 'Basic SVG Canvas', firstControl: 'Undo', lang: 'en' }), {
    heading: 'Basic SVG Canvas',
    firstControl: 'Undo',
    lang: 'en',
  });

  await runAgentBrowser(['click', '[data-nodebraid-node-id="example-discover"]']);
  await runAgentBrowser(['click', '[aria-label="Zoom out"]']);
  await waitForMetrics({ revision: '1', selection: 'example-discover', zoom: '0.83×' });
  const beforeLayout = await readLayoutState();
  assert.ok(beforeLayout.transform, 'Expected the public SVG Viewport transform.');
  assert.deepEqual(beforeLayout.positions, {
    'example-compose': { x: 360, y: 260 },
    'example-discover': { x: 80, y: 100 },
    'example-ship': { x: 660, y: 120 },
  });
  await runAgentBrowser(['click', '[aria-label="Auto layout"]']);
  await waitForMetrics({ revision: '2', nodes: '3', edges: '1', selection: 'example-discover', zoom: '0.83×' });
  const afterLayout = await readLayoutState();
  assert.notDeepEqual(afterLayout.positions, beforeLayout.positions);
  assert.deepEqual(Object.keys(afterLayout.positions), Object.keys(beforeLayout.positions));
  assert.ok(afterLayout.positions['example-compose']!.x > afterLayout.positions['example-discover']!.x);
  assert.equal(afterLayout.transform, beforeLayout.transform);
  assert.deepEqual(afterLayout.edgeIds, beforeLayout.edgeIds);
  await assertEdgeAtPorts('example-initial-edge', 'example-discover', 'example-compose');

  await runAgentBrowser(['click', '[aria-label="Auto layout"]']);
  await waitForMetrics({ revision: '2', history: 'Undo / —' });
  assert.deepEqual(await readLayoutState(), afterLayout);
  await runAgentBrowser(['click', '[aria-label="Undo"]']);
  await waitForMetrics({ revision: '3', selection: 'example-discover', zoom: '0.83×' });
  assert.deepEqual(await readLayoutState(), beforeLayout);
  await assertEdgeAtPorts('example-initial-edge', 'example-discover', 'example-compose');
  await runAgentBrowser(['click', '[aria-label="Redo"]']);
  await waitForMetrics({ revision: '4', selection: 'example-discover', zoom: '0.83×' });
  assert.deepEqual(await readLayoutState(), afterLayout);
  await assertEdgeAtPorts('example-initial-edge', 'example-discover', 'example-compose');

  await evaluateBrowserScenario(`new Promise((resolve) => {
    document.querySelector('.canvas-frame')?.scrollIntoView({ block: 'start' });
    requestAnimationFrame(() => resolve(true));
  })`);
  const movedSourcePort = await readElementCenter(
    '[data-nodebraid-port-node-id="example-compose"][data-nodebraid-port-id="output"]',
  );
  const movedTargetPort = await readElementCenter(
    '[data-nodebraid-port-node-id="example-ship"][data-nodebraid-port-id="input"]',
  );
  await dispatchMouseDown(movedSourcePort.x, movedSourcePort.y);
  await dispatchMouseMove(movedTargetPort.x, movedTargetPort.y);
  await dispatchMouseUp(movedTargetPort.x, movedTargetPort.y);
  await waitForMetrics({ revision: '5', nodes: '3', edges: '2' });
  assert.deepEqual((await readLayoutState()).positions, afterLayout.positions);
  await assertEdgeAtPorts('example-edge-1', 'example-compose', 'example-ship');
  await evaluateBrowserScenario(`new Promise((resolve) => {
    window.scrollTo(0, 0);
    requestAnimationFrame(() => resolve(true));
  })`);
  await runAgentBrowser(['click', '[aria-label="Reset example"]']);
  await waitForMetrics({ revision: '1', nodes: '3', edges: '1', selection: 'None', zoom: '1.00×' });

  await runAgentBrowser(['click', '[aria-label="Zoom in"]']);
  assert.deepEqual(await waitForMetrics({ zoom: '1.20×' }), { zoom: '1.20×' });
  await runAgentBrowser(['click', '[aria-label="Reset view"]']);
  assert.deepEqual(await waitForMetrics({ zoom: '1.00×' }), { zoom: '1.00×' });

  await runAgentBrowser(['click', '[aria-label="Undo"]']);
  assert.deepEqual(await waitForMetrics({ revision: '2', nodes: '0', edges: '0', history: '— / Redo' }), {
    revision: '2',
    nodes: '0',
    edges: '0',
    history: '— / Redo',
  });
  assert.deepEqual(await readHistoryControls(), { undoDisabled: true, redoDisabled: false });

  await runAgentBrowser(['click', '[aria-label="Redo"]']);
  assert.deepEqual(await waitForMetrics({ revision: '3', nodes: '3', edges: '1', history: 'Undo / —' }), {
    revision: '3',
    nodes: '3',
    edges: '1',
    history: 'Undo / —',
  });

  await evaluateBrowserScenario(`(() => {
    const target = document.querySelector('.canvas-target');
    const projection = target?.querySelector(':scope > [data-nodebraid-renderer-svg-root]');
    if (!(target instanceof SVGSVGElement) || !(projection instanceof SVGGElement)) {
      throw new Error('Missing mounted SVG Runtime before React Adapter remount.');
    }
    globalThis.__nodebraidReactAdapterTarget = target;
    globalThis.__nodebraidReactAdapterProjection = projection;
    globalThis.__nodebraidReactAdapterMutations = { added: 0, removed: 0 };
    globalThis.__nodebraidReactAdapterObserver = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof SVGGElement && node.hasAttribute('data-nodebraid-renderer-svg-root')) {
            globalThis.__nodebraidReactAdapterMutations.added += 1;
          }
        }
        for (const node of record.removedNodes) {
          if (node instanceof SVGGElement && node.hasAttribute('data-nodebraid-renderer-svg-root')) {
            globalThis.__nodebraidReactAdapterMutations.removed += 1;
          }
        }
      }
    });
    globalThis.__nodebraidReactAdapterObserver.observe(target, { childList: true });
    return true;
  })()`);
  await runAgentBrowser(['click', '[aria-label="Reset example"]']);
  assert.deepEqual(await waitForMetrics({ revision: '1', nodes: '3', edges: '1', history: 'Undo / —' }), {
    revision: '1',
    nodes: '3',
    edges: '1',
    history: 'Undo / —',
  });
  assert.equal(await evaluateBrowserScenario(`document.querySelectorAll('[data-nodebraid-node-id]').length`), 3);
  assert.deepEqual(
    await evaluateBrowserScenario(`(() => {
      globalThis.__nodebraidReactAdapterObserver.disconnect();
      const target = document.querySelector('.canvas-target');
      return {
        sameTarget: target === globalThis.__nodebraidReactAdapterTarget,
        oldProjectionConnected: globalThis.__nodebraidReactAdapterProjection.isConnected,
        projectionCount: target?.querySelectorAll(':scope > [data-nodebraid-renderer-svg-root]').length,
        mutations: globalThis.__nodebraidReactAdapterMutations,
      };
    })()`),
    {
      sameTarget: true,
      oldProjectionConnected: false,
      projectionCount: 1,
      mutations: { added: 1, removed: 1 },
    },
  );

  await runAgentBrowser(['click', '[data-nodebraid-node-id="example-discover"]']);
  await evaluateBrowserScenario(`(() => {
    globalThis.__nodebraidDuplicateKey = { trusted: false, defaultPrevented: false };
    document.querySelector('.canvas-target')?.addEventListener('keydown', (event) => {
      if (event.code === 'KeyD' && event.metaKey) {
        globalThis.__nodebraidDuplicateKey = {
          trusted: event.isTrusted,
          defaultPrevented: event.defaultPrevented,
        };
      }
    }, { once: true });
    return true;
  })()`);
  await dispatchDuplicateKey();
  assert.deepEqual(await evaluateBrowserScenario('globalThis.__nodebraidDuplicateKey'), {
    trusted: true,
    defaultPrevented: true,
  });
  assert.deepEqual(
    await waitForMetrics({ revision: '2', nodes: '4', edges: '1', selection: 'example-duplicate-node-1' }),
    { revision: '2', nodes: '4', edges: '1', selection: 'example-duplicate-node-1' },
  );
  await clickExampleControl('Undo');
  assert.deepEqual(await waitForMetrics({ revision: '3', nodes: '3', selection: 'None' }), {
    revision: '3',
    nodes: '3',
    selection: 'None',
  });
  await clickExampleControl('Redo');
  assert.deepEqual(await waitForMetrics({ revision: '4', nodes: '4', selection: 'None' }), {
    revision: '4',
    nodes: '4',
    selection: 'None',
  });
  await clickExampleControl('Disable duplicate shortcut');
  await waitForControlDisabled('Disable duplicate shortcut');
  await evaluateBrowserScenario(`(() => {
    globalThis.__nodebraidReleasedDuplicateKey = { trusted: false, defaultPrevented: true };
    const target = document.querySelector('.canvas-target');
    target?.focus();
    target?.addEventListener('keydown', (event) => {
      if (event.code === 'KeyD' && event.metaKey) {
        globalThis.__nodebraidReleasedDuplicateKey = {
          trusted: event.isTrusted,
          defaultPrevented: event.defaultPrevented,
        };
      }
    }, { once: true });
    return true;
  })()`);
  await dispatchDuplicateKey();
  assert.deepEqual(await evaluateBrowserScenario('globalThis.__nodebraidReleasedDuplicateKey'), {
    trusted: true,
    defaultPrevented: false,
  });
  assert.deepEqual(await waitForMetrics({ revision: '4', nodes: '4', selection: 'None' }), {
    revision: '4',
    nodes: '4',
    selection: 'None',
  });
  await runAgentBrowser(['click', '[aria-label="Reset example"]']);
  assert.deepEqual(await waitForMetrics({ revision: '1', nodes: '3', edges: '1', selection: 'None' }), {
    revision: '1',
    nodes: '3',
    edges: '1',
    selection: 'None',
  });

  await runAgentBrowser(['click', '[aria-label="Fit view"]']);
  assert.equal(
    await evaluateBrowserScenario(`(() => {
      const target = document.querySelector('.canvas-target').getBoundingClientRect();
      return Array.from(document.querySelectorAll('[data-nodebraid-node-id]')).every((node) => {
        const bounds = node.getBoundingClientRect();
        return bounds.left >= target.left + 47 && bounds.right <= target.right - 47 &&
          bounds.top >= target.top + 47 && bounds.bottom <= target.bottom - 47;
      });
    })()`),
    true,
  );
  await runAgentBrowser(['click', '[aria-label="Reset view"]']);
  assert.deepEqual(await waitForMetrics({ zoom: '1.00×' }), { zoom: '1.00×' });

  const boxStart = await readCanvasPoint(40, 40);
  const boxEnd = await readCanvasPoint(550, 370);
  await dispatchMouseDown(boxStart.x, boxStart.y);
  await dispatchMouseMove(boxEnd.x, boxEnd.y);
  assert.deepEqual(
    await evaluateBrowserScenario(`(() => {
      const marquee = document.querySelector('[data-nodebraid-box-selection]');
      return marquee ? {
        x: marquee.getAttribute('x'),
        y: marquee.getAttribute('y'),
        width: marquee.getAttribute('width'),
        height: marquee.getAttribute('height'),
      } : null;
    })()`),
    { x: '40', y: '40', width: '510', height: '330' },
  );
  assert.deepEqual(await waitForMetrics({ revision: '1', selection: 'None' }), {
    revision: '1',
    selection: 'None',
  });
  await dispatchMouseUp(boxEnd.x, boxEnd.y);
  assert.deepEqual(
    await waitForMetrics({
      revision: '1',
      selection: 'example-compose, example-discover',
      history: 'Undo / —',
    }),
    {
      revision: '1',
      selection: 'example-compose, example-discover',
      history: 'Undo / —',
    },
  );
  assert.equal(await evaluateBrowserScenario(`document.querySelector('[data-nodebraid-box-selection]')`), null);

  await runAgentBrowser(['click', '[data-nodebraid-node-id="example-discover"]']);
  assert.deepEqual(await waitForMetrics({ selection: 'example-discover' }), { selection: 'example-discover' });

  const selectedNode = await readElementCenter('[data-nodebraid-node-id="example-discover"]');
  await dispatchMouseDown(selectedNode.x, selectedNode.y);
  await dispatchMouseMove(selectedNode.x + 60, selectedNode.y + 40);
  await dispatchMouseUp(selectedNode.x + 60, selectedNode.y + 40);
  assert.deepEqual(await waitForMetrics({ revision: '2', nodes: '3', edges: '1' }), {
    revision: '2',
    nodes: '3',
    edges: '1',
  });
  assert.deepEqual(
    await evaluateBrowserScenario(`(() => {
      const node = document.querySelector('[data-nodebraid-node-id="example-discover"]');
      const matrix = node.transform.baseVal.getItem(0).matrix;
      return { x: matrix.e, y: matrix.f };
    })()`),
    { x: 140, y: 140 },
  );

  await evaluateBrowserScenario(`new Promise((resolve) => {
    document.querySelector('.canvas-frame')?.scrollIntoView({ block: 'start' });
    requestAnimationFrame(() => resolve(true));
  })`);
  const sourceAnchor = await readElementCenter(
    '[data-nodebraid-port-node-id="example-compose"][data-nodebraid-port-id="output"][data-nodebraid-port-role="source"]',
  );
  const targetAnchor = await readElementCenter(
    '[data-nodebraid-port-node-id="example-ship"][data-nodebraid-port-id="input"][data-nodebraid-port-role="target"]',
  );
  await dispatchMouseDown(sourceAnchor.x, sourceAnchor.y);
  assert.equal(
    await evaluateBrowserScenario(`document.querySelector('.canvas-target')?.hasPointerCapture(1)`),
    true,
    'Expected source Connection Anchor pointerdown to capture the Gesture Pointer.',
  );
  await dispatchMouseMove(targetAnchor.x, targetAnchor.y);
  assert.equal(
    await evaluateBrowserScenario(`document.querySelectorAll('[data-nodebraid-connection-preview]').length`),
    1,
  );
  await dispatchMouseUp(targetAnchor.x, targetAnchor.y);
  assert.deepEqual(await waitForMetrics({ revision: '3', nodes: '3', edges: '2' }), {
    revision: '3',
    nodes: '3',
    edges: '2',
  });

  const deleteBoxStart = await readCanvasPoint(40, 40);
  const deleteBoxEnd = await readCanvasPoint(550, 370);
  await dispatchMouseDown(deleteBoxStart.x, deleteBoxStart.y);
  await dispatchMouseMove(deleteBoxEnd.x, deleteBoxEnd.y);
  await dispatchMouseUp(deleteBoxEnd.x, deleteBoxEnd.y);
  assert.deepEqual(await waitForMetrics({ selection: 'example-compose, example-discover' }), {
    selection: 'example-compose, example-discover',
  });
  assert.equal(
    await evaluateBrowserScenario(`(() => {
      const target = document.querySelector('.canvas-target');
      target?.focus();
      return document.activeElement === target;
    })()`),
    true,
    'Expected the SVG Renderer Target to own Focus before Delete.',
  );
  await evaluateBrowserScenario(`(() => {
    globalThis.__nodebraidDeleteKeyTrusted = false;
    document.querySelector('.canvas-target')?.addEventListener('keydown', (event) => {
      if (event.key === 'Delete' || event.code === 'Delete') {
        globalThis.__nodebraidDeleteKeyTrusted = event.isTrusted;
      }
    }, { once: true });
    return true;
  })()`);
  await dispatchDeleteKey();
  assert.equal(
    await evaluateBrowserScenario('globalThis.__nodebraidDeleteKeyTrusted'),
    true,
    'Expected Chromium to deliver a trusted Delete key event to the focused SVG Target.',
  );
  assert.deepEqual(
    await waitForMetrics({ revision: '4', nodes: '1', edges: '0', selection: 'None', history: 'Undo / —' }),
    { revision: '4', nodes: '1', edges: '0', selection: 'None', history: 'Undo / —' },
  );

  await clickExampleControl('Undo');
  assert.deepEqual(
    await waitForMetrics({ revision: '5', nodes: '3', edges: '2', selection: 'None', history: 'Undo / Redo' }),
    { revision: '5', nodes: '3', edges: '2', selection: 'None', history: 'Undo / Redo' },
  );
  await clickExampleControl('Redo');
  assert.deepEqual(
    await waitForMetrics({ revision: '6', nodes: '1', edges: '0', selection: 'None', history: 'Undo / —' }),
    { revision: '6', nodes: '1', edges: '0', selection: 'None', history: 'Undo / —' },
  );

  await evaluateBrowserScenario(`(() => {
    const target = document.querySelector('.canvas-target');
    if (!(target instanceof SVGSVGElement)) throw new Error('Missing SVG Target for mount failure test.');
    const expected = new Error('Expected React Adapter Runtime Factory failure.');
    globalThis.__nodebraidExpectedMountFailure = expected;
    globalThis.__nodebraidReportedMountFailure = false;
    addEventListener('error', (event) => {
      if (event.error === expected) {
        globalThis.__nodebraidReportedMountFailure = true;
        event.preventDefault();
      }
    });
    Object.defineProperty(target, 'append', {
      configurable: true,
      value() {
        delete target.append;
        throw expected;
      },
    });
    return true;
  })()`);
  await clickExampleControl('Reset example');
  assert.deepEqual(
    await evaluateBrowserScenario(`new Promise((resolve, reject) => {
      const deadline = Date.now() + 5000;
      const read = () => {
        const status = document.querySelector('[data-example-status]')?.getAttribute('data-example-status');
        const reported = globalThis.__nodebraidReportedMountFailure;
        if (status === 'failed' && reported) {
          resolve({
            status,
            reported,
            projectionCount: document.querySelectorAll('[data-nodebraid-renderer-svg-root]').length,
            message: document.querySelector('[role="alert"]')?.textContent,
          });
          return;
        }
        if (Date.now() >= deadline) {
          reject(new Error('React Adapter Runtime Factory failure was not exposed.'));
          return;
        }
        setTimeout(read, 25);
      };
      read();
    })`),
    {
      status: 'failed',
      reported: true,
      projectionCount: 0,
      message: 'Runtime errorExpected React Adapter Runtime Factory failure.',
    },
  );
} finally {
  await runAgentBrowser(['close']);
  await server.stop(true);
}

async function readLayoutState(): Promise<
  Readonly<{
    positions: Readonly<Record<string, Readonly<{ x: number; y: number }>>>;
    transform: string | null;
    edgeIds: readonly string[];
  }>
> {
  return evaluateBrowserScenario(`({
    positions: Object.fromEntries(Array.from(document.querySelectorAll('[data-nodebraid-node-id]'), (node) => [
      node.getAttribute('data-nodebraid-node-id'),
      { x: node.transform.baseVal.getItem(0).matrix.e, y: node.transform.baseVal.getItem(0).matrix.f },
    ])),
    transform: document.querySelector('[data-nodebraid-renderer-svg-root]')?.getAttribute('transform') ?? null,
    edgeIds: Array.from(document.querySelectorAll('[data-nodebraid-edge-id]'), (edge) =>
      edge.getAttribute('data-nodebraid-edge-id')),
  })`);
}

async function assertEdgeAtPorts(edgeId: string, sourceNodeId: string, targetNodeId: string): Promise<void> {
  const points = await evaluateBrowserScenario<{ edge: readonly number[]; ports: readonly number[] }>(`(() => {
    const read = (selector, attributes) => {
      const element = document.querySelector(selector);
      if (!element) throw new Error('Missing connection projection: ' + selector);
      return attributes.map((attribute) => {
        const value = element.getAttribute(attribute);
        if (value === null) throw new Error('Missing connection attribute: ' + attribute);
        return Number(value);
      });
    };
    return {
      edge: read(${JSON.stringify(`[data-nodebraid-edge-id="${edgeId}"]`)}, ['x1', 'y1', 'x2', 'y2']),
      ports: [
        ...read(${JSON.stringify(`[data-nodebraid-port-node-id="${sourceNodeId}"][data-nodebraid-port-id="output"]`)}, ['cx', 'cy']),
        ...read(${JSON.stringify(`[data-nodebraid-port-node-id="${targetNodeId}"][data-nodebraid-port-id="input"]`)}, ['cx', 'cy']),
      ],
    };
  })()`);
  assert.ok([...points.edge, ...points.ports].every(Number.isFinite));
  assert.deepEqual(points.edge, points.ports);
}

async function readElementCenter(selector: string): Promise<Readonly<{ x: number; y: number }>> {
  return evaluateBrowserScenario(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) throw new Error('Missing browser-test element: ' + ${JSON.stringify(selector)});
    const bounds = element.getBoundingClientRect();
    return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
  })()`);
}

async function readCanvasPoint(x: number, y: number): Promise<Readonly<{ x: number; y: number }>> {
  return evaluateBrowserScenario(`(() => {
    const target = document.querySelector('.canvas-target');
    if (!target) throw new Error('Missing Examples Application Canvas Target.');
    const bounds = target.getBoundingClientRect();
    return { x: bounds.left + ${x}, y: bounds.top + ${y} };
  })()`);
}

async function dispatchMouseDown(x: number, y: number): Promise<void> {
  await withExamplePageCdp(async (send) => {
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

async function dispatchMouseMove(x: number, y: number): Promise<void> {
  await withExamplePageCdp(async (send) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1 });
  });
}

async function dispatchMouseUp(x: number, y: number): Promise<void> {
  await withExamplePageCdp(async (send) => {
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

async function dispatchDeleteKey(): Promise<void> {
  await withExamplePageCdp(async (send) => {
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'Delete',
      code: 'Delete',
      windowsVirtualKeyCode: 46,
    });
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Delete',
      code: 'Delete',
      windowsVirtualKeyCode: 46,
    });
  });
}

async function dispatchDuplicateKey(): Promise<void> {
  await withExamplePageCdp(async (send) => {
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'd',
      code: 'KeyD',
      modifiers: 4,
      windowsVirtualKeyCode: 68,
    });
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'd',
      code: 'KeyD',
      modifiers: 4,
      windowsVirtualKeyCode: 68,
    });
  });
}

async function clickExampleControl(label: string): Promise<void> {
  await evaluateBrowserScenario(`(() => {
    const control = document.querySelector('[aria-label="${label}"]');
    if (!(control instanceof HTMLButtonElement)) throw new Error('Missing Example control: ${label}');
    control.click();
    return true;
  })()`);
}

async function waitForControlDisabled(label: string): Promise<void> {
  await evaluateBrowserScenario(`
    new Promise((resolve, reject) => {
      const deadline = Date.now() + 5000;
      const read = () => {
        const control = document.querySelector('[aria-label="${label}"]');
        if (control instanceof HTMLButtonElement && control.disabled) {
          resolve(true);
          return;
        }
        if (Date.now() >= deadline) {
          reject(new Error('Example control did not become disabled: ${label}'));
          return;
        }
        setTimeout(read, 25);
      };
      read();
    })
  `);
}

async function withExamplePageCdp(run: (sendPage: CdpSend) => Promise<void>): Promise<void> {
  const client = await CdpClient.connect(await readAgentBrowserCdpUrl(runAgentBrowser));
  try {
    const targetResult = (await client.send('Target.getTargets')) as Readonly<{
      targetInfos: readonly Readonly<{ targetId: string; type: string; url: string; browserContextId?: string }>[];
    }>;
    const page = targetResult.targetInfos.find(
      (targetInfo) => targetInfo.type === 'page' && targetInfo.url.startsWith(server.url.origin),
    );
    assert.ok(page, 'Expected the Examples Application CDP page target.');
    const attachment = (await client.send('Target.attachToTarget', {
      targetId: page.targetId,
      flatten: true,
    })) as Readonly<{ sessionId: string }>;
    await run((method, params = {}) => client.send(method, params, attachment.sessionId));
  } finally {
    client.close();
  }
}

async function waitForPageCopy(
  expected: Readonly<{ heading: string; firstControl: string; lang: string }>,
): Promise<Readonly<{ heading: string | null; firstControl: string | null; lang: string | null }>> {
  return evaluateBrowserScenario(`
    new Promise((resolve, reject) => {
      const expected = ${JSON.stringify(expected)};
      const deadline = Date.now() + 5000;
      const read = () => {
        const actual = {
          heading: document.querySelector('h1')?.textContent ?? null,
          firstControl: document.querySelector('[data-example-control]')?.getAttribute('aria-label') ?? null,
          lang: new URL(location.href).searchParams.get('lang'),
        };
        if (Object.entries(expected).every(([name, value]) => actual[name] === value)) {
          resolve(actual);
          return;
        }
        if (Date.now() >= deadline) {
          reject(new Error('Page copy did not reach ' + JSON.stringify(expected) + '; actual=' + JSON.stringify(actual)));
          return;
        }
        setTimeout(read, 25);
      };
      read();
    })
  `);
}

async function readHistoryControls(): Promise<Readonly<{ undoDisabled: boolean; redoDisabled: boolean }>> {
  return evaluateBrowserScenario(`({
    undoDisabled: document.querySelector('[aria-label="Undo"]')?.disabled,
    redoDisabled: document.querySelector('[aria-label="Redo"]')?.disabled,
  })`);
}

async function waitForMetrics(expected: Readonly<Record<string, string>>): Promise<Readonly<Record<string, string>>> {
  return evaluateBrowserScenario(`
    new Promise((resolve, reject) => {
      const expected = ${JSON.stringify(expected)};
      const deadline = Date.now() + 5000;
      const read = () => {
        const actual = Object.fromEntries(Object.keys(expected).map((name) => [
          name,
          document.querySelector('[data-example-metric="' + name + '"]')?.textContent,
        ]));
        if (Object.entries(expected).every(([name, value]) => actual[name] === value)) {
          resolve(actual);
          return;
        }
        if (Date.now() >= deadline) {
          reject(new Error(
            'Metrics did not reach ' + JSON.stringify(expected) +
            '; actual=' + JSON.stringify(actual) +
            '; url=' + location.href +
            '; status=' + document.querySelector('main')?.getAttribute('data-example-status') +
            '; body=' + document.body.innerText.slice(0, 1000)
          ));
          return;
        }
        setTimeout(read, 25);
      };
      read();
    })
  `);
}

async function evaluateBrowserScenario<Result = unknown>(expression: string): Promise<Result> {
  const output = await runAgentBrowser(['eval', expression, '--json']);
  const response = JSON.parse(output) as AgentBrowserJson<Result>;
  assert.equal(response.success, true, JSON.stringify(response.error));
  assert.ok(response.data, `Browser scenario returned no data: ${expression}`);
  return response.data.result;
}
