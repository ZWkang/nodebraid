import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectDeclarations } from '../../../scripts/collect-declarations';

const forbiddenImport =
  /(?:from\s+|import\()["'](?:@cflow\/(?:core|runtime-cordis|plugin-[^"']+|renderer-(?!api)[^"']+)|cordis|rxjs)["']/;
const forbiddenPlatformType =
  /\b(?:HTMLElement|SVGElement|CanvasRenderingContext2D|OffscreenCanvas|PointerEvent|MouseEvent|WheelEvent|KeyboardEvent|Konva|Pixi)\b/;
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const indexDeclaration = await readFile(join(dist, 'index.d.ts'), 'utf8');
assert.match(indexDeclaration, /CanvasRenderer/);
assert.match(indexDeclaration, /RendererFactory/);
assert.match(indexDeclaration, /RendererError/);
for (const declaration of await collectDeclarations(dist)) {
  assert.doesNotMatch(declaration.contents, forbiddenImport, declaration.path);
  assert.doesNotMatch(declaration.contents, forbiddenPlatformType, declaration.path);
}

const packageName = '@cflow/renderer-api';
const packageExports = await import(packageName);
assert.equal(typeof packageExports.RendererError, 'function');
