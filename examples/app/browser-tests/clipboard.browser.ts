import assert from 'node:assert/strict';
import { resolve } from 'node:path';

import {
  CdpClient,
  createAgentBrowserRunner,
  createProductionAppServer,
  readAgentBrowserCdpUrl,
} from './browser-test-harness';

const applicationRoot = resolve(import.meta.dir, '..');
const repositoryRoot = resolve(applicationRoot, '../..');
const agentBrowser = resolve(repositoryRoot, 'node_modules/.bin/agent-browser');
const session = `nodebraid-clipboard-example-${process.pid}`;
const runAgentBrowser = createAgentBrowserRunner(agentBrowser, repositoryRoot, session);

const server = await createProductionAppServer(applicationRoot);

let client: CdpClient | undefined;
let browserContextId: string | undefined;
let scenarioFailure: unknown;
try {
  await runAgentBrowser(['open', 'about:blank']);
  const cdpUrl = await readAgentBrowserCdpUrl(runAgentBrowser);
  client = await CdpClient.connect(cdpUrl);
  const context = (await client.send('Target.createBrowserContext', {
    disposeOnDetach: true,
  })) as Readonly<{ browserContextId: string }>;
  browserContextId = context.browserContextId;
  await setClipboardPermission(client, browserContextId, 'granted');
  const target = (await client.send('Target.createTarget', {
    url: `${server.url.origin}/basic-svg?lang=en`,
    browserContextId,
  })) as Readonly<{ targetId: string }>;
  const attachment = (await client.send('Target.attachToTarget', {
    targetId: target.targetId,
    flatten: true,
  })) as Readonly<{ sessionId: string }>;
  const page = attachment.sessionId;
  await client.send(
    'Emulation.setDeviceMetricsOverride',
    { width: 1280, height: 960, deviceScaleFactor: 1, mobile: false },
    page,
  );
  await client.send('Page.bringToFront', {}, page);
  await evaluate(
    client,
    page,
    `new Promise((resolve, reject) => {
      const deadline = Date.now() + 5000;
      const read = () => {
        const status = document.querySelector('[data-example-status]')?.getAttribute('data-example-status');
        if (status === 'ready') return resolve(true);
        if (Date.now() >= deadline) return reject(new Error('Clipboard Example did not become ready.'));
        setTimeout(read, 25);
      };
      read();
    })`,
  );
  assert.equal(
    await evaluate(client, page, `navigator.permissions.query({ name: 'clipboard-read' }).then(({ state }) => state)`),
    'granted',
  );

  const nodeCenter = (await evaluate(
    client,
    page,
    `(() => {
      const node = document.querySelector('[data-nodebraid-node-id="example-discover"]');
      if (!node) throw new Error('Missing Clipboard Example source Node.');
      const bounds = node.getBoundingClientRect();
      return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
    })()`,
  )) as Readonly<{ x: number; y: number }>;
  await dispatchClick(client, page, nodeCenter.x, nodeCenter.y);
  assert.deepEqual(await readMetrics(client, page, { selection: 'example-discover' }), {
    selection: 'example-discover',
  });

  await installKeyObservation(client, page, 'copy', 'KeyC');
  await dispatchModKey(client, page, 'c');
  assert.deepEqual(await evaluate(client, page, 'globalThis.__nodebraidClipboardKeycopy'), {
    trusted: true,
    defaultPrevented: true,
  });
  const copiedText = await evaluate(client, page, 'navigator.clipboard.readText()');
  const copiedEnvelope = JSON.parse(String(copiedText)) as Readonly<{
    type: string;
    version: number;
    fragment: Readonly<{
      nodes: readonly Readonly<{
        id: string;
        type: string;
        position: Readonly<{ x: number; y: number }>;
        data: null;
      }>[];
      edges: readonly unknown[];
      selection: Readonly<{ nodeIds: readonly string[]; edgeIds: readonly string[] }>;
    }>;
  }>;
  assert.deepEqual(copiedEnvelope, {
    type: 'nodebraid.examples/canvas-fragment',
    version: 1,
    fragment: {
      type: 'nodebraid.canvas-fragment',
      nodes: [
        {
          id: 'example-discover',
          type: 'step',
          position: { x: 80, y: 100 },
          size: { width: 160, height: 88 },
          data: null,
        },
      ],
      edges: [],
      selection: { nodeIds: ['example-discover'], edgeIds: [] },
    },
  });

  await installKeyObservation(client, page, 'paste', 'KeyV');
  await dispatchModKey(client, page, 'v');
  assert.deepEqual(
    await readMetrics(client, page, {
      revision: '2',
      nodes: '4',
      edges: '1',
      selection: 'example-clipboard-node-1',
      history: 'Undo / —',
    }),
    {
      revision: '2',
      nodes: '4',
      edges: '1',
      selection: 'example-clipboard-node-1',
      history: 'Undo / —',
    },
  );
  assert.deepEqual(await evaluate(client, page, 'globalThis.__nodebraidClipboardKeypaste'), {
    trusted: true,
    defaultPrevented: true,
  });
  assert.deepEqual(
    await evaluate(
      client,
      page,
      `(() => {
        const node = document.querySelector('[data-nodebraid-node-id="example-clipboard-node-1"]');
        const matrix = node.transform.baseVal.getItem(0).matrix;
        return { x: matrix.e, y: matrix.f };
      })()`,
    ),
    { x: 104, y: 124 },
  );

  await clickControl(client, page, 'Undo');
  assert.deepEqual(await readMetrics(client, page, { revision: '3', nodes: '3', selection: 'None' }), {
    revision: '3',
    nodes: '3',
    selection: 'None',
  });
  await clickControl(client, page, 'Redo');
  assert.deepEqual(await readMetrics(client, page, { revision: '4', nodes: '4', selection: 'None' }), {
    revision: '4',
    nodes: '4',
    selection: 'None',
  });

  await evaluate(client, page, `document.querySelector('.canvas-target')?.focus()`);
  await evaluate(client, page, `navigator.clipboard.writeText('foreign clipboard text')`);
  await dispatchModKey(client, page, 'v');
  assert.deepEqual(
    await readMetrics(client, page, {
      revision: '4',
      nodes: '4',
      selection: 'None',
      'clipboard-failure': 'CODEC_DECODE_FAILED:SyntaxError',
    }),
    {
      revision: '4',
      nodes: '4',
      selection: 'None',
      'clipboard-failure': 'CODEC_DECODE_FAILED:SyntaxError',
    },
  );

  await setClipboardPermission(client, browserContextId, 'denied');
  await installKeyObservation(client, page, 'denied', 'KeyV');
  await dispatchModKey(client, page, 'v');
  assert.deepEqual(await evaluate(client, page, 'globalThis.__nodebraidClipboardKeydenied'), {
    trusted: true,
    defaultPrevented: true,
  });
  assert.deepEqual(
    await readMetrics(client, page, {
      revision: '4',
      nodes: '4',
      selection: 'None',
      'clipboard-failure': 'TRANSPORT_READ_FAILED:NotAllowedError',
    }),
    {
      revision: '4',
      nodes: '4',
      selection: 'None',
      'clipboard-failure': 'TRANSPORT_READ_FAILED:NotAllowedError',
    },
  );
  await setClipboardPermission(client, browserContextId, 'granted');

  await clickControl(client, page, 'Disable clipboard shortcuts');
  await evaluate(
    client,
    page,
    `new Promise((resolve, reject) => {
      const deadline = Date.now() + 5000;
      const read = () => {
        const control = document.querySelector('[aria-label="Disable clipboard shortcuts"]');
        if (control instanceof HTMLButtonElement && control.disabled) return resolve(true);
        if (Date.now() >= deadline) return reject(new Error('Clipboard Shortcut cleanup did not settle.'));
        setTimeout(read, 25);
      };
      read();
    })`,
  );
  await installKeyObservation(client, page, 'released', 'KeyC');
  await dispatchModKey(client, page, 'c');
  assert.deepEqual(await evaluate(client, page, 'globalThis.__nodebraidClipboardKeyreleased'), {
    trusted: true,
    defaultPrevented: false,
  });
} catch (error) {
  scenarioFailure = error;
} finally {
  const failures: unknown[] = scenarioFailure === undefined ? [] : [scenarioFailure];
  if (client && browserContextId) {
    try {
      await client.send('Target.disposeBrowserContext', { browserContextId });
    } catch (error) {
      failures.push(error);
    }
  }
  try {
    client?.close();
  } catch (error) {
    failures.push(error);
  }
  try {
    await runAgentBrowser(['close']);
  } catch (error) {
    failures.push(error);
  }
  try {
    await server.stop(true);
  } catch (error) {
    failures.push(error);
  }
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) throw new AggregateError(failures, 'Clipboard browser scenario and cleanup failed.');
}

async function setClipboardPermission(
  client: CdpClient,
  contextId: string,
  setting: 'granted' | 'denied',
): Promise<void> {
  for (const name of ['clipboard-read', 'clipboard-write']) {
    await client.send('Browser.setPermission', {
      permission: { name },
      setting,
      origin: server.url.origin,
      embeddedOrigin: server.url.origin,
      browserContextId: contextId,
    });
  }
}

async function dispatchClick(client: CdpClient, page: string, x: number, y: number): Promise<void> {
  await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 }, page);
  await client.send(
    'Input.dispatchMouseEvent',
    { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 },
    page,
  );
  await client.send(
    'Input.dispatchMouseEvent',
    { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 },
    page,
  );
}

async function dispatchModKey(client: CdpClient, page: string, key: 'c' | 'v'): Promise<void> {
  const code = key === 'c' ? 'KeyC' : 'KeyV';
  const windowsVirtualKeyCode = key === 'c' ? 67 : 86;
  await client.send(
    'Input.dispatchKeyEvent',
    { type: 'keyDown', key, code, modifiers: 4, windowsVirtualKeyCode },
    page,
  );
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers: 4, windowsVirtualKeyCode }, page);
}

async function installKeyObservation(
  client: CdpClient,
  page: string,
  name: string,
  code: 'KeyC' | 'KeyV',
): Promise<void> {
  await evaluate(
    client,
    page,
    `(() => {
      globalThis.__nodebraidClipboardKey${name} = { trusted: false, defaultPrevented: false };
      document.querySelector('.canvas-target')?.addEventListener('keydown', (event) => {
        if (event.code === '${code}' && event.metaKey) {
          globalThis.__nodebraidClipboardKey${name} = {
            trusted: event.isTrusted,
            defaultPrevented: event.defaultPrevented,
          };
        }
      }, { once: true });
      return true;
    })()`,
  );
}

async function clickControl(client: CdpClient, page: string, label: string): Promise<void> {
  await evaluate(
    client,
    page,
    `(() => {
      const control = document.querySelector('[aria-label=${JSON.stringify(label)}]');
      if (!(control instanceof HTMLButtonElement)) throw new Error('Missing Clipboard Example control.');
      control.click();
      return true;
    })()`,
  );
}

async function readMetrics(
  client: CdpClient,
  page: string,
  expected: Readonly<Record<string, string>>,
): Promise<Readonly<Record<string, string>>> {
  return evaluate(
    client,
    page,
    `new Promise((resolve, reject) => {
      const expected = ${JSON.stringify(expected)};
      const deadline = Date.now() + 5000;
      const read = () => {
        const actual = Object.fromEntries(Object.keys(expected).map((name) => [
          name,
          document.querySelector('[data-example-metric="' + name + '"]')?.textContent,
        ]));
        if (Object.entries(expected).every(([name, value]) => actual[name] === value)) return resolve(actual);
        if (Date.now() >= deadline) return reject(new Error(
          'Clipboard metrics did not reach ' + JSON.stringify(expected) + '; actual=' + JSON.stringify(actual)
        ));
        setTimeout(read, 25);
      };
      read();
    })`,
  ) as Promise<Readonly<Record<string, string>>>;
}

async function evaluate(client: CdpClient, page: string, expression: string): Promise<unknown> {
  const response = (await client.send(
    'Runtime.evaluate',
    { expression, awaitPromise: true, returnByValue: true },
    page,
  )) as Readonly<{
    result: Readonly<{ value?: unknown; description?: string }>;
    exceptionDetails?: Readonly<{ text?: string; exception?: Readonly<{ description?: string }> }>;
  }>;
  if (response.exceptionDetails) {
    throw new Error(
      response.exceptionDetails.exception?.description ??
        response.exceptionDetails.text ??
        'Browser evaluation failed.',
    );
  }
  return response.result.value;
}
