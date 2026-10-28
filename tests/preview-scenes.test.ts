import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { previewLimitations, selectPreviewScenes } from '../scripts/preview-scenarios';
import { createPreviewBrowserRunner } from '../scripts/collect-preview';

test('preview commands use an owned empty config and exclude inherited browser configuration', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'nodebraid-preview-environment-'));
  try {
    const executable = join(directory, 'inspect-process');
    writeFileSync(
      executable,
      `#!/usr/bin/env bun\nconsole.log(JSON.stringify({ args: process.argv.slice(2), marker: process.env.PREVIEW_MARKER, browserEnv: Object.keys(process.env).filter(key => key.startsWith('AGENT_BROWSER_')) }));\n`,
      { mode: 0o700 },
    );
    const config = join(directory, 'browser-config.json');
    const inherited = {
      PATH: process.env.PATH,
      PREVIEW_MARKER: 'kept',
      AGENT_BROWSER_PROFILE: '/user/profile',
      AGENT_BROWSER_AUTO_CONNECT: '1',
      AGENT_BROWSER_CONFIG: '/user/config.json',
    };
    const run = createPreviewBrowserRunner(executable, directory, 'owned-preview', config, inherited);
    expect(JSON.parse(await run(['snapshot', '--json']))).toEqual({
      args: ['--session', 'owned-preview', '--config', config, 'snapshot', '--json'],
      marker: 'kept',
      browserEnv: [],
    });
    expect(JSON.parse(readFileSync(config, 'utf8'))).toEqual({});
    expect(inherited.AGENT_BROWSER_PROFILE).toBe('/user/profile');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('selects visible scenes for changed public capabilities without duplicate runs', () => {
  expect(
    selectPreviewScenes([
      'packages/plugin-duplicate-selection/src/index.ts',
      'packages/plugin-history/src/index.ts',
      'packages/port-api/src/index.ts',
    ]).map((scene) => scene.id),
  ).toEqual(['selection-history', 'port-connection', 'document-files', 'node-authoring']);
});

test('the CLI records committed source for a docs-only change and rejects dirty source', () => {
  const directory = mkdtempSync(join(tmpdir(), 'nodebraid-preview-test-'));
  const script = resolve(import.meta.dir, '../scripts/collect-preview.ts');
  const git = (...args: string[]) => execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim();
  try {
    git('init', '-q');
    git('config', 'user.name', 'Preview test');
    git('config', 'user.email', 'preview@example.test');
    writeFileSync(join(directory, 'README.md'), 'before\n');
    git('add', 'README.md');
    git('commit', '-qm', 'before');
    const base = git('rev-parse', 'HEAD');
    writeFileSync(join(directory, 'README.md'), 'after\n');
    git('commit', '-qam', 'after');
    const out = join(directory, '.git', 'preview');
    const result = Bun.spawnSync(['bun', script, '--base', base, '--out', out], { cwd: directory });
    expect({ exitCode: result.exitCode, stderr: result.stderr.toString() }).toEqual({ exitCode: 0, stderr: '' });
    const report = JSON.parse(readFileSync(join(out, 'preview.json'), 'utf8'));
    expect(report.status).toBe('not-applicable');
    expect(report.source.base).toBe(base);
    expect(report.source.head).toBe(git('rev-parse', 'HEAD'));
    expect(report.source.tree).toBe(git('rev-parse', 'HEAD^{tree}'));
    expect(report.source.patch).toMatch(/^[a-f0-9]{64}$/);
    expect(report.scenes).toEqual([]);

    writeFileSync(
      join(directory, 'package.json'),
      JSON.stringify({ scripts: { 'example:build': 'bun run missing-build.ts' } }),
    );
    git('add', 'package.json');
    git('commit', '-qm', 'visible build input');
    const failedOut = join(directory, '.git', 'failed-preview');
    const failed = Bun.spawnSync(['bun', script, '--base', base, '--out', failedOut], { cwd: directory });
    expect(failed.exitCode).not.toBe(0);
    const failedReport = JSON.parse(readFileSync(join(failedOut, 'preview.json'), 'utf8'));
    expect(failedReport.status).toBe('failed');
    expect(failedReport.reason).toContain('production build failed');
    expect(failedReport.artifacts[0]).toMatchObject({ path: 'build.log', kind: 'log' });
    expect(readFileSync(join(failedOut, 'build.log'), 'utf8')).toContain('missing-build.ts');

    writeFileSync(join(directory, 'README.md'), 'uncommitted\n');
    const dirty = Bun.spawnSync(['bun', script, '--base', base, '--out', join(out, 'dirty')], { cwd: directory });
    expect(dirty.exitCode).not.toBe(0);
    expect(dirty.stderr.toString()).toContain('clean committed worktree');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('clipboard and preview maintenance select their real scenes, with uncovered Layout made explicit', () => {
  expect(selectPreviewScenes(['packages/plugin-clipboard/src/index.ts']).map((scene) => scene.id)).toEqual([
    'clipboard',
  ]);
  expect(selectPreviewScenes(['scripts/collect-preview.ts']).map((scene) => scene.id)).toEqual([
    'viewport',
    'selection-history',
    'port-connection',
    'clipboard',
    'document-files',
    'node-authoring',
  ]);
  expect(selectPreviewScenes(['packages/layout-elk/src/index.ts']).length).toBe(6);
  expect(previewLimitations(['packages/layout-elk/src/index.ts']).join('\n')).toContain('not Layout execution');
});

test('a base branch that advanced independently selects the common ancestor for the PR diff', () => {
  const directory = mkdtempSync(join(tmpdir(), 'nodebraid-preview-diverged-'));
  const script = resolve(import.meta.dir, '../scripts/collect-preview.ts');
  const git = (...args: string[]) => execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim();
  try {
    git('init', '-q');
    git('config', 'user.name', 'Preview test');
    git('config', 'user.email', 'preview@example.test');
    writeFileSync(join(directory, 'README.md'), 'common\n');
    git('add', 'README.md');
    git('commit', '-qm', 'common');
    const common = git('rev-parse', 'HEAD');
    writeFileSync(join(directory, 'README.md'), 'pull request\n');
    git('commit', '-qam', 'pull request');
    const head = git('rev-parse', 'HEAD');
    git('checkout', '-q', '--detach', common);
    writeFileSync(join(directory, 'README.md'), 'advanced main\n');
    git('commit', '-qam', 'advanced main');
    const advancedMain = git('rev-parse', 'HEAD');
    git('checkout', '-q', '--detach', head);
    const out = join(directory, '.git', 'preview');
    const result = Bun.spawnSync(['bun', script, '--base', advancedMain, '--out', out], { cwd: directory });
    expect({ exitCode: result.exitCode, stderr: result.stderr.toString() }).toEqual({ exitCode: 0, stderr: '' });
    const report = JSON.parse(readFileSync(join(out, 'preview.json'), 'utf8'));
    expect(report.source).toMatchObject({ base: common, head });
    expect(report.status).toBe('not-applicable');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('shared rendering changes exercise all scenes, while docs and tests have no visible change', () => {
  expect(selectPreviewScenes(['packages/renderer-svg/src/svg-projection.ts']).map((scene) => scene.id)).toEqual([
    'viewport',
    'selection-history',
    'port-connection',
    'clipboard',
    'document-files',
    'node-authoring',
  ]);
  expect(
    selectPreviewScenes([
      'README.md',
      'examples/app/browser-tests/basic-svg.browser.ts',
      'packages/renderer-svg/README.md',
      'packages/renderer-svg/tests/types.test.ts',
      'website/guide.md',
    ]),
  ).toEqual([]);
  expect(selectPreviewScenes([], true).map((scene) => scene.id)).toEqual([
    'viewport',
    'selection-history',
    'port-connection',
    'clipboard',
    'document-files',
    'node-authoring',
  ]);
});

test('Document changes select the real file round-trip scene', () => {
  expect(selectPreviewScenes(['packages/document/src/index.ts']).map((scene) => scene.id)).toEqual([
    'document-files',
    'node-authoring',
  ]);
});

test('Node Editing changes select the real authoring workflow', () => {
  expect(selectPreviewScenes(['packages/plugin-node-editing/src/index.ts']).map((scene) => scene.id)).toEqual([
    'node-authoring',
  ]);
});
