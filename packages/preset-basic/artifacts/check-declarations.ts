import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectDeclarations } from '../../../scripts/collect-declarations';

const forbiddenImport = /(?:from\s+|import\()["'](?:@nodebraid\/(?:core|renderer-(?!api)[^"']+)|cordis|rxjs)["']/;
const forbiddenCordisType = /\b(?:Context|CordisError|Effect|Fiber|FiberState)\b/;
const forbiddenPlatformType =
  /\b(?:HTMLElement|SVGElement|SVGSVGElement|CanvasRenderingContext2D|PointerEvent|KeyboardEvent|WheelEvent|FocusEvent)\b/;
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const indexDeclaration = await readFile(join(dist, 'index.d.ts'), 'utf8');

assert.match(indexDeclaration, /createBasicCanvasPlugin/);
assert.match(indexDeclaration, /BasicCanvasPluginOptions/);
for (const declaration of await collectDeclarations(dist)) {
  assert.doesNotMatch(declaration.contents, forbiddenImport, declaration.path);
  assert.doesNotMatch(declaration.contents, forbiddenCordisType, declaration.path);
  assert.doesNotMatch(declaration.contents, forbiddenPlatformType, declaration.path);
}

const packageName = '@nodebraid/preset-basic';
const packageExports = await import(packageName);
assert.deepEqual(Object.keys(packageExports), ['createBasicCanvasPlugin']);
assert.equal(typeof packageExports.createBasicCanvasPlugin, 'function');
