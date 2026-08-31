import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectDeclarations } from '../../../scripts/collect-declarations';

const forbiddenImport =
  /(?:from\s+|import\()["'](?:@nodebraid\/(?:core|runtime-cordis|plugin-[^"']+|renderer-[^"']+)|cordis|rxjs)["']/;
const forbiddenPlatformType =
  /\b(?:HTMLElement|SVGElement|CanvasRenderingContext2D|PointerEvent|KeyboardEvent|Clipboard)\b/;
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const indexDeclaration = await readFile(join(dist, 'index.d.ts'), 'utf8');
assert.match(indexDeclaration, /export \{ acceptCanvasFragment \}/);
assert.match(indexDeclaration, /export \{ materializeCanvasFragment \}/);
for (const declaration of await collectDeclarations(dist)) {
  assert.doesNotMatch(declaration.contents, forbiddenImport, declaration.path);
  assert.doesNotMatch(declaration.contents, forbiddenPlatformType, declaration.path);
}

const packageExports = await import('@nodebraid/canvas-fragment');
assert.deepEqual(Object.keys(packageExports).sort(), [
  'CanvasFragmentError',
  'acceptCanvasFragment',
  'captureCanvasFragment',
  'materializeCanvasFragment',
]);
