import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectDeclarations } from '../../../scripts/collect-declarations';

const forbiddenImport = /(?:from\s+|import\()["'](?:@nodebraid\/(?:core|renderer-(?!api)[^"']+)|cordis|rxjs)["']/;
const forbiddenCordisType = /\b(?:CordisError|Effect|Fiber|FiberState)\b/;
const forbiddenPlatformType = /\b(?:HTMLElement|SVGElement|CanvasRenderingContext2D|PointerEvent|KeyboardEvent)\b/;
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const indexDeclaration = await readFile(join(dist, 'index.d.ts'), 'utf8');
assert.match(indexDeclaration, /export type \{ InteractionProjectionBinding, RendererService \}/);
assert.match(indexDeclaration, /export \{ createRendererPlugin, rendererService \}/);
for (const declaration of await collectDeclarations(dist)) {
  assert.doesNotMatch(declaration.contents, forbiddenImport, declaration.path);
  assert.doesNotMatch(declaration.contents, forbiddenCordisType, declaration.path);
  assert.doesNotMatch(declaration.contents, forbiddenPlatformType, declaration.path);
}

const packageName = '@nodebraid/plugin-renderer';
const packageExports = await import(packageName);
assert.equal(typeof packageExports.createRendererPlugin, 'function');
assert.equal(typeof packageExports.rendererService, 'object');
