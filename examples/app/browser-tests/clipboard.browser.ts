import assert from 'node:assert/strict';
import { extname, resolve, sep } from 'node:path';

const applicationRoot = resolve(import.meta.dir, '..');
const repositoryRoot = resolve(applicationRoot, '../..');
const distributionRoot = resolve(applicationRoot, 'dist');
const distributionPrefix = `${distributionRoot}${sep}`;
const index = Bun.file(resolve(distributionRoot, 'index.html'));
const agentBrowser = resolve(repositoryRoot, 'node_modules/.bin/agent-browser');
const session = `nodebraid-clipboard-example-${process.pid}`;

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

let client: CdpClient | undefined;
let browserContextId: string | undefined;
try {
  await runAgentBrowser(['open', 'about:blank']);
  const cdpUrl = await readCdpUrl();
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
  assert.equal(JSON.parse(String(copiedText)).type, 'nodebraid.examples/canvas-fragment');

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

  await evaluate(client, page, `navigator.clipboard.writeText('foreign clipboard text')`);
  await dispatchModKey(client, page, 'v');
  assert.deepEqual(await readMetrics(client, page, { revision: '4', nodes: '4', selection: 'None' }), {
    revision: '4',
    nodes: '4',
    selection: 'None',
  });

  await setClipboardPermission(client, browserContextId, 'denied');
  await installKeyObservation(client, page, 'denied', 'KeyV');
  await dispatchModKey(client, page, 'v');
  assert.deepEqual(await evaluate(client, page, 'globalThis.__nodebraidClipboardKeydenied'), {
    trusted: true,
    defaultPrevented: true,
  });
  assert.deepEqual(await readMetrics(client, page, { revision: '4', nodes: '4', selection: 'None' }), {
    revision: '4',
    nodes: '4',
    selection: 'None',
  });
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
} finally {
  if (client && browserContextId) {
    await client.send('Target.disposeBrowserContext', { browserContextId }).catch(() => undefined);
  }
  client?.close();
  await runAgentBrowser(['close']);
  await server.stop(true);
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

async function readCdpUrl(): Promise<string> {
  const output = await runAgentBrowser(['get', 'cdp-url', '--json']);
  const response = JSON.parse(output) as Readonly<{
    success: boolean;
    data: Readonly<{ cdpUrl: string }> | null;
    error: unknown;
  }>;
  assert.equal(response.success, true, JSON.stringify(response.error));
  assert.ok(response.data?.cdpUrl);
  return response.data.cdpUrl;
}

class CdpClient {
  readonly #socket: WebSocket;
  readonly #pending = new Map<
    number,
    Readonly<{ resolve: (result: unknown) => void; reject: (error: Error) => void }>
  >();
  #nextId = 1;

  private constructor(socket: WebSocket) {
    this.#socket = socket;
    socket.addEventListener('message', (event) => {
      if (typeof event.data !== 'string') return;
      const message = JSON.parse(event.data) as Readonly<{
        id?: number;
        result?: unknown;
        error?: Readonly<{ message?: string }>;
      }>;
      if (message.id === undefined) return;
      const pending = this.#pending.get(message.id);
      if (!pending) return;
      this.#pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message ?? 'CDP command failed.'));
      else pending.resolve(message.result);
    });
  }

  static async connect(url: string): Promise<CdpClient> {
    const socket = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener('open', () => resolve(), { once: true });
      socket.addEventListener('error', () => reject(new Error('Failed to connect to Clipboard CDP.')), { once: true });
    });
    return new CdpClient(socket);
  }

  send(method: string, params: Readonly<Record<string, unknown>> = {}, sessionId?: string): Promise<unknown> {
    const id = this.#nextId;
    this.#nextId += 1;
    const result = new Promise<unknown>((resolve, reject) => this.#pending.set(id, { resolve, reject }));
    this.#socket.send(JSON.stringify({ id, method, params, ...(sessionId === undefined ? {} : { sessionId }) }));
    return result;
  }

  close(): void {
    this.#socket.close();
  }
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
