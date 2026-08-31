import assert from 'node:assert/strict';

export type CdpSend = (method: string, params?: Readonly<Record<string, unknown>>) => Promise<unknown>;

export function createAgentBrowserRunner(
  executable: string,
  repositoryRoot: string,
  session: string,
): (arguments_: readonly string[]) => Promise<string> {
  return async (arguments_) => {
    const process = Bun.spawn([executable, '--session', session, ...arguments_], {
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

  close(): void {
    this.#socket.close();
  }
}

function processEnv(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}
