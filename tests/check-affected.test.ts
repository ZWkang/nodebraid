import { expect, test } from 'bun:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const cli = resolve('scripts/check-affected.ts');

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'nodebraid-affected-'));
  const write = (path: string, content: string) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  write('package.json', JSON.stringify({ workspaces: ['packages/*'] }));
  for (const [name, dependencies, devDependencies] of [
    ['value', {}, {}],
    ['consumer', { '@nodebraid/value': 'workspace:*' }, {}],
    ['browser', {}, { '@nodebraid/value': 'workspace:*' }],
    ['unrelated', {}, {}],
  ] as const) {
    write(
      `packages/${name}/package.json`,
      JSON.stringify({
        name: `@nodebraid/${name}`,
        dependencies,
        devDependencies,
        scripts: {
          'build:self': 'bun build.ts',
          'test:self': 'bun test tests',
          'typecheck:self': 'bun typecheck.ts',
          ...(name === 'browser' ? { 'test:browser:self': 'bun browser.ts' } : {}),
        },
      }),
    );
    write(`packages/${name}/src/index.ts`, 'export const value = 1;\n');
  }
  write('tests/consumer.test.ts', "import '@nodebraid/consumer';\n");
  write('tests/unrelated.test.ts', "import '@nodebraid/unrelated';\n");
  git('init', '-q');
  git('add', '.');
  git(
    '-c',
    'user.name=Test',
    '-c',
    'user.email=test@example.invalid',
    '-c',
    'core.hooksPath=/dev/null',
    'commit',
    '-qm',
    'fixture',
  );
  const invoke = (...args: string[]) => spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8' });
  return { root, write, git, invoke };
}

test('development plan follows production and test consumers without selecting unrelated suites', () => {
  const f = fixture();
  try {
    f.write('packages/value/src/index.ts', 'export const value = 2;\n');
    const result = f.invoke('--plan');
    expect(result.status).toBe(0);
    const plan = JSON.parse(result.stdout);
    expect(plan.mode).toBe('affected');
    expect(plan.packages).toEqual(['@nodebraid/browser', '@nodebraid/consumer', '@nodebraid/value']);
    expect(plan.tests).toEqual(['tests/consumer.test.ts']);
    expect(plan.browser).toEqual(['@nodebraid/browser']);
    expect(plan.docs).toBe(false);
  } finally {
    rmSync(f.root, { recursive: true });
  }
});

test('branch comparison includes commits, staged changes, untracked files and both sides of renames', () => {
  const f = fixture();
  try {
    const base = f.git('rev-parse', 'HEAD');
    f.write('packages/value/src/index.ts', 'export const value = 2;\n');
    f.git('add', '.');
    f.git(
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.invalid',
      '-c',
      'core.hooksPath=/dev/null',
      'commit',
      '-qm',
      'change value',
    );
    f.git('mv', 'packages/unrelated/src/index.ts', 'packages/consumer/src/moved.ts');
    f.write('packages/browser/src/new.ts', 'export const added = true;\n');
    f.write('packages/consumer/src/index.ts', 'export const value = 3;\n');
    const result = f.invoke('--base', base, '--plan');
    expect(result.status).toBe(0);
    const plan = JSON.parse(result.stdout);
    expect(plan.packages).toEqual([
      '@nodebraid/browser',
      '@nodebraid/consumer',
      '@nodebraid/unrelated',
      '@nodebraid/value',
    ]);
    expect(plan.files).toEqual([
      'packages/browser/src/new.ts',
      'packages/consumer/src/index.ts',
      'packages/consumer/src/moved.ts',
      'packages/unrelated/src/index.ts',
      'packages/value/src/index.ts',
    ]);
    expect(f.invoke('--base', 'does-not-exist', '--plan').status).not.toBe(0);
  } finally {
    rmSync(f.root, { recursive: true });
  }
});

test('shared changes explicitly select full checks and preserve the real command failure', () => {
  const f = fixture();
  try {
    f.write('package.json', JSON.stringify({ workspaces: ['packages/*'], scripts: { check: 'bun check.ts' } }));
    f.write('check.ts', 'console.log("full check executed"); process.exit(7);\n');
    const plan = JSON.parse(f.invoke('--plan').stdout);
    expect(plan.mode).toBe('full');
    expect(plan.shared).toContain('package.json');
    const result = f.invoke();
    expect(result.status).toBe(7);
    expect(result.stdout).toContain('full check executed');
  } finally {
    rmSync(f.root, { recursive: true });
  }
});

test('a clean checkout selects no development checks and website changes select documentation', () => {
  const f = fixture();
  try {
    const clean = JSON.parse(f.invoke('--plan').stdout);
    expect(clean.files).toEqual([]);
    expect(clean.packages).toEqual([]);
    f.write('website/guide/start.md', '# Start\n');
    const plan = JSON.parse(f.invoke('--plan').stdout);
    expect(plan.mode).toBe('affected');
    expect(plan.docs).toBe(true);
    expect(plan.browser).toEqual([]);
  } finally {
    rmSync(f.root, { recursive: true });
  }
});

test('root tests follow a side-effect import into a local fixture', () => {
  const f = fixture();
  try {
    f.write('tests/consumer.test.ts', "import './fixture';\n");
    f.write('tests/fixture.ts', "import '@nodebraid/value';\n");
    f.git('add', '.');
    f.git(
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.invalid',
      '-c',
      'core.hooksPath=/dev/null',
      'commit',
      '-qm',
      'fixture import',
    );
    f.write('packages/value/src/index.ts', 'export const value = 2;\n');
    expect(JSON.parse(f.invoke('--plan').stdout).tests).toEqual(['tests/consumer.test.ts']);
  } finally {
    rmSync(f.root, { recursive: true });
  }
});

test('root test selection ignores package names and import statements inside fixture strings', () => {
  const f = fixture();
  try {
    f.write(
      'tests/tooling.test.ts',
      `const manifest = { name: '@nodebraid/consumer' };
const fixture = "import '@nodebraid/consumer'; import '@nodebraid/missing';";
export { manifest, fixture };
`,
    );
    f.git('add', '.');
    f.git(
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.invalid',
      '-c',
      'core.hooksPath=/dev/null',
      'commit',
      '-qm',
      'fixture text',
    );
    f.write('packages/value/src/index.ts', 'export const value = 2;\n');
    expect(JSON.parse(f.invoke('--plan').stdout).tests).toEqual(['tests/consumer.test.ts']);
  } finally {
    rmSync(f.root, { recursive: true });
  }
});

test('affected execution runs every selected layer once and stops on a real selected failure', () => {
  const f = fixture();
  try {
    const log = join(f.root, '.tmp/steps.log');
    const record = (step: string) =>
      `import { appendFileSync } from 'node:fs'; appendFileSync(${JSON.stringify(log)}, '${step}\\n');\n`;
    f.write('.gitignore', 'node_modules/\n.tmp/\n');
    f.write('.tmp/steps.log', '');
    f.write(
      'package.json',
      JSON.stringify({ workspaces: ['packages/*'], scripts: { 'docs:check:self': 'bun docs.ts' } }),
    );
    f.write('docs.ts', record('docs'));
    f.write(
      'packages/core/package.json',
      JSON.stringify({ name: '@nodebraid/core', dependencies: { '@nodebraid/value': 'workspace:*' }, scripts: {} }),
    );
    mkdirSync(join(f.root, 'node_modules/.bin'), { recursive: true });
    mkdirSync(join(f.root, 'node_modules/@nodebraid'), { recursive: true });
    for (const tool of ['prettier', 'oxlint'])
      symlinkSync(resolve(`node_modules/.bin/${tool}`), join(f.root, 'node_modules/.bin', tool));
    for (const name of ['value', 'consumer', 'browser', 'unrelated', 'core']) {
      const manifestPath = `packages/${name}/package.json`;
      const manifest = JSON.parse(readFileSync(join(f.root, manifestPath), 'utf8'));
      manifest.exports = './src/index.ts';
      manifest.scripts = {
        'build:self': 'bun build.ts',
        'typecheck:self': 'bun typecheck.ts',
        'test:self': 'bun suite.ts',
        ...(name === 'browser' ? { 'test:browser:self': 'bun browser.ts' } : {}),
      };
      f.write(manifestPath, JSON.stringify(manifest));
      f.write(`packages/${name}/src/index.ts`, 'export const value = 1;\n');
      for (const [file, step] of [
        ['build.ts', 'build'],
        ['typecheck.ts', 'types'],
        ['suite.ts', 'test'],
        ['browser.ts', 'browser'],
      ]) {
        f.write(`packages/${name}/${file}`, record(`${name}:${step}`));
      }
      if (name === 'consumer') {
        f.write(
          `packages/${name}/suite.ts`,
          record('consumer:test') +
            `import { existsSync } from 'node:fs'; if (existsSync(${JSON.stringify(join(f.root, '.tmp/fail'))})) process.exit(9);\n`,
        );
      }
      symlinkSync(join(f.root, 'packages', name), join(f.root, 'node_modules/@nodebraid', name));
    }
    f.write(
      'tests/consumer.test.ts',
      "import '@nodebraid/consumer';\nimport { test } from 'bun:test';\n" +
        record('root:test') +
        "test('integration fixture', () => {});\n",
    );
    f.git('add', '.');
    f.git(
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.invalid',
      '-c',
      'core.hooksPath=/dev/null',
      'commit',
      '-qm',
      'executable fixture',
    );
    f.write('packages/value/src/index.ts', 'export const value = 2;\n');
    const success = f.invoke();
    expect({ status: success.status, error: success.status ? success.stderr : '' }).toEqual({ status: 0, error: '' });
    expect(readFileSync(log, 'utf8').trim().split('\n')).toEqual([
      'browser:build',
      'value:build',
      'consumer:build',
      'core:build',
      'browser:types',
      'browser:test',
      'consumer:types',
      'consumer:test',
      'core:types',
      'core:test',
      'value:types',
      'value:test',
      'root:test',
      'browser:browser',
      'docs',
    ]);
    f.write('.tmp/steps.log', '');
    f.write('.tmp/fail', 'selected check must fail');
    expect(f.invoke().status).toBe(9);
    const failedSteps = readFileSync(log, 'utf8');
    expect(failedSteps).toContain('consumer:test');
    expect(failedSteps).not.toContain('root:test');
    expect(failedSteps).not.toContain('browser:browser');
    expect(failedSteps).not.toContain('docs');
  } finally {
    rmSync(f.root, { recursive: true });
  }
});
