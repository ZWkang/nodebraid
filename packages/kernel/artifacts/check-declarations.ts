import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const forbiddenImport = /(?:from\s+|import\()["'](?:@cflow\/(?:core|runtime-cordis|renderer-[^"']+)|cordis|rxjs)["']/;
const forbiddenPlatformType = /\b(?:HTMLElement|SVGElement|CanvasRenderingContext2D|PointerEvent|MouseEvent)\b/;

const kernelDist = fileURLToPath(new URL('../dist/', import.meta.url));
for (const declaration of await collectDeclarations(kernelDist)) {
  assert.doesNotMatch(declaration.contents, forbiddenImport, declaration.path);
  assert.doesNotMatch(declaration.contents, forbiddenPlatformType, declaration.path);
}

async function collectDeclarations(directory: string): Promise<Array<{ path: string; contents: string }>> {
  const declarations: Array<{ path: string; contents: string }> = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      declarations.push(...(await collectDeclarations(path)));
    } else if (entry.name.endsWith('.d.ts')) {
      declarations.push({ path, contents: await readFile(path, 'utf8') });
    }
  }
  return declarations;
}
