import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createCanvasKernel, nodeId } from '@nodebraid/kernel';

import { collectDeclarations } from '../../../scripts/collect-declarations';

const forbiddenImport =
  /(?:from\s+|import\()["'](?:@nodebraid\/(?:core|runtime-cordis|plugin-[^"']+|renderer-[^"']+)|cordis|rxjs)["']/;
const forbiddenPlatformType =
  /\b(?:HTMLElement|SVGElement|CanvasRenderingContext2D|PointerEvent|KeyboardEvent|Clipboard|File|Blob)\b/;
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const indexDeclaration = await readFile(join(dist, 'index.d.ts'), 'utf8');
assert.match(indexDeclaration, /deserializeCanvasDocument/);
assert.match(indexDeclaration, /serializeCanvasDocument/);
for (const declaration of await collectDeclarations(dist)) {
  assert.doesNotMatch(declaration.contents, forbiddenImport, declaration.path);
  assert.doesNotMatch(declaration.contents, forbiddenPlatformType, declaration.path);
}

const packageExports = await import('@nodebraid/document');
assert.deepEqual(Object.keys(packageExports).sort(), [
  'CanvasDocumentError',
  'deserializeCanvasDocument',
  'serializeCanvasDocument',
]);
const kernel = createCanvasKernel();
kernel.transact(({ nodes }) => {
  nodes.add({ id: nodeId('package-consumer'), type: 'task', position: { x: 2, y: 3 }, data: 42n });
});
const codec = {
  format: 'artifact/bigint-v1',
  encode(data: unknown) {
    if (typeof data !== 'bigint') throw new Error('Expected bigint business data.');
    return data.toString();
  },
  decode: (text: string) => BigInt(text),
};
const text = packageExports.serializeCanvasDocument(kernel.read().snapshot, codec);
assert.deepEqual(packageExports.deserializeCanvasDocument(text, codec), {
  nodes: [{ id: nodeId('package-consumer'), type: 'task', position: { x: 2, y: 3 }, data: 42n }],
  edges: [],
});
