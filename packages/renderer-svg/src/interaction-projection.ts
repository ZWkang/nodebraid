import type {
  BoxSelectionInteractionProjection,
  ConnectionAnchorIdentity,
  ConnectionPreviewInteractionProjection,
  InteractionProjection,
  NodeDragInteractionProjection,
  ViewportPanInteractionProjection,
} from '@nodebraid/interaction-api';
import type { CanvasSnapshot } from '@nodebraid/kernel';
import { RendererError } from '@nodebraid/renderer-api';
import type { SessionSnapshot } from '@nodebraid/session-api';

export function acceptInteractionProjection(
  value: unknown,
  document: CanvasSnapshot,
  session: SessionSnapshot,
): InteractionProjection {
  if (!isRecord(value)) throwInvalidProjectionType();
  switch (value.type) {
    case 'node-drag':
      return acceptNodeDrag(value, document);
    case 'viewport-pan':
      return acceptViewportPan(value, session);
    case 'connection-preview':
      return acceptConnectionPreview(value, document);
    case 'box-selection':
      return acceptBoxSelection(value);
    default:
      throwInvalidProjectionType();
  }
}

export function isInteractionCompatibleWithDocument(
  interaction: InteractionProjection | null,
  document: CanvasSnapshot,
): boolean {
  if (interaction?.type === 'connection-preview') {
    const referencedNodeIds = [
      interaction.source.nodeId,
      ...(interaction.target.type === 'none' ? [] : [interaction.target.anchor.nodeId]),
    ];
    return referencedNodeIds.every((nodeId) => {
      const node = document.nodes.find((candidate) => candidate.id === nodeId);
      return node?.size !== undefined && node.size.width > 0 && node.size.height > 0;
    });
  }
  if (interaction?.type !== 'node-drag') return true;
  const nodes = new Map(document.nodes.map((node) => [node.id, node]));
  return interaction.nodes.every((candidate) => {
    const node = nodes.get(candidate.nodeId);
    return (
      node !== undefined && node.position.x === candidate.basePosition.x && node.position.y === candidate.basePosition.y
    );
  });
}

function acceptNodeDrag(value: Record<string, unknown>, document: CanvasSnapshot): NodeDragInteractionProjection {
  if (!Array.isArray(value.nodes)) throwInvalidProjectionStructure('nodes');
  for (let index = 0; index < value.nodes.length; index += 1) {
    const candidate = value.nodes[index];
    if (!isRecord(candidate)) throwInvalidProjectionStructure(`nodes[${index}]`);
    if (typeof candidate.nodeId !== 'string' || candidate.nodeId.length === 0) {
      throwInvalidProjectionStructure(`nodes[${index}].nodeId`);
    }
    if (!isRecord(candidate.basePosition)) throwInvalidProjectionStructure(`nodes[${index}].basePosition`);
    if (!isRecord(candidate.position)) throwInvalidProjectionStructure(`nodes[${index}].position`);
  }
  const projection = value as unknown as NodeDragInteractionProjection;
  if (projection.nodes.length === 0) {
    throw new RendererError(
      'INVALID_INTERACTION_PROJECTION',
      'Node Drag Interaction Projection requires at least one Node.',
      { issue: 'EMPTY_NODE_DRAG' },
    );
  }
  const nodes = new Map(document.nodes.map((node) => [node.id, node]));
  const seenNodeIds = new Set<string>();
  let previousNodeId: string | undefined;
  for (const candidate of projection.nodes) {
    if (seenNodeIds.has(candidate.nodeId)) {
      throw new RendererError('INVALID_INTERACTION_PROJECTION', 'Interaction Projection Node IDs must be unique.', {
        issue: 'DUPLICATE_NODE',
      });
    }
    seenNodeIds.add(candidate.nodeId);
    if (previousNodeId !== undefined && previousNodeId > candidate.nodeId) {
      throw new RendererError(
        'INVALID_INTERACTION_PROJECTION',
        'Interaction Projection Node IDs must use canonical order.',
        { issue: 'NON_CANONICAL_NODE_ORDER' },
      );
    }
    previousNodeId = candidate.nodeId;
    for (const [field, coordinate] of [
      ['basePosition.x', candidate.basePosition.x],
      ['basePosition.y', candidate.basePosition.y],
      ['position.x', candidate.position.x],
      ['position.y', candidate.position.y],
    ] as const) {
      if (Number.isFinite(coordinate)) continue;
      throw new RendererError(
        'INVALID_INTERACTION_PROJECTION',
        'Interaction Projection Node positions must be finite.',
        { issue: 'INVALID_NODE_POSITION', field },
      );
    }
    const node = nodes.get(candidate.nodeId);
    if (!node || node.position.x !== candidate.basePosition.x || node.position.y !== candidate.basePosition.y) {
      throw new RendererError('INTERACTION_OUT_OF_SYNC', 'Interaction Projection Node Baseline is stale.', {
        issue: 'NODE_POSITION_MISMATCH',
      });
    }
  }
  return Object.freeze({
    type: 'node-drag',
    nodes: Object.freeze(
      projection.nodes.map((candidate) =>
        Object.freeze({
          nodeId: candidate.nodeId,
          basePosition: Object.freeze({ ...candidate.basePosition }),
          position: Object.freeze({ ...candidate.position }),
        }),
      ),
    ),
  });
}

function acceptViewportPan(value: Record<string, unknown>, session: SessionSnapshot): ViewportPanInteractionProjection {
  if (!isRecord(value.baseViewport)) throwInvalidProjectionStructure('baseViewport');
  if (!isRecord(value.viewport)) throwInvalidProjectionStructure('viewport');
  const projection = value as unknown as ViewportPanInteractionProjection;
  assertViewport('baseViewport', projection.baseViewport);
  assertViewport('viewport', projection.viewport);
  if (!viewportsEqual(projection.baseViewport, session.viewport)) {
    throw new RendererError('INTERACTION_OUT_OF_SYNC', 'Interaction Projection Viewport Baseline is stale.', {
      issue: 'VIEWPORT_MISMATCH',
    });
  }
  return Object.freeze({
    type: 'viewport-pan',
    baseViewport: Object.freeze({ ...projection.baseViewport }),
    viewport: Object.freeze({ ...projection.viewport }),
  });
}

function acceptConnectionPreview(
  value: Record<string, unknown>,
  document: CanvasSnapshot,
): ConnectionPreviewInteractionProjection {
  if (!isConnectionAnchor(value.source) || !isRecord(value.pointerWorldPoint) || !isRecord(value.target)) {
    throwInvalidProjectionStructure('connection-preview');
  }
  if (
    value.target.type !== 'none' &&
    ((value.target.type !== 'valid' && value.target.type !== 'invalid') || !isConnectionAnchor(value.target.anchor))
  ) {
    throwInvalidProjectionStructure('target');
  }
  const projection = value as unknown as ConnectionPreviewInteractionProjection;
  assertPoint('pointerWorldPoint', projection.pointerWorldPoint);
  assertConnectionAnchorBaseline(projection.source, 'source', document);
  if (projection.target.type !== 'none') assertConnectionAnchorBaseline(projection.target.anchor, 'target', document);
  return Object.freeze({
    type: 'connection-preview',
    source: Object.freeze({ ...projection.source }),
    pointerWorldPoint: Object.freeze({ ...projection.pointerWorldPoint }),
    target:
      projection.target.type === 'none'
        ? Object.freeze({ type: 'none' as const })
        : Object.freeze({
            type: projection.target.type,
            anchor: Object.freeze({ ...projection.target.anchor }),
          }),
  });
}

function acceptBoxSelection(value: Record<string, unknown>): BoxSelectionInteractionProjection {
  if (!isRecord(value.rect)) throwInvalidProjectionStructure('rect');
  const projection = value as unknown as BoxSelectionInteractionProjection;
  for (const field of ['x', 'y', 'width', 'height'] as const) {
    const coordinate = projection.rect[field];
    if (Number.isFinite(coordinate) && ((field !== 'width' && field !== 'height') || coordinate >= 0)) continue;
    throw new RendererError('INVALID_INTERACTION_PROJECTION', 'Box Selection rect must be finite and non-negative.', {
      issue: 'INVALID_BOX_SELECTION_RECT',
      field: `rect.${field}`,
    });
  }
  return Object.freeze({ type: 'box-selection', rect: Object.freeze({ ...projection.rect }) });
}

function assertConnectionAnchorBaseline(
  anchor: ConnectionAnchorIdentity,
  role: ConnectionAnchorIdentity['role'],
  document: CanvasSnapshot,
): void {
  if (anchor.role !== role) {
    throw new RendererError('INVALID_INTERACTION_PROJECTION', 'Connection Anchor role is invalid.', {
      issue: 'INVALID_CONNECTION_ANCHOR_ROLE',
    });
  }
  const node = document.nodes.find((candidate) => candidate.id === anchor.nodeId);
  if (node?.size && node.size.width > 0 && node.size.height > 0) return;
  throw new RendererError('INTERACTION_OUT_OF_SYNC', 'Connection Anchor Node is unavailable.', {
    issue: 'CONNECTION_ANCHOR_UNAVAILABLE',
  });
}

function assertPoint(field: string, point: Readonly<{ x: number; y: number }>): void {
  for (const coordinate of ['x', 'y'] as const) {
    if (Number.isFinite(point[coordinate])) continue;
    throw new RendererError('INVALID_INTERACTION_PROJECTION', 'Interaction Projection Point must be finite.', {
      issue: 'INVALID_POINT',
      field: `${field}.${coordinate}`,
    });
  }
}

function assertViewport(prefix: 'baseViewport' | 'viewport', viewport: SessionSnapshot['viewport']): void {
  for (const field of ['x', 'y', 'zoom'] as const) {
    const coordinate = viewport[field];
    if (Number.isFinite(coordinate) && (field !== 'zoom' || coordinate > 0)) continue;
    throw new RendererError(
      'INVALID_INTERACTION_PROJECTION',
      'Interaction Projection Viewport values must be finite with positive zoom.',
      { issue: 'INVALID_VIEWPORT', field: `${prefix}.${field}` },
    );
  }
}

function isConnectionAnchor(value: unknown): value is ConnectionAnchorIdentity {
  return (
    isRecord(value) &&
    typeof value.nodeId === 'string' &&
    value.nodeId.length > 0 &&
    (value.role === 'source' || value.role === 'target')
  );
}

function throwInvalidProjectionType(): never {
  throw new RendererError('INVALID_INTERACTION_PROJECTION', 'Interaction Projection type is invalid.', {
    issue: 'INVALID_PROJECTION_TYPE',
  });
}

function throwInvalidProjectionStructure(field: string): never {
  throw new RendererError('INVALID_INTERACTION_PROJECTION', 'Interaction Projection structure is invalid.', {
    issue: 'INVALID_PROJECTION_STRUCTURE',
    field,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function viewportsEqual(left: SessionSnapshot['viewport'], right: SessionSnapshot['viewport']): boolean {
  return left.x === right.x && left.y === right.y && left.zoom === right.zoom;
}
