import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rename, rmdir } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';

export type CdpSend = (method: string, params?: Readonly<Record<string, unknown>>) => Promise<unknown>;

export async function createProductionAppServer(applicationRoot: string): Promise<ReturnType<typeof Bun.serve>> {
  const distributionRoot = resolve(applicationRoot, 'dist');
  const distributionPrefix = `${distributionRoot}${sep}`;
  const index = Bun.file(resolve(distributionRoot, 'index.html'));
  assert.equal(await index.exists(), true, 'Expected the Examples Application production build.');
  return Bun.serve({
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
}

export function createAgentBrowserRunner(
  executable: string,
  repositoryRoot: string,
  session: string,
  environment?: Readonly<Record<string, string>>,
): (arguments_: readonly string[]) => Promise<string> {
  return async (arguments_) => {
    const process = Bun.spawn([executable, '--session', session, ...arguments_], {
      cwd: repositoryRoot,
      env: environment ?? processEnv(),
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
  };
}

export async function readAgentBrowserCdpUrl(
  runAgentBrowser: (arguments_: readonly string[]) => Promise<string>,
): Promise<string> {
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

export async function downloadBrowserFile(
  client: CdpClient,
  runAgentBrowser: (arguments_: readonly string[]) => Promise<string>,
  selector: string,
  path: string,
  browserContextId?: string,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const directory = await mkdtemp(resolve(dirname(path), '.download-'));
  // agent-browser 0.20's download command only sets a directory; it does not click or await a file.
  await client.send('Browser.setDownloadBehavior', {
    behavior: 'allowAndName',
    downloadPath: directory,
    eventsEnabled: true,
    ...(browserContextId === undefined ? {} : { browserContextId }),
  });
  const started = client.waitForEvent('Browser.downloadWillBegin', () => true);
  const finished = client.waitForEvent(
    'Browser.downloadProgress',
    (event) => event.state === 'completed' || event.state === 'canceled',
  );
  const [start, finish] = await Promise.all([started, finished, runAgentBrowser(['click', selector])]);
  assert.equal(finish.guid, start.guid, 'Expected completion of the download triggered by this click.');
  assert.equal(finish.state, 'completed', 'Chromium canceled the file download.');
  assert.equal(typeof finish.guid, 'string');
  await rename(resolve(directory, finish.guid as string), path);
  await rmdir(directory);
}

export class CdpClient {
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
      socket.addEventListener('error', () => reject(new Error('Failed to connect to Chromium CDP.')), { once: true });
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

  waitForEvent(
    method: string,
    matches: (params: Readonly<Record<string, unknown>>) => boolean,
  ): Promise<Readonly<Record<string, unknown>>> {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        this.#socket.removeEventListener('message', receive);
        this.#socket.removeEventListener('close', closed);
      };
      const receive = (event: MessageEvent) => {
        if (typeof event.data !== 'string') return;
        const message = JSON.parse(event.data) as Readonly<{
          method?: string;
          params?: Readonly<Record<string, unknown>>;
        }>;
        if (message.method !== method || !message.params || !matches(message.params)) return;
        cleanup();
        resolve(message.params);
      };
      const closed = () => {
        cleanup();
        reject(new Error(`Chromium CDP closed while waiting for ${method}.`));
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Timed out waiting for Chromium CDP event ${method}.`));
      }, 5000);
      this.#socket.addEventListener('message', receive);
      this.#socket.addEventListener('close', closed);
    });
  }

  close(): void {
    this.#socket.close();
  }
}

function processEnv(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}
