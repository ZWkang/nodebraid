import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectDeclarations } from '../../../scripts/collect-declarations';

const forbiddenImport = /(?:from\s+|import\()["'](?:@cflow\/core|cordis|rxjs|@cflow\/renderer-[^"']+)["']/;
const forbiddenCordisType = /\b(?:Context|CordisError|Effect|Fiber|FiberState)\b/;

const pluginDist = fileURLToPath(new URL('../dist/', import.meta.url));
const pluginDeclaration = await readFile(join(pluginDist, 'index.d.ts'), 'utf8');
assert.match(pluginDeclaration, /export type \{ CommitObserver, KernelService \}/);
assert.match(pluginDeclaration, /export \{ KernelPluginError/);
assert.match(pluginDeclaration, /export \{ kernelPlugin, kernelService \}/);

for (const declaration of await collectDeclarations(pluginDist)) {
  assert.doesNotMatch(declaration.contents, forbiddenImport, declaration.path);
  assert.doesNotMatch(declaration.contents, forbiddenCordisType, declaration.path);
}

const pluginPackageName = '@cflow/plugin-kernel';
const runtimePackageName = '@cflow/runtime-cordis';
const pluginPackage = (await import(pluginPackageName)) as typeof import('../src/index');
const runtimePackage = await import(runtimePackageName);
let revision: number | undefined;
const consumer = runtimePackage.definePlugin({
  requires: { kernel: pluginPackage.kernelService },
  setup(context) {
    revision = context.services.kernel.read().snapshot.revision;
  },
});
const host = runtimePackage.createPluginHost();
host.install(pluginPackage.kernelPlugin);
const installation = host.install(consumer);
await installation.whenActive();
assert.equal(revision, 0);
await host.dispose();
