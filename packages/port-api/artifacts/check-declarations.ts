import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectDeclarations } from '../../../scripts/collect-declarations';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const indexDeclaration = await readFile(join(dist, 'index.d.ts'), 'utf8');
assert.match(indexDeclaration, /PortDefinition/);
assert.match(indexDeclaration, /PortSnapshot/);
assert.match(indexDeclaration, /getPortDefinition/);

for (const declaration of await collectDeclarations(dist)) {
  assert.doesNotMatch(
    declaration.contents,
    /(?:from\s+|import\()["'](?:@nodebraid\/core|cordis|rxjs|@nodebraid\/renderer-)/,
  );
  assert.doesNotMatch(declaration.contents, /\b(?:SVGElement|HTMLElement|Context|Fiber)\b/);
}

const packageExports = await import('@nodebraid/port-api');
assert.deepEqual(Object.keys(packageExports).sort(), [
  'getNodePortSnapshot',
  'getPortDefinition',
  'hasPortDefinitions',
]);
