import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectDeclarations } from '../../../scripts/collect-declarations';

const forbiddenImport = /(?:from\s+|import\()["'](?:@cflow\/(?:core|renderer-(?!api)[^"']+)|cordis|rxjs)["']/;
const forbiddenPlatformType = /\b(?:HTMLElement|SVGElement|CanvasRenderingContext2D|PointerEvent|KeyboardEvent)\b/;
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const indexDeclaration = await readFile(join(dist, 'index.d.ts'), 'utf8');
assert.match(indexDeclaration, /export \{ interactionPlugin \}/);
for (const declaration of await collectDeclarations(dist)) {
  assert.doesNotMatch(declaration.contents, forbiddenImport, declaration.path);
  assert.doesNotMatch(declaration.contents, forbiddenPlatformType, declaration.path);
}

const packageExports = await import('@cflow/plugin-interaction');
assert.equal(typeof packageExports.interactionPlugin, 'object');
