import { describeNonFiniteNumber, type DiagnosticAttributes } from '@nodebraid/diagnostics';

import type { CanvasEdge, CanvasNode, ChangeDirection, ChangeSet, EntityWriter, GraphChange } from './contracts';
import {
  canvasEdgesEqual,
  canvasNodesEqual,
  captureCanvasEdgeValue,
  captureCanvasNodeValue,
  isRecord,
} from './entity-values';
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
  const changes = validateChangeSet(changeSet, direction);

  // Preflight every affected entity before writing so one stale entry cannot cause partial replay.
  for (const change of changes) {
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
  const orderedChanges = direction === 'forward' ? changes : [...changes].reverse();
  for (const change of orderedChanges) {
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

function validateChangeSet(changeSet: ChangeSet, direction: ChangeDirection): readonly GraphChange[] {
  // Runtime validation is required because JavaScript callers can forge values despite TypeScript declarations.
  if (direction !== 'forward' && direction !== 'reverse') {
    if (typeof direction !== 'string') {
      throwInvalidChangeSet('Change Set direction must be forward or reverse.', {
        issue: 'INVALID_DIRECTION',
        receivedType: direction === null ? 'null' : typeof direction,
      });
    }
    throwInvalidChangeSet('Change Set direction must be forward or reverse.', {
      issue: 'INVALID_DIRECTION',
      direction,
    });
  }
  if (!isRecord(changeSet)) {
    throwInvalidChangeSet('Change Set must be an object.', {});
  }
  const beforeRevision = changeSet.beforeRevision;
  const revision = changeSet.revision;
  if (
    !Number.isSafeInteger(beforeRevision) ||
    beforeRevision < 0 ||
    !Number.isSafeInteger(revision) ||
    revision !== beforeRevision + 1
  ) {
    throwInvalidChangeSet('Change Set revisions must be adjacent non-negative safe integers.', {
      issue: 'INVALID_REVISIONS',
      beforeRevision: describeInvalidRevision(beforeRevision),
      revision: describeInvalidRevision(revision),
    });
  }
  const changes = changeSet.changes;
  if (!Array.isArray(changes)) {
    throwInvalidChangeSet('Change Set must contain at least one change.', {});
  }
  const length = changes.length;
  if (length === 0) {
    throwInvalidChangeSet('Change Set must contain at least one change.', {});
  }
  const identities = new Set<string>();
  const accepted: GraphChange[] = [];
  // Keep native Array length coercion without invoking the input's traversal hooks.
  for (const index of Array.prototype.keys.call({ length })) {
    const change: GraphChange = changes[index];
    if (!isRecord(change)) {
      throwInvalidChangeSet('Change must identify a Node or Edge.', { index });
    }
    const entityKind = change.entity;
    if (entityKind !== 'node' && entityKind !== 'edge') {
      throwInvalidChangeSet('Change must identify a Node or Edge.', { index });
    }
    const id = change.id;
    if (typeof id !== 'string' || id.length === 0) {
      throwInvalidChangeSet('Change entity ID must be a non-empty string.', { index });
    }
    const identity = `${entityKind}\u0000${id}`;
    if (identities.has(identity)) {
      throwInvalidChangeSet('Change Set must not contain duplicate entity changes.', {
        index,
        entity: entityKind,
        id,
      });
    }
    identities.add(identity);
    const before = change.before;
    const after = change.after;
    if (before === null && after === null) {
      throwInvalidChangeSet('Change must contain a before or after entity.', { index });
    }
    const captureSide = (entity: unknown, side: 'before' | 'after') => {
      if (entity === null) return null;
      const captured = entityKind === 'node' ? captureCanvasNodeValue(entity) : captureCanvasEdgeValue(entity);
      if (!captured || captured.id !== id) {
        throwInvalidChangeSet('Change entity must match its kind and ID.', {
          index,
          side,
          entity: entityKind,
          id,
        });
      }
      return captured;
    };
    const ownedBefore = captureSide(before, 'before');
    const ownedAfter = captureSide(after, 'after');
    accepted.push(Object.freeze({ entity: entityKind, id, before: ownedBefore, after: ownedAfter }) as GraphChange);
  }
  return accepted;
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
    Object.freeze({
      entity: change.entity,
      id: change.id,
      direction,
      expectedState: expected === null ? 'missing' : 'present',
      actualState: actual === null ? 'missing' : 'present',
    }),
  );
}

function throwInvalidChangeSet(message: string, details: DiagnosticAttributes): never {
  throw new KernelError('INVALID_CHANGE_SET', message, Object.freeze({ ...details }));
}

function describeInvalidRevision(value: unknown): DiagnosticAttributes {
  if (typeof value !== 'number') {
    return Object.freeze({
      receivedType: value === null ? 'null' : typeof value,
    });
  }
  if (!Number.isFinite(value)) {
    return Object.freeze({ receivedNumber: describeNonFiniteNumber(value) });
  }
  return Object.freeze({ value });
}
