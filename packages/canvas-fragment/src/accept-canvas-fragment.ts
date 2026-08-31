import type { CanvasEdge, CanvasNode, EdgeEndpoint, EdgeId, NodeId } from '@nodebraid/kernel';

import { CanvasFragmentError } from './canvas-fragment-error';
import type { CanvasFragment } from './contracts';

export function acceptCanvasFragment(value: unknown): CanvasFragment {
  const record = requireRecord(value, ['type', 'nodes', 'edges', 'selection']);
  if (read(record, 'type') !== 'nodebraid.canvas-fragment') throwInvalid('Canvas Fragment type is invalid.');
  const rawNodes = requireArray(read(record, 'nodes'), 'Canvas Fragment nodes must be an array.');
  if (rawNodes.length === 0) throwInvalid('Canvas Fragment must contain at least one Node.');
  const nodes = rawNodes.map(acceptNode).sort((left, right) => compareIds(left.id, right.id));
  const nodeIds = new Set<NodeId>();
  for (const node of nodes) {
    if (nodeIds.has(node.id)) throwInvalid('Canvas Fragment Node IDs must be unique.');
    nodeIds.add(node.id);
  }
  const rawEdges = requireArray(read(record, 'edges'), 'Canvas Fragment edges must be an array.');
  const edges = rawEdges.map(acceptEdge).sort((left, right) => compareIds(left.id, right.id));
  const edgeIds = new Set<EdgeId>();
  for (const edge of edges) {
    if (edgeIds.has(edge.id)) throwInvalid('Canvas Fragment Edge IDs must be unique.');
    edgeIds.add(edge.id);
    if (!nodeIds.has(edge.source.nodeId) || !nodeIds.has(edge.target.nodeId)) {
      throwInvalid('Canvas Fragment Edge endpoints must reference Fragment Nodes.');
    }
  }
  assertNoInternalParentCycle(nodes, nodeIds);
  const selectionRecord = requireRecord(read(record, 'selection'), ['nodeIds', 'edgeIds']);
  const selectionNodeIds = acceptIds(read(selectionRecord, 'nodeIds'), 'Node');
  if (!setsEqual(new Set(selectionNodeIds), nodeIds)) {
    throwInvalid('Canvas Fragment Selection must contain every Fragment Node exactly once.');
  }
  const selectionEdgeIds = acceptIds(read(selectionRecord, 'edgeIds'), 'Edge') as EdgeId[];
  if (selectionEdgeIds.some((id) => !edgeIds.has(id))) {
    throwInvalid('Canvas Fragment Selection Edge must belong to the Fragment.');
  }
  return Object.freeze({
    type: 'nodebraid.canvas-fragment',
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    selection: Object.freeze({
      nodeIds: Object.freeze(selectionNodeIds as NodeId[]),
      edgeIds: Object.freeze(selectionEdgeIds),
    }),
  });
}

function acceptNode(value: unknown): CanvasNode {
  const record = requireRecord(
    value,
    ['id', 'type', 'position', 'size', 'parentId', 'data'],
    ['id', 'type', 'position', 'data'],
  );
  const id = requireId(read(record, 'id'), 'Node');
  const type = read(record, 'type');
  if (typeof type !== 'string') throwInvalid('Canvas Fragment Node type must be a string.');
  const position = acceptPoint(read(record, 'position'));
  const sizeValue = readOptional(record, 'size');
  const size =
    sizeValue === undefined
      ? undefined
      : (() => {
          const sizeRecord = requireRecord(sizeValue, ['width', 'height']);
          const width = read(sizeRecord, 'width');
          const height = read(sizeRecord, 'height');
          if (!Number.isFinite(width) || !Number.isFinite(height) || (width as number) < 0 || (height as number) < 0) {
            throwInvalid('Canvas Fragment Node size must be finite and non-negative.');
          }
          return Object.freeze({ width: width as number, height: height as number });
        })();
  const parentValue = readOptional(record, 'parentId');
  const parentId = parentValue === undefined ? undefined : requireId(parentValue, 'Parent');
  return Object.freeze({
    id: id as NodeId,
    type,
    position,
    ...(size === undefined ? {} : { size }),
    ...(parentId === undefined ? {} : { parentId: parentId as NodeId }),
    data: read(record, 'data'),
  });
}

function acceptEdge(value: unknown): CanvasEdge {
  const record = requireRecord(value, ['id', 'type', 'source', 'target', 'data']);
  const id = requireId(read(record, 'id'), 'Edge');
  const type = read(record, 'type');
  if (typeof type !== 'string') throwInvalid('Canvas Fragment Edge type must be a string.');
  return Object.freeze({
    id: id as EdgeId,
    type,
    source: acceptEndpoint(read(record, 'source')),
    target: acceptEndpoint(read(record, 'target')),
    data: read(record, 'data'),
  });
}

function acceptEndpoint(value: unknown): EdgeEndpoint {
  const record = requireRecord(value, ['nodeId', 'portId'], ['nodeId']);
  const nodeId = requireId(read(record, 'nodeId'), 'Endpoint Node');
  const portId = readOptional(record, 'portId');
  if (portId !== undefined && typeof portId !== 'string') {
    throwInvalid('Canvas Fragment Endpoint portId must be a string.');
  }
  return Object.freeze({ nodeId: nodeId as NodeId, ...(portId === undefined ? {} : { portId }) });
}

function acceptPoint(value: unknown): Readonly<{ x: number; y: number }> {
  const record = requireRecord(value, ['x', 'y']);
  const x = read(record, 'x');
  const y = read(record, 'y');
  if (!Number.isFinite(x) || !Number.isFinite(y)) throwInvalid('Canvas Fragment position must be finite.');
  return Object.freeze({ x: x as number, y: y as number });
}

function acceptIds(value: unknown, entity: string): string[] {
  const values = requireArray(value, `Canvas Fragment Selection ${entity} IDs must be an array.`);
  const ids = values.map((id) => requireId(id, `Selection ${entity}`));
  if (new Set(ids).size !== ids.length) throwInvalid(`Canvas Fragment Selection ${entity} IDs must be unique.`);
  return ids.sort(compareIds);
}

function assertNoInternalParentCycle(nodes: readonly CanvasNode[], nodeIds: ReadonlySet<NodeId>): void {
  const parentByNode = new Map(nodes.map((node) => [node.id, node.parentId]));
  for (const node of nodes) {
    const visited = new Set<NodeId>();
    let current: NodeId | undefined = node.id;
    while (current !== undefined && nodeIds.has(current)) {
      if (visited.has(current)) throwInvalid('Canvas Fragment parent relationships must be acyclic.');
      visited.add(current);
      current = parentByNode.get(current);
    }
  }
}

function requireRecord(
  value: unknown,
  keys: readonly string[],
  requiredKeys: readonly string[] = keys,
): Record<PropertyKey, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throwInvalid('Canvas Fragment is malformed.');
  const record = value as Record<PropertyKey, unknown>;
  const allowed = new Set(keys);
  for (const key of Reflect.ownKeys(record)) {
    if (typeof key !== 'string' || !allowed.has(key)) throwInvalid('Canvas Fragment contains an unknown field.');
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (!descriptor || !('value' in descriptor)) throwInvalid('Canvas Fragment fields must be data properties.');
  }
  for (const key of requiredKeys) {
    if (!Object.prototype.hasOwnProperty.call(record, key))
      throwInvalid('Canvas Fragment is missing a required field.');
  }
  return record;
}

function read(record: Record<PropertyKey, unknown>, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !('value' in descriptor)) throwInvalid('Canvas Fragment is missing a required field.');
  return descriptor.value;
}

function readOptional(record: Record<PropertyKey, unknown>, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor) return undefined;
  if (!('value' in descriptor)) throwInvalid('Canvas Fragment fields must be data properties.');
  return descriptor.value;
}

function requireArray(value: unknown, message: string): unknown[] {
  if (!Array.isArray(value)) throwInvalid(message);
  return value;
}

function requireId(value: unknown, entity: string): string {
  if (typeof value !== 'string' || value.length === 0) throwInvalid(`Canvas Fragment ${entity} ID is invalid.`);
  return value;
}

function setsEqual(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function throwInvalid(message: string): never {
  throw new CanvasFragmentError('INVALID_FRAGMENT', message);
}
