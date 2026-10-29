import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  appendFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import {
  CdpClient,
  createAgentBrowserRunner,
  createProductionAppServer,
  downloadBrowserFile,
  readAgentBrowserCdpUrl,
} from '../examples/app/browser-tests/browser-test-harness';
import { previewLimitations, selectPreviewScenes, type PreviewScene } from './preview-scenarios';

interface PreviewSource {
  base: string;
  head: string;
  tree: string;
  patch: string;
}

interface PreviewArtifact {
  path: string;
  kind: 'screenshot' | 'recording' | 'snapshot' | 'log';
  sha256: string;
}

interface SceneResult {
  id: string;
  title: string;
  status: 'passed' | 'failed';
  steps: string[];
  error?: string;
  artifacts: string[];
}

interface Preview {
  schemaVersion: 1;
  source: PreviewSource;
  status: 'passed' | 'failed' | 'not-applicable';
  reason?: string;
  limitations: string[];
  scenes: SceneResult[];
  artifacts: PreviewArtifact[];
}

const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const digest = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');

function sourceAt(base: string): PreviewSource {
  if (git('status', '--porcelain')) throw new Error('Preview requires a clean committed worktree.');
  return {
    base,
    head: git('rev-parse', 'HEAD'),
    tree: git('rev-parse', 'HEAD^{tree}'),
    patch: digest(execFileSync('git', ['diff', '--binary', base, 'HEAD'])),
  };
}

export function createPreviewBrowserRunner(
  executable: string,
  root: string,
  session: string,
  config: string,
  inherited: Readonly<Record<string, string | undefined>> = process.env,
): (args: readonly string[]) => Promise<string> {
  writeFileSync(config, '{}\n', { flag: 'wx' });
  const environment = Object.fromEntries(
    Object.entries(inherited).filter(
      (entry): entry is [string, string] => entry[1] !== undefined && !entry[0].startsWith('AGENT_BROWSER_'),
    ),
  );
  const run = createAgentBrowserRunner(executable, root, session, environment);
  return (args) => run(['--config', config, ...args]);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { base: { type: 'string' }, out: { type: 'string' }, all: { type: 'boolean' }, help: { type: 'boolean' } },
  });
  if (values.help) {
    console.log('Usage: bun scripts/collect-preview.ts --base <commit> --out <new-directory> [--all]');
    return;
  }
  if (!values.base || !values.out) throw new Error('Expected --base <commit> and --out <new-directory>.');
  const requestedBase = git('rev-parse', '--verify', '--end-of-options', `${values.base}^{commit}`);
  const base = git('merge-base', requestedBase, 'HEAD');
  const source = sourceAt(base);
  const files = execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', base, source.head], {
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean);
  const selected = selectPreviewScenes(files, values.all);
  const out = resolve(values.out);
  if (existsSync(out) && readdirSync(out).length)
    throw new Error('Preview output must be empty; previous evidence is retained.');
  mkdirSync(out, { recursive: true });
  const preview: Preview = {
    schemaVersion: 1,
    source,
    status: selected.length ? 'passed' : 'not-applicable',
    limitations: previewLimitations(files),
    scenes: [],
    artifacts: [],
  };
  try {
    if (!selected.length)
      preview.reason = 'No changed Examples Application or Canvas runtime source selects a visible scene.';
    else {
      const log = openSync(join(out, 'build.log'), 'wx');
      let build;
      try {
        build = spawnSync('bun', ['run', 'example:build'], { stdio: ['ignore', log, log] });
      } finally {
        closeSync(log);
        preview.artifacts.push({
          path: 'build.log',
          kind: 'log',
          sha256: digest(readFileSync(join(out, 'build.log'))),
        });
      }
      if (build.error) throw build.error;
      assert.equal(build.status, 0, `Examples production build failed (${build.status}); see build.log.`);
      const ffmpeg = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
      writeFileSync(join(out, 'ffmpeg.log'), `${ffmpeg.stdout ?? ''}${ffmpeg.stderr ?? ''}${ffmpeg.error ?? ''}`);
      preview.artifacts.push({
        path: 'ffmpeg.log',
        kind: 'log',
        sha256: digest(readFileSync(join(out, 'ffmpeg.log'))),
      });
      if (ffmpeg.error) throw ffmpeg.error;
      assert.equal(ffmpeg.status, 0, 'ffmpeg is required for real recording; see ffmpeg.log.');
      const root = git('rev-parse', '--show-toplevel');
      const server = await createProductionAppServer(join(root, 'examples/app'));
      try {
        for (const scene of selected) {
          const result = await collectScene(scene, root, server.url.origin, out, preview.artifacts);
          preview.scenes.push(result);
          if (result.status === 'failed') preview.status = 'failed';
        }
      } finally {
        await server.stop(true);
      }
    }
    assert.deepEqual(sourceAt(base), source, 'Source changed while collecting preview evidence.');
  } catch (error) {
    preview.status = 'failed';
    preview.reason = String(error);
  }
  writeFileSync(join(out, 'preview.json'), `${JSON.stringify(preview, null, 2)}\n`);
  console.log(JSON.stringify({ status: preview.status, manifest: join(out, 'preview.json') }));
  if (preview.status === 'failed') process.exitCode = 1;
}

async function collectScene(
  scene: PreviewScene,
  root: string,
  origin: string,
  out: string,
  artifacts: PreviewArtifact[],
): Promise<SceneResult> {
  const result: SceneResult = { ...scene, status: 'passed', steps: [], artifacts: [] };
  const failures: string[] = [];
  const directory = join(out, scene.id);
  mkdirSync(directory);
  const actionLog = join(directory, 'actions.log');
  writeFileSync(actionLog, `Scene: ${scene.title}\n`, { flag: 'wx' });
  const logAction = (line: string) => appendFileSync(actionLog, `${line}\n`);
  const session = `nb-preview-${process.pid}-${randomUUID().slice(0, 8)}`;
  const config = join(directory, 'browser-config.json');
  const execute = createPreviewBrowserRunner(join(root, 'node_modules/.bin/agent-browser'), root, session, config);
  const run = async (args: readonly string[]): Promise<string> => {
    logAction(
      `${new Date().toISOString()} $ agent-browser --session ${session} --config ${JSON.stringify(config)} ${args.map((arg) => JSON.stringify(arg)).join(' ')}`,
    );
    try {
      const output = await execute(args);
      logAction(output);
      return output;
    } catch (error) {
      logAction(`ERROR ${String(error)}`);
      throw error;
    }
  };
  const observe = async <T>(expression: string): Promise<T> => {
    const response = JSON.parse(await run(['eval', expression, '--json'])) as {
      success: boolean;
      data?: { result: T };
      error?: unknown;
    };
    assert.equal(response.success, true, JSON.stringify(response.error));
    assert.ok(response.data, 'Browser observation returned no result.');
    return response.data.result;
  };
  const remember = (file: string, kind: PreviewArtifact['kind']) => {
    const path = `${scene.id}/${file}`;
    const content = readFileSync(join(out, path));
    assert.ok(content.length, `Empty evidence: ${path}`);
    artifacts.push({ path, kind, sha256: digest(content) });
    result.artifacts.push(path);
  };
  const capture = async (name: string) => {
    await run(['screenshot', join(directory, `${name}.png`), '--full']);
    remember(`${name}.png`, 'screenshot');
    writeFileSync(join(directory, `${name}.snapshot.json`), `${await run(['snapshot', '--json'])}\n`);
    remember(`${name}.snapshot.json`, 'snapshot');
  };
  const step = async (label: string, action: () => Promise<unknown>) => {
    result.steps.push(label);
    logAction(`STEP ${label}`);
    await action();
  };
  const metrics = async (expected: Record<string, string>) => {
    const actual = await observe(`new Promise((resolve, reject) => {
      const expected = ${JSON.stringify(expected)}, deadline = Date.now() + 5000;
      const read = () => {
        const actual = Object.fromEntries(Object.keys(expected).map(name => [name,
          document.querySelector('[data-example-metric="' + name + '"]')?.textContent]));
        if (Object.entries(expected).every(([name, value]) => actual[name] === value)) return resolve(actual);
        if (Date.now() >= deadline) return reject(new Error('Metrics did not reach ' + JSON.stringify(expected) + '; actual=' + JSON.stringify(actual)));
        setTimeout(read, 25);
      };
      read();
    })`);
    assert.deepEqual(actual, expected);
  };
  const control = (name: string) => run(['click', `[aria-label="${name}"]`]);
  const center = async (selector: string) => {
    const point = await observe<{ x: number; y: number } | null>(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
    })()`);
    assert.ok(point, `Missing visible interaction target: ${selector}`);
    return point;
  };
  let recording = false;
  let client: CdpClient | undefined;
  let pageSession: string | undefined;
  let browserContextId: string | undefined;
  const sendPage = async (method: string, params: Readonly<Record<string, unknown>>) => {
    assert.ok(client && pageSession, 'Expected the owned Examples CDP page.');
    logAction(`CDP ${method} ${JSON.stringify(params)}`);
    return client.send(method, params, pageSession);
  };
  const shortcut = async (key: 'c' | 'd' | 'v') => {
    for (const type of ['keyDown', 'keyUp']) {
      await sendPage('Input.dispatchKeyEvent', {
        type,
        key,
        code: `Key${key.toUpperCase()}`,
        modifiers: 4,
        windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0),
      });
    }
  };
  try {
    await run(['open', `${origin}/basic-svg?lang=en`]);
    await run(['set', 'viewport', '1280', '720']);
    // 0.20 start creates an odd-height page that libx264 cannot encode. Restart
    // begins on this configured page; this fresh session has no prior recording.
    await run(['record', 'restart', join(directory, 'recording.mp4')]);
    recording = true;
    client = await CdpClient.connect(await readAgentBrowserCdpUrl(run));
    const targets = (await client.send('Target.getTargets')) as {
      targetInfos: { targetId: string; type: string; url: string; browserContextId?: string }[];
    };
    const page = targets.targetInfos.find((target) => target.type === 'page' && target.url.startsWith(origin));
    assert.ok(page, 'Expected the owned Examples Application target.');
    browserContextId = page.browserContextId;
    const attachment = (await client.send('Target.attachToTarget', { targetId: page.targetId, flatten: true })) as {
      sessionId: string;
    };
    pageSession = attachment.sessionId;
    await sendPage('Page.bringToFront', {});
    await step('Doctor: wait for the real Examples Application and its initial Canvas', async () => {
      await run(['wait', '[data-example-status="ready"]']);
      assert.equal(await observe('document.querySelectorAll("[data-nodebraid-renderer-svg-root]").length'), 1);
      await metrics({ revision: '1', nodes: '3', edges: '1', selection: 'None', zoom: '1.00×' });
    });
    await capture('before');
    if (scene.id === 'viewport') {
      await step('Zoom in through the toolbar; verify 1.20× and unchanged Document', async () => {
        await control('Zoom in');
        await metrics({ zoom: '1.20×', revision: '1', nodes: '3', edges: '1' });
        await capture('zoomed');
      });
      await step('Reset view; verify the initial 1.00× Viewport', async () => {
        await control('Reset view');
        await metrics({ zoom: '1.00×', revision: '1' });
      });
    } else if (scene.id === 'selection-history') {
      await step('Select Discover and duplicate using a native keyboard shortcut', async () => {
        await run(['click', '[data-nodebraid-node-id="example-discover"]']);
        await metrics({ selection: 'example-discover' });
        await shortcut('d');
        await metrics({ revision: '2', nodes: '4', edges: '1', selection: 'example-duplicate-node-1' });
        await capture('duplicated');
      });
      await step('Undo and redo the duplicate; verify Document counts and revision', async () => {
        await control('Undo');
        await metrics({ revision: '3', nodes: '3', selection: 'None' });
        await control('Redo');
        await metrics({ revision: '4', nodes: '4', selection: 'None' });
      });
    } else if (scene.id === 'port-connection') {
      await step('Drag Compose output Port onto Ship input Port', async () => {
        await run(['scrollintoview', '.canvas-target']);
        const source = await center(
          '[data-nodebraid-port-node-id="example-compose"][data-nodebraid-port-id="output"][data-nodebraid-port-role="source"]',
        );
        const target = await center(
          '[data-nodebraid-port-node-id="example-ship"][data-nodebraid-port-id="input"][data-nodebraid-port-role="target"]',
        );
        await sendPage('Input.dispatchMouseEvent', { type: 'mouseMoved', ...source, buttons: 0 });
        await sendPage('Input.dispatchMouseEvent', {
          type: 'mousePressed',
          ...source,
          button: 'left',
          buttons: 1,
          clickCount: 1,
        });
        await sendPage('Input.dispatchMouseEvent', { type: 'mouseMoved', ...target, button: 'left', buttons: 1 });
        assert.equal(await observe('document.querySelectorAll("[data-nodebraid-connection-preview]").length'), 1);
        await capture('connecting');
        await sendPage('Input.dispatchMouseEvent', {
          type: 'mouseReleased',
          ...target,
          button: 'left',
          buttons: 0,
          clickCount: 1,
        });
        await metrics({ revision: '2', nodes: '3', edges: '2' });
        assert.equal(await observe('document.querySelectorAll("[data-nodebraid-connection-preview]").length'), 0);
        assert.equal(await observe('document.querySelectorAll("[data-nodebraid-edge-id=example-edge-1]").length'), 1);
      });
    } else if (scene.id === 'node-authoring') {
      const createdId = 'example-node-1';
      const label = () =>
        observe<string | null>(
          `document.querySelector('[data-nodebraid-node-id="${createdId}"] [data-example-node-label]')?.textContent ?? null`,
        );
      const placeAt = async (x: number, y: number) => {
        await run(['scrollintoview', '[aria-label="Place node"]']);
        await control('Place node');
        await run(['wait', '[data-example-placement="waiting"]']);
        await run(['scrollintoview', '.canvas-target']);
        const point = await observe<{ x: number; y: number }>(`(() => {
          const bounds = document.querySelector('.canvas-target').getBoundingClientRect();
          return {x: bounds.left + ${x}, y: bounds.top + ${y}};
        })()`);
        await sendPage('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point, buttons: 0 });
        await sendPage('Input.dispatchMouseEvent', {
          type: 'mousePressed',
          ...point,
          button: 'left',
          buttons: 1,
          clickCount: 1,
        });
        await sendPage('Input.dispatchMouseEvent', {
          type: 'mouseReleased',
          ...point,
          button: 'left',
          buttons: 0,
          clickCount: 1,
        });
      };
      await step('Select a generic type and place one custom SVG Node using a native click', async () => {
        await run(['select', '[aria-label="Node type"]', 'step']);
        await placeAt(300, 400);
        await metrics({ nodes: '4', revision: '2', selection: createdId });
        assert.equal(await label(), 'Card');
        assert.equal(
          await observe(`document.querySelector('[data-example-placement]').getAttribute('data-example-placement')`),
          'idle',
        );
        await capture('created');
      });
      await step('Apply application data once, then Undo and Redo that edit', async () => {
        await run(['fill', '[aria-label="Node label"]', 'Custom card']);
        await run(['fill', '[aria-label="Tags (JSON array)"]', '["saved","中文"]']);
        assert.equal(await label(), 'Card');
        await metrics({ revision: '2' });
        await control('Apply changes');
        await metrics({ revision: '3' });
        assert.equal(await label(), 'Custom card');
        await control('Undo');
        await metrics({ revision: '4' });
        assert.equal(await label(), 'Card');
        await control('Redo');
        await metrics({ revision: '5' });
        assert.equal(await label(), 'Custom card');
        await capture('edited');
      });
      await step('Create a second visual type and restore both types and edited data from a real file', async () => {
        await run(['select', '[aria-label="Node type"]', 'note']);
        await placeAt(520, 400);
        await metrics({ nodes: '5', revision: '6', selection: 'example-node-2' });
        assert.equal(
          await observe(`document.querySelectorAll('[data-nodebraid-node-id="example-node-2"] ellipse').length`),
          1,
        );
        assert.ok(client, 'Expected the owned browser connection.');
        const savedPath = join(directory, 'nodes.json');
        await downloadBrowserFile(client, run, '[aria-label="Export document"]', savedPath, browserContextId);
        const saved = JSON.parse(readFileSync(savedPath, 'utf8'));
        assert.deepEqual(JSON.parse(saved.nodes.find((node: { id: string }) => node.id === createdId).data), {
          label: 'Custom card',
          tags: ['saved', '中文'],
        });
        remember('nodes.json', 'snapshot');
        await run(['reload']);
        await run(['wait', '[data-example-status="ready"]']);
        await run(['upload', '[aria-label="Document file"]', savedPath]);
        await metrics({ nodes: '5', edges: '1', history: '— / —' });
        assert.equal(await label(), 'Custom card');
        const restoredPath = join(directory, 'restored-nodes.json');
        await downloadBrowserFile(client, run, '[aria-label="Export document"]', restoredPath, browserContextId);
        assert.deepEqual(JSON.parse(readFileSync(restoredPath, 'utf8')), saved);
        remember('restored-nodes.json', 'snapshot');
      });
    } else if (scene.id === 'document-files') {
      const documentPath = join(directory, 'document.json');
      await step('Edit and download a real complete Document file', async () => {
        await run(['click', '[data-nodebraid-node-id="example-discover"]']);
        await shortcut('d');
        await metrics({ nodes: '4', revision: '2' });
        assert.ok(client, 'Expected the owned browser connection.');
        await downloadBrowserFile(client, run, '[aria-label="Export document"]', documentPath, browserContextId);
        const saved = JSON.parse(readFileSync(documentPath, 'utf8'));
        assert.equal(saved.type, 'nodebraid/document');
        assert.equal(saved.version, 1);
        assert.equal(saved.nodes.length, 4);
        assert.equal(saved.edges.length, 1);
        assert.equal('revision' in saved, false);
        remember('document.json', 'snapshot');
        await capture('exported');
      });
      await step('Reopen the application and upload the downloaded file', async () => {
        await run(['reload']);
        await run(['wait', '[data-example-status="ready"]']);
        await metrics({ nodes: '3', revision: '1' });
        await run(['upload', '[aria-label="Document file"]', documentPath]);
        await metrics({ nodes: '4', edges: '1', history: '— / —' });
        assert.equal(await observe('document.querySelector("[aria-label=Undo]").disabled'), true);
        assert.equal(
          await observe('document.querySelectorAll("[data-nodebraid-node-id=example-duplicate-node-1]").length'),
          1,
        );
        const restored = join(directory, 'restored.json');
        assert.ok(client, 'Expected the owned browser connection.');
        await downloadBrowserFile(client, run, '[aria-label="Export document"]', restored, browserContextId);
        assert.deepEqual(JSON.parse(readFileSync(restored, 'utf8')), JSON.parse(readFileSync(documentPath, 'utf8')));
        remember('restored.json', 'snapshot');
        await capture('restored');
      });
      await step('Continue editing and Undo only the new edit', async () => {
        await run(['click', '[data-nodebraid-node-id="example-discover"]']);
        await shortcut('d');
        await metrics({ nodes: '5' });
        assert.equal(
          await observe('document.querySelectorAll("[data-nodebraid-node-id=example-duplicate-node-2]").length'),
          1,
        );
        await control('Undo');
        await metrics({ nodes: '4', history: '— / Redo' });
        assert.equal(
          await observe('document.querySelectorAll("[data-nodebraid-node-id=example-duplicate-node-1]").length'),
          1,
        );
        assert.equal(await observe('document.querySelector("[aria-label=Undo]").disabled'), true);
      });
    } else {
      await step('Grant clipboard permission only to this isolated browser context', async () => {
        assert.ok(client && browserContextId, 'Expected the owned Clipboard browser context.');
        for (const name of ['clipboard-read', 'clipboard-write']) {
          logAction(`CDP Browser.setPermission ${name} granted ${browserContextId}`);
          await client.send('Browser.setPermission', {
            permission: { name },
            setting: 'granted',
            origin,
            embeddedOrigin: origin,
            browserContextId,
          });
        }
        assert.equal(
          await observe("navigator.permissions.query({name:'clipboard-read'}).then(permission => permission.state)"),
          'granted',
        );
      });
      await step('Copy Discover, paste it, and verify the resulting Canvas', async () => {
        await run(['click', '[data-nodebraid-node-id="example-discover"]']);
        await metrics({ selection: 'example-discover' });
        await shortcut('c');
        const clipboard = await observe<string>('navigator.clipboard.readText()');
        assert.ok(JSON.parse(clipboard).fragment, 'Native copy must produce an Examples Canvas Fragment envelope.');
        await shortcut('v');
        await metrics({ revision: '2', nodes: '4', edges: '1', selection: 'example-clipboard-node-1' });
      });
    }
    await capture('after');
  } catch (error) {
    failures.push(String(error));
    try {
      await capture('failure');
    } catch (captureError) {
      failures.push(`Failure capture: ${String(captureError)}`);
    }
  } finally {
    if (recording) {
      try {
        await run(['record', 'stop']);
        remember('recording.mp4', 'recording');
        const args = [
          '-n',
          '-i',
          join(directory, 'recording.mp4'),
          '-vf',
          'setpts=15*PTS',
          '-r',
          '30',
          '-an',
          '-c:v',
          'libx264',
          '-pix_fmt',
          'yuv420p',
          '-movflags',
          '+faststart',
          join(directory, 'review.mp4'),
        ];
        const command = `ffmpeg ${args.map((arg) => JSON.stringify(arg)).join(' ')}`;
        logAction(`REVIEW VIDEO: 15× slow playback of captured frames; not a performance measurement.\n$ ${command}`);
        const logPath = join(directory, 'review-encoding.log');
        writeFileSync(logPath, `$ ${command}\n`, { flag: 'wx' });
        const log = openSync(logPath, 'a');
        let encoding;
        try {
          encoding = spawnSync('ffmpeg', args, { stdio: ['ignore', log, log] });
        } finally {
          closeSync(log);
          remember('review-encoding.log', 'log');
        }
        assert.ifError(encoding.error);
        assert.equal(encoding.status, 0, 'Review video encoding failed; see review-encoding.log.');
        remember('review.mp4', 'recording');
      } catch (error) {
        failures.push(`Recording: ${String(error)}`);
      }
    }
    client?.close();
    try {
      await run(['close']);
    } catch (error) {
      failures.push(`Cleanup: ${String(error)}`);
    }
    remember('actions.log', 'log');
  }
  if (failures.length) {
    result.status = 'failed';
    result.error = failures.join('\n');
  }
  return result;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
