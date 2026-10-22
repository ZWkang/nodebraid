import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { prepareRun } from '../scripts/local-agent-run';

const reporter = resolve('scripts/verification-report.ts');
const runner = resolve('scripts/local-agent.ts');
const digest = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'nodebraid-report-'));
  const run = join(directory, '.tmp/run');
  const output = join(directory, '.tmp/report');
  try {
    mkdirSync(run, { recursive: true });
    const git = (...args: string[]) => execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim();
    const json = (path: string, value: unknown) => writeFileSync(path, JSON.stringify(value));
    const invoke = (script: string, ...args: string[]) =>
      spawnSync(process.execPath, [script, ...args], { cwd: directory, encoding: 'utf8' });
    const execute = (...args: string[]) => {
      const result = invoke(runner, ...args);
      if (result.status !== 0) throw new Error(result.stderr);
      return JSON.parse(result.stdout);
    };
    git('init', '-q');
    git('switch', '-c', 'feat/issue-45');
    git('config', 'user.name', 'Report test');
    git('config', 'user.email', 'report@example.invalid');
    git('config', 'core.hooksPath', '.git/hooks');
    writeFileSync(join(directory, '.gitignore'), '.tmp/\n');
    json(join(directory, 'package.json'), { scripts: { check: 'bun check.ts' } });
    writeFileSync(join(directory, 'check.ts'), "console.log('full engineering check executed');\n");
    git('add', '.');
    git('commit', '-qm', 'base');
    const base = git('rev-parse', 'HEAD');
    json(join(run, 'input.json'), {
      run: 'report-run',
      repository: 'ZWkang/nodebraid',
      source: { kind: 'issue', number: 45 },
      branch: 'feat/issue-45',
      baseRefName: 'main',
      base,
      expectedParent: base,
      request: 'approved report scope',
      pending: [],
      plan: [{ id: 'report', blockedBy: [], acceptance: 'Reviewer can inspect actual verification evidence' }],
    });
    execute('prepare', join(run, 'input.json'), run);
    writeFileSync(join(directory, 'changed.txt'), 'published change\n');
    git('add', '.');
    git('commit', '-qm', 'change');
    const identity = execute('inspect', run);
    const standards = 'Read the report command and callers.\nNot checked: Windows.\nSource: review-session-standards';
    const spec =
      'The approved report requirements are covered.\nNot checked: remote publication.\nSource: review-session-spec';
    json(join(run, 'reviews.json'), {
      standards: { ...identity, verdict: 'passed', report: standards },
      spec: { ...identity, verdict: 'passed', report: spec },
    });
    json(join(run, 'decisions.json'), []);
    execute('verify', run, join(run, 'reviews.json'), join(run, 'decisions.json'));
    const publishedHead = git('commit-tree', identity.tree, '-p', base, '-m', 'published tree');
    json(join(run, 'remote.json'), { sha: publishedHead, tree: { sha: identity.tree }, parents: [{ sha: base }] });
    execute('publication', run, join(run, 'remote.json'));
    return {
      directory,
      run,
      output,
      identity,
      base,
      publishedHead,
      standards,
      spec,
      json,
      report: () => invoke(reporter, run, output),
      cleanup: () => rmSync(directory, { recursive: true, force: true }),
    };
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}

test.each(['expectedParent', 'baseRefName'])(
  'legacy runs without %s stay historical and are not rewritten by reporting',
  (missing) => {
    const f = fixture();
    try {
      const input = JSON.parse(readFileSync(join(f.run, 'input.json'), 'utf8'));
      delete input[missing];
      const legacy = join(f.directory, '.tmp/legacy');
      mkdirSync(legacy);
      f.json(join(legacy, 'prepared-task.json'), prepareRun(input));
      const original = readFileSync(join(legacy, 'prepared-task.json'), 'utf8');
      const result = spawnSync(process.execPath, [reporter, legacy, f.output], { cwd: f.directory, encoding: 'utf8' });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('Legacy run lacks baseRefName or expectedParent');
      expect(readFileSync(join(legacy, 'prepared-task.json'), 'utf8')).toBe(original);
      expect(existsSync(f.output)).toBe(false);
    } finally {
      f.cleanup();
    }
  },
);

test('repeating report generation preserves the previous proof rather than overwriting it', () => {
  const f = fixture();
  try {
    expect(f.report().status).toBe(0);
    const original = readFileSync(join(f.output, 'report.md'), 'utf8');
    const second = f.report();
    expect(second.status).not.toBe(0);
    expect(second.stderr).toContain('already exists');
    expect(readFileSync(join(f.output, 'report.md'), 'utf8')).toBe(original);
  } finally {
    f.cleanup();
  }
});

test('the public report command preserves both reviews, real logs and published identity without inventing regressions', () => {
  const f = fixture();
  try {
    const result = f.report();
    expect(result.status).toBe(0);
    const report = JSON.parse(readFileSync(join(f.output, 'report.json'), 'utf8'));
    expect(report.schemaVersion).toBe(1);
    expect(report.source).toEqual({
      base: f.base,
      expectedParent: f.base,
      head: f.publishedHead,
      localHead: f.identity.head,
      tree: f.identity.tree,
      patch: f.identity.patch,
    });
    const markdown = readFileSync(join(f.output, 'report.md'), 'utf8');
    expect(markdown).toContain(f.standards);
    expect(markdown).toContain(f.spec);
    expect(markdown).toContain('Reviewer can inspect actual verification evidence');
    expect(markdown).toContain('Behavior evidence: not provided');
    expect(markdown).toContain('exit 0');
    expect(report.artifacts.some((file: { path: string }) => file.path === 'report.md')).toBe(true);
    expect(report.artifacts.some((file: { path: string }) => file.path === 'report.json')).toBe(false);
    const logs = report.artifacts.filter((file: { kind: string }) => file.kind === 'log');
    expect(logs).toHaveLength(1);
    expect(readFileSync(join(f.output, logs[0].path), 'utf8')).toContain('full engineering check executed');
    for (const artifact of report.artifacts) {
      expect(digest(readFileSync(join(f.output, artifact.path)))).toBe(artifact.sha256);
    }
  } finally {
    f.cleanup();
  }
}, 30_000);

test('declared behavior results retain real red/green logs, failures and explicit unrun checks', () => {
  const f = fixture();
  try {
    const command = 'bun regression.ts';
    const script = join(f.run, 'regression.ts');
    const evidence: unknown[] = [];
    for (const [phase, actual] of [
      ['red', 1],
      ['green', 2],
    ] as const) {
      writeFileSync(
        script,
        `import { strictEqual } from 'node:assert'; strictEqual(${actual}, 2, 'both selected nodes must be retained');\n`,
      );
      const result = spawnSync(process.execPath, [script], { cwd: f.run, encoding: 'utf8' });
      expect(result.status).toBe(phase === 'red' ? 1 : 0);
      writeFileSync(join(f.run, `${phase}.log`), result.stdout + result.stderr);
      evidence.push({
        id: `selection-${phase}`,
        acceptance: 'Both selected nodes must be retained; old code retains one.',
        command,
        exitCode: result.status,
        log: `${phase}.log`,
        phase,
        expectedExitCode: phase === 'red' ? 1 : 0,
        status: 'passed',
      });
    }
    evidence.push({
      id: 'windows',
      acceptance: 'Windows rendering',
      command: 'bun test:windows',
      exitCode: null,
      phase: 'check',
      status: 'not-run',
    });
    writeFileSync(join(f.run, 'external.log'), 'The required service was unavailable.\n');
    evidence.push({
      id: 'external',
      acceptance: 'Remote integration responds',
      command: 'bun check:remote',
      exitCode: 1,
      log: 'external.log',
      phase: 'check',
      status: 'failed',
    });
    f.json(join(f.run, 'behavior-evidence.json'), evidence);
    const result = f.report();
    expect(result.status).toBe(0);
    const report = JSON.parse(readFileSync(join(f.output, 'report.json'), 'utf8'));
    expect(report.behaviorEvidence).toHaveLength(4);
    const markdown = readFileSync(join(f.output, 'report.md'), 'utf8');
    expect(markdown).toContain('selection-red');
    expect(markdown).toContain('expected exit 1');
    expect(markdown).toContain('windows');
    expect(markdown).toContain('not-run');
    expect(markdown).toContain('failed');
    expect(markdown).not.toContain('Behavior evidence: not provided');
    const red = report.behaviorEvidence.find((item: { phase: string }) => item.phase === 'red');
    expect(readFileSync(join(f.output, red.log), 'utf8')).toContain('both selected nodes must be retained');
  } finally {
    f.cleanup();
  }
}, 30_000);

test('the report refuses log paths outside the run and every symlink, including metadata and output files', () => {
  const f = fixture();
  try {
    const verificationPath = join(f.run, 'verification.json');
    const verified = JSON.parse(readFileSync(verificationPath, 'utf8'));
    const privateLog = join(f.directory, 'private.log');
    writeFileSync(privateLog, 'private credential material must never be copied');
    writeFileSync(join(f.run, 'inside.log'), 'ordinary log');
    symlinkSync(privateLog, join(f.run, 'outside-link.log'));
    symlinkSync(join(f.run, 'inside.log'), join(f.run, 'inside-link.log'));
    symlinkSync(f.directory, join(f.run, 'directory-link'));
    for (const log of [
      privateLog,
      '../../private.log',
      'outside-link.log',
      'inside-link.log',
      'directory-link/private.log',
    ]) {
      f.json(verificationPath, { ...verified, checks: { ...verified.checks, log } });
      const result = f.report();
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/outside|symlink/i);
      expect(existsSync(f.output)).toBe(false);
    }
    f.json(verificationPath, verified);
    const metadata = readFileSync(join(f.run, 'publication.json'));
    const elsewhere = join(f.directory, 'publication.json');
    writeFileSync(elsewhere, metadata);
    rmSync(join(f.run, 'publication.json'));
    symlinkSync(elsewhere, join(f.run, 'publication.json'));
    expect(f.report().status).not.toBe(0);
    rmSync(join(f.run, 'publication.json'));
    writeFileSync(join(f.run, 'publication.json'), metadata);
    mkdirSync(f.output);
    symlinkSync(privateLog, join(f.output, 'report.md'));
    expect(f.report().status).not.toBe(0);
    expect(readFileSync(privateLog, 'utf8')).toBe('private credential material must never be copied');
  } finally {
    f.cleanup();
  }
}, 30_000);

test('stale publication or reviews and missing original logs fail before a report is written', () => {
  const f = fixture();
  try {
    const publication = JSON.parse(readFileSync(join(f.run, 'publication.json'), 'utf8'));
    for (const change of [
      { tree: 'a'.repeat(40) },
      { localHead: 'a'.repeat(40) },
      { parent: 'a'.repeat(40) },
      { head: 'not-a-sha' },
      { taskDigest: 'another-task' },
    ]) {
      f.json(join(f.run, 'publication.json'), { ...publication, ...change });
      expect(f.report().status).not.toBe(0);
      expect(existsSync(f.output)).toBe(false);
    }
    f.json(join(f.run, 'publication.json'), publication);
    const path = join(f.run, 'verification.json');
    const verified = JSON.parse(readFileSync(path, 'utf8'));
    f.json(path, {
      ...verified,
      reviews: { ...verified.reviews, spec: { ...verified.reviews.spec, patch: 'a'.repeat(64) } },
    });
    expect(f.report().status).not.toBe(0);
    f.json(path, { ...verified, checks: { ...verified.checks, exitCode: 1 } });
    expect(f.report().status).not.toBe(0);
    f.json(path, { ...verified, checks: { ...verified.checks, log: 'missing.log' } });
    expect(f.report().stderr).toContain('missing');
    expect(existsSync(f.output)).toBe(false);
  } finally {
    f.cleanup();
  }
}, 30_000);

test('behavior declarations cannot turn missing execution, unexplained red or contradictory exits into a pass', () => {
  const f = fixture();
  try {
    writeFileSync(join(f.run, 'regression.log'), 'behavior assertion failed');
    const red = {
      id: 'red',
      acceptance: 'Selected node count is one instead of two',
      command: 'bun test regression',
      phase: 'red',
      status: 'passed',
      exitCode: 1,
      expectedExitCode: 1,
      log: 'regression.log',
    };
    for (const entries of [
      [{ ...red, acceptance: '' }],
      [{ ...red, expectedExitCode: undefined }],
      [{ ...red, exitCode: 0 }],
      [{ ...red, log: undefined }],
      [{ ...red, status: 'not-run', exitCode: null }],
      [{ ...red, phase: 'green' }],
      [{ ...red, log: 'missing.log' }],
      [red, red],
    ]) {
      f.json(join(f.run, 'behavior-evidence.json'), entries);
      expect(f.report().status).not.toBe(0);
      expect(existsSync(f.output)).toBe(false);
    }
    f.json(join(f.run, 'behavior-evidence.json'), []);
    expect(f.report().status).toBe(0);
    expect(readFileSync(join(f.output, 'report.md'), 'utf8')).toContain('no checks declared');
  } finally {
    f.cleanup();
  }
}, 30_000);
