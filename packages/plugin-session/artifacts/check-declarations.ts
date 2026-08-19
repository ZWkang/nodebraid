import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectDeclarations } from '../../../scripts/collect-declarations';

const forbiddenImport =
  /(?:from\s+|import\()["'](?:@cflow\/core|@cflow\/plugin-command|@cflow\/history|cordis|rxjs|@cflow\/renderer-[^"']+)["']/;
const forbiddenCordisType = /\b(?:Context|CordisError|Effect|Fiber|FiberState)\b/;

const pluginDist = fileURLToPath(new URL('../dist/', import.meta.url));
const pluginDeclaration = await readFile(join(pluginDist, 'index.d.ts'), 'utf8');
assert.match(
  pluginDeclaration,
  /export type \{ SelectionInput, SelectionSnapshot, SessionService, SessionSnapshot, Viewport \}/,
);
assert.match(pluginDeclaration, /export \{ SessionError/);
assert.match(pluginDeclaration, /export \{ sessionDiagnosticEvents \}/);
assert.match(pluginDeclaration, /export \{ sessionPlugin, sessionService \}/);

for (const declaration of await collectDeclarations(pluginDist)) {
  assert.doesNotMatch(declaration.contents, forbiddenImport, declaration.path);
  assert.doesNotMatch(declaration.contents, forbiddenCordisType, declaration.path);
}

const pluginPackageName = '@cflow/plugin-session';
const kernelPluginPackageName = '@cflow/plugin-kernel';
const runtimePackageName = '@cflow/runtime-cordis';
const pluginPackage = (await import(pluginPackageName)) as typeof import('../src/index');
const kernelPluginPackage = await import(kernelPluginPackageName);
const runtimePackage = await import(runtimePackageName);
let snapshot: import('../src/index').SessionSnapshot | undefined;
const consumer = runtimePackage.definePlugin({
  requires: { session: pluginPackage.sessionService },
  setup(context) {
    snapshot = context.services.session.getSnapshot();
  },
});
const host = runtimePackage.createPluginHost();
host.install(kernelPluginPackage.kernelPlugin);
host.install(pluginPackage.sessionPlugin);
const installation = host.install(consumer);
await installation.whenActive();
assert.deepEqual(snapshot, {
  selection: { nodeIds: [], edgeIds: [] },
  viewport: { x: 0, y: 0, zoom: 1 },
});
await host.dispose();
