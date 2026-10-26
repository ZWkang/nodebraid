import type { CanvasEdge, CanvasNode, EdgeEndpoint, Point, Size } from './contracts';
import { edgeId, nodeId, type EdgeId, type NodeId } from './identifiers';

export function freezeCanvasNode(node: CanvasNode, id: NodeId): CanvasNode {
  const type = node.type;
  const position = node.position;
  const ownedPosition = Object.freeze({ x: position.x, y: position.y });
  const size = node.size;
  const ownedSize = size === undefined ? undefined : Object.freeze({ width: size.width, height: size.height });
  const parentId = node.parentId;
  // Copy and freeze only NodeBraid-owned shells. Arbitrary data intentionally keeps its original reference.
  return Object.freeze({
    id,
    type,
    position: ownedPosition,
    ...(ownedSize === undefined ? {} : { size: ownedSize }),
    ...(parentId === undefined ? {} : { parentId }),
    data: node.data,
  });
}

export function freezeCanvasEdge(edge: CanvasEdge, id: EdgeId): CanvasEdge {
  // Endpoints are Kernel-owned values; edge.data remains opaque just like node.data.
  return Object.freeze({
    id,
    type: edge.type,
    source: freezeEdgeEndpoint(edge.source),
    target: freezeEdgeEndpoint(edge.target),
    data: edge.data,
  });
}

export function canvasNodesEqual(left: CanvasNode | null, right: CanvasNode | null): boolean {
  if (left === right) return true;
  if (left === null || right === null) return false;
  return (
    left.id === right.id &&
    left.type === right.type &&
    left.position.x === right.position.x &&
    left.position.y === right.position.y &&
    left.size?.width === right.size?.width &&
    left.size?.height === right.size?.height &&
    left.parentId === right.parentId &&
    // The Kernel cannot safely deep-compare arbitrary domain values.
    Object.is(left.data, right.data)
  );
}

export function canvasEdgesEqual(left: CanvasEdge | null, right: CanvasEdge | null): boolean {
  if (left === right) return true;
  if (left === null || right === null) return false;
  return (
    left.id === right.id &&
    left.type === right.type &&
    left.source.nodeId === right.source.nodeId &&
    left.source.portId === right.source.portId &&
    left.target.nodeId === right.target.nodeId &&
    left.target.portId === right.target.portId &&
    Object.is(left.data, right.data)
  );
}

export function captureCanvasNodeValue(value: unknown): CanvasNode | undefined {
  if (!isRecord(value)) return undefined;
  const id = value.id;
  if (typeof id !== 'string') return undefined;
  const type = value.type;
  if (typeof type !== 'string' || !('data' in value)) return undefined;
  const position = capturePointValue(value.position);
  if (!position) return undefined;
  const receivedSize = value.size;
  const size = receivedSize === undefined ? undefined : captureSizeValue(receivedSize);
  if (receivedSize !== undefined && size === undefined) return undefined;
  const parentId = value.parentId;
  if (parentId !== undefined && (typeof parentId !== 'string' || parentId.length === 0)) return undefined;
  if (id.length === 0) return undefined;
  return Object.freeze({
    id: nodeId(id),
    type,
    position,
    ...(size === undefined ? {} : { size }),
    ...(parentId === undefined ? {} : { parentId: nodeId(parentId) }),
    // Opaque data keeps its existing preflight or materialization read phase.
    get data() {
      return value.data;
    },
  });
}

export function captureCanvasEdgeValue(value: unknown): CanvasEdge | undefined {
  if (!isRecord(value)) return undefined;
  const id = value.id;
  if (typeof id !== 'string') return undefined;
  const type = value.type;
  if (typeof type !== 'string' || !('data' in value)) return undefined;
  const source = captureEndpointValue(value.source);
  if (!source) return undefined;
  const target = captureEndpointValue(value.target);
  if (!target || id.length === 0) return undefined;
  return Object.freeze({
    id: edgeId(id),
    type,
    source,
    target,
    get data() {
      return value.data;
    },
  });
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function freezeEdgeEndpoint(endpoint: EdgeEndpoint): EdgeEndpoint {
  const nodeId = endpoint.nodeId;
  const portId = endpoint.portId;
  return Object.freeze({
    nodeId,
    ...(portId === undefined ? {} : { portId }),
  });
}

function capturePointValue(value: unknown): Point | undefined {
  if (!isRecord(value)) return undefined;
  const x = value.x;
  if (typeof x !== 'number') return undefined;
  const y = value.y;
  if (typeof y !== 'number') return undefined;
  return Object.freeze({ x, y });
}

function captureSizeValue(value: unknown): Size | undefined {
  if (!isRecord(value)) return undefined;
  const width = value.width;
  if (typeof width !== 'number') return undefined;
  const height = value.height;
  if (typeof height !== 'number') return undefined;
  return Object.freeze({ width, height });
}

function captureEndpointValue(value: unknown): EdgeEndpoint | undefined {
  if (!isRecord(value)) return undefined;
  const id = value.nodeId;
  if (typeof id !== 'string' || id.length === 0) return undefined;
  const portId = value.portId;
  if (portId !== undefined && typeof portId !== 'string') return undefined;
  return Object.freeze({ nodeId: nodeId(id), ...(portId === undefined ? {} : { portId }) });
}
