import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectDeclarations } from '../../../scripts/collect-declarations';

const forbiddenCordisImport = /(?:from\s+|import\()["']cordis["']/;
const forbiddenCordisType = /\b(?:Context|CordisError|Effect|Fiber|FiberState)\b/;

const coreDist = fileURLToPath(new URL('../dist/', import.meta.url));
const diagnosticsDist = fileURLToPath(new URL('../../diagnostics/dist/', import.meta.url));
const kernelDist = fileURLToPath(new URL('../../kernel/dist/', import.meta.url));
const layoutApiDist = fileURLToPath(new URL('../../layout-api/dist/', import.meta.url));
const pluginCommandDist = fileURLToPath(new URL('../../plugin-command/dist/', import.meta.url));
const pluginHistoryDist = fileURLToPath(new URL('../../plugin-history/dist/', import.meta.url));
const pluginKernelDist = fileURLToPath(new URL('../../plugin-kernel/dist/', import.meta.url));
const pluginSessionDist = fileURLToPath(new URL('../../plugin-session/dist/', import.meta.url));
const pluginLayoutDist = fileURLToPath(new URL('../../plugin-layout/dist/', import.meta.url));
const runtimeDist = fileURLToPath(new URL('../../runtime-cordis/dist/', import.meta.url));
const coreDeclaration = await readFile(join(coreDist, 'index.d.ts'), 'utf8');
const declarationFiles = await Promise.all([
  collectDeclarations(coreDist),
  collectDeclarations(diagnosticsDist),
  collectDeclarations(kernelDist),
  collectDeclarations(layoutApiDist),
  collectDeclarations(pluginCommandDist),
  collectDeclarations(pluginHistoryDist),
  collectDeclarations(pluginKernelDist),
  collectDeclarations(pluginSessionDist),
  collectDeclarations(pluginLayoutDist),
  collectDeclarations(runtimeDist),
]);

assert.match(coreDeclaration, /export \* from '@cflow\/diagnostics';/);
assert.match(coreDeclaration, /export \* from '@cflow\/kernel';/);
assert.match(coreDeclaration, /export \* from '@cflow\/layout-api';/);
assert.match(coreDeclaration, /export \* from '@cflow\/plugin-command';/);
assert.match(coreDeclaration, /export \* from '@cflow\/plugin-history';/);
assert.match(coreDeclaration, /export \* from '@cflow\/plugin-kernel';/);
assert.match(coreDeclaration, /export \* from '@cflow\/plugin-session';/);
assert.match(coreDeclaration, /export \* from '@cflow\/plugin-layout';/);
assert.match(coreDeclaration, /export \* from '@cflow\/runtime-cordis';/);
assert.doesNotMatch(coreDeclaration, /@cflow\/layout-(?:dagre|elk)/);
for (const declaration of declarationFiles.flat()) {
  assert.doesNotMatch(declaration.contents, forbiddenCordisImport, declaration.path);
  assert.doesNotMatch(declaration.contents, forbiddenCordisType, declaration.path);
}

// Use the package name only after build output exists; source-relative tests cover behavior earlier in `bun run check`.
const corePackageName = '@cflow/core';
const corePackage = (await import(corePackageName)) as typeof import('../src/index');
const kernel = corePackage.createCanvasKernel();
assert.equal(kernel.read().snapshot.revision, 0);
assert.ok(corePackage.CFlowError);
assert.equal(corePackage.diagnosticEvents.sinkFault, 'cflow.diagnostics.sink.fault');
assert.ok(corePackage.kernelPlugin);
assert.ok(corePackage.kernelService);
assert.ok(corePackage.commandPlugin);
assert.ok(corePackage.commandService);
assert.ok(corePackage.sessionPlugin);
assert.ok(corePackage.sessionService);
assert.equal(corePackage.defineCommand('artifact.command').id, 'artifact.command');
assert.ok(corePackage.historyPlugin);
assert.ok(corePackage.historyService);
assert.equal(corePackage.undoCommand.id, 'history.undo');
assert.equal(corePackage.redoCommand.id, 'history.redo');
assert.equal(typeof corePackage.createLayoutInput, 'function');
assert.equal(typeof corePackage.defineLayoutEngine, 'function');
assert.equal(typeof corePackage.createLayoutPlugin, 'function');
