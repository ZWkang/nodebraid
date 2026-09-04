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
const outputDirectory = resolve(repositoryRoot, '.tmp/adapter-react-browser');
const bundlePath = resolve(outputDirectory, 'runtime-mount.js');
const agentBrowser = resolve(repositoryRoot, 'node_modules/.bin/agent-browser');
const session = `nodebraid-adapter-react-${process.pid}`;

await mkdir(outputDirectory, { recursive: true });
const build = await Bun.build({
  entrypoints: [resolve(packageRoot, 'browser-tests/runtime-mount.entry.tsx')],
  target: 'browser',
  format: 'iife',
});
if (!build.success) throw new AggregateError(build.logs, 'React Adapter browser entry failed to build.');
const bundle = build.outputs[0];
if (!bundle) throw new Error('React Adapter browser build produced no output.');
await Bun.write(bundlePath, bundle);

const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    if (new URL(request.url).pathname === '/runtime-mount.js') {
      return new Response(Bun.file(bundlePath), { headers: { 'content-type': 'text/javascript; charset=utf-8' } });
    }
    return new Response('<!doctype html><html><body><script src="/runtime-mount.js"></script></body></html>', {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  },
});

try {
  await runAgentBrowser(['open', server.url.href]);
  assert.deepEqual(await evaluateBrowserScenario('globalThis.__nodebraidReactAdapterLifecycle()'), {
    createCountWhileFirstPending: 1,
    staleResolutionEvents: ['create:1', 'resolve:1', 'dispose:start:1', 'dispose:end:1', 'create:2'],
    firstReady: { status: 'ready', runtimeId: '2', failurePhase: null, targetRuntimeId: '2' },
    firstReadyRemountRender: { generation: 2, status: 'pending', runtimeId: null },
    readyRemountEvents: [
      'create:1',
      'resolve:1',
      'dispose:start:1',
      'dispose:end:1',
      'create:2',
      'resolve:2',
      'dispose:start:2',
      'dispose:end:2',
      'create:3',
    ],
    finalEvents: [
      'create:1',
      'resolve:1',
      'dispose:start:1',
      'dispose:end:1',
      'create:2',
      'resolve:2',
      'dispose:start:2',
      'dispose:end:2',
      'create:3',
      'resolve:3',
      'dispose:start:3',
      'dispose:end:3',
    ],
    failures: [],
    targetConnectedAfterUnmount: false,
  });

  assert.deepEqual(await evaluateBrowserScenario('globalThis.__nodebraidReactAdapterFailures()'), {
    createFailureState: { status: 'failed', runtimeId: null, failurePhase: 'create', targetRuntimeId: null },
    disposeFailureState: { status: 'failed', runtimeId: null, failurePhase: 'dispose', targetRuntimeId: '2' },
    createCountAfterDisposeFailure: 2,
    failures: [
      { phase: 'create', sameError: true },
      { phase: 'dispose', sameError: true },
    ],
    events: [
      'create:1',
      'reject:1',
      'report:create',
      'create:2',
      'resolve:2',
      'dispose:start:2',
      'dispose:reject:2',
      'report:dispose',
    ],
  });

  assert.deepEqual(await evaluateBrowserScenario('globalThis.__nodebraidReactAdapterSnapshots()'), {
    initial: '0|1|false',
    updated: '4|2|true',
    subscriptionsWhileMounted: { kernel: 1, session: 1, history: 1 },
    subscriptionsAfterUnmount: { kernel: 0, session: 0, history: 0 },
  });

  assert.deepEqual(await evaluateBrowserScenario('globalThis.__nodebraidReactAdapterReporterRace()'), {
    committed: 1,
    abandoned: 0,
  });

  assert.equal(
    await evaluateBrowserScenario('globalThis.__nodebraidReactAdapterMultipleTarget()'),
    'Runtime Mount ref cannot be attached to more than one React Target at a time.',
  );
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

async function evaluateBrowserScenario<Result>(expression: string): Promise<Result> {
  const output = await runAgentBrowser(['eval', expression, '--json']);
  const response = JSON.parse(output) as AgentBrowserJson<Result>;
  assert.equal(response.success, true, JSON.stringify(response.error));
  assert.ok(response.data, `Browser scenario returned no data: ${expression}`);
  return response.data.result;
}

function processEnv(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}
