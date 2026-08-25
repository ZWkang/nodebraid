import type { CanvasEdge, CanvasNode } from '@nodebraid/kernel';

export function isCanvasNode(value: unknown): value is CanvasNode {
  return (
    isRecord(value) &&
    isId(value.id) &&
    typeof value.type === 'string' &&
    isPoint(value.position) &&
    (value.size === undefined ||
      (isRecord(value.size) && typeof value.size.width === 'number' && typeof value.size.height === 'number')) &&
    (value.parentId === undefined || isId(value.parentId)) &&
    'data' in value
  );
}

export function isCanvasEdge(value: unknown): value is CanvasEdge {
  return (
    isRecord(value) &&
    isId(value.id) &&
    typeof value.type === 'string' &&
    isEndpoint(value.source) &&
    isEndpoint(value.target) &&
    'data' in value
  );
}

function isEndpoint(value: unknown): value is CanvasEdge['source'] {
  return isRecord(value) && isId(value.nodeId) && (value.portId === undefined || typeof value.portId === 'string');
}

export function isPoint(value: unknown): value is CanvasNode['position'] {
  return isRecord(value) && typeof value.x === 'number' && typeof value.y === 'number';
}

export function isIdArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(isId);
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
