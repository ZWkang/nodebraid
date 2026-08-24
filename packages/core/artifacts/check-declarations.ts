import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectDeclarations } from '../../../scripts/collect-declarations';

const forbiddenCordisImport = /(?:from\s+|import\()["']cordis["']/;
const forbiddenCordisType = /\b(?:Context|CordisError|Effect|Fiber|FiberState)\b/;

const coreDist = fileURLToPath(new URL('../dist/', import.meta.url));
const diagnosticsDist = fileURLToPath(new URL('../../diagnostics/dist/', import.meta.url));
const interactionApiDist = fileURLToPath(new URL('../../interaction-api/dist/', import.meta.url));
const kernelDist = fileURLToPath(new URL('../../kernel/dist/', import.meta.url));
const layoutApiDist = fileURLToPath(new URL('../../layout-api/dist/', import.meta.url));
const pluginCommandDist = fileURLToPath(new URL('../../plugin-command/dist/', import.meta.url));
const pluginHistoryDist = fileURLToPath(new URL('../../plugin-history/dist/', import.meta.url));
const pluginInteractionDist = fileURLToPath(new URL('../../plugin-interaction/dist/', import.meta.url));
const pluginKernelDist = fileURLToPath(new URL('../../plugin-kernel/dist/', import.meta.url));
const pluginRendererDist = fileURLToPath(new URL('../../plugin-renderer/dist/', import.meta.url));
const pluginSessionDist = fileURLToPath(new URL('../../plugin-session/dist/', import.meta.url));
const pluginLayoutDist = fileURLToPath(new URL('../../plugin-layout/dist/', import.meta.url));
const presetBasicDist = fileURLToPath(new URL('../../preset-basic/dist/', import.meta.url));
const rendererApiDist = fileURLToPath(new URL('../../renderer-api/dist/', import.meta.url));
const runtimeDist = fileURLToPath(new URL('../../runtime-cordis/dist/', import.meta.url));
const sessionApiDist = fileURLToPath(new URL('../../session-api/dist/', import.meta.url));
const coreDeclaration = await readFile(join(coreDist, 'index.d.ts'), 'utf8');
const declarationFiles = await Promise.all([
  collectDeclarations(coreDist),
  collectDeclarations(diagnosticsDist),
  collectDeclarations(interactionApiDist),
  collectDeclarations(kernelDist),
  collectDeclarations(layoutApiDist),
  collectDeclarations(pluginCommandDist),
  collectDeclarations(pluginHistoryDist),
  collectDeclarations(pluginInteractionDist),
  collectDeclarations(pluginKernelDist),
  collectDeclarations(pluginRendererDist),
  collectDeclarations(pluginSessionDist),
  collectDeclarations(pluginLayoutDist),
  collectDeclarations(presetBasicDist),
  collectDeclarations(rendererApiDist),
  collectDeclarations(runtimeDist),
  collectDeclarations(sessionApiDist),
]);

assert.match(coreDeclaration, /export \* from '@nodebraid\/diagnostics';/);
assert.match(coreDeclaration, /export \* from '@nodebraid\/interaction-api';/);
assert.match(coreDeclaration, /export \* from '@nodebraid\/kernel';/);
assert.match(coreDeclaration, /export \* from '@nodebraid\/layout-api';/);
assert.match(coreDeclaration, /export \* from '@nodebraid\/plugin-command';/);
assert.match(coreDeclaration, /export \* from '@nodebraid\/plugin-history';/);
assert.match(coreDeclaration, /export \* from '@nodebraid\/plugin-interaction';/);
assert.match(coreDeclaration, /export \* from '@nodebraid\/plugin-kernel';/);
assert.match(coreDeclaration, /export \* from '@nodebraid\/plugin-renderer';/);
assert.match(coreDeclaration, /export \* from '@nodebraid\/plugin-session';/);
assert.match(coreDeclaration, /export \* from '@nodebraid\/plugin-layout';/);
assert.match(coreDeclaration, /export \* from '@nodebraid\/preset-basic';/);
assert.match(coreDeclaration, /export \* from '@nodebraid\/renderer-api';/);
assert.match(coreDeclaration, /export \* from '@nodebraid\/runtime-cordis';/);
assert.match(coreDeclaration, /export \* from '@nodebraid\/session-api';/);
assert.doesNotMatch(coreDeclaration, /@nodebraid\/layout-(?:dagre|elk)/);
assert.doesNotMatch(coreDeclaration, /@nodebraid\/renderer-svg/);
for (const declaration of declarationFiles.flat()) {
  assert.doesNotMatch(declaration.contents, forbiddenCordisImport, declaration.path);
  assert.doesNotMatch(declaration.contents, forbiddenCordisType, declaration.path);
}

// Use the package name only after build output exists; source-relative tests cover behavior earlier in `bun run check`.
const corePackageName = '@nodebraid/core';
const corePackage = (await import(corePackageName)) as typeof import('../src/index');
const kernel = corePackage.createCanvasKernel();
assert.equal(kernel.read().snapshot.revision, 0);
assert.ok(corePackage.NodeBraidError);
assert.equal(corePackage.diagnosticEvents.sinkFault, 'nodebraid.diagnostics.sink.fault');
assert.ok(corePackage.kernelPlugin);
assert.ok(corePackage.kernelService);
assert.ok(corePackage.commandPlugin);
assert.ok(corePackage.commandService);
assert.ok(corePackage.sessionPlugin);
assert.ok(corePackage.sessionService);
assert.equal(typeof corePackage.RendererError, 'function');
assert.equal(typeof corePackage.createRendererPlugin, 'function');
assert.ok(corePackage.rendererService);
assert.equal(corePackage.defineCommand('artifact.command').id, 'artifact.command');
assert.ok(corePackage.historyPlugin);
assert.ok(corePackage.historyService);
assert.ok(corePackage.interactionPlugin);
assert.equal(typeof corePackage.createBasicCanvasPlugin, 'function');
assert.equal(corePackage.moveNodesCommand.id, 'interaction.nodes.move');
assert.equal(corePackage.interactionDiagnosticEvents.inputRejected, 'nodebraid.plugin.interaction.input.rejected');
assert.equal(corePackage.undoCommand.id, 'history.undo');
assert.equal(corePackage.redoCommand.id, 'history.redo');
assert.equal(typeof corePackage.createLayoutInput, 'function');
assert.equal(typeof corePackage.defineLayoutEngine, 'function');
assert.equal(typeof corePackage.createLayoutPlugin, 'function');
