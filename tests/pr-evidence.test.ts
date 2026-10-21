import { afterEach, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  loadEvidenceBundle,
  renderEvidenceBlock,
  replaceEvidenceBlock,
  publishEvidence,
  resolveEvidencePullRequest,
} from '../scripts/pr-evidence';

const directories: string[] = [];
const head = 'a'.repeat(40);
const source = { base: 'b'.repeat(40), head, tree: 'c'.repeat(40), patch: 'd'.repeat(64) };
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'nodebraid-evidence-'));
  directories.push(directory);
  const bytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN3sAAAAASUVORK5CYII=',
    'base64',
  );
  writeFileSync(join(directory, 'after.png'), bytes);
  const manifest = {
    schemaVersion: 1,
    source,
    status: 'passed',
    scenes: [
      { id: 'viewport', title: 'Zoom and reset', status: 'passed', steps: ['Click Zoom in'], artifacts: ['after.png'] },
    ],
    artifacts: [{ path: 'after.png', kind: 'screenshot', sha256: createHash('sha256').update(bytes).digest('hex') }],
  };
  writeFileSync(join(directory, 'preview.json'), JSON.stringify(manifest));
  return { directory, manifest };
}
afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

test('publishes actual checksummed evidence and preserves author text on repeated updates', async () => {
  const { directory } = fixture();
  const bundle = await loadEvidenceBundle(directory, head);
  const block = renderEvidenceBlock(bundle, 'ZWkang/nodebraid', 45);
  const body = replaceEvidenceBlock('## Purpose\n\nKeep this explanation.', block);
  expect(body).toContain('Keep this explanation.');
  expect(body).toContain('after.png');
  expect(body).toContain(head);
  expect(replaceEvidenceBlock(body, block)).toBe(body);
  expect(block).toContain('未提供');
});

test('rejects stale source, tampered bytes and files outside the evidence directory', async () => {
  const { directory, manifest } = fixture();
  await expect(loadEvidenceBundle(directory, 'e'.repeat(40))).rejects.toThrow(/head/i);
  writeFileSync(join(directory, 'after.png'), 'changed');
  await expect(loadEvidenceBundle(directory, head)).rejects.toThrow(/digest|hash/i);
  manifest.artifacts[0]!.path = '../outside.png';
  writeFileSync(join(directory, 'preview.json'), JSON.stringify(manifest));
  await expect(loadEvidenceBundle(directory, head)).rejects.toThrow(/path/i);
});

test('rejects symlinks and inconsistent scene artifact references', async () => {
  const { directory, manifest } = fixture();
  mkdirSync(join(directory, 'linked'));
  symlinkSync(join(directory, 'after.png'), join(directory, 'linked', 'alias.png'));
  manifest.artifacts[0]!.path = 'linked/alias.png';
  writeFileSync(join(directory, 'preview.json'), JSON.stringify(manifest));
  await expect(loadEvidenceBundle(directory, head)).rejects.toThrow(/symlink/i);
  manifest.artifacts[0]!.path = 'after.png';
  manifest.scenes[0]!.artifacts = ['missing.png'];
  writeFileSync(join(directory, 'preview.json'), JSON.stringify(manifest));
  await expect(loadEvidenceBundle(directory, head)).rejects.toThrow(/artifact/i);
});

test('a failed scenario stays failed in the published report', async () => {
  const { directory, manifest } = fixture();
  manifest.status = 'failed';
  manifest.scenes[0]!.status = 'failed';
  Object.assign(manifest.scenes[0]!, { error: 'Expected zoom 1.20, received 1.00' });
  writeFileSync(join(directory, 'preview.json'), JSON.stringify(manifest));
  const block = renderEvidenceBlock(await loadEvidenceBundle(directory, head), 'ZWkang/nodebraid', 45);
  expect(block).toContain('failed');
  expect(block).toContain('Expected zoom');
});

test('a changed PR head prevents all publication writes', async () => {
  const { directory } = fixture();
  const bundle = await loadEvidenceBundle(directory, head);
  const requests: string[] = [];
  const server = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    fetch(request) {
      requests.push(request.method);
      return Response.json({
        state: 'open',
        head: { sha: 'e'.repeat(40) },
        base: { repo: { full_name: 'ZWkang/nodebraid' } },
      });
    },
  });
  try {
    await expect(
      publishEvidence(bundle, { repository: 'ZWkang/nodebraid', pr: 45, token: 'test-token', api: server.url.origin }),
    ).rejects.toThrow(/head/i);
    expect(requests).toEqual(['GET']);
  } finally {
    await server.stop(true);
  }
});

test('publishes media through Git data, updates only the evidence block and reads it back', async () => {
  const { directory } = fixture();
  const bundle = await loadEvidenceBundle(directory, head);
  let body = '## Author summary\n\nKeep my explanation.';
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  const server = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    async fetch(request) {
      const path = new URL(request.url).pathname.replace('/repos/ZWkang/nodebraid', '');
      if (request.method !== 'GET') {
        const data = (await request.json()) as Record<string, unknown>;
        writes.push({ path, body: data });
        if (path === '/git/blobs')
          return Response.json({ sha: createHash('sha1').update(String(data.content)).digest('hex') });
        if (path === '/git/trees') return Response.json({ sha: '1'.repeat(40) });
        if (path === '/git/commits') return Response.json({ sha: '2'.repeat(40) });
        if (path === '/git/refs') return Response.json({ ref: data.ref, object: { sha: data.sha } });
        if (path === '/pulls/45') {
          body = String(data.body);
          return Response.json({ body });
        }
      }
      if (path === '/pulls/45')
        return Response.json({
          state: 'open',
          head: { sha: head },
          base: { repo: { full_name: 'ZWkang/nodebraid' } },
          body,
        });
      if (path === `/git/commits/${head}`) return Response.json({ tree: { sha: source.tree } });
      return Response.json({ message: 'Not found' }, { status: 404 });
    },
  });
  try {
    const receipt = await publishEvidence(bundle, {
      repository: 'ZWkang/nodebraid',
      pr: 45,
      token: 'test-token',
      api: server.url.origin,
    });
    expect(receipt.head).toBe(head);
    expect(receipt.body).toContain('Keep my explanation.');
    expect(writes.find((write) => write.path === '/git/refs')?.body.ref).toBe('refs/heads/pr-evidence');
    const tree = writes.find((write) => write.path === '/git/trees')!.body.tree as { path: string }[];
    expect(tree.map((entry) => entry.path)).toEqual([
      `pr-45/${head}/preview/after.png`,
      `pr-45/${head}/preview/preview.json`,
    ]);
    expect(writes.filter((write) => write.path === '/pulls/45')).toHaveLength(1);
  } finally {
    await server.stop(true);
  }
});

test('cannot publish claimed evidence for another source tree', async () => {
  const { directory } = fixture();
  const bundle = await loadEvidenceBundle(directory, head);
  const writes: string[] = [];
  const server = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    fetch(request) {
      if (request.method !== 'GET') writes.push(request.method);
      if (request.url.endsWith('/pulls/45'))
        return Response.json({ state: 'open', head: { sha: head }, base: { repo: { full_name: 'ZWkang/nodebraid' } } });
      return Response.json({ tree: { sha: 'f'.repeat(40) } });
    },
  });
  try {
    await expect(
      publishEvidence(bundle, { repository: 'ZWkang/nodebraid', pr: 45, token: 'test-token', api: server.url.origin }),
    ).rejects.toThrow(/tree/i);
    expect(writes).toEqual([]);
  } finally {
    await server.stop(true);
  }
});

test('rejects a success claim without screenshots and malformed PR markers', async () => {
  const { directory, manifest } = fixture();
  manifest.scenes[0]!.artifacts = [];
  writeFileSync(join(directory, 'preview.json'), JSON.stringify(manifest));
  await expect(loadEvidenceBundle(directory, head)).rejects.toThrow(/screenshot/i);
  expect(() => replaceEvidenceBlock('author\n<!-- nodebraid-evidence:begin -->unfinished', 'new')).toThrow(/markers/i);
});

test('resolves an empty workflow PR association from current commit-linked PRs only', () => {
  const current = { number: 45, state: 'open', head: { sha: head }, base: { repo: { full_name: 'ZWkang/nodebraid' } } };
  const closed = { ...current, number: 10, state: 'closed' };
  expect(resolveEvidencePullRequest([closed, current], 'ZWkang/nodebraid', head)).toBe(45);
  expect(() => resolveEvidencePullRequest([closed], 'ZWkang/nodebraid', head)).toThrow(/current|head/);
  expect(() => resolveEvidencePullRequest([current, { ...current, number: 46 }], 'ZWkang/nodebraid', head)).toThrow(
    /ambiguous/,
  );
});

test('untrusted preview names cannot address the independent review namespace', async () => {
  const { directory, manifest } = fixture();
  mkdirSync(join(directory, 'logs'));
  const forgedLog = Buffer.from('invented check success');
  const forgedReport = Buffer.from('{"review":"invented"}');
  writeFileSync(join(directory, 'logs/full-check.log'), forgedLog);
  writeFileSync(join(directory, 'report.json'), forgedReport);
  manifest.artifacts.push(
    { path: 'logs/full-check.log', kind: 'log', sha256: createHash('sha256').update(forgedLog).digest('hex') },
    { path: 'report.json', kind: 'snapshot', sha256: createHash('sha256').update(forgedReport).digest('hex') },
  );
  writeFileSync(join(directory, 'preview.json'), JSON.stringify(manifest));
  const bundle = await loadEvidenceBundle(directory, head, true);
  expect([...bundle.files.keys()]).toContain('preview/logs/full-check.log');
  expect([...bundle.files.keys()]).toContain('preview/report.json');
  expect([...bundle.files.keys()].every((path) => path.startsWith('preview/'))).toBe(true);
  expect(bundle.report).toBeUndefined();
});

for (const incomingKind of ['preview', 'review'] as const) {
  test(`${incomingKind}-only publication refuses a different saved base/patch before uploading`, async () => {
    const { directory } = fixture();
    if (incomingKind === 'review') {
      rmSync(join(directory, 'preview.json'));
      const bytes = Buffer.from('# Actual independent report');
      writeFileSync(join(directory, 'report.md'), bytes);
      writeFileSync(
        join(directory, 'report.json'),
        JSON.stringify({
          schemaVersion: 1,
          source,
          artifacts: [{ path: 'report.md', kind: 'report', sha256: createHash('sha256').update(bytes).digest('hex') }],
        }),
      );
    }
    const bundle = await loadEvidenceBundle(directory, head);
    const counterpart = incomingKind === 'preview' ? 'review/report.json' : 'preview/preview.json';
    const writes: string[] = [];
    const server = Bun.serve({
      port: 0,
      hostname: '127.0.0.1',
      fetch(request) {
        const path = new URL(request.url).pathname;
        if (request.method !== 'GET') {
          writes.push(path);
          return new Response('Unexpected write', { status: 500 });
        }
        if (path.endsWith('/pulls/45'))
          return Response.json({
            state: 'open',
            head: { sha: head },
            base: { repo: { full_name: 'ZWkang/nodebraid' } },
            body: 'original',
          });
        if (path.includes('/git/ref/')) return Response.json({ object: { sha: 'f'.repeat(40) } });
        if (path.includes('/git/commits/')) return Response.json({ tree: { sha: source.tree } });
        if (path.endsWith(counterpart))
          return Response.json({
            encoding: 'base64',
            content: Buffer.from(
              JSON.stringify({
                schemaVersion: 1,
                source: { ...source, base: 'e'.repeat(40), patch: 'f'.repeat(64) },
                artifacts: [],
              }),
            ).toString('base64'),
          });
        return new Response('Missing', { status: 404 });
      },
    });
    try {
      await expect(
        publishEvidence(bundle, {
          repository: 'ZWkang/nodebraid',
          pr: 45,
          token: 'test-token',
          api: server.url.origin,
        }),
      ).rejects.toThrow(/base|scope/);
      expect(writes).toEqual([]);
    } finally {
      await server.stop(true);
    }
  });
}

test('preserving a previous report requires its original artifact bytes to match', async () => {
  const { directory } = fixture();
  const bundle = await loadEvidenceBundle(directory, head);
  const writes: string[] = [];
  const saved = {
    schemaVersion: 1,
    source,
    artifacts: [
      { path: 'report.md', kind: 'report', sha256: createHash('sha256').update('original review').digest('hex') },
    ],
  };
  const server = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    fetch(request) {
      const path = new URL(request.url).pathname;
      if (request.method !== 'GET') {
        writes.push(path);
        return new Response('Unexpected write', { status: 500 });
      }
      if (path.endsWith('/pulls/45'))
        return Response.json({
          state: 'open',
          head: { sha: head },
          base: { repo: { full_name: 'ZWkang/nodebraid' } },
          body: 'original',
        });
      if (path.includes('/git/ref/')) return Response.json({ object: { sha: 'f'.repeat(40) } });
      if (path.includes('/git/commits/')) return Response.json({ tree: { sha: source.tree } });
      if (path.endsWith('/review/report.json'))
        return Response.json({ encoding: 'base64', content: Buffer.from(JSON.stringify(saved)).toString('base64') });
      if (path.endsWith('/review/report.md'))
        return Response.json({ encoding: 'base64', content: Buffer.from('tampered review').toString('base64') });
      return new Response('Missing', { status: 404 });
    },
  });
  try {
    await expect(
      publishEvidence(bundle, { repository: 'ZWkang/nodebraid', pr: 45, token: 'test-token', api: server.url.origin }),
    ).rejects.toThrow(/digest/);
    expect(writes).toEqual([]);
  } finally {
    await server.stop(true);
  }
});
