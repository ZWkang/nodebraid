import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectDeclarations } from '../../../scripts/collect-declarations';

const forbiddenImport =
  /(?:from\s+|import\()["'](?:@nodebraid\/(?:core|runtime-cordis|plugin-[^"']+|layout-dagre)|elkjs|cordis|rxjs)["']/;
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const indexDeclaration = await readFile(join(dist, 'index.d.ts'), 'utf8');
assert.match(indexDeclaration, /export type \{ ElkLayoutAlgorithm, ElkLayoutConfig, ElkLayoutDirection \}/);
assert.match(indexDeclaration, /export \{ elkLayoutEngine \}/);
for (const declaration of await collectDeclarations(dist)) {
  assert.doesNotMatch(declaration.contents, forbiddenImport, declaration.path);
}
const packageName = '@nodebraid/layout-elk';
const packageExports = await import(packageName);
assert.equal(packageExports.elkLayoutEngine.id, 'elk');
