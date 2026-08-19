import type { CanvasCommit, CanvasEdge, CanvasNode, CanvasSnapshot, CanvasView, NodeId } from '@cflow/kernel';
import { RendererError, type RendererDocumentUpdate } from '@cflow/renderer-api';
import type { SessionSnapshot } from '@cflow/session-api';

/** @internal */
export function cloneCanvasSnapshot(snapshot: CanvasSnapshot): CanvasSnapshot {
  return {
    revision: snapshot.revision,
    nodes: snapshot.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: { x: node.position.x, y: node.position.y },
      ...(node.size === undefined ? {} : { size: { width: node.size.width, height: node.size.height } }),
      ...(node.parentId === undefined ? {} : { parentId: node.parentId }),
      data: node.data,
    })),
    edges: snapshot.edges.map((edge) => ({
      id: edge.id,
      type: edge.type,
      source: {
        nodeId: edge.source.nodeId,
        ...(edge.source.portId === undefined ? {} : { portId: edge.source.portId }),
      },
      target: {
        nodeId: edge.target.nodeId,
        ...(edge.target.portId === undefined ? {} : { portId: edge.target.portId }),
      },
      data: edge.data,
    })),
  };
}

/** @internal */
export function validateRendererDocumentUpdate(value: unknown): RendererDocumentUpdate {
  if (!isRecord(value) || (value.type !== 'reset' && value.type !== 'commit')) {
    throw new RendererError('INVALID_DOCUMENT_UPDATE', 'SVG Renderer Document Update is invalid.', {
      issue: 'INVALID_DOCUMENT_UPDATE',
    });
  }
  if (value.type === 'reset') {
    validateCanvasView(value.view);
    return value as unknown as RendererDocumentUpdate;
  }
  validateCanvasCommit(value.commit);
  return value as unknown as RendererDocumentUpdate;
}

function validateCanvasCommit(value: unknown): asserts value is CanvasCommit {
  if (!isRecord(value)) throwInvalidCommit();
  validateCanvasView(value.before);
  validateCanvasView(value.after);
  if (!isRecord(value.changeSet)) throwInvalidCommit();
  const changeSet = value.changeSet;
  if (
    !Number.isSafeInteger(changeSet.beforeRevision) ||
    !Number.isSafeInteger(changeSet.revision) ||
    !Array.isArray(changeSet.changes)
  ) {
    throwInvalidCommit();
  }
  for (const change of changeSet.changes) {
    if (
      !isRecord(change) ||
      (change.entity !== 'node' && change.entity !== 'edge') ||
      typeof change.id !== 'string' ||
      change.id.length === 0 ||
      !('before' in change) ||
      !('after' in change) ||
      (change.before === null && change.after === null) ||
      !isChangeEntityValue(change.entity, change.id, change.before) ||
      !isChangeEntityValue(change.entity, change.id, change.after)
    ) {
      throwInvalidCommit();
    }
  }
}

function isChangeEntityValue(entity: 'node' | 'edge', id: string, value: unknown): boolean {
  if (value === null) return true;
  if (entity === 'node') return isCanvasNodeShell(value) && value.id === id;
  return isCanvasEdgeShell(value) && value.id === id;
}

function throwInvalidCommit(): never {
  throw new RendererError('INVALID_DOCUMENT_UPDATE', 'SVG Renderer Canvas Commit is invalid.', {
    issue: 'INVALID_DOCUMENT_COMMIT',
  });
}

/** @internal */
export function validateCanvasView(value: unknown): asserts value is CanvasView {
  if (!isRecord(value) || !isRecord(value.snapshot)) throwInvalidSnapshot('view', 'INVALID_VIEW');
  const snapshot = value.snapshot;
  if (typeof snapshot.revision !== 'number' || !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0) {
    throwInvalidSnapshot('revision', 'INVALID_REVISION');
  }
  if (!Array.isArray(snapshot.nodes)) throwInvalidSnapshot('nodes', 'INVALID_ARRAY');
  if (!Array.isArray(snapshot.edges)) throwInvalidSnapshot('edges', 'INVALID_ARRAY');
  if (!isCanvasQuerySurface(value.query)) throwInvalidSnapshot('query', 'INVALID_QUERY');
  validateCanonicalIds(snapshot.nodes, 'nodes');
  validateCanonicalIds(snapshot.edges, 'edges');
  const nodeIds = new Set<string>();
  const nodes: CanvasNode[] = [];
  for (const node of snapshot.nodes) {
    if (!isCanvasNodeShell(node)) throwInvalidSnapshot('nodes', 'INVALID_ENTITY');
    nodeIds.add(node.id);
    nodes.push(node);
  }
  for (const node of nodes) {
    if (node.parentId !== undefined && !nodeIds.has(node.parentId)) {
      throwInvalidSnapshot('nodes', 'MISSING_PARENT');
    }
  }
  validateParentAcyclic(nodes);
  for (const edge of snapshot.edges) {
    if (!isCanvasEdgeShell(edge)) throwInvalidSnapshot('edges', 'INVALID_ENTITY');
    if (!nodeIds.has(edge.source.nodeId) || !nodeIds.has(edge.target.nodeId)) {
      throwInvalidSnapshot('edges', 'MISSING_EDGE_ENDPOINT');
    }
  }
}

function isCanvasQuerySurface(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return ['getNode', 'getEdge', 'getIncomingEdges', 'getOutgoingEdges', 'getIncidentEdges', 'getChildren'].every(
    (method) => typeof value[method] === 'function',
  );
}

function validateParentAcyclic(nodes: readonly CanvasNode[]): void {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const states = new Map<NodeId, 'done' | 'visiting'>();
  const visit = (id: NodeId): void => {
    const state = states.get(id);
    if (state === 'done') return;
    if (state === 'visiting') throwInvalidSnapshot('nodes', 'PARENT_CYCLE');
    states.set(id, 'visiting');
    const parentId = nodesById.get(id)?.parentId;
    if (parentId !== undefined) visit(parentId);
    states.set(id, 'done');
  };
  for (const node of nodes) visit(node.id);
}

function validateCanonicalIds(entities: readonly Readonly<{ readonly id: string }>[], field: 'nodes' | 'edges'): void {
  let previous: string | undefined;
  for (const entity of entities) {
    if (!isRecord(entity) || typeof entity.id !== 'string' || entity.id.length === 0) {
      throwInvalidSnapshot(field, 'INVALID_ID');
    }
    if (previous !== undefined && previous >= entity.id) throwInvalidSnapshot(field, 'NON_CANONICAL_IDS');
    previous = entity.id;
  }
}

function isCanvasNodeShell(value: unknown): value is CanvasNode {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.type !== 'string' ||
    !Object.hasOwn(value, 'data')
  ) {
    return false;
  }
  if (!isPoint(value.position)) return false;
  if (value.size !== undefined && !isSize(value.size)) return false;
  return value.parentId === undefined || (typeof value.parentId === 'string' && value.parentId.length > 0);
}

function isCanvasEdgeShell(value: unknown): value is CanvasEdge {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.type === 'string' &&
    Object.hasOwn(value, 'data') &&
    isEndpoint(value.source) &&
    isEndpoint(value.target)
  );
}

function isPoint(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.x === 'number' &&
    Number.isFinite(value.x) &&
    typeof value.y === 'number' &&
    Number.isFinite(value.y)
  );
}

function isSize(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.width === 'number' &&
    Number.isFinite(value.width) &&
    value.width > 0 &&
    typeof value.height === 'number' &&
    Number.isFinite(value.height) &&
    value.height > 0
  );
}

function isEndpoint(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.nodeId === 'string' &&
    value.nodeId.length > 0 &&
    (value.portId === undefined || typeof value.portId === 'string')
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function throwInvalidSnapshot(field: string, reason: string): never {
  throw new RendererError('INVALID_DOCUMENT_UPDATE', 'SVG Renderer Document Snapshot is invalid.', {
    issue: 'INVALID_DOCUMENT_SNAPSHOT',
    field,
    reason,
  });
}

/** @internal */
export function validateSessionSnapshot(snapshot: SessionSnapshot, documentSnapshot: CanvasSnapshot): void {
  if (!isRecord(snapshot) || !isRecord(snapshot.selection) || !isRecord(snapshot.viewport)) {
    throwInvalidSession('INVALID_SESSION_STRUCTURE');
  }
  if (!Array.isArray(snapshot.selection.nodeIds)) throwInvalidSession('INVALID_SELECTION', { field: 'nodeIds' });
  if (!Array.isArray(snapshot.selection.edgeIds)) throwInvalidSession('INVALID_SELECTION', { field: 'edgeIds' });
  const nodeIds = new Set(documentSnapshot.nodes.map((node) => node.id));
  const edgeIds = new Set(documentSnapshot.edges.map((edge) => edge.id));
  validateSelectionIds(snapshot.selection.nodeIds, 'nodeIds', 'node', nodeIds);
  validateSelectionIds(snapshot.selection.edgeIds, 'edgeIds', 'edge', edgeIds);
  for (const field of ['x', 'y', 'zoom'] as const) {
    const value = snapshot.viewport[field];
    if (typeof value !== 'number' || !Number.isFinite(value) || (field === 'zoom' && value <= 0)) {
      throwInvalidSession('INVALID_VIEWPORT', { field });
    }
  }
}

function validateSelectionIds(
  ids: readonly string[],
  field: 'nodeIds' | 'edgeIds',
  entity: 'node' | 'edge',
  availableIds: ReadonlySet<string>,
): void {
  let previous: string | undefined;
  for (const id of ids) {
    if (typeof id !== 'string' || id.length === 0) throwInvalidSession('INVALID_SELECTION', { field });
    if (previous === id) throwInvalidSession('DUPLICATE_SELECTION_ID', { field, id });
    if (previous !== undefined && previous > id) throwInvalidSession('NON_CANONICAL_SELECTION', { field });
    if (!availableIds.has(id)) throwInvalidSession('SELECTION_ENTITY_MISSING', { entity, id });
    previous = id;
  }
}

function throwInvalidSession(issue: string, details: Readonly<Record<string, string>> = {}): never {
  throw new RendererError('INVALID_SESSION_SNAPSHOT', 'SVG Renderer Session Snapshot is invalid.', {
    issue,
    ...details,
  });
}

/** @internal */
export function cloneSessionSnapshot(snapshot: SessionSnapshot): SessionSnapshot {
  return {
    selection: {
      nodeIds: [...snapshot.selection.nodeIds],
      edgeIds: [...snapshot.selection.edgeIds],
    },
    viewport: {
      x: snapshot.viewport.x,
      y: snapshot.viewport.y,
      zoom: snapshot.viewport.zoom,
    },
  };
}
