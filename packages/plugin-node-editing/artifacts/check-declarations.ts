import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import { collectDeclarations } from '../../../scripts/collect-declarations';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
for (const declaration of await collectDeclarations(dist)) {
  assert.doesNotMatch(
    declaration.contents,
    /(?:from\s+|import\()["'](?:@nodebraid\/(?:core|adapter-react|renderer-svg)|cordis|rxjs)["']/,
    declaration.path,
  );
  assert.doesNotMatch(declaration.contents, /\b(?:CordisError|Fiber|FiberState)\b/, declaration.path);
}
const packageName = '@nodebraid/plugin-node-editing';
const entry = await import(packageName);
assert.equal(entry.createNodeCommand.id, 'node.create');
assert.equal(entry.updateNodeDataCommand.id, 'node.data.update');
assert.ok(entry.nodeEditingPlugin);
