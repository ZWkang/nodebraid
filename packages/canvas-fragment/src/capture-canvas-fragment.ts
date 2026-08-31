import type { CanvasEdge, CanvasNode, CanvasView, EdgeId, NodeId } from '@nodebraid/kernel';

import type { CanvasFragment, CanvasFragmentSelection } from './contracts';

export function captureCanvasFragment(view: CanvasView, selection: CanvasFragmentSelection): CanvasFragment | null {
  if (selection.nodeIds.length === 0) return null;
  const nodeIds = [...selection.nodeIds].sort(compareIds);
  const nodeIdSet = new Set(nodeIds);
  const nodes = nodeIds.map((id) => requireNode(view, id));
  const edgesById = new Map<EdgeId, CanvasEdge>();
  for (const nodeId of nodeIds) {
    for (const edge of view.query.getIncidentEdges(nodeId)) {
      if (nodeIdSet.has(edge.source.nodeId) && nodeIdSet.has(edge.target.nodeId)) edgesById.set(edge.id, edge);
    }
  }
  const edges = [...edgesById.values()].sort((left, right) => compareIds(left.id, right.id));
  const internalEdgeIds = new Set(edges.map((edge) => edge.id));
  const selectedEdgeIds = [...selection.edgeIds].filter((id) => internalEdgeIds.has(id)).sort(compareIds);
  return Object.freeze({
    type: 'nodebraid.canvas-fragment',
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    selection: Object.freeze({ nodeIds: Object.freeze(nodeIds), edgeIds: Object.freeze(selectedEdgeIds) }),
  });
}

function requireNode(view: CanvasView, id: NodeId): CanvasNode {
  const node = view.query.getNode(id);
  if (!node) throw new Error('Canvas Fragment source Node is unavailable.');
  return node;
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
