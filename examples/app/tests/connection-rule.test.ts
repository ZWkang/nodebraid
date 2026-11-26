import { expect, test } from 'bun:test';
import { createCanvasKernel, nodeId, edgeId } from '@nodebraid/core';
import { exampleConnectionRule } from '../src/example-runtime/connection-rule';

test('an indirect path from the candidate target back to the source would close a cycle', () => {
  const kernel = createCanvasKernel(),
    a = nodeId('a'),
    b = nodeId('b'),
    c = nodeId('c');
  kernel.transact((tx) => {
    for (const id of [a, b, c]) tx.nodes.add({ id, type: 'step', position: { x: 0, y: 0 }, data: null });
    for (const [source, target] of [
      [a, b],
      [b, c],
    ] as const)
      tx.edges.add({
        id: edgeId(source + target),
        type: 'link',
        source: { nodeId: source },
        target: { nodeId: target },
        data: null,
      });
  });
  const view = kernel.read();
  expect(
    exampleConnectionRule({
      source: { nodeId: c },
      target: { nodeId: a },
      view,
      ports: { documentRevision: view.snapshot.revision, generation: 0, nodes: [] },
    }),
  ).toMatchObject({ type: 'deny', reason: { code: 'CYCLE' } });
});
