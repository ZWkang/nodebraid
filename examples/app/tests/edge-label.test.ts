import { expect, test } from 'bun:test';
import { createCanvasKernel, edgeId, nodeId } from '@nodebraid/core';
import { applyEdgeLabel } from '../src/example-runtime/edge-label';

test('label changes preserve the exact endpoints, tags and other edges and reject a replaced edge', () => {
  const kernel = createCanvasKernel(),
    a = nodeId('a'),
    b = nodeId('b'),
    id = edgeId('ab'),
    other = edgeId('other');
  kernel.transact((tx) => {
    for (const n of [a, b]) tx.nodes.add({ id: n, type: 'task', data: null, position: { x: 0, y: 0 } });
    for (const n of [id, other])
      tx.edges.add({
        id: n,
        type: 'flow',
        source: { nodeId: a, portId: 'out' },
        target: { nodeId: b, portId: 'in' },
        data: { label: 'Yes', tags: ['branch'] },
      });
  });
  const original = kernel.read().query.getEdge(id)!,
    untouched = kernel.read().query.getEdge(other);
  expect(applyEdgeLabel(kernel, original, 'Yes')).toBeNull();
  applyEdgeLabel(kernel, original, 'No');
  expect(kernel.read().query.getEdge(id)).toEqual({ ...original, data: { label: 'No', tags: ['branch'] } });
  expect(kernel.read().query.getEdge(other)).toBe(untouched);
  expect(() => applyEdgeLabel(kernel, original, 'Older')).toThrow();
  applyEdgeLabel(kernel, kernel.read().query.getEdge(id)!, '');
  expect(kernel.read().query.getEdge(id)?.data).toEqual({ label: '', tags: ['branch'] });
});
