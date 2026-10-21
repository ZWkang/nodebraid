import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export interface Workspace {
  name: string;
  directory: string;
  scripts: Record<string, string>;
  dependencies: string[];
  testDependencies: string[];
}

interface Manifest {
  name: string;
  scripts: Record<string, string>;
  workspaces?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function readManifest(path: string): Manifest {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function readWorkspaces(root: string): Map<string, Workspace> {
  const { workspaces } = readManifest(join(root, 'package.json'));
  if (!workspaces) throw new Error(`No workspaces declared in ${root}`);
  const result = new Map<string, Workspace>();
  const workspaceDependencies = (dependencies: Record<string, string> = {}) =>
    Object.entries(dependencies)
      .filter(([, version]) => version.startsWith('workspace:'))
      .map(([name]) => name);
  for (const pattern of workspaces) {
    for (const path of [...new Bun.Glob(`${pattern}/package.json`).scanSync({ cwd: root })].sort()) {
      const manifest = readManifest(join(root, path));
      result.set(manifest.name, {
        name: manifest.name,
        directory: resolve(root, dirname(path)),
        scripts: manifest.scripts,
        dependencies: workspaceDependencies(manifest.dependencies),
        testDependencies: workspaceDependencies(manifest.devDependencies),
      });
    }
  }
  return result;
}

export function buildWorkspaces(root: string, names: string[]): void {
  const workspaces = readWorkspaces(root);
  const built = new Set<string>();
  const building = new Set<string>();
  function build(name: string) {
    if (built.has(name)) return;
    if (building.has(name)) throw new Error(`Workspace dependency cycle: ${[...building, name].join(' -> ')}`);
    const workspace = workspaces.get(name);
    if (!workspace) throw new Error(`Unknown workspace: ${name}`);
    building.add(name);
    for (const dependency of workspace.dependencies) build(dependency);
    console.log(`[build] ${name}`);
    const result = spawnSync(process.execPath, ['run', 'build:self'], {
      cwd: workspace.directory,
      stdio: 'inherit',
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${name} build:self failed with exit ${result.status}`);
    building.delete(name);
    built.add(name);
  }
  for (const name of names) build(name);
}

function findWorkspaceRoot(directory: string): string {
  const manifest = join(directory, 'package.json');
  if (existsSync(manifest) && readManifest(manifest).workspaces) return directory;
  const parent = dirname(directory);
  if (parent === directory) throw new Error('No workspace root found');
  return findWorkspaceRoot(parent);
}

if (import.meta.main) {
  const root = findWorkspaceRoot(process.cwd());
  const names = process.argv.slice(2);
  const workspaces = readWorkspaces(root);
  if (names[0] === '--dependencies' || names[0] === '--test-dependencies') {
    if (names.length !== 2) throw new Error(`${names[0]} requires exactly one workspace name`);
    const workspace = workspaces.get(names[1]!);
    if (!workspace) throw new Error(`Unknown workspace: ${names[1]}`);
    buildWorkspaces(
      root,
      names[0] === '--test-dependencies'
        ? [...workspace.dependencies, ...workspace.testDependencies]
        : workspace.dependencies,
    );
  } else {
    buildWorkspaces(root, names.length ? names : [...workspaces.keys()]);
  }
}
