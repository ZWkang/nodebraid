import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectDeclarations } from '../../../scripts/collect-declarations';

const forbiddenImport = /(?:from\s+|import\()["'](?:@nodebraid\/core|@nodebraid\/renderer-[^"']+|cordis|rxjs)["']/;
const forbiddenPlatformType = /\b(?:Navigator|ClipboardEvent|HTMLElement|SVGElement|KeyboardEvent)\b/;
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const indexDeclaration = await readFile(join(dist, 'index.d.ts'), 'utf8');
assert.match(indexDeclaration, /copySelectionToClipboardCommand/);
assert.match(indexDeclaration, /pasteClipboardCommand/);
assert.match(indexDeclaration, /createClipboardPlugin/);
assert.match(indexDeclaration, /createClipboardShortcutPlugin/);
for (const declaration of await collectDeclarations(dist)) {
  assert.doesNotMatch(declaration.contents, forbiddenImport, declaration.path);
  assert.doesNotMatch(declaration.contents, forbiddenPlatformType, declaration.path);
}

const packageExports = await import('@nodebraid/plugin-clipboard');
assert.deepEqual(Object.keys(packageExports).sort(), [
  'ClipboardError',
  'copySelectionToClipboardCommand',
  'createClipboardPlugin',
  'createClipboardShortcutPlugin',
  'pasteClipboardCommand',
]);
