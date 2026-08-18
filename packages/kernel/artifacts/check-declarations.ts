import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import { collectDeclarations } from '../../../scripts/collect-declarations';

const forbiddenImport = /(?:from\s+|import\()["'](?:@cflow\/(?:core|runtime-cordis|renderer-[^"']+)|cordis|rxjs)["']/;
const forbiddenPlatformType = /\b(?:HTMLElement|SVGElement|CanvasRenderingContext2D|PointerEvent|MouseEvent)\b/;

const kernelDist = fileURLToPath(new URL('../dist/', import.meta.url));
for (const declaration of await collectDeclarations(kernelDist)) {
  assert.doesNotMatch(declaration.contents, forbiddenImport, declaration.path);
  assert.doesNotMatch(declaration.contents, forbiddenPlatformType, declaration.path);
}
