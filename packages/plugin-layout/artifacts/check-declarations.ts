import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectDeclarations } from '../../../scripts/collect-declarations';

const forbiddenImport = /(?:from\s+|import\()["'](?:@nodebraid\/(?:core|layout-(?:dagre|elk))|cordis|rxjs)["']/;
const forbiddenCordisType = /\b(?:CordisError|Effect|Fiber|FiberState)\b/;
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const indexDeclaration = await readFile(join(dist, 'index.d.ts'), 'utf8');
assert.match(indexDeclaration, /export type \{ CreateLayoutPluginOptions, LayoutCommandInput, LayoutCommandResult \}/);
assert.match(indexDeclaration, /export \{ createLayoutPlugin \}/);
for (const declaration of await collectDeclarations(dist)) {
  assert.doesNotMatch(declaration.contents, forbiddenImport, declaration.path);
  assert.doesNotMatch(declaration.contents, forbiddenCordisType, declaration.path);
}
const packageName = '@nodebraid/plugin-layout';
const packageExports = await import(packageName);
assert.equal(typeof packageExports.createLayoutPlugin, 'function');
