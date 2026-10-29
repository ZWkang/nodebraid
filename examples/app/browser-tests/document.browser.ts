import assert from 'node:assert/strict';
import { appendFile, mkdir, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  CdpClient,
  createAgentBrowserRunner,
  createProductionAppServer,
  downloadBrowserFile,
  readAgentBrowserCdpUrl,
} from './browser-test-harness';

const applicationRoot = resolve(import.meta.dir, '..');
const repositoryRoot = resolve(applicationRoot, '../..');
await mkdir(resolve(repositoryRoot, '.tmp'), { recursive: true });
const evidence = await mkdtemp(resolve(repositoryRoot, '.tmp/document-browser-'));
const config = resolve(evidence, 'browser-config.json');
await Bun.write(config, '{}\n');
const environment = Object.fromEntries(
  Object.entries(process.env).filter(
    (entry): entry is [string, string] => entry[1] !== undefined && !entry[0].startsWith('AGENT_BROWSER_'),
  ),
);
const runBrowser = createAgentBrowserRunner(
  resolve(repositoryRoot, 'node_modules/.bin/agent-browser'),
  repositoryRoot,
  `nodebraid-document-example-${process.pid}`,
  environment,
);
const browser = async (args: readonly string[]) => {
  const output = await runBrowser(['--config', config, ...args]);
  await appendFile(resolve(evidence, 'actions.log'), `${JSON.stringify(args)}\n${output}\n`);
  return output;
};
const server = await createProductionAppServer(applicationRoot);
let client: CdpClient | undefined;
let page: string | undefined;
let browserContextId: string | undefined;
let downloadSequence = 0;

const businessData = { label: 'Discover requirements', tags: ['saved', '中文'] };
const fixture = {
  type: 'nodebraid/document',
  version: 1,
  dataFormat: 'nodebraid.examples/data-v1',
  nodes: [
    node('example-discover', 80, 100, businessData),
    node('example-compose', 360, 260, { label: 'Compose', tags: [] }),
    node('example-ship', 660, 120, null),
    { ...node('example-duplicate-node-1', 80, 460, null), parentId: 'example-discover' },
    node('example-clipboard-node-1', 660, 460, null),
  ].sort((left, right) => left.id.localeCompare(right.id)),
  edges: [
    edge('example-initial-edge', 'example-discover', 'example-compose', { label: 'Flow', tags: ['edge'] }),
    edge('example-edge-1', 'example-discover', 'example-ship', null),
    edge('example-duplicate-edge-1', 'example-ship', 'example-duplicate-node-1', null),
    edge('example-clipboard-edge-1', 'example-ship', 'example-clipboard-node-1', null),
  ].sort((left, right) => left.id.localeCompare(right.id)),
};

try {
  await browser(['open', `${server.url.origin}/basic-svg?lang=en`]);
  await browser(['set', 'viewport', '1280', '960']);
  await waitForMetrics({ nodes: '3', edges: '1', history: 'Undo / —' });
  assert.equal(await evaluate(`document.querySelector('[aria-label="Document file"]')?.type`), 'file');
  await attachPage();
  const initial = await download('initial');
  assert.deepEqual(Object.keys(initial.document).sort(), ['dataFormat', 'edges', 'nodes', 'type', 'version']);
  assert.equal(initial.document.type, 'nodebraid/document');
  assert.equal(initial.document.dataFormat, 'nodebraid.examples/data-v1');
  assert.equal(initial.document.nodes.length, 3);

  await client!.send('Browser.setPermission', {
    permission: { name: 'clipboard-read' },
    setting: 'granted',
    origin: server.url.origin,
  });
  await client!.send('Browser.setPermission', {
    permission: { name: 'clipboard-write' },
    setting: 'granted',
    origin: server.url.origin,
  });

  const fixturePath = resolve(evidence, 'business-document.json');
  await Bun.write(fixturePath, JSON.stringify(fixture));
  await browser(['upload', '[aria-label="Document file"]', fixturePath]);
  await waitForMetrics({ nodes: '5', edges: '4', history: '— / —' });
  const saved = await download('business-saved');
  assert.deepEqual(saved.document, fixture);

  await browser(['reload']);
  await waitForMetrics({ revision: '1', nodes: '3', edges: '1', history: 'Undo / —' });
  await browser(['click', '[data-nodebraid-node-id="example-discover"]']);
  await browser(['click', '[aria-label="Zoom out"]']);
  await waitForMetrics({ selection: 'example-discover', zoom: '0.83×' });
  const viewport = await evaluate(
    `document.querySelector('[data-nodebraid-renderer-svg-root]')?.getAttribute('transform')`,
  );
  await evaluate(`globalThis.__documentProjection = document.querySelector('[data-nodebraid-renderer-svg-root]')`);
  await browser(['upload', '[aria-label="Document file"]', saved.path]);
  await waitForMetrics({ nodes: '5', edges: '4', history: '— / —', selection: 'example-discover', zoom: '0.83×' });
  assert.equal(
    await evaluate(`globalThis.__documentProjection === document.querySelector('[data-nodebraid-renderer-svg-root]')`),
    true,
  );
  assert.equal(
    await evaluate(`document.querySelector('[data-nodebraid-renderer-svg-root]')?.getAttribute('transform')`),
    viewport,
  );
  const restored = await download('restored');
  assert.equal(restored.text, saved.text);
  assert.deepEqual(
    await readNodePositions(),
    Object.fromEntries(fixture.nodes.map((item) => [item.id, item.position])),
  );
  assert.deepEqual(
    await evaluate(
      `({undo: document.querySelector('[aria-label="Undo"]').disabled, redo: document.querySelector('[aria-label="Redo"]').disabled})`,
    ),
    { undo: true, redo: true },
  );

  await moveDiscover();
  await waitForMetrics({ history: 'Undo / —' });
  assert.notEqual((await download('layout')).text, saved.text);
  await browser(['click', '[aria-label="Undo"]']);
  await waitForMetrics({ history: '— / Redo' });
  assert.equal((await download('layout-undone')).text, saved.text);

  // Choosing the very same file again must run the import and clear Redo.
  await browser(['upload', '[aria-label="Document file"]', saved.path]);
  await waitForMetrics({ history: '— / —' });
  assert.equal(await evaluate(`document.querySelector('[aria-label="Document file"]').value`), '');
  await moveDiscover();
  await waitForMetrics({ history: 'Undo / —' });
  await browser(['upload', '[aria-label="Document file"]', saved.path]);
  await waitForMetrics({ history: '— / —' });
  assert.equal((await download('same-file')).text, saved.text);

  // Invalid files retain the complete graph, both History directions, and Session.
  await moveDiscover();
  await waitForMetrics({ history: 'Undo / —' });
  await moveDiscover();
  await browser(['click', '[aria-label="Undo"]']);
  await waitForMetrics({ history: 'Undo / Redo' });
  const beforeFailure = await readState();
  const beforeFailureFile = await download('before-failure');
  const invalidFiles = [
    { name: 'malformed', text: '{', message: /JSON|property name|Unexpected/ },
    { name: 'version', text: JSON.stringify({ ...fixture, version: 2 }), message: /version must be 1/ },
    { name: 'format', text: JSON.stringify({ ...fixture, dataFormat: 'other' }), message: /data format/ },
    {
      name: 'reference',
      text: JSON.stringify({ ...fixture, edges: [edge('broken', 'missing', 'example-ship', null)] }),
      message: /The final graph is invalid/,
    },
    {
      name: 'data',
      text: JSON.stringify({
        ...fixture,
        nodes: fixture.nodes.map((item, index) => (index === 0 ? { ...item, data: '{"label":42,"tags":[]}' } : item)),
      }),
      message: /Example data/,
    },
    {
      name: 'data-fields',
      text: JSON.stringify({
        ...fixture,
        nodes: fixture.nodes.map((item, index) =>
          index === 0 ? { ...item, data: '{"label":"x","tags":[],"secret":true}' } : item,
        ),
      }),
      message: /Example data/,
    },
  ];
  for (const invalid of invalidFiles) {
    const path = resolve(evidence, `${invalid.name}.json`);
    await Bun.write(path, invalid.text);
    await browser(['upload', '[aria-label="Document file"]', path]);
    const message = await waitForAlert();
    assert.match(message, invalid.message, invalid.name);
    assert.deepEqual(await readState(), beforeFailure, invalid.name);
    assert.equal((await download(`after-${invalid.name}`)).text, beforeFailureFile.text, invalid.name);
  }

  await send('Page.enable');
  await send('Page.setInterceptFileChooserDialog', { enabled: true });
  const chooser = client!.waitForEvent('Page.fileChooserOpened', () => true);
  const [opened] = await Promise.all([chooser, browser(['click', '[aria-label="Import document"]'])]);
  assert.equal(opened.mode, 'selectSingle');
  const root = (await send('DOM.getDocument')) as { root: { nodeId: number } };
  const input = (await send('DOM.querySelector', {
    nodeId: root.root.nodeId,
    selector: '[aria-label="Document file"]',
  })) as { nodeId: number };
  await send('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [] });
  await send('Page.setInterceptFileChooserDialog', { enabled: false });
  assert.deepEqual(await readState(), beforeFailure, 'Empty file selection must not modify the Canvas.');

  await browser(['upload', '[aria-label="Document file"]', saved.path]);
  await waitForMetrics({ history: '— / —' });
  assert.equal(await evaluate(`document.querySelector('[role="alert"]')?.textContent ?? null`), null);
  await browser(['click', '[aria-label="Reset view"]']);
  await waitForMetrics({ zoom: '1.00×' });

  // All three allocators see restored IDs, including generated Edge IDs.
  await scrollCanvas();
  const source = await center('[data-nodebraid-port-node-id="example-compose"][data-nodebraid-port-id="output"]');
  const target = await center('[data-nodebraid-port-node-id="example-ship"][data-nodebraid-port-id="input"]');
  await drag(source, target);
  await waitForMetrics({ edges: '5', history: 'Undo / —' });
  assert.equal(await evaluate(`document.querySelector('[data-nodebraid-edge-id="example-edge-2"]') !== null`), true);
  await browser(['click', '[aria-label="Undo"]']);
  await waitForMetrics({ edges: '4', history: '— / Redo' });

  await selectOriginalPair();
  await modKey('d');
  await waitForMetrics({ nodes: '7', edges: '5', selection: 'example-duplicate-node-2, example-duplicate-node-3' });
  const duplicated = (await download('duplicate')).document;
  assert.equal(
    duplicated.edges.some((item) => item.id === 'example-duplicate-edge-2'),
    true,
  );
  assert.deepEqual(
    JSON.parse(duplicated.nodes.find((item) => item.id === 'example-duplicate-node-3')!.data),
    businessData,
  );
  await browser(['click', '[aria-label="Undo"]']);
  await waitForMetrics({ nodes: '5', edges: '4', history: '— / Redo', selection: 'None' });
  await browser(['click', '[aria-label="Redo"]']);
  await waitForMetrics({ nodes: '7', edges: '5' });
  await browser(['click', '[aria-label="Undo"]']);
  await waitForMetrics({ nodes: '5', edges: '4' });

  await selectOriginalPair();
  await modKey('c');
  await evaluate(`new Promise((resolve, reject) => {
    const deadline = Date.now() + 5000;
    const read = async () => {
      const text = await navigator.clipboard.readText();
      if (text.includes('nodebraid.examples/canvas-fragment')) return resolve(true);
      if (Date.now() > deadline) return reject(new Error('Expected copied business data.'));
      setTimeout(read, 25);
    };
    read().catch(reject);
  })`);
  await modKey('v');
  await waitForMetrics({
    nodes: '7',
    edges: '5',
    selection: 'example-clipboard-node-2, example-clipboard-node-3',
    'clipboard-failure': 'None',
  });
  const pasted = (await download('pasted')).document;
  assert.equal(
    pasted.edges.some((item) => item.id === 'example-clipboard-edge-2'),
    true,
  );
  assert.deepEqual(JSON.parse(pasted.nodes.find((item) => item.id === 'example-clipboard-node-3')!.data), businessData);
  await browser(['click', '[aria-label="Undo"]']);
  await waitForMetrics({ nodes: '5', edges: '4', history: '— / Redo' });
  assert.equal((await download('paste-undone')).text, saved.text);
  await browser(['screenshot', resolve(evidence, 'restored.png')]);
  console.log(`Document file workflow passed; evidence: ${evidence}`);
} catch (error) {
  await browser(['screenshot', resolve(evidence, 'failure.png')]);
  console.error(`Document file workflow failed; evidence: ${evidence}`);
  throw error;
} finally {
  client?.close();
  await browser(['close']);
  await server.stop(true);
}

function node(id: string, x: number, y: number, data: unknown) {
  return { id, type: 'step', position: { x, y }, size: { width: 160, height: 88 }, data: JSON.stringify(data) };
}

function edge(id: string, source: string, target: string, data: unknown) {
  return {
    id,
    type: 'flow',
    source: { nodeId: source, portId: 'output' },
    target: { nodeId: target, portId: 'input' },
    data: JSON.stringify(data),
  };
}

async function download(name: string) {
  downloadSequence += 1;
  const path = resolve(evidence, `${downloadSequence}-${name}.json`);
  assert.ok(client);
  await downloadBrowserFile(client, browser, '[aria-label="Export document"]', path, browserContextId);
  const text = await Bun.file(path).text();
  return { path, text, document: JSON.parse(text) as typeof fixture };
}

async function evaluate<T = unknown>(expression: string): Promise<T> {
  const output = await browser(['eval', expression, '--json']);
  const result = JSON.parse(output) as { success: boolean; data: { result: T } | null; error: unknown };
  assert.equal(result.success, true, JSON.stringify(result.error));
  assert.ok(result.data);
  return result.data.result;
}

async function attachPage() {
  client = await CdpClient.connect(await readAgentBrowserCdpUrl(browser));
  const targets = (await client.send('Target.getTargets')) as {
    targetInfos: { targetId: string; type: string; url: string; browserContextId?: string }[];
  };
  const target = targets.targetInfos.find((item) => item.type === 'page' && item.url.startsWith(server.url.origin));
  assert.ok(target);
  browserContextId = target.browserContextId;
  const attachment = (await client.send('Target.attachToTarget', { targetId: target.targetId, flatten: true })) as {
    sessionId: string;
  };
  page = attachment.sessionId;
}

async function send(method: string, params: Record<string, unknown> = {}) {
  assert.ok(client);
  assert.ok(page);
  return client.send(method, params, page);
}

async function waitForMetrics(expected: Record<string, string>) {
  return evaluate(`new Promise((resolve, reject) => {
    const expected = ${JSON.stringify(expected)};
    const deadline = Date.now() + 5000;
    const read = () => {
      const actual = Object.fromEntries(Object.keys(expected).map(name => [name, document.querySelector('[data-example-metric="' + name + '"]')?.textContent]));
      if (Object.entries(expected).every(([key, value]) => actual[key] === value)) return resolve(actual);
      if (Date.now() > deadline) return reject(new Error('Document metrics expected ' + JSON.stringify(expected) + '; actual=' + JSON.stringify(actual)));
      setTimeout(read, 25);
    };
    read();
  })`);
}

async function waitForAlert(): Promise<string> {
  return evaluate(`new Promise((resolve, reject) => {
    const deadline = Date.now() + 5000;
    const read = () => {
      const input = document.querySelector('[aria-label="Document file"]');
      const message = document.querySelector('[role="alert"]')?.textContent;
      if (!input?.disabled && message) return resolve(message);
      if (Date.now() > deadline) return reject(new Error('Expected visible file error.'));
      setTimeout(read, 25);
    };
    read();
  })`);
}

async function readState() {
  return evaluate(`({
    metrics: Object.fromEntries(Array.from(document.querySelectorAll('[data-example-metric]'), element => [element.getAttribute('data-example-metric'), element.textContent])),
    svg: document.querySelector('[data-nodebraid-renderer-svg-root]')?.outerHTML,
    undo: document.querySelector('[aria-label="Undo"]').disabled,
    redo: document.querySelector('[aria-label="Redo"]').disabled,
  })`);
}

async function readNodePositions() {
  return evaluate(
    `Object.fromEntries(Array.from(document.querySelectorAll('[data-nodebraid-node-id]'), node => [node.getAttribute('data-nodebraid-node-id'), { x: node.transform.baseVal.getItem(0).matrix.e, y: node.transform.baseVal.getItem(0).matrix.f }]))`,
  );
}

async function center(selector: string): Promise<{ x: number; y: number }> {
  return evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) throw new Error('Missing element ' + ${JSON.stringify(selector)});
    const bounds = element.getBoundingClientRect();
    return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
  })()`);
}

async function scrollCanvas() {
  await browser(['scrollintoview', '.canvas-target']);
}

async function moveDiscover() {
  await scrollCanvas();
  await browser(['click', '[data-nodebraid-node-id="example-discover"]']);
  const point = await center('[data-nodebraid-node-id="example-discover"]');
  await drag(point, { x: point.x + 30, y: point.y + 20 });
}

async function drag(start: { x: number; y: number }, end: { x: number; y: number }) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...start, buttons: 0 });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...start, button: 'left', buttons: 1, clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...end, button: 'left', buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...end, button: 'left', buttons: 0, clickCount: 1 });
}

async function selectOriginalPair() {
  await scrollCanvas();
  await browser(['click', '[data-nodebraid-node-id="example-discover"]']);
  const point = await center('[data-nodebraid-node-id="example-compose"]');
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point, buttons: 0 });
  await send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    ...point,
    button: 'left',
    buttons: 1,
    clickCount: 1,
    modifiers: 8,
  });
  await send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    ...point,
    button: 'left',
    buttons: 0,
    clickCount: 1,
    modifiers: 8,
  });
  await waitForMetrics({ selection: 'example-compose, example-discover' });
}

async function modKey(key: 'c' | 'd' | 'v') {
  const code = `Key${key.toUpperCase()}`;
  const windowsVirtualKeyCode = key.toUpperCase().charCodeAt(0);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers: 4, windowsVirtualKeyCode });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers: 4, windowsVirtualKeyCode });
}
