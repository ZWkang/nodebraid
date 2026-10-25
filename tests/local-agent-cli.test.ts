import { expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { prepareRun, type RunInput } from '../scripts/local-agent-run';

const cli = resolve('scripts/local-agent.ts');

test('one issue resumes its local ticket frontier without creating child issues', () => {
  const dir = mkdtempSync(join(tmpdir(), 'nodebraid-local-plan-'));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
  const invoke = (...args: string[]) => spawnSync(process.execPath, [cli, ...args], { cwd: dir, encoding: 'utf8' });
  const json = (name: string, value: unknown) => writeFileSync(join(dir, name), JSON.stringify(value));
  try {
    git('init', '-q', '-b', 'main');
    git(
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.invalid',
      '-c',
      'core.hooksPath=.git/hooks',
      'commit',
      '--allow-empty',
      '-qm',
      'fixture',
    );
    const base = git('rev-parse', 'HEAD');
    json('input.json', {
      run: 'single-spec',
      repository: 'ZWkang/nodebraid',
      source: { kind: 'issue', number: 71 },
      branch: 'feat/issue-71',
      baseRefName: 'main',
      base,
      expectedParent: base,
      request: 'Deliver the approved spec in one PR with local implementation tickets.',
      pending: [],
      plan: [
        { id: 'implement', blockedBy: [], acceptance: 'The approved behavior passes its public seam test.' },
        { id: 'deliver', blockedBy: ['implement'], acceptance: 'The same PR passes delivery acceptance.' },
      ],
    });
    expect(invoke('prepare', 'input.json', 'run').status).toBe(0);
    const prepared = readFileSync(join(dir, 'run/prepared-task.json'), 'utf8');
    json('completed.json', []);
    expect(JSON.parse(invoke('frontier', 'run', 'completed.json').stdout)).toEqual(['implement']);
    json('completed.json', ['implement']);
    expect(JSON.parse(invoke('frontier', 'run', 'completed.json').stdout)).toEqual(['deliver']);
    expect(invoke('prepare', 'input.json', 'run').status).toBe(0);
    expect(JSON.parse(invoke('frontier', 'run', 'completed.json').stdout)).toEqual(['deliver']);
    json('completed.json', ['implement', 'deliver']);
    expect(JSON.parse(invoke('frontier', 'run', 'completed.json').stdout)).toEqual([]);
    json('completed.json', ['deliver']);
    const skippedBlocker = invoke('frontier', 'run', 'completed.json');
    expect(skippedBlocker.status).not.toBe(0);
    expect(skippedBlocker.stdout).toBe('');
    expect(skippedBlocker.stderr).toContain('Completed task has an unfinished blocker.');
    expect(readFileSync(join(dir, 'run/prepared-task.json'), 'utf8')).toBe(prepared);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

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
    writeFileSync(
      join(dir, 'check.ts'),
      "await Bun.write('.tmp/check-started', 'real check');\nif (await Bun.file('.tmp/fail').exists()) process.exit(1);\n",
    );
    mkdirSync(join(dir, '.agents'));
    writeFileSync(join(dir, '.agents/review.md'), 'Review policy must retain human review.\n');
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
    const input: RunInput = {
      run: 'run-1',
      repository: 'ZWkang/nodebraid',
      source: { kind: 'issue', number: 10 },
      branch: 'feat/issue-10',
      baseRefName: 'main',
      base,
      expectedParent: base,
      request: 'approved-scope',
      pending: [],
      plan: [{ id: 'fix', blockedBy: [], acceptance: 'Public regression red then green' }],
    };
    json('.tmp/input.json', input);
    json('.tmp/unbound.json', { ...input, baseRefName: undefined });
    expect(invoke('prepare', '.tmp/unbound.json', '.tmp/unbound-run').stderr).toContain('baseRefName');
    json('.tmp/no-parent.json', { ...input, expectedParent: undefined });
    expect(invoke('prepare', '.tmp/no-parent.json', '.tmp/no-parent-run').stderr).toContain('expectedParent');
    expect(invoke('prepare', '.tmp/input.json', '.tmp/run').status).toBe(0);
    expect(invoke('prepare', '.tmp/input.json', '.tmp/run').status).toBe(0);
    json('.tmp/input.json', { ...input, request: 'different' });
    expect(invoke('prepare', '.tmp/input.json', '.tmp/run').status).not.toBe(0);
    mkdirSync(join(dir, 'docs'));
    git('mv', '.agents/review.md', 'docs/renamed policy.md');
    git(
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.invalid',
      '-c',
      'core.hooksPath=.git/hooks',
      'commit',
      '-qm',
      'move policy',
    );
    const head = git('rev-parse', 'HEAD'),
      tree = git('rev-parse', 'HEAD^{tree}');
    const patch = createHash('sha256')
      .update(execFileSync('git', ['diff', '--binary', base, head], { cwd: dir }))
      .digest('hex');
    const reviews = {
      standards: { head, tree, patch, verdict: 'passed', report: 'Standards fixture review' },
      spec: { head, tree, patch, verdict: 'passed', report: 'Spec fixture review' },
    };
    json('.tmp/reviews.json', reviews);
    json('.tmp/decisions.json', []);
    const { expectedParent: _parent, ...legacyInput } = input;
    mkdirSync(join(dir, '.tmp/legacy-run'));
    json('.tmp/legacy-run/prepared-task.json', prepareRun(legacyInput));
    const legacyText = readFileSync(join(dir, '.tmp/legacy-run/prepared-task.json'), 'utf8');
    expect(invoke('verify', '.tmp/legacy-run', '.tmp/reviews.json', '.tmp/decisions.json').stderr).toContain(
      'expectedParent',
    );
    expect(invoke('publication', '.tmp/legacy-run', '.tmp/not-a-commit.json').stderr).toContain('expectedParent');
    expect(existsSync(join(dir, '.tmp/legacy-run/verification.json'))).toBe(false);
    expect(readFileSync(join(dir, '.tmp/legacy-run/prepared-task.json'), 'utf8')).toBe(legacyText);
    expect(invoke('verify', '.tmp/run', '.tmp/reviews.json', '.tmp/decisions.json').stderr).toContain(
      'Risk assessment',
    );
    expect(existsSync(join(dir, '.tmp/check-started'))).toBe(false);
    const risk = {
      level: 'low',
      rationale: 'The fixture declares a localized documentation change.',
      evidence: 'Both paths in the rename were reviewed.',
      rollback: 'Revert the rename commit.',
    };
    const classified = { standards: { ...reviews.standards, risk }, spec: { ...reviews.spec, risk } };
    json('.tmp/reviews.json', { ...classified, spec: { ...classified.spec, risk: { ...risk, rollback: '' } } });
    expect(invoke('verify', '.tmp/run', '.tmp/reviews.json', '.tmp/decisions.json').stderr).toContain(
      'Risk assessment',
    );
    expect(existsSync(join(dir, '.tmp/check-started'))).toBe(false);
    json('.tmp/reviews.json', classified);
    writeFileSync(join(dir, '.tmp/fail'), 'real child process exits nonzero');
    expect(invoke('verify', '.tmp/run', '.tmp/reviews.json', '.tmp/decisions.json').status).not.toBe(0);
    expect(JSON.parse(readFileSync(join(dir, '.tmp/run/verification.json'), 'utf8')).checks.exitCode).toBe(1);
    rmSync(join(dir, '.tmp/fail'));
    expect(invoke('verify', '.tmp/run', '.tmp/reviews.json', '.tmp/decisions.json').status).toBe(0);
    const verification = JSON.parse(readFileSync(join(dir, '.tmp/run/verification.json'), 'utf8'));
    expect(verification.changedFiles).toEqual(['.agents/review.md', 'docs/renamed policy.md']);
    expect(existsSync(join(dir, '.tmp/check-started'))).toBe(true);
    json('.tmp/remote.json', {
      sha: 'b'.repeat(40),
      tree: { sha: tree },
      parents: [{ sha: 'c'.repeat(40) }, { sha: base }],
    });
    expect(invoke('publication', '.tmp/run', '.tmp/remote.json').status).not.toBe(0);
    json('.tmp/remote.json', { sha: 'b'.repeat(40), tree: { sha: tree }, parents: [{ sha: base }] });
    json('.tmp/run/verification.json', { ...verification, changedFiles: ['docs/renamed policy.md'] });
    expect(invoke('publication', '.tmp/run', '.tmp/remote.json').stderr).toContain('source changed');
    json('.tmp/run/verification.json', verification);
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
      baseRefOid: base,
      mergeable: 'MERGEABLE',
      mergeStateStatus: 'CLEAN',
      reviewDecision: '',
      feedback: [],
      threads: [],
      statusCheckRollup: [
        { name: 'checks', workflowName: 'Checks', headSha: 'b'.repeat(40), status: 'COMPLETED', conclusion: 'SUCCESS' },
      ],
    });
    expect(JSON.parse(invoke('evaluate', '.tmp/run', '.tmp/snapshot.json').stdout)).toMatchObject({
      status: 'ready',
      risk: { level: 'high', route: 'full-human' },
      autoMergeCandidate: false,
    });
    const newer = JSON.parse(readFileSync(join(dir, '.tmp/snapshot.json'), 'utf8'));
    json('.tmp/snapshot.json', { ...newer, baseRefName: 'feat/issue-9' });
    expect(JSON.parse(invoke('evaluate', '.tmp/run', '.tmp/snapshot.json').stdout).status).toBe('waiting-verification');
    newer.headRefOid = 'c'.repeat(40);
    newer.statusCheckRollup[0].headSha = newer.headRefOid;
    json('.tmp/snapshot.json', newer);
    expect(JSON.parse(invoke('evaluate', '.tmp/run', '.tmp/snapshot.json').stdout).status).toBe('waiting-verification');
  } finally {
    rmSync(dir, { recursive: true });
  }
});
