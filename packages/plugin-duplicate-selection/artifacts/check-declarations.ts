import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectDeclarations } from '../../../scripts/collect-declarations';

const forbiddenImport = /(?:from\s+|import\()["'](?:@nodebraid\/(?:core|renderer-(?!api)[^"']+)|cordis|rxjs)["']/;
const forbiddenPlatformType = /\b(?:HTMLElement|SVGElement|PointerEvent|KeyboardEvent|ClipboardEvent)\b/;
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const indexDeclaration = await readFile(join(dist, 'index.d.ts'), 'utf8');
assert.match(indexDeclaration, /duplicateSelectionCommand/);
assert.match(indexDeclaration, /createDuplicateSelectionPlugin/);
assert.match(indexDeclaration, /createDuplicateSelectionShortcutPlugin/);
assert.match(indexDeclaration, /DuplicateIdMaterializer/);
for (const declaration of await collectDeclarations(dist)) {
  assert.doesNotMatch(declaration.contents, forbiddenImport, declaration.path);
  assert.doesNotMatch(declaration.contents, forbiddenPlatformType, declaration.path);
}

const packageExports = await import('@nodebraid/plugin-duplicate-selection');
assert.equal(typeof packageExports.createDuplicateSelectionPlugin, 'function');
assert.equal(typeof packageExports.createDuplicateSelectionShortcutPlugin, 'function');
assert.equal(typeof packageExports.duplicateSelectionCommand, 'object');
assert.equal(typeof packageExports.DuplicateSelectionError, 'function');
