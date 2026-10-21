import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

export interface EvidenceSource {
  base: string;
  head: string;
  tree: string;
  patch: string;
  localHead?: string;
}
interface Artifact {
  path: string;
  kind: 'screenshot' | 'recording' | 'snapshot' | 'log' | 'report';
  sha256: string;
}
interface Scene {
  id: string;
  title: string;
  status: 'passed' | 'failed';
  steps: string[];
  artifacts: string[];
  error?: string;
}
export interface PreviewEvidence {
  schemaVersion: 1;
  source: EvidenceSource;
  status: 'passed' | 'failed' | 'not-applicable';
  reason?: string;
  limitations?: string[];
  scenes: Scene[];
  artifacts: Artifact[];
}
export interface EvidenceBundle {
  source: EvidenceSource;
  preview?: PreviewEvidence;
  report?: string;
  files: Map<string, Buffer>;
}

const BEGIN = '<!-- nodebraid-evidence:begin -->';
const END = '<!-- nodebraid-evidence:end -->';
const BRANCH = 'pr-evidence';
const hash = (value: Buffer) => createHash('sha256').update(value).digest('hex');
const text = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/[\\`*_{}[\]]/g, (character) => `\\${character}`);

function validateSource(source: EvidenceSource, head: string) {
  assert.ok(
    source && [source.base, source.head, source.tree].every((value) => /^[a-f0-9]{40}$/.test(value)),
    'Invalid evidence source',
  );
  assert.match(source.patch, /^[a-f0-9]{64}$/, 'Invalid patch digest');
  assert.equal(source.head, head, 'Evidence head differs from the requested head');
}

function validatePath(path: string): void {
  assert.ok(
    /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(path) &&
      path.split('/').every((part) => part && part !== '.' && part !== '..'),
    'Invalid artifact path',
  );
}

async function readArtifact(directory: string, path: string): Promise<Buffer> {
  validatePath(path);
  const root = await realpath(directory);
  let current = root;
  for (const part of path.split('/')) {
    current = resolve(current, part);
    assert.equal((await lstat(current)).isSymbolicLink(), false, 'Artifact symlinks are not allowed');
  }
  assert.ok((await realpath(current)).startsWith(`${root}${sep}`), 'Artifact path leaves evidence directory');
  assert.ok((await lstat(current)).isFile(), 'Artifact must be a regular file');
  return readFile(current);
}

type EvidenceKind = 'preview' | 'review';
type EvidenceReader = (kind: EvidenceKind, path: string) => Promise<Buffer | undefined>;

async function collectEvidence(
  read: EvidenceReader,
  head: string,
  kinds: EvidenceKind[],
  previewOnly = false,
  expectedSource?: EvidenceSource,
): Promise<EvidenceBundle | undefined> {
  const files = new Map<string, Buffer>();
  let source: EvidenceSource | undefined;
  let preview: PreviewEvidence | undefined;
  let report: string | undefined;
  for (const kind of kinds) {
    const name = kind === 'preview' ? 'preview.json' : 'report.json';
    const bytes = await read(kind, name);
    if (!bytes) continue;
    const manifest = JSON.parse(bytes.toString('utf8')) as {
      schemaVersion: number;
      source: EvidenceSource;
      artifacts: Artifact[];
    };
    assert.equal(manifest.schemaVersion, 1, 'Unknown evidence version');
    validateSource(manifest.source, head);
    if (expectedSource)
      for (const key of ['base', 'head', 'tree', 'patch'] as const)
        assert.equal(
          manifest.source[key],
          expectedSource[key],
          `Published evidence ${key} differs from the incoming scope`,
        );
    if (source) {
      assert.equal(manifest.source.tree, source.tree, 'Reports describe different trees');
      assert.equal(manifest.source.base, source.base, 'Reports describe different bases');
      assert.equal(manifest.source.patch, source.patch, 'Reports describe different patches');
    }
    source = manifest.source;
    assert.ok(Array.isArray(manifest.artifacts), 'Missing artifact list');
    const declared = new Set<string>();
    for (const artifact of manifest.artifacts) {
      assert.ok(!declared.has(artifact.path), 'Duplicate artifact path');
      declared.add(artifact.path);
      validatePath(artifact.path);
      const content = await read(kind, artifact.path);
      assert.ok(content, `Missing declared artifact: ${kind}/${artifact.path}`);
      assert.equal(hash(content), artifact.sha256, 'Artifact digest does not match its bytes');
      const extensions: Record<Artifact['kind'], string[]> = {
        screenshot: ['.png'],
        recording: ['.mp4'],
        snapshot: ['.txt', '.json'],
        log: ['.txt', '.log'],
        report: ['.md', '.json'],
      };
      assert.ok(extensions[artifact.kind]?.includes(extname(artifact.path)), 'Unsupported artifact kind or extension');
      if (previewOnly) assert.notEqual(artifact.kind, 'report', 'PR code cannot supply an independent review report');
      if (artifact.kind === 'screenshot')
        assert.ok(
          content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
          'Invalid PNG artifact',
        );
      if (artifact.kind === 'recording')
        assert.ok(content.subarray(4, 8).equals(Buffer.from('ftyp')), 'Invalid MP4 artifact');
      files.set(`${kind}/${artifact.path}`, content);
    }
    files.set(`${kind}/${name}`, bytes);
    if (name === 'preview.json') {
      preview = manifest as PreviewEvidence;
      assert.ok(['passed', 'failed', 'not-applicable'].includes(preview.status), 'Invalid preview outcome');
      assert.ok(Array.isArray(preview.scenes), 'Missing preview scenes');
      for (const scene of preview.scenes) {
        assert.ok(scene.id && scene.title && ['passed', 'failed'].includes(scene.status), 'Invalid scene');
        assert.ok(
          Array.isArray(scene.steps) && scene.steps.every((step) => typeof step === 'string'),
          'Invalid scene steps',
        );
        assert.ok(
          Array.isArray(scene.artifacts) && scene.artifacts.every((file) => declared.has(file)),
          'Scene refers to an undeclared artifact',
        );
        if (scene.status === 'failed') assert.ok(scene.error, 'Failed scene needs its error');
        if (scene.status === 'passed')
          assert.ok(
            scene.artifacts.some((file) =>
              manifest.artifacts.some((artifact) => artifact.path === file && artifact.kind === 'screenshot'),
            ),
            'Passed scene needs screenshot evidence',
          );
      }
      if (preview.status === 'passed')
        assert.ok(
          preview.scenes.length && preview.scenes.every((scene) => scene.status === 'passed'),
          'Passed preview needs passed scenes',
        );
      if (preview.status === 'not-applicable')
        assert.ok(preview.reason && !preview.scenes.length, 'Inapplicable preview needs a reason and no scenes');
      if (preview.status === 'failed')
        assert.ok(
          preview.reason || preview.scenes.some((scene) => scene.status === 'failed'),
          'Failed preview needs a failure reason',
        );
    } else {
      assert.ok(declared.has('report.md'), 'Missing human-readable report artifact');
      report = files.get('review/report.md')!.toString('utf8');
    }
  }
  return source ? { source, preview, report, files } : undefined;
}

export async function loadEvidenceBundle(
  directory: string,
  head: string,
  previewOnly = false,
): Promise<EvidenceBundle> {
  const bundle = await collectEvidence(
    async (_kind, name) => {
      validatePath(name);
      const exists = await lstat(resolve(directory, name)).then(
        () => true,
        (error: NodeJS.ErrnoException) => {
          if (error.code === 'ENOENT') return false;
          throw error;
        },
      );
      return exists ? readArtifact(directory, name) : undefined;
    },
    head,
    previewOnly ? ['preview'] : ['preview', 'review'],
    previewOnly,
  );
  assert.ok(bundle, 'No evidence manifest was produced');
  return bundle;
}

export function renderEvidenceBlock(bundle: EvidenceBundle, repository: string, pr: number): string {
  const prefix = `pr-${pr}/${bundle.source.head}`;
  const raw = `https://raw.githubusercontent.com/${repository}/${BRANCH}/${prefix}/`;
  const browse = `https://github.com/${repository}/blob/${BRANCH}/${prefix}/`;
  const lines = [
    BEGIN,
    '### 审查、验证与界面证据',
    '',
    `提交：\`${bundle.source.head}\` · tree：\`${bundle.source.tree}\``,
    '',
  ];
  if (bundle.report) lines.push(`[完整审查与验证报告](${browse}review/report.md)`, '');
  else lines.push('独立审查与本地验证报告：未提供。下面的界面证据不代表两轴审查或完整工程检查通过。', '');
  if (bundle.preview) {
    const preview = bundle.preview;
    lines.push(`界面预览：**${preview.status}**${preview.reason ? ` — ${text(preview.reason)}` : ''}`, '');
    if (preview.limitations?.length) lines.push(...preview.limitations.map((item) => `- 未覆盖：${text(item)}`), '');
    for (const scene of preview.scenes) {
      lines.push(
        `#### ${text(scene.title)} · ${scene.status}`,
        '',
        ...scene.steps.map((step, index) => `${index + 1}. ${text(step)}`),
        '',
      );
      if (scene.error) lines.push(`失败：${text(scene.error)}`, '');
      for (const file of scene.artifacts) {
        if (file.endsWith('.png'))
          lines.push(`**${text(file.split('/').at(-1)!)}**`, '', `![${text(scene.title)}](${raw}preview/${file})`, '');
        else if (file.endsWith('.mp4'))
          lines.push(
            `[${file.endsWith('/review.mp4') ? '慢放录屏（1/15 速，仅供审阅）' : '原始录屏 MP4'}](${raw}preview/${file})`,
            '',
          );
        else lines.push(`[${text(file)}](${browse}preview/${file})`, '');
      }
    }
    const shown = new Set(preview.scenes.flatMap((scene) => scene.artifacts));
    for (const artifact of preview.artifacts.filter((artifact) => !shown.has(artifact.path)))
      lines.push(`[${text(artifact.path)}](${browse}preview/${artifact.path})`, '');
    lines.push(`[场景与产物清单](${browse}preview/preview.json)`, '');
  } else lines.push('界面预览：未提供；不能据此认定没有可见变化。', '');
  lines.push(END);
  return lines.join('\n');
}

export function replaceEvidenceBlock(body: string, block: string): string {
  const begin = body.indexOf(BEGIN),
    end = body.indexOf(END);
  assert.equal(begin < 0, end < 0, 'Incomplete evidence markers in PR body');
  if (begin < 0) return `${body.trimEnd()}\n\n${block}\n`;
  assert.ok(
    end > begin && body.indexOf(BEGIN, begin + BEGIN.length) < 0 && body.indexOf(END, end + END.length) < 0,
    'Ambiguous evidence markers in PR body',
  );
  return body.slice(0, begin) + block + body.slice(end + END.length);
}

export function resolveEvidencePullRequest(
  pulls: { number: number; state: string; head: { sha: string }; base: { repo: { full_name: string } } }[],
  repository: string,
  head: string,
): number {
  const matching = pulls.filter(
    (pr) => pr.state === 'open' && pr.head.sha === head && pr.base.repo.full_name === repository,
  );
  assert.equal(
    matching.length,
    1,
    'Expected exactly one open PR at the producer head; refuse stale or ambiguous evidence',
  );
  return matching[0]!.number;
}

interface PullRequest {
  state: string;
  head: { sha: string };
  base: { repo: { full_name: string } };
  body: string | null;
}
interface PublishOptions {
  repository: string;
  pr: number;
  token: string;
  api?: string;
}

export async function publishEvidence(bundle: EvidenceBundle, options: PublishOptions) {
  assert.match(options.repository, /^[\w.-]+\/[\w.-]+$/);
  assert.ok(
    Number.isSafeInteger(options.pr) && options.pr > 0 && options.token,
    'Repository, PR and token are required',
  );
  const root = `/repos/${options.repository}`;
  async function request<T>(path: string, method = 'GET', data?: unknown, absent = false): Promise<T | undefined> {
    const response = await fetch(`${options.api ?? 'https://api.github.com'}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${options.token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
    if (absent && response.status === 404) return undefined;
    if (!response.ok) throw new Error(`GitHub ${method} ${path}: ${response.status} ${await response.text()}`);
    return response.json() as Promise<T>;
  }
  async function current() {
    const pr = (await request<PullRequest>(`${root}/pulls/${options.pr}`))!;
    assert.equal(pr.state, 'open', 'PR is no longer open');
    assert.equal(pr.base.repo.full_name, options.repository, 'PR belongs to another repository');
    assert.equal(pr.head.sha, bundle.source.head, 'PR head changed; refuse stale evidence publication');
    return pr;
  }
  await current();
  const checkedCommit = (await request<{ tree: { sha: string } }>(`${root}/git/commits/${bundle.source.head}`))!;
  assert.equal(checkedCommit.tree.sha, bundle.source.tree, 'Evidence tree differs from the published source');
  const previous = await request<{ object: { sha: string } }>(
    `${root}/git/ref/heads/${BRANCH}`,
    'GET',
    undefined,
    true,
  );
  const commit = previous
    ? await request<{ tree: { sha: string } }>(`${root}/git/commits/${previous.object.sha}`)
    : undefined;
  const prefix = `pr-${options.pr}/${bundle.source.head}`;
  if (previous) {
    const missing: EvidenceKind[] = [
      ...(!bundle.preview ? ['preview' as const] : []),
      ...(!bundle.report ? ['review' as const] : []),
    ];
    const existing = await collectEvidence(
      async (kind, path) => {
        validatePath(path);
        const file = await request<{ content: string; encoding: string; sha: string }>(
          `${root}/contents/${prefix}/${kind}/${path}?ref=${previous.object.sha}`,
          'GET',
          undefined,
          true,
        );
        if (!file) return undefined;
        const blob =
          file.encoding === 'base64'
            ? file
            : (await request<{ content: string; encoding: string }>(`${root}/git/blobs/${file.sha}`))!;
        assert.equal(blob.encoding, 'base64', 'Unsupported evidence blob encoding');
        return Buffer.from(blob.content, 'base64');
      },
      bundle.source.head,
      missing,
      false,
      bundle.source,
    );
    if (existing) {
      bundle = { ...bundle, preview: bundle.preview ?? existing.preview, report: bundle.report ?? existing.report };
    }
  }
  const entries = [];
  for (const [path, content] of bundle.files) {
    const blob = (await request<{ sha: string }>(`${root}/git/blobs`, 'POST', {
      content: content.toString('base64'),
      encoding: 'base64',
    }))!;
    entries.push({ path: `${prefix}/${path}`, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const tree = (await request<{ sha: string }>(`${root}/git/trees`, 'POST', {
    ...(commit ? { base_tree: commit.tree.sha } : {}),
    tree: entries,
  }))!;
  const next = (await request<{ sha: string }>(`${root}/git/commits`, 'POST', {
    message: `docs: publish evidence for #${options.pr} at ${bundle.source.head.slice(0, 7)}`,
    tree: tree.sha,
    parents: previous ? [previous.object.sha] : [bundle.source.head],
  }))!;
  await current();
  if (previous) await request(`${root}/git/refs/heads/${BRANCH}`, 'PATCH', { sha: next.sha, force: false });
  else await request(`${root}/git/refs`, 'POST', { ref: `refs/heads/${BRANCH}`, sha: next.sha });
  const pr = await current();
  const body = replaceEvidenceBlock(pr.body ?? '', renderEvidenceBlock(bundle, options.repository, options.pr));
  if (body !== pr.body) await request(`${root}/pulls/${options.pr}`, 'PATCH', { body });
  const readback = await current();
  assert.equal(readback.body, body, 'PR evidence body readback differs');
  return {
    head: bundle.source.head,
    evidenceCommit: next.sha,
    url: `https://github.com/${options.repository}/pull/${options.pr}`,
    body,
  };
}
