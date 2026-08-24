import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectDeclarations } from '../../../scripts/collect-declarations';

const forbiddenImport =
  /(?:from\s+|import\()["'](?:@nodebraid\/(?:core|runtime-cordis|plugin-[^"']+|layout-(?:dagre|elk))|cordis|rxjs)["']/;
const forbiddenPlatformType = /\b(?:HTMLElement|SVGElement|CanvasRenderingContext2D|PointerEvent|MouseEvent)\b/;
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const indexDeclaration = await readFile(join(dist, 'index.d.ts'), 'utf8');
assert.match(indexDeclaration, /export \{ defineLayoutEngine \}/);
assert.match(indexDeclaration, /export \{ LayoutError/);
assert.match(indexDeclaration, /export \{ createLayoutInput \}/);
assert.match(indexDeclaration, /export \{ validateLayoutProposal \}/);
for (const declaration of await collectDeclarations(dist)) {
  assert.doesNotMatch(declaration.contents, forbiddenImport, declaration.path);
  assert.doesNotMatch(declaration.contents, forbiddenPlatformType, declaration.path);
}
const packageName = '@nodebraid/layout-api';
const packageExports = await import(packageName);
assert.equal(typeof packageExports.createLayoutInput, 'function');
assert.equal(typeof packageExports.defineLayoutEngine, 'function');
assert.equal(typeof packageExports.LayoutError, 'function');
