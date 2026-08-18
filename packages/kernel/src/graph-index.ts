import type { CanvasEdge, CanvasNode, CanvasQuery } from './contracts';
import type { EdgeId, NodeId } from './identifiers';
import { KernelError } from './kernel-error';
import { compareIds } from './ordering';

/** Mutable relation indexes for one committed graph or one private Transaction Draft. */
export class GraphIndex {
  readonly #incoming = new Map<NodeId, CanvasEdge[]>();
  readonly #outgoing = new Map<NodeId, CanvasEdge[]>();
  readonly #children = new Map<NodeId, CanvasNode[]>();

  constructor(nodes: ReadonlyMap<NodeId, CanvasNode>, edges: ReadonlyMap<EdgeId, CanvasEdge>) {
    for (const node of nodes.values()) {
      if (node.parentId !== undefined) append(this.#children, node.parentId, node);
    }
    for (const edge of edges.values()) {
      append(this.#outgoing, edge.source.nodeId, edge);
      append(this.#incoming, edge.target.nodeId, edge);
    }
    sortBuckets(this.#children);
    sortBuckets(this.#incoming);
    sortBuckets(this.#outgoing);
  }

  addNode(node: CanvasNode): void {
    if (node.parentId !== undefined) insertSorted(this.#children, node.parentId, node);
  }

  replaceNode(before: CanvasNode, after: CanvasNode): void {
    if (before.parentId !== undefined) removeById(this.#children, before.parentId, before.id);
    if (after.parentId !== undefined) insertSorted(this.#children, after.parentId, after);
  }

  removeNode(node: CanvasNode): void {
    if (node.parentId !== undefined) removeById(this.#children, node.parentId, node.id);
  }

  addEdge(edge: CanvasEdge): void {
    insertSorted(this.#outgoing, edge.source.nodeId, edge);
    insertSorted(this.#incoming, edge.target.nodeId, edge);
  }

  replaceEdge(before: CanvasEdge, after: CanvasEdge): void {
    this.removeEdge(before);
    this.addEdge(after);
  }

  removeEdge(edge: CanvasEdge): void {
    removeById(this.#outgoing, edge.source.nodeId, edge.id);
    removeById(this.#incoming, edge.target.nodeId, edge.id);
  }

  getIncoming(nodeId: NodeId): readonly CanvasEdge[] {
    return frozenCopy(this.#incoming.get(nodeId));
  }

  getOutgoing(nodeId: NodeId): readonly CanvasEdge[] {
    return frozenCopy(this.#outgoing.get(nodeId));
  }

  getIncident(nodeId: NodeId): readonly CanvasEdge[] {
    return Object.freeze(mergeById(this.#incoming.get(nodeId) ?? [], this.#outgoing.get(nodeId) ?? []));
  }

  getChildren(parentId: NodeId): readonly CanvasNode[] {
    return frozenCopy(this.#children.get(parentId));
  }
}

export function createCanvasQuery(
  nodes: ReadonlyMap<NodeId, CanvasNode>,
  edges: ReadonlyMap<EdgeId, CanvasEdge>,
  index: GraphIndex,
  assertOpen: () => void = () => {},
): CanvasQuery {
  const requireNode = (id: NodeId): void => {
    if (!nodes.has(id)) {
      throw new KernelError('ENTITY_NOT_FOUND', `Node "${id}" does not exist.`, Object.freeze({ entity: 'node', id }));
    }
  };
  return Object.freeze({
    getNode(id: NodeId) {
      assertOpen();
      return nodes.get(id);
    },
    getEdge(id: EdgeId) {
      assertOpen();
      return edges.get(id);
    },
    getIncomingEdges(id: NodeId) {
      assertOpen();
      requireNode(id);
      return index.getIncoming(id);
    },
    getOutgoingEdges(id: NodeId) {
      assertOpen();
      requireNode(id);
      return index.getOutgoing(id);
    },
    getIncidentEdges(id: NodeId) {
      assertOpen();
      requireNode(id);
      return index.getIncident(id);
    },
    getChildren(id: NodeId) {
      assertOpen();
      requireNode(id);
      return index.getChildren(id);
    },
  });
}

interface Identified {
  readonly id: string;
}

function append<Key, Value>(buckets: Map<Key, Value[]>, key: Key, value: Value): void {
  const bucket = buckets.get(key);
  if (bucket === undefined) buckets.set(key, [value]);
  else bucket.push(value);
}

function sortBuckets<Key, Value extends Identified>(buckets: Map<Key, Value[]>): void {
  for (const bucket of buckets.values()) bucket.sort((left, right) => compareIds(left.id, right.id));
}

function insertSorted<Key, Value extends Identified>(buckets: Map<Key, Value[]>, key: Key, value: Value): void {
  const bucket = buckets.get(key);
  if (bucket === undefined) {
    buckets.set(key, [value]);
    return;
  }
  let low = 0;
  let high = bucket.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (compareIds(bucket[middle]!.id, value.id) < 0) low = middle + 1;
    else high = middle;
  }
  bucket.splice(low, 0, value);
}

function removeById<Key, Value extends Identified>(buckets: Map<Key, Value[]>, key: Key, id: string): void {
  const bucket = buckets.get(key);
  if (bucket === undefined) return;
  const index = bucket.findIndex((value) => value.id === id);
  if (index >= 0) bucket.splice(index, 1);
  if (bucket.length === 0) buckets.delete(key);
}

function frozenCopy<Value>(values: readonly Value[] | undefined): readonly Value[] {
  return Object.freeze(values === undefined ? [] : [...values]);
}

function mergeById<Value extends Identified>(left: readonly Value[], right: readonly Value[]): Value[] {
  const merged: Value[] = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length || rightIndex < right.length) {
    const leftValue = left[leftIndex];
    const rightValue = right[rightIndex];
    if (leftValue === undefined) {
      merged.push(rightValue!);
      rightIndex += 1;
    } else if (rightValue === undefined) {
      merged.push(leftValue);
      leftIndex += 1;
    } else {
      const comparison = compareIds(leftValue.id, rightValue.id);
      if (comparison <= 0) {
        merged.push(leftValue);
        leftIndex += 1;
      }
      if (comparison >= 0) {
        if (comparison > 0) merged.push(rightValue);
        rightIndex += 1;
      }
    }
  }
  return merged;
}
