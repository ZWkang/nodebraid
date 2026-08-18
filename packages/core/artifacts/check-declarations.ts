import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const forbiddenCordisImport = /(?:from\s+|import\()["']cordis["']/;
const forbiddenCordisType = /\b(?:Context|CordisError|Effect|Fiber|FiberState)\b/;

const coreDist = fileURLToPath(new URL('../dist/', import.meta.url));
const kernelDist = fileURLToPath(new URL('../../kernel/dist/', import.meta.url));
const runtimeDist = fileURLToPath(new URL('../../runtime-cordis/dist/', import.meta.url));
const coreDeclaration = await readFile(join(coreDist, 'index.d.ts'), 'utf8');
const declarationFiles = await Promise.all([
  collectDeclarations(coreDist),
  collectDeclarations(kernelDist),
  collectDeclarations(runtimeDist),
]);

assert.match(coreDeclaration, /export \* from '@cflow\/kernel';/);
assert.match(coreDeclaration, /export \* from '@cflow\/runtime-cordis';/);
for (const declaration of declarationFiles.flat()) {
  assert.doesNotMatch(declaration.contents, forbiddenCordisImport, declaration.path);
  assert.doesNotMatch(declaration.contents, forbiddenCordisType, declaration.path);
}

// Use the package name only after build output exists; source-relative tests cover behavior earlier in `bun run check`.
const corePackageName = '@cflow/core';
const corePackage = (await import(corePackageName)) as typeof import('../src/index');
const kernel = corePackage.createCanvasKernel();
assert.equal(kernel.read().snapshot.revision, 0);

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
