import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const cli = resolve('scripts/build-workspaces.ts');

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'nodebraid-build-workspaces-'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ workspaces: ['packages/*'] }));
  function workspace(name: string, dependencies: string[] = [], testDependencies: string[] = []) {
    const directory = join(root, 'packages', name);
    mkdirSync(directory, { recursive: true });
    writeFileSync(
      join(directory, 'package.json'),
      JSON.stringify({
        name,
        scripts: { 'build:self': 'bun build.ts' },
        dependencies: Object.fromEntries(dependencies.map((dependency) => [dependency, 'workspace:*'])),
        devDependencies: Object.fromEntries(testDependencies.map((dependency) => [dependency, 'workspace:*'])),
      }),
    );
    writeFileSync(
      join(directory, 'build.ts'),
      `import { appendFileSync, existsSync, writeFileSync } from 'node:fs';
for (const dependency of ${JSON.stringify(dependencies)}) {
  if (!existsSync('../' + dependency + '/built')) throw new Error('Dependency not built: ' + dependency);
}
appendFileSync('../../build.log', ${JSON.stringify(name + '\n')});
writeFileSync('built', 'built');
`,
    );
    return directory;
  }
  const invoke = (...args: string[]) => spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8' });
  const builds = () => readFileSync(join(root, 'build.log'), 'utf8').trim().split('\n');
  return { root, workspace, invoke, builds };
}

test('one invocation builds a shared dependency once before its consumers and a later invocation rebuilds it', () => {
  const { root, workspace, invoke, builds } = fixture();
  try {
    workspace('shared');
    workspace('left', ['shared']);
    workspace('right', ['shared']);
    workspace('app', ['left', 'right']);
    expect(invoke('app', 'right').status).toBe(0);
    expect(builds()).toEqual(['shared', 'left', 'right', 'app']);
    expect(invoke('app').status).toBe(0);
    expect(builds()).toEqual(['shared', 'left', 'right', 'app', 'shared', 'left', 'right', 'app']);
  } finally {
    rmSync(root, { recursive: true });
  }
});

test('dependency modes prepare production and test dependencies without building the selected workspace', () => {
  const { root, workspace, invoke, builds } = fixture();
  try {
    workspace('shared');
    workspace('production', ['shared']);
    workspace('test-support', ['shared']);
    workspace('app', ['production'], ['test-support']);
    expect(invoke('--dependencies', 'app').status).toBe(0);
    expect(builds()).toEqual(['shared', 'production']);
    expect(invoke('--test-dependencies', 'app').status).toBe(0);
    expect(builds()).toEqual(['shared', 'production', 'shared', 'production', 'test-support']);
  } finally {
    rmSync(root, { recursive: true });
  }
});

test('a real build failure stops its consumers and is returned as a failing command', () => {
  const { root, workspace, invoke, builds } = fixture();
  try {
    const dependency = workspace('dependency');
    writeFileSync(join(dependency, 'build.ts'), "console.error('broken declaration'); process.exit(7);\n");
    workspace('app', ['dependency']);
    const result = invoke('app');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('broken declaration');
    expect(result.stderr).toContain('dependency build:self failed with exit 7');
    expect(() => builds()).toThrow();
  } finally {
    rmSync(root, { recursive: true });
  }
});

test('a dependency cycle fails with the workspace path instead of recursing until stack overflow', () => {
  const { root, workspace, invoke } = fixture();
  try {
    workspace('left', ['right']);
    workspace('right', ['left']);
    const result = invoke('left');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Workspace dependency cycle: left -> right -> left');
  } finally {
    rmSync(root, { recursive: true });
  }
});
