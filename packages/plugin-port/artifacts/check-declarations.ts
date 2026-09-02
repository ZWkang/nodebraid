import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectDeclarations } from '../../../scripts/collect-declarations';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const indexDeclaration = await readFile(join(dist, 'index.d.ts'), 'utf8');
assert.match(indexDeclaration, /PortContribution/);
assert.match(indexDeclaration, /PortService/);
assert.match(indexDeclaration, /createPortContributionPlugin/);
assert.match(indexDeclaration, /portPlugin/);

for (const declaration of await collectDeclarations(dist)) {
  assert.doesNotMatch(
    declaration.contents,
    /(?:from\s+|import\()["'](?:@nodebraid\/core|cordis|rxjs|@nodebraid\/renderer-)/,
  );
  assert.doesNotMatch(declaration.contents, /\b(?:SVGElement|HTMLElement|Context|Fiber)\b/);
}

const packageExports = await import('@nodebraid/plugin-port');
assert.equal(typeof packageExports.createPortContributionPlugin, 'function');
assert.equal(typeof packageExports.portPlugin, 'object');
assert.equal(typeof packageExports.portService, 'object');
assert.equal(typeof packageExports.PortError, 'function');
assert.equal(typeof packageExports.portDiagnosticEvents, 'object');
