import type { CanvasEdge, CanvasNode, CanvasSnapshot, CanvasView } from './contracts';
import { createCanvasQuery, GraphIndex } from './graph-index';
import type { EdgeId, NodeId } from './identifiers';
import { compareIds } from './ordering';

export function createCanvasView(
  revision: number,
  nodes: ReadonlyMap<NodeId, CanvasNode>,
  edges: ReadonlyMap<EdgeId, CanvasEdge>,
): CanvasView {
  // Canonical ID ordering makes equivalent Documents observable identically; it does not imply z-index.
  const sortedNodes = Object.freeze([...nodes.values()].sort((left, right) => compareIds(left.id, right.id)));
  const sortedEdges = Object.freeze([...edges.values()].sort((left, right) => compareIds(left.id, right.id)));
  const snapshot: CanvasSnapshot = Object.freeze({
    revision,
    nodes: sortedNodes,
    edges: sortedEdges,
  });
  const index = new GraphIndex(nodes, edges);
  return Object.freeze({ snapshot, query: createCanvasQuery(nodes, edges, index) });
}
