import { expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';

test('the discovery command preserves unfinished work and failed investigations across processes', () => {
  const directory = mkdtempSync(join(tmpdir(), 'nodebraid-discovery-'));
  const cli = resolve('scripts/discovery.ts');
  const git = (...args: string[]) => execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim();
  const run = (...args: string[]) => spawnSync(process.execPath, [cli, ...args], { cwd: directory, encoding: 'utf8' });
  try {
    git('init', '-q');
    mkdirSync(join(directory, 'packages/kernel'), { recursive: true });
    mkdirSync(join(directory, '.tmp'));
    writeFileSync(join(directory, '.gitignore'), '.tmp/\n');
    writeFileSync(join(directory, 'packages/kernel/index.ts'), 'export const kernel = 1;\n');
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
      'baseline',
    );
    git('update-ref', 'refs/remotes/origin/main', 'HEAD');
    expect(run('init', '.tmp/queue.json').status).toBe(0);
    const queue = JSON.parse(run('sync', '.tmp/queue.json').stdout);
    expect(queue.pending).toContain('packages/kernel');
    const report = {
      seam: 'packages/kernel',
      head: git('rev-parse', 'HEAD'),
      evidence: 'Public Kernel test failed',
      remaining: [],
      commands: [{ command: 'bun test', exitCode: 1 }],
    };
    writeFileSync(join(directory, '.tmp/report.json'), JSON.stringify(report));
    expect(run('finish', '.tmp/queue.json', '.tmp/report.json').status).not.toBe(0);
    expect(JSON.parse(run('sync', '.tmp/queue.json').stdout).pending).toContain('packages/kernel');
    writeFileSync(
      join(directory, '.tmp/report.json'),
      JSON.stringify({ ...report, evidence: '', commands: [{ command: 'bun test', exitCode: 0 }] }),
    );
    expect(run('finish', '.tmp/queue.json', '.tmp/report.json').status).not.toBe(0);
    expect(JSON.parse(run('sync', '.tmp/queue.json').stdout).pending).toContain('packages/kernel');
    writeFileSync(
      join(directory, '.tmp/report.json'),
      JSON.stringify({
        ...report,
        evidence: 'Public Kernel test passed',
        commands: [{ command: 'bun test', exitCode: 0 }],
      }),
    );
    expect(run('finish', '.tmp/queue.json', '.tmp/report.json').status).toBe(0);
    expect(JSON.parse(run('sync', '.tmp/queue.json').stdout).pending).not.toContain('packages/kernel');
    expect(
      JSON.parse(readFileSync(join(directory, '.tmp/queue.json'), 'utf8')).seams.find(
        (s: { name: string }) => s.name === 'packages/kernel',
      ).checkedHead,
    ).toBe(report.head);
  } finally {
    rmSync(directory, { recursive: true });
  }
});
