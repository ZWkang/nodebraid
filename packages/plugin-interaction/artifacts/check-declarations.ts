import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectDeclarations } from '../../../scripts/collect-declarations';

const forbiddenImport = /(?:from\s+|import\()["'](?:@nodebraid\/(?:core|renderer-(?!api)[^"']+)|cordis|rxjs)["']/;
const forbiddenPlatformType = /\b(?:HTMLElement|SVGElement|CanvasRenderingContext2D|PointerEvent|KeyboardEvent)\b/;
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const indexDeclaration = await readFile(join(dist, 'index.d.ts'), 'utf8');
assert.match(indexDeclaration, /export \{ interactionPlugin \}/);
assert.match(indexDeclaration, /InteractionError/);
assert.match(indexDeclaration, /InteractionConfig/);
assert.match(indexDeclaration, /interactionDiagnosticEvents/);
assert.match(indexDeclaration, /moveNodesCommand/);
assert.match(indexDeclaration, /createEdgeCommand/);
assert.match(indexDeclaration, /ConnectionMaterializer/);
assert.match(indexDeclaration, /computeBoxSelection/);
assert.match(indexDeclaration, /createWorldRect/);
for (const declaration of await collectDeclarations(dist)) {
  assert.doesNotMatch(declaration.contents, forbiddenImport, declaration.path);
  assert.doesNotMatch(declaration.contents, forbiddenPlatformType, declaration.path);
}

const packageExports = await import('@nodebraid/plugin-interaction');
assert.equal(typeof packageExports.interactionPlugin, 'object');
assert.equal(typeof packageExports.InteractionError, 'function');
assert.equal(typeof packageExports.interactionDiagnosticEvents, 'object');
assert.equal(typeof packageExports.moveNodesCommand, 'object');
assert.equal(typeof packageExports.createEdgeCommand, 'object');
assert.equal(typeof packageExports.computeBoxSelection, 'function');
assert.equal(typeof packageExports.createWorldRect, 'function');
