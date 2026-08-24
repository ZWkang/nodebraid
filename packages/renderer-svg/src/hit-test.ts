import type { CanvasSnapshot } from '@cflow/kernel';
import { RendererError, type HitResult, type ScreenPoint } from '@cflow/renderer-api';
import type { SessionSnapshot } from '@cflow/session-api';

import { readTargetMatrix } from './target-mapping';

/** @internal */
export function hitTestProjection(
  point: ScreenPoint,
  target: SVGSVGElement,
  documentSnapshot: CanvasSnapshot,
  sessionSnapshot: SessionSnapshot,
  edgeHitTolerance: number,
  connectionAnchorHitTolerance: number,
): HitResult | null {
  validateScreenPoint(point);
  readTargetMatrix(target, 'TARGET_UNAVAILABLE');
  const bounds = target.getBoundingClientRect();
  if (point.x < 0 || point.y < 0 || point.x >= bounds.width || point.y >= bounds.height) return null;
  const viewport = sessionSnapshot.viewport;
  const worldPoint = {
    x: (point.x - viewport.x) / viewport.zoom,
    y: (point.y - viewport.y) / viewport.zoom,
  };
  for (let index = documentSnapshot.nodes.length - 1; index >= 0; index -= 1) {
    const node = documentSnapshot.nodes[index];
    if (!node?.size || node.size.width <= 0 || node.size.height <= 0) continue;
    for (const role of ['source', 'target'] as const) {
      const anchorWorldPoint = {
        x: role === 'source' ? node.position.x + node.size.width : node.position.x,
        y: node.position.y + node.size.height / 2,
      };
      const anchorScreenPoint = {
        x: anchorWorldPoint.x * viewport.zoom + viewport.x,
        y: anchorWorldPoint.y * viewport.zoom + viewport.y,
      };
      if (Math.hypot(point.x - anchorScreenPoint.x, point.y - anchorScreenPoint.y) <= connectionAnchorHitTolerance) {
        return { type: 'connection-anchor', nodeId: node.id, role, worldPoint };
      }
    }
  }
  for (let index = documentSnapshot.nodes.length - 1; index >= 0; index -= 1) {
    const node = documentSnapshot.nodes[index];
    if (!node?.size) continue;
    if (
      worldPoint.x >= node.position.x &&
      worldPoint.x <= node.position.x + node.size.width &&
      worldPoint.y >= node.position.y &&
      worldPoint.y <= node.position.y + node.size.height
    ) {
      return { type: 'node', nodeId: node.id, worldPoint };
    }
  }
  const nodesById = new Map(documentSnapshot.nodes.map((node) => [node.id, node]));
  for (let index = documentSnapshot.edges.length - 1; index >= 0; index -= 1) {
    const edge = documentSnapshot.edges[index];
    if (!edge) continue;
    const source = nodesById.get(edge.source.nodeId);
    const destination = nodesById.get(edge.target.nodeId);
    if (!source?.size || !destination?.size) continue;
    const sourceScreen = {
      x: (source.position.x + source.size.width / 2) * viewport.zoom + viewport.x,
      y: (source.position.y + source.size.height / 2) * viewport.zoom + viewport.y,
    };
    const destinationScreen = {
      x: (destination.position.x + destination.size.width / 2) * viewport.zoom + viewport.x,
      y: (destination.position.y + destination.size.height / 2) * viewport.zoom + viewport.y,
    };
    if (distanceToSegment(point, sourceScreen, destinationScreen) <= edgeHitTolerance) {
      return { type: 'edge', edgeId: edge.id, worldPoint };
    }
  }
  return { type: 'canvas', worldPoint };
}

function validateScreenPoint(point: ScreenPoint): void {
  if (!isRecord(point) || typeof point.x !== 'number' || !Number.isFinite(point.x)) {
    throw new RendererError('INVALID_SCREEN_POINT', 'SVG Renderer Screen Point x must be finite.', { field: 'x' });
  }
  if (typeof point.y !== 'number' || !Number.isFinite(point.y)) {
    throw new RendererError('INVALID_SCREEN_POINT', 'SVG Renderer Screen Point y must be finite.', { field: 'y' });
  }
}

function distanceToSegment(
  point: Readonly<{ x: number; y: number }>,
  start: Readonly<{ x: number; y: number }>,
  end: Readonly<{ x: number; y: number }>,
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const squaredLength = dx * dx + dy * dy;
  if (squaredLength === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const projection = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / squaredLength));
  return Math.hypot(point.x - (start.x + projection * dx), point.y - (start.y + projection * dy));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
