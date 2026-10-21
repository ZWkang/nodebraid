import { afterEach, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const temporaryDirectories: string[] = [];
const repository = 'ZWkang/nodebraid';
const head = 'a'.repeat(40);

afterEach(() => {
  for (const path of temporaryDirectories.splice(0)) rmSync(path, { recursive: true, force: true });
});

test('a closed producer is explicitly inapplicable before artifact access or publication', async () => {
  const fixture = producer();
  fixture.pages[0]![0]!.state = 'closed';

  const result = await invoke(fixture);

  expect(result.exitCode).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({
    status: 'not-applicable',
    head,
    reason: 'no-open-current-head-pr',
  });
  expect(result.output).toBe('publish=false\n');
  expect(result.requests).toEqual([
    'GET /repos/ZWkang/nodebraid/actions/runs/123',
    `GET /repos/ZWkang/nodebraid/commits/${head}/pulls?per_page=100&page=1`,
  ]);
  expect(result.stdout).not.toContain('evidenceCommit');
});

test('a superseded producer cannot publish to a PR with a newer head', async () => {
  const fixture = producer();
  fixture.pages[0]![0]!.head.sha = 'b'.repeat(40);
  const result = await invoke(fixture);
  expect(result.exitCode).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({ status: 'not-applicable', reason: 'no-open-current-head-pr' });
  expect(result.output).toBe('publish=false\n');
});

test('a current producer enables publication only after every PR page is read', async () => {
  const fixture = producer();
  const current = fixture.pages[0]![0]!;
  fixture.pages = [
    Array.from({ length: 100 }, (_, index) => ({ ...current, number: index + 100, state: 'closed' })),
    [current],
  ];
  const result = await invoke(fixture);
  expect(result.exitCode).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({ status: 'eligible', pr: 17, head });
  expect(result.output).toBe('publish=true\n');
  expect(result.requests).toHaveLength(3);
  expect(result.requests[2]).toBe(`GET /repos/ZWkang/nodebraid/commits/${head}/pulls?per_page=100&page=2`);
  expect(result.stdout).not.toContain('evidenceCommit');
});

test('ambiguous current producers remain an error without enabling publication', async () => {
  const fixture = producer();
  fixture.pages[0]!.push({ ...fixture.pages[0]![0]!, number: 18 });
  const result = await invoke(fixture);
  expect(result.exitCode).not.toBe(0);
  expect(result.stderr).toContain('ambiguous');
  expect(result.output).toBeNull();
});

test.each(['runStatus', 'pullsStatus'] as const)('GitHub read failure in %s is not a no-work result', async (field) => {
  const fixture = producer();
  fixture[field] = 403;
  const result = await invoke(fixture);
  expect(result.exitCode).not.toBe(0);
  expect(result.stderr).toContain('403');
  expect(result.output).toBeNull();
  expect(result.stdout).not.toContain('not-applicable');
});

test.each([
  { field: 'event', value: 'push' },
  { field: 'path', value: '.github/workflows/untrusted.yml' },
  { field: 'status', value: 'in_progress' },
] as const)('an invalid producer $field fails before reading PR pages', async ({ field, value }) => {
  const fixture = producer();
  fixture.run[field] = value;
  const result = await invoke(fixture);
  expect(result.exitCode).not.toBe(0);
  expect(result.output).toBeNull();
  expect(result.requests).toHaveLength(1);
});

test('a producer from another repository remains an error', async () => {
  const fixture = producer();
  fixture.run.repository.full_name = 'other/repository';
  const result = await invoke(fixture);
  expect(result.exitCode).not.toBe(0);
  expect(result.output).toBeNull();
  expect(result.requests).toHaveLength(1);
});

test('missing evidence for an eligible current producer still fails the strict publisher', async () => {
  const result = await invoke(producer(), 'publish');
  expect(result.exitCode).not.toBe(0);
  expect(result.stderr).toMatch(/preview|report|ENOENT/);
  expect(result.output).toBeNull();
  expect(result.stdout).not.toContain('not-applicable');
  expect(result.stdout).not.toContain('evidenceCommit');
});

function producer() {
  return {
    run: {
      id: 123,
      repository: { full_name: repository },
      path: '.github/workflows/test.yml',
      event: 'pull_request',
      status: 'completed',
      head_sha: head,
    },
    pages: [[{ number: 17, state: 'open', head: { sha: head }, base: { repo: { full_name: repository } } }]],
    runStatus: 200,
    pullsStatus: 200,
  };
}

async function invoke(fixture: ReturnType<typeof producer>, mode: 'preflight' | 'publish' = 'preflight') {
  const directory = mkdtempSync(join(tmpdir(), 'nodebraid-evidence-producer-'));
  temporaryDirectories.push(directory);
  const fixturePath = join(directory, 'fixture.json');
  const eventPath = join(directory, 'event.json');
  const outputPath = join(directory, 'step-output');
  const requestsPath = join(directory, 'requests');
  writeFileSync(fixturePath, JSON.stringify({ ...fixture, requests: requestsPath }));
  writeFileSync(eventPath, JSON.stringify({ workflow_run: { id: fixture.run.id } }));
  const child = Bun.spawn(
    [
      process.execPath,
      '--preload',
      resolve(import.meta.dir, 'fixtures/evidence-github-api.js'),
      resolve(import.meta.dir, '../scripts/publish-pr-evidence.ts'),
      mode === 'preflight' ? 'preflight' : join(directory, 'missing-evidence'),
    ],
    {
      cwd: resolve(import.meta.dir, '..'),
      env: {
        ...process.env,
        GITHUB_REPOSITORY: repository,
        GITHUB_TOKEN: 'fixture-only-no-network',
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_OUTPUT: outputPath,
        NODEBRAID_EVIDENCE_API_FIXTURE: fixturePath,
      },
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return {
    stdout,
    stderr,
    exitCode,
    output: existsSync(outputPath) ? readFileSync(outputPath, 'utf8') : null,
    requests: existsSync(requestsPath) ? readFileSync(requestsPath, 'utf8').trim().split('\n') : [],
  };
}
