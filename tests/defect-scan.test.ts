import { expect, test } from 'bun:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createScanContext } from '../scripts/prepare-defect-scan';

test('the first investigation records a full snapshot instead of inventing a prior scan', () => {
  expect(createScanContext('a'.repeat(40), undefined)).toEqual({
    head: 'a'.repeat(40),
    base: null,
    mode: 'snapshot',
    range: null,
  });
});

test('the next investigation covers changes since the last successful scan', () => {
  expect(createScanContext('b'.repeat(40), 'a'.repeat(40))).toEqual({
    head: 'b'.repeat(40),
    base: 'a'.repeat(40),
    mode: 'changes',
    range: `${'a'.repeat(40)}..${'b'.repeat(40)}`,
  });
  expect(() => createScanContext('main; echo injected', undefined)).toThrow('commit SHA');
  expect(() => createScanContext('a'.repeat(40), 'untrusted ref')).toThrow('commit SHA');
});

test('the CLI pins a clean main snapshot and rejects uncommitted source changes', () => {
  const directory = mkdtempSync(join(tmpdir(), 'nodebraid-scan-'));
  const script = resolve('scripts/prepare-defect-scan.ts');
  const git = (...args: string[]) => execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim();
  try {
    git('init', '-q');
    writeFileSync(join(directory, '.gitignore'), '.tmp/\n');
    writeFileSync(join(directory, 'public.ts'), 'export const version = 1;\n');
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
    const clean = spawnSync(process.execPath, [script], { cwd: directory, encoding: 'utf8' });
    expect(clean.status).toBe(0);
    const context = JSON.parse(readFileSync(join(directory, '.tmp/agent-defect-scan.json'), 'utf8'));
    expect(context.head).toBe(git('rev-parse', 'HEAD'));
    expect(context.files).toEqual(['.gitignore', 'public.ts']);
    writeFileSync(join(directory, 'public.ts'), 'export const version = 2;\n');
    const dirty = spawnSync(process.execPath, [script], { cwd: directory, encoding: 'utf8' });
    expect(dirty.status).not.toBe(0);
    expect(dirty.stderr).toContain('clean worktree');
  } finally {
    rmSync(directory, { recursive: true });
  }
});
