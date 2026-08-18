import { test } from 'bun:test';

import {
  createCanvasKernel,
  edgeId,
  nodeId,
  type CanvasEdge,
  type CanvasNode,
  type ChangeSet,
  type NodeId,
} from '../src';

test('keeps the public Kernel contract type-safe', () => {
  const verifyTypes = () => {
    const kernel = createCanvasKernel();
    const view = kernel.read();
    const node: CanvasNode = {
      id: nodeId('node'),
      type: 'task',
      position: { x: 0, y: 0 },
      data: { label: 'Task' },
    };
    const edge: CanvasEdge = {
      id: edgeId('edge'),
      type: 'flow',
      source: { nodeId: node.id },
      target: { nodeId: node.id },
      data: null,
    };

    // @ts-expect-error Canvas Snapshot collections stay readonly.
    view.snapshot.nodes.push(node);
    // @ts-expect-error Canvas Snapshot revision stays readonly.
    view.snapshot.revision = 2;
    // @ts-expect-error Domain data stays unknown until a caller narrows it.
    const label: string = node.data.label;
    void label;

    kernel.transact((transaction) => {
      // @ts-expect-error Node writers reject Edge identifiers.
      transaction.nodes.remove(edge.id);
      // @ts-expect-error Edge writers reject Node entities.
      transaction.edges.add(node);
      transaction.nodes.add(node);
      transaction.edges.add(edge);
    });

    const changeSet: ChangeSet = {
      beforeRevision: 0,
      revision: 1,
      changes: [{ entity: 'node', id: node.id, before: null, after: node }],
    };
    // @ts-expect-error Change Set collections stay readonly.
    changeSet.changes.push({ entity: 'node', id: node.id, before: node, after: null });
    // @ts-expect-error Node IDs cannot be assigned from ordinary strings.
    const forgedId: NodeId = 'node';
    void forgedId;
  };

  void verifyTypes;
});
