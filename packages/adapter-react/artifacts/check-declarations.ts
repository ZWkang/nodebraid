import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectDeclarations } from '../../../scripts/collect-declarations';

const forbiddenImport =
  /(?:from\s+|import\()["'](?:@nodebraid\/(?:core|runtime-cordis|renderer-[^"']+)|cordis|rxjs|@nodebraid\/examples)["']/;
const forbiddenSurface = /\b(?:Context|Provider|Selector|HTMLElement|SVGElement)\b/;
const adapterDist = fileURLToPath(new URL('../dist/', import.meta.url));
const indexDeclaration = await readFile(join(adapterDist, 'index.d.ts'), 'utf8');

assert.match(indexDeclaration, /export \{ useRuntimeMount \}/);
assert.match(indexDeclaration, /export \{ useHistorySnapshot, useKernelView, useSessionSnapshot \}/);

for (const declaration of await collectDeclarations(adapterDist)) {
  assert.doesNotMatch(declaration.contents, forbiddenImport, declaration.path);
  assert.doesNotMatch(declaration.contents, forbiddenSurface, declaration.path);
}

const packageName = '@nodebraid/adapter-react';
const adapterPackage = (await import(packageName)) as typeof import('../src');
assert.equal(typeof adapterPackage.useRuntimeMount, 'function');
assert.equal(typeof adapterPackage.useKernelView, 'function');
assert.equal(typeof adapterPackage.useSessionSnapshot, 'function');
assert.equal(typeof adapterPackage.useHistorySnapshot, 'function');
