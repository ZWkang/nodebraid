import { expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const cli = resolve('scripts/local-agent.ts');
test('a persisted task resumes after a failed real check and never blesses an unrelated head', () => {
  const dir = mkdtempSync(join(tmpdir(), 'nodebraid-local-run-'));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
  const invoke = (...args: string[]) => spawnSync(process.execPath, [cli, ...args], { cwd: dir, encoding: 'utf8' });
  const json = (name: string, value: unknown) => writeFileSync(join(dir, name), JSON.stringify(value));
  try {
    git('init', '-q');
    git('switch', '-c', 'feat/issue-10');
    writeFileSync(join(dir, '.gitignore'), '.tmp/\n');
    json('package.json', { scripts: { check: 'bun check.ts' } });
    writeFileSync(join(dir, 'check.ts'), "if (await Bun.file('.tmp/fail').exists()) process.exit(1);\n");
    git('add', '.');
    git(
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.invalid',
      '-c',
      'core.hooksPath=.git/hooks',
      'commit',
      '-qm',
      'fixture',
    );
    const base = git('rev-parse', 'HEAD');
    mkdirSync(join(dir, '.tmp'));
    const input = {
      run: 'run-1',
      repository: 'ZWkang/nodebraid',
      source: { kind: 'issue', number: 10 },
      branch: 'feat/issue-10',
      base,
      request: 'approved-scope',
      pending: [],
      plan: [{ id: 'fix', blockedBy: [], acceptance: 'Public regression red then green' }],
    };
    json('.tmp/input.json', input);
    expect(invoke('prepare', '.tmp/input.json', '.tmp/run').status).toBe(0);
    expect(invoke('prepare', '.tmp/input.json', '.tmp/run').status).toBe(0);
    json('.tmp/input.json', { ...input, request: 'different' });
    expect(invoke('prepare', '.tmp/input.json', '.tmp/run').status).not.toBe(0);
    const head = git('rev-parse', 'HEAD'),
      tree = git('rev-parse', 'HEAD^{tree}');
    const patch = createHash('sha256')
      .update(execFileSync('git', ['diff', '--binary', base, head], { cwd: dir }))
      .digest('hex');
    json('.tmp/reviews.json', {
      standards: { head, tree, patch, verdict: 'passed', report: 'Standards fixture review' },
      spec: { head, tree, patch, verdict: 'passed', report: 'Spec fixture review' },
    });
    json('.tmp/decisions.json', []);
    writeFileSync(join(dir, '.tmp/fail'), 'real child process exits nonzero');
    expect(invoke('verify', '.tmp/run', '.tmp/reviews.json', '.tmp/decisions.json').status).not.toBe(0);
    expect(JSON.parse(readFileSync(join(dir, '.tmp/run/verification.json'), 'utf8')).checks.exitCode).toBe(1);
    rmSync(join(dir, '.tmp/fail'));
    expect(invoke('verify', '.tmp/run', '.tmp/reviews.json', '.tmp/decisions.json').status).toBe(0);
    json('.tmp/remote.json', {
      sha: 'b'.repeat(40),
      tree: { sha: tree },
      parents: [{ sha: 'c'.repeat(40) }, { sha: base }],
    });
    expect(invoke('publication', '.tmp/run', '.tmp/remote.json').status).not.toBe(0);
    json('.tmp/remote.json', { sha: 'b'.repeat(40), tree: { sha: tree }, parents: [{ sha: base }] });
    expect(invoke('publication', '.tmp/run', '.tmp/remote.json').status).toBe(0);
    json('.tmp/snapshot.json', {
      number: 11,
      title: '[local-agent] fixture',
      state: 'OPEN',
      isDraft: false,
      headRefName: 'feat/issue-10',
      headRefOid: 'b'.repeat(40),
      headRepository: { nameWithOwner: 'ZWkang/nodebraid' },
      baseRefName: 'main',
      mergeable: 'MERGEABLE',
      mergeStateStatus: 'CLEAN',
      reviewDecision: '',
      feedback: [],
      threads: [],
      statusCheckRollup: [
        { name: 'checks', workflowName: 'Checks', headSha: 'b'.repeat(40), status: 'COMPLETED', conclusion: 'SUCCESS' },
      ],
    });
    expect(JSON.parse(invoke('evaluate', '.tmp/run', '.tmp/snapshot.json').stdout).status).toBe('ready');
    const newer = JSON.parse(readFileSync(join(dir, '.tmp/snapshot.json'), 'utf8'));
    newer.headRefOid = 'c'.repeat(40);
    newer.statusCheckRollup[0].headSha = newer.headRefOid;
    json('.tmp/snapshot.json', newer);
    expect(JSON.parse(invoke('evaluate', '.tmp/run', '.tmp/snapshot.json').stdout).status).toBe('waiting-verification');
  } finally {
    rmSync(dir, { recursive: true });
  }
});
