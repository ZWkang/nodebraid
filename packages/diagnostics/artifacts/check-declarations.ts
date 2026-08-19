import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectDeclarations } from '../../../scripts/collect-declarations';

const forbiddenImport = /(?:from\s+|import\()["'](?:@cflow\/|cordis|rxjs)["']/;
const forbiddenPlatformType = /\b(?:HTMLElement|SVGElement|CanvasRenderingContext2D|PointerEvent|MouseEvent)\b/;

const diagnosticsDist = fileURLToPath(new URL('../dist/', import.meta.url));
const indexDeclaration = await readFile(join(diagnosticsDist, 'index.d.ts'), 'utf8');
assert.match(indexDeclaration, /export \{ CFlowError/);
assert.match(indexDeclaration, /export \{ DiagnosticsError/);
assert.match(indexDeclaration, /export \{ diagnosticEvents \}/);
assert.match(indexDeclaration, /describeNonFiniteNumber/);
for (const declaration of await collectDeclarations(diagnosticsDist)) {
  assert.doesNotMatch(declaration.contents, forbiddenImport, declaration.path);
  assert.doesNotMatch(declaration.contents, forbiddenPlatformType, declaration.path);
}

const packageName = '@cflow/diagnostics';
const packageExports = await import(packageName);
assert.equal(typeof packageExports.CFlowError, 'function');
assert.equal(typeof packageExports.describeError, 'function');
assert.equal(typeof packageExports.describeNonFiniteNumber, 'function');
assert.equal(packageExports.diagnosticEvents.sinkFault, 'cflow.diagnostics.sink.fault');
