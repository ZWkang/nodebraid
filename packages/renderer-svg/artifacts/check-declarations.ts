import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectDeclarations } from '../../../scripts/collect-declarations';

const forbiddenImport =
  /(?:from\s+|import\()["'](?:@nodebraid\/(?:core|runtime-cordis|plugin-[^"']+|renderer-(?!api|svg)[^"']+)|cordis|rxjs|react|vue|svelte)["']/;
const forbiddenLeakedPlatformType =
  /\b(?:PointerEvent|MouseEvent|WheelEvent|KeyboardEvent|CanvasRenderingContext2D|OffscreenCanvas|Konva|Pixi)\b/;
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const indexDeclaration = await readFile(join(dist, 'index.d.ts'), 'utf8');
assert.match(indexDeclaration, /createSvgRenderer/);
assert.match(indexDeclaration, /SvgRendererConfig/);
assert.match(indexDeclaration, /SvgRendererError/);
const declarations = await collectDeclarations(dist);
assert.ok(declarations.some((declaration) => /SVGSVGElement/.test(declaration.contents)));
for (const declaration of declarations) {
  assert.doesNotMatch(declaration.contents, forbiddenImport, declaration.path);
  assert.doesNotMatch(declaration.contents, forbiddenLeakedPlatformType, declaration.path);
}

const packageName = '@nodebraid/renderer-svg';
const packageExports = await import(packageName);
assert.equal(typeof packageExports.createSvgRenderer, 'function');
assert.equal(typeof packageExports.SvgRendererError, 'function');
assert.equal('default' in packageExports, false);
assert.equal('createRendererPlugin' in packageExports, false);
