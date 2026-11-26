import type { CanvasKernel, CanvasEdge } from '@nodebraid/core';
import { acceptExampleData } from './example-data-codec';

export function applyEdgeLabel(kernel: Pick<CanvasKernel, 'transact'>, expected: CanvasEdge, label: string) {
  return kernel.transact(
    (tx) => {
      if (tx.query.getEdge(expected.id) !== expected)
        throw new Error('The selected edge changed. Cancel to reload its label.');
      const data = acceptExampleData(expected.data);
      if (label === (data?.label ?? '')) return;
      tx.edges.replace(expected.id, { ...expected, data: { label, tags: data?.tags ?? [] } });
    },
    { origin: 'example.edge-label' },
  );
}
