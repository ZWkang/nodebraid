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
const evidence = await mkdtemp(resolve(repositoryRoot, '.tmp/node-authoring-browser-'));
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
  `nodebraid-node-authoring-${process.pid}`,
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
const cardId = 'example-node-1';
const noteId = 'example-node-2';

try {
  await browser(['open', `${server.url.origin}/basic-svg?lang=en`]);
  await browser(['set', 'viewport', '1280', '960']);
  await waitForMetrics({ revision: '1', nodes: '3', edges: '1', selection: 'None' });
  await attachPage();
  await browser(['screenshot', resolve(evidence, 'before.png')]);

  await browser(['click', '[aria-label="Place node"]']);
  await waitForPlacement('waiting');
  await browser(['click', '[data-nodebraid-node-id="example-discover"]']);
  await waitForMetrics({ revision: '1', nodes: '3', selection: 'None' });
  await waitForPlacement('waiting');
  await scrollCanvas();
  const dragStart = await canvasPoint(30, 390);
  await drag(dragStart, { x: dragStart.x + 50, y: dragStart.y + 20 });
  await waitForMetrics({ revision: '1', nodes: '3', selection: 'None' });
  assert.equal(await evaluate(`document.querySelector('[data-nodebraid-box-selection]') !== null`), false);
  await waitForPlacement('waiting');
  await clickPoint(await canvasPoint(300, 400));
  await waitForMetrics({ revision: '2', nodes: '4', selection: cardId });
  await waitForPlacement('idle');
  assert.deepEqual(await position(cardId), { x: 300, y: 400 });
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(nodeSelector(cardId))})?.tagName`), 'g');
  await waitForEditor(cardId);
  assert.equal(await label(cardId), 'Card');

  await browser(['fill', '[aria-label="Node label"]', 'Edited card']);
  await browser(['fill', '[aria-label="Tags (JSON array)"]', '["saved","中文","comma,inside"]']);
  assert.equal(await label(cardId), 'Card', 'Typing must not modify the Canvas before Apply.');
  await waitForMetrics({ revision: '2' });
  await browser(['click', '[aria-label="Apply changes"]']);
  await waitForMetrics({ revision: '3' });
  assert.equal(await label(cardId), 'Edited card');
  const edited = await download('edited');
  assert.deepEqual(JSON.parse(edited.document.nodes.find((node) => node.id === cardId)!.data), {
    label: 'Edited card',
    tags: ['saved', '中文', 'comma,inside'],
  });

  await browser(['fill', '[aria-label="Node label"]', 'Cancelled draft']);
  await browser(['click', '[aria-label="Cancel changes"]']);
  await waitForMetrics({ revision: '3' });
  assert.equal(await label(cardId), 'Edited card');
  await browser(['click', '[aria-label="Undo"]']);
  await waitForMetrics({ revision: '4' });
  assert.equal(await label(cardId), 'Card');
  await browser(['click', '[aria-label="Redo"]']);
  await waitForMetrics({ revision: '5' });
  assert.equal(await label(cardId), 'Edited card');

  await browser(['fill', '[aria-label="Node label"]', 'Unsaved draft']);
  await browser(['click', '[data-nodebraid-node-id="example-discover"]']);
  await waitForMetrics({ selection: 'example-discover' });
  await wait(`document.querySelector('[aria-label="Unsaved node changes"]') !== null`);
  await waitForEditor(cardId);
  assert.equal(await evaluate(`document.querySelector('[aria-label="Node label"]').value`), 'Unsaved draft');
  await browser(['screenshot', resolve(evidence, 'draft-switch.png')]);
  await browser(['click', '[aria-label="Keep editing"]']);
  await waitForMetrics({ selection: cardId });
  await browser(['click', '[data-nodebraid-node-id="example-discover"]']);
  await browser(['click', '[aria-label="Discard and switch"]']);
  await waitForEditor('example-discover');
  await browser(['click', nodeSelector(cardId)]);
  await waitForEditor(cardId);
  assert.equal(await evaluate(`document.querySelector('[aria-label="Node label"]').value`), 'Edited card');

  await browser(['fill', '[aria-label="Tags (JSON array)"]', '[1]']);
  await browser(['click', '[aria-label="Apply changes"]']);
  await wait(`document.querySelector('[data-example-edit-error]') !== null`);
  await waitForMetrics({ revision: '5' });
  assert.equal(await label(cardId), 'Edited card');
  await browser(['click', '[aria-label="Cancel changes"]']);

  await browser(['fill', '[aria-label="Node label"]', 'Draft before moving']);
  await scrollCanvas();
  const start = await center(nodeSelector(cardId));
  await drag(start, { x: start.x + 30, y: start.y + 20 });
  await waitForMetrics({ revision: '6' });
  await wait(`document.querySelector('[data-example-edit-conflict]') !== null`);
  await browser(['click', '[aria-label="Apply changes"]']);
  await wait(`document.querySelector('[data-example-edit-error]') !== null`);
  await waitForMetrics({ revision: '6' });
  assert.equal(await label(cardId), 'Edited card');
  assert.equal(await evaluate(`document.querySelector('[aria-label="Node label"]').value`), 'Draft before moving');
  await browser(['screenshot', resolve(evidence, 'stale-draft.png')]);
  await browser(['click', '[aria-label="Reload node"]']);
  await wait(`document.querySelector('[data-example-edit-conflict]') === null`);
  assert.equal(await evaluate(`document.querySelector('[aria-label="Node label"]').value`), 'Edited card');
  await browser(['fill', '[aria-label="Node label"]', 'Final card']);
  await browser(['click', '[aria-label="Apply changes"]']);
  await waitForMetrics({ revision: '7' });
  assert.deepEqual(await position(cardId), { x: 330, y: 420 });

  await browser(['select', '[aria-label="Node type"]', 'note']);
  await browser(['click', '[aria-label="Place node"]']);
  await browser(['press', 'Escape']);
  await waitForPlacement('idle');
  await waitForMetrics({ revision: '7', nodes: '4', selection: cardId });
  await browser(['click', '[aria-label="Place node"]']);
  await browser(['click', '[aria-label="Cancel placement"]']);
  await waitForPlacement('idle');
  await waitForMetrics({ revision: '7', nodes: '4', selection: cardId });

  await browser(['click', '[aria-label="Zoom out"]']);
  await browser(['click', '[aria-label="Place node"]']);
  await scrollCanvas();
  const notePoint = await canvasPoint(520, 350);
  const expectedNote = await evaluate<{ x: number; y: number }>(`(() => {
    const root = document.querySelector('[data-nodebraid-renderer-svg-root]');
    const point = new DOMPoint(${notePoint.x}, ${notePoint.y}).matrixTransform(root.getScreenCTM().inverse());
    return { x: point.x, y: point.y };
  })()`);
  await clickPoint(notePoint);
  await waitForMetrics({ revision: '8', nodes: '5', selection: noteId });
  await waitForPlacement('idle');
  const actualNote = await position(noteId);
  assert.ok(Math.abs(actualNote.x - expectedNote.x) < 0.001);
  assert.ok(Math.abs(actualNote.y - expectedNote.y) < 0.001);
  assert.equal(
    await evaluate(`document.querySelector(${JSON.stringify(`${nodeSelector(noteId)} ellipse`)}) !== null`),
    true,
  );
  // Rectangle geometry remains clickable even outside the Note's ellipse.
  await browser(['click', '[data-nodebraid-node-id="example-discover"]']);
  const corner = await evaluate<{ x: number; y: number }>(`(() => {
    const matrix = document.querySelector(${JSON.stringify(nodeSelector(noteId))}).getScreenCTM();
    const point = new DOMPoint(2, 2).matrixTransform(matrix);
    return { x: point.x, y: point.y };
  })()`);
  await clickPoint(corner);
  await waitForMetrics({ selection: noteId });

  await browser(['click', '[aria-label="Reset view"]']);
  await scrollCanvas();
  await drag(
    await center(`[data-nodebraid-port-node-id="${cardId}"][data-nodebraid-port-id="output"]`),
    await center('[data-nodebraid-port-node-id="example-discover"][data-nodebraid-port-id="input"]'),
  );
  await waitForMetrics({ revision: '9', edges: '2' });
  const saved = await download('complete');
  assert.equal(saved.document.nodes.length, 5);
  assert.equal(saved.document.edges.length, 2);
  assert.equal(saved.document.nodes.find((node) => node.id === noteId)?.type, 'note');
  await browser(['reload']);
  await waitForMetrics({ revision: '1', nodes: '3', edges: '1' });
  await browser(['upload', '[aria-label="Document file"]', saved.path]);
  await waitForMetrics({ nodes: '5', edges: '2', history: '— / —' });
  const restored = await download('restored');
  assert.equal(restored.text, saved.text);
  assert.equal(await label(cardId), 'Final card');
  assert.equal(await label(noteId), 'Note');
  await browser(['click', nodeSelector(noteId)]);
  await waitForEditor(noteId);
  await browser(['fill', '[aria-label="Node label"]', 'After restore']);
  await browser(['click', '[aria-label="Apply changes"]']);
  await waitForMetrics({ history: 'Undo / —' });
  assert.equal(await label(noteId), 'After restore');
  await browser(['click', '[aria-label="Undo"]']);
  await waitForMetrics({ history: '— / Redo' });
  assert.equal((await download('edit-undone')).text, saved.text);
  await browser(['click', nodeSelector(cardId)]);
  await waitForEditor(cardId);
  await browser(['fill', '[aria-label="Node label"]', 'Applied while switching']);
  await browser(['click', nodeSelector(noteId)]);
  await browser(['click', '[aria-label="Apply and switch"]']);
  await waitForEditor(noteId);
  assert.equal(await label(cardId), 'Applied while switching');
  await browser(['click', '[aria-label="Undo"]']);
  await waitForMetrics({ history: '— / Redo' });
  assert.equal((await download('switch-edit-undone')).text, saved.text);
  await browser(['screenshot', resolve(evidence, 'after.png')]);
  console.log(`Node authoring workflow passed; evidence: ${evidence}`);
} catch (error) {
  await browser(['screenshot', resolve(evidence, 'failure.png')]);
  console.error(`Node authoring workflow failed; evidence: ${evidence}`);
  throw error;
} finally {
  client?.close();
  await browser(['close']);
  await server.stop(true);
}

function nodeSelector(id: string): string {
  return `[data-nodebraid-node-id="${id}"]`;
}

async function evaluate<T = unknown>(expression: string): Promise<T> {
  const output = await browser(['eval', expression, '--json']);
  const result = JSON.parse(output) as { success: boolean; data: { result: T } | null; error: unknown };
  assert.equal(result.success, true, JSON.stringify(result.error));
  assert.ok(result.data);
  return result.data.result;
}

async function wait(expression: string): Promise<void> {
  await evaluate(`new Promise((resolve, reject) => {
    const deadline = Date.now() + 5000;
    const read = () => {
      if (${expression}) return resolve(true);
      if (Date.now() > deadline) return reject(new Error('Node authoring condition did not become true: ' + ${JSON.stringify(expression)}));
      setTimeout(read, 25);
    };
    read();
  })`);
}

async function waitForMetrics(expected: Record<string, string>): Promise<void> {
  await wait(
    `Object.entries(${JSON.stringify(expected)}).every(([key, value]) => document.querySelector('[data-example-metric="' + key + '"]')?.textContent === value)`,
  );
}

async function waitForPlacement(status: 'waiting' | 'idle'): Promise<void> {
  await wait(
    `document.querySelector('[data-example-placement]')?.getAttribute('data-example-placement') === ${JSON.stringify(status)}`,
  );
}

async function waitForEditor(id: string): Promise<void> {
  await wait(
    `document.querySelector('[data-example-editor-node]')?.getAttribute('data-example-editor-node') === ${JSON.stringify(id)}`,
  );
}

async function label(id: string): Promise<string> {
  return evaluate(
    `document.querySelector(${JSON.stringify(`${nodeSelector(id)} [data-example-node-label]`)})?.textContent`,
  );
}

async function position(id: string): Promise<{ x: number; y: number }> {
  return evaluate(`(() => {
    const matrix = document.querySelector(${JSON.stringify(nodeSelector(id))}).transform.baseVal.getItem(0).matrix;
    return { x: matrix.e, y: matrix.f };
  })()`);
}

async function attachPage(): Promise<void> {
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

async function send(method: string, params: Record<string, unknown>): Promise<unknown> {
  assert.ok(client);
  assert.ok(page);
  return client.send(method, params, page);
}

async function scrollCanvas(): Promise<void> {
  await browser(['scrollintoview', '.canvas-target']);
}

async function canvasPoint(x: number, y: number): Promise<{ x: number; y: number }> {
  return evaluate(`(() => {
    const bounds = document.querySelector('.canvas-target').getBoundingClientRect();
    return { x: bounds.left + ${x}, y: bounds.top + ${y} };
  })()`);
}

async function center(selector: string): Promise<{ x: number; y: number }> {
  return evaluate(`(() => {
    const bounds = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
    return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
  })()`);
}

async function clickPoint(point: { x: number; y: number }): Promise<void> {
  await drag(point, point);
}

async function drag(start: { x: number; y: number }, end: { x: number; y: number }): Promise<void> {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...start, buttons: 0 });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...start, button: 'left', buttons: 1, clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...end, button: 'left', buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...end, button: 'left', buttons: 0, clickCount: 1 });
}

interface SavedDocument {
  readonly nodes: readonly { readonly id: string; readonly type: string; readonly data: string }[];
  readonly edges: readonly unknown[];
}

async function download(name: string): Promise<{ path: string; text: string; document: SavedDocument }> {
  const path = resolve(evidence, `${++downloadSequence}-${name}.json`);
  assert.ok(client);
  await downloadBrowserFile(client, browser, '[aria-label="Export document"]', path, browserContextId);
  const text = await Bun.file(path).text();
  return { path, text, document: JSON.parse(text) as SavedDocument };
}
