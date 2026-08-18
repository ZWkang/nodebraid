import type { CanvasEdge, CanvasNode, EdgeEndpoint, Point, Size } from './contracts';

export function freezeCanvasNode(node: CanvasNode): CanvasNode {
  // Copy and freeze only CFlow-owned shells. Arbitrary data intentionally keeps its original reference.
  return Object.freeze({
    id: node.id,
    type: node.type,
    position: Object.freeze({ x: node.position.x, y: node.position.y }),
    ...(node.size === undefined ? {} : { size: Object.freeze({ width: node.size.width, height: node.size.height }) }),
    ...(node.parentId === undefined ? {} : { parentId: node.parentId }),
    data: node.data,
  });
}

export function freezeCanvasEdge(edge: CanvasEdge): CanvasEdge {
  // Endpoints are Kernel-owned values; edge.data remains opaque just like node.data.
  return Object.freeze({
    id: edge.id,
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

export function isCanvasNodeValue(value: unknown): value is CanvasNode {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.type !== 'string' || !('data' in value)) {
    return false;
  }
  if (!isPointValue(value.position)) return false;
  if (value.size !== undefined && !isSizeValue(value.size)) return false;
  return value.parentId === undefined || (typeof value.parentId === 'string' && value.parentId.length > 0);
}

export function isCanvasEdgeValue(value: unknown): value is CanvasEdge {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.type === 'string' &&
    'data' in value &&
    isEndpointValue(value.source) &&
    isEndpointValue(value.target)
  );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function freezeEdgeEndpoint(endpoint: EdgeEndpoint): EdgeEndpoint {
  return Object.freeze({
    nodeId: endpoint.nodeId,
    ...(endpoint.portId === undefined ? {} : { portId: endpoint.portId }),
  });
}

function isPointValue(value: unknown): value is Point {
  return isRecord(value) && typeof value.x === 'number' && typeof value.y === 'number';
}

function isSizeValue(value: unknown): value is Size {
  return isRecord(value) && typeof value.width === 'number' && typeof value.height === 'number';
}

function isEndpointValue(value: unknown): value is EdgeEndpoint {
  return (
    isRecord(value) &&
    typeof value.nodeId === 'string' &&
    value.nodeId.length > 0 &&
    (value.portId === undefined || typeof value.portId === 'string')
  );
}
