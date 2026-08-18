import type { CanvasEdge, CanvasNode, ChangeDirection, ChangeSet, EntityWriter, GraphChange } from './contracts';
import { canvasEdgesEqual, canvasNodesEqual, isCanvasEdgeValue, isCanvasNodeValue, isRecord } from './entity-values';
import type { EdgeId, NodeId } from './identifiers';
import { KernelError } from './kernel-error';

export function applyChangeSetToDraft(
  changeSet: ChangeSet,
  direction: ChangeDirection,
  draftNodes: ReadonlyMap<NodeId, CanvasNode>,
  draftEdges: ReadonlyMap<EdgeId, CanvasEdge>,
  nodeWriter: EntityWriter<NodeId, CanvasNode>,
  edgeWriter: EntityWriter<EdgeId, CanvasEdge>,
): void {
  validateChangeSet(changeSet, direction);

  // Preflight every affected entity before writing so one stale entry cannot cause partial replay.
  for (const change of changeSet.changes) {
    if (change.entity === 'node') {
      const expected = direction === 'forward' ? change.before : change.after;
      const actual = draftNodes.get(change.id) ?? null;
      if (!canvasNodesEqual(actual, expected)) throwChangeSetConflict(change, direction, expected, actual);
    } else {
      const expected = direction === 'forward' ? change.before : change.after;
      const actual = draftEdges.get(change.id) ?? null;
      if (!canvasEdgesEqual(actual, expected)) throwChangeSetConflict(change, direction, expected, actual);
    }
  }

  // Reverse replay also reverses entity order; final graph validation still happens once at commit.
  const changes = direction === 'forward' ? changeSet.changes : [...changeSet.changes].reverse();
  for (const change of changes) {
    const source = direction === 'forward' ? change.before : change.after;
    const target = direction === 'forward' ? change.after : change.before;
    const writer = change.entity === 'node' ? nodeWriter : edgeWriter;
    if (source === null && target !== null) {
      writer.add(target as never);
    } else if (source !== null && target === null) {
      writer.remove(change.id as never);
    } else if (target !== null) {
      writer.replace(change.id as never, target as never);
    }
  }
}

function validateChangeSet(changeSet: ChangeSet, direction: ChangeDirection): void {
  // Runtime validation is required because JavaScript callers can forge values despite TypeScript declarations.
  if (direction !== 'forward' && direction !== 'reverse') {
    throwInvalidChangeSet('Change Set direction must be forward or reverse.', { direction });
  }
  if (!isRecord(changeSet)) {
    throwInvalidChangeSet('Change Set must be an object.', {});
  }
  if (
    !Number.isSafeInteger(changeSet.beforeRevision) ||
    changeSet.beforeRevision < 0 ||
    !Number.isSafeInteger(changeSet.revision) ||
    changeSet.revision !== changeSet.beforeRevision + 1
  ) {
    throwInvalidChangeSet('Change Set revisions must be adjacent non-negative safe integers.', {
      beforeRevision: changeSet.beforeRevision,
      revision: changeSet.revision,
    });
  }
  if (!Array.isArray(changeSet.changes) || changeSet.changes.length === 0) {
    throwInvalidChangeSet('Change Set must contain at least one change.', {});
  }
  const identities = new Set<string>();
  for (const [index, change] of changeSet.changes.entries()) {
    if (!isRecord(change) || (change.entity !== 'node' && change.entity !== 'edge')) {
      throwInvalidChangeSet('Change must identify a Node or Edge.', { index });
    }
    if (typeof change.id !== 'string' || change.id.length === 0) {
      throwInvalidChangeSet('Change entity ID must be a non-empty string.', { index });
    }
    const identity = `${change.entity}\u0000${change.id}`;
    if (identities.has(identity)) {
      throwInvalidChangeSet('Change Set must not contain duplicate entity changes.', {
        index,
        entity: change.entity,
        id: change.id,
      });
    }
    identities.add(identity);
    if (change.before === null && change.after === null) {
      throwInvalidChangeSet('Change must contain a before or after entity.', { index });
    }
    for (const [side, entity] of [
      ['before', change.before],
      ['after', change.after],
    ] as const) {
      if (entity === null) continue;
      const validNode = change.entity === 'node' && isCanvasNodeValue(entity) && entity.id === change.id;
      const validEdge = change.entity === 'edge' && isCanvasEdgeValue(entity) && entity.id === change.id;
      if (!validNode && !validEdge) {
        throwInvalidChangeSet('Change entity must match its kind and ID.', {
          index,
          side,
          entity: change.entity,
          id: change.id,
        });
      }
    }
  }
}

function throwChangeSetConflict(
  change: GraphChange,
  direction: ChangeDirection,
  expected: CanvasNode | CanvasEdge | null,
  actual: CanvasNode | CanvasEdge | null,
): never {
  throw new KernelError(
    'CHANGE_SET_CONFLICT',
    `Change Set source does not match ${change.entity} "${change.id}".`,
    Object.freeze({ entity: change.entity, id: change.id, direction, expected, actual }),
  );
}

function throwInvalidChangeSet(message: string, details: Readonly<Record<string, unknown>>): never {
  throw new KernelError('INVALID_CHANGE_SET', message, Object.freeze({ ...details }));
}
