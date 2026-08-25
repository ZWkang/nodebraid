import assert from 'node:assert/strict';
import { extname, resolve, sep } from 'node:path';

interface AgentBrowserJson<Result> {
  readonly success: boolean;
  readonly data: Readonly<{ result: Result }> | null;
  readonly error: unknown;
}

const applicationRoot = resolve(import.meta.dir, '..');
const repositoryRoot = resolve(applicationRoot, '../..');
const distributionRoot = resolve(applicationRoot, 'dist');
const distributionPrefix = `${distributionRoot}${sep}`;
const index = Bun.file(resolve(distributionRoot, 'index.html'));
const agentBrowser = resolve(repositoryRoot, 'node_modules/.bin/agent-browser');
const session = `nodebraid-basic-svg-example-${process.pid}`;

assert.equal(await index.exists(), true, 'Expected the Examples Application production build.');

const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    const url = new URL(request.url);
    const relativePath = decodeURIComponent(url.pathname.replace(/^\//, ''));
    const candidate = resolve(distributionRoot, relativePath);
    if (candidate !== distributionRoot && candidate.startsWith(distributionPrefix) && extname(candidate)) {
      const file = Bun.file(candidate);
      if (await file.exists()) return new Response(file);
    }
    return new Response(index, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  },
});

try {
  await runAgentBrowser(['open', `${server.url.origin}/basic-svg?lang=en`]);
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
    controls: ['Undo', 'Redo', 'Zoom in', 'Zoom out', 'Fit view', 'Reset view', 'Reset example'],
    metrics: {
      revision: '1',
      nodes: '3',
      edges: '1',
      selection: 'None',
      zoom: '1.00×',
      history: 'Undo / —',
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
  await runAgentBrowser(['click', '[aria-label="Switch to English"]']);
  assert.deepEqual(await waitForPageCopy({ heading: 'Basic SVG Canvas', firstControl: 'Undo', lang: 'en' }), {
    heading: 'Basic SVG Canvas',
    firstControl: 'Undo',
    lang: 'en',
  });

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

  await runAgentBrowser(['click', '[aria-label="Reset example"]']);
  assert.deepEqual(await waitForMetrics({ revision: '1', nodes: '3', edges: '1', history: 'Undo / —' }), {
    revision: '1',
    nodes: '3',
    edges: '1',
    history: 'Undo / —',
  });
  assert.equal(await evaluateBrowserScenario(`document.querySelectorAll('[data-nodebraid-node-id]').length`), 3);

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
      return { x: node?.getAttribute('x'), y: node?.getAttribute('y') };
    })()`),
    { x: '140', y: '140' },
  );

  await evaluateBrowserScenario(`new Promise((resolve) => {
    document.querySelector('.canvas-frame')?.scrollIntoView({ block: 'start' });
    requestAnimationFrame(() => resolve(true));
  })`);
  const sourceAnchor = await readElementCenter(
    '[data-nodebraid-connection-anchor-node-id="example-compose"][data-nodebraid-connection-anchor-role="source"]',
  );
  const targetAnchor = await readElementCenter(
    '[data-nodebraid-connection-anchor-node-id="example-ship"][data-nodebraid-connection-anchor-role="target"]',
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
} finally {
  await runAgentBrowser(['close']);
  await server.stop(true);
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

type PageCdpSend = (method: string, params?: Readonly<Record<string, unknown>>) => Promise<unknown>;

async function withExamplePageCdp(run: (send: PageCdpSend) => Promise<void>): Promise<void> {
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
    assert.ok(page, 'Expected the Examples Application CDP page target.');
    const attachment = (await send('Target.attachToTarget', {
      targetId: page.targetId,
      flatten: true,
    })) as Readonly<{ sessionId: string }>;
    await run((method, params = {}) => send(method, params, attachment.sessionId));
  } finally {
    socket.close();
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
          reject(new Error('Metrics did not reach ' + JSON.stringify(expected) + '; actual=' + JSON.stringify(actual)));
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

function processEnv(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}
