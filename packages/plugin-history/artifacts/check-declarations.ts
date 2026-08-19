import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectDeclarations } from '../../../scripts/collect-declarations';

const forbiddenImport = /(?:from\s+|import\()["'](?:@cflow\/(?:core|renderer-[^"']+)|cordis|rxjs)["']/;
const forbiddenCordisType = /\b(?:CordisError|Effect|Fiber|FiberState)\b/;

const pluginDist = fileURLToPath(new URL('../dist/', import.meta.url));
const pluginDeclaration = await readFile(join(pluginDist, 'index.d.ts'), 'utf8');
assert.match(pluginDeclaration, /export type \{ HistoryService, HistorySnapshot \}/);
assert.match(pluginDeclaration, /export \{ redoCommand, undoCommand \}/);
assert.match(pluginDeclaration, /export \{ HistoryError/);
assert.match(pluginDeclaration, /export \{ historyDiagnosticEvents \}/);
assert.match(pluginDeclaration, /export \{ historyPlugin, historyService \}/);

for (const declaration of await collectDeclarations(pluginDist)) {
  assert.doesNotMatch(declaration.contents, forbiddenImport, declaration.path);
  assert.doesNotMatch(declaration.contents, forbiddenCordisType, declaration.path);
}

const pluginPackageName = '@cflow/plugin-history';
const pluginPackage = (await import(pluginPackageName)) as typeof import('../src/index');
assert.equal(pluginPackage.undoCommand.id, 'history.undo');
assert.equal(pluginPackage.redoCommand.id, 'history.redo');
assert.ok(pluginPackage.historyPlugin);
assert.ok(pluginPackage.historyService);
