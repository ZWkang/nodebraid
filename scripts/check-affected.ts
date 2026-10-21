import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { buildWorkspaces, readWorkspaces } from './build-workspaces';

const args = process.argv.slice(2);
let base = 'HEAD';
let planOnly = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--plan') planOnly = true;
  else if (args[i] === '--base' && args[i + 1]) base = args[++i]!;
  else throw new Error('Usage: check:affected [--base <ref>] [--plan]');
}
const git = (...command: string[]) => execFileSync('git', command, { encoding: 'utf8' });
const root = git('rev-parse', '--show-toplevel').trim();
process.chdir(root);
const baseline = base === 'HEAD' ? 'HEAD' : git('merge-base', base, 'HEAD').trim();
const files = [
  ...new Set([
    ...git('diff', '--name-only', '--no-renames', '-z', baseline, '--').split('\0'),
    ...git('ls-files', '--others', '--exclude-standard', '-z').split('\0'),
  ]),
]
  .filter(Boolean)
  .sort();
const workspaces = readWorkspaces(root);
const affected = new Set<string>();
let docs = false;
const shared: string[] = [];
for (const file of files) {
  if (file.startsWith('website/')) {
    docs = true;
    continue;
  }
  const workspace = [...workspaces.values()].find((item) => file.startsWith(`${relative(root, item.directory)}/`));
  if (workspace) affected.add(workspace.name);
  else if (
    !file.endsWith('.md') ||
    file.startsWith('.agents/') ||
    file.startsWith('docs/agents/') ||
    file === 'AGENTS.md'
  ) {
    // Shared tooling and files outside a workspace have repository-wide impact.
    shared.push(file);
  }
}
let previousSize = -1;
while (previousSize !== affected.size) {
  previousSize = affected.size;
  for (const workspace of workspaces.values()) {
    if ([...workspace.dependencies, ...workspace.testDependencies].some((name) => affected.has(name))) {
      affected.add(workspace.name);
    }
  }
}

// Root integration tests can use a shared local fixture; follow those imports too.
function workspaceImports(path: string, seen = new Set<string>()): string[] {
  if (seen.has(path)) return [];
  seen.add(path);
  const source = readFileSync(path, 'utf8');
  const imports = new Bun.Transpiler({ loader: path.endsWith('x') ? 'tsx' : 'ts' }).scanImports(source);
  const names = imports
    .filter((item) => item.path.startsWith('@nodebraid/'))
    .map((item) => item.path.split('/').slice(0, 2).join('/'));
  for (const item of imports.filter((item) => item.path.startsWith('.'))) {
    const target = resolve(dirname(path), item.path);
    const file = [target, `${target}.ts`, `${target}.tsx`, join(target, 'index.ts')].find(
      (candidate) => existsSync(candidate) && /\.[cm]?[jt]sx?$/.test(candidate),
    );
    if (file) names.push(...workspaceImports(file, seen));
  }
  return [...new Set(names)];
}
const rootTests = [...new Bun.Glob('tests/**/*.test.ts').scanSync({ cwd: root })].sort();
const imports = new Map(rootTests.map((path) => [path, workspaceImports(join(root, path))]));
const tests = rootTests.filter((path) => imports.get(path)!.some((name) => affected.has(name)));
const packages = [...affected].sort();
const browser = packages.filter((name) => workspaces.get(name)!.scripts['test:browser:self']);
docs ||= affected.has('@nodebraid/core');
const plan = { mode: shared.length ? 'full' : 'affected', files, packages, tests, browser, docs, shared };
console.log(JSON.stringify(plan, null, 2));
if (planOnly) process.exit(0);

function run(command: string[], cwd = root) {
  console.log(`\n[check:affected] ${relative(root, cwd) || '.'}: ${command.join(' ')}`);
  const result = spawnSync(command[0]!, command.slice(1), { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (shared.length) {
  run([process.execPath, 'run', 'check']);
} else if (files.length) {
  const existing = files.filter((file) => existsSync(join(root, file)));
  if (existing.length)
    run([process.execPath, 'x', '--no-install', 'prettier', '--check', '--ignore-unknown', ...existing]);
  const code = existing.filter((file) => /\.[cm]?[jt]sx?$/.test(file));
  if (code.length) run([process.execPath, 'x', '--no-install', 'oxlint', ...code]);
  const build = new Set(packages);
  for (const name of packages) for (const dependency of workspaces.get(name)!.testDependencies) build.add(dependency);
  for (const path of tests) for (const name of imports.get(path)!) build.add(name);
  if (docs) build.add('@nodebraid/core');
  buildWorkspaces(root, [...build]);
  for (const name of packages) {
    const workspace = workspaces.get(name)!;
    run([process.execPath, 'run', 'typecheck:self'], workspace.directory);
    if (workspace.scripts['test:self']) run([process.execPath, 'run', 'test:self'], workspace.directory);
  }
  if (tests.length) run([process.execPath, 'test', ...tests]);
  for (const name of browser) run([process.execPath, 'run', 'test:browser:self'], workspaces.get(name)!.directory);
  if (docs) run([process.execPath, 'run', 'docs:check:self']);
} else {
  console.log('No changed files; no development checks selected. Full delivery checks are still required.');
}
