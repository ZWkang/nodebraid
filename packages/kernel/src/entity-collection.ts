import type { EntityWriter, GraphChange } from './contracts';
import { KernelError } from './kernel-error';
import { compareIds } from './ordering';

type EntityKind = GraphChange['entity'];

interface Identified<Id extends string> {
  readonly id: Id;
}

interface WriterOptions<Id extends string, Entity extends Identified<Id>> {
  readonly kind: EntityKind;
  readonly draft: Map<Id, Entity>;
  readonly touchedIds: Set<Id>;
  readonly freeze: (entity: Entity, id: Id) => Entity;
  readonly assertOpen: () => void;
  readonly onAdd: (entity: Entity) => void;
  readonly onReplace: (before: Entity, after: Entity) => void;
  readonly onRemove: (entity: Entity) => void;
}

export function createEntityWriter<Id extends string, Entity extends Identified<Id>>(
  options: WriterOptions<Id, Entity>,
): EntityWriter<Id, Entity> {
  const label = options.kind === 'node' ? 'Node' : 'Edge';
  const writeCaptured = (id: Id, entity: Entity): void => {
    // Capturing caller fields can write again through the same Transaction.
    const before = options.draft.get(id);
    options.draft.set(id, entity);
    if (before === undefined) options.onAdd(entity);
    else options.onReplace(before, entity);
    options.touchedIds.add(id);
  };
  return Object.freeze({
    add(entity: Entity): void {
      options.assertOpen();
      const id = entity.id;
      if (options.draft.has(id)) {
        throw new KernelError(
          'ENTITY_ALREADY_EXISTS',
          `${label} "${id}" already exists.`,
          Object.freeze({ entity: options.kind, id }),
        );
      }
      const frozen = options.freeze(entity, id);
      writeCaptured(id, frozen);
    },
    replace(id: Id, entity: Entity): void {
      options.assertOpen();
      const before = options.draft.get(id);
      if (before === undefined) {
        throw new KernelError(
          'ENTITY_NOT_FOUND',
          `${label} "${id}" does not exist.`,
          Object.freeze({ entity: options.kind, id }),
        );
      }
      const actualId = entity.id;
      if (actualId !== id) {
        throw new KernelError(
          'ENTITY_ID_MISMATCH',
          `Replacement ${label} ID "${actualId}" does not match "${id}".`,
          Object.freeze({ entity: options.kind, id, actualId }),
        );
      }
      const frozen = options.freeze(entity, actualId);
      writeCaptured(id, frozen);
    },
    remove(id: Id): void {
      options.assertOpen();
      const entity = options.draft.get(id);
      if (entity === undefined) {
        throw new KernelError(
          'ENTITY_NOT_FOUND',
          `${label} "${id}" does not exist.`,
          Object.freeze({ entity: options.kind, id }),
        );
      }
      options.draft.delete(id);
      options.onRemove(entity);
      options.touchedIds.add(id);
    },
  });
}

export function collectEntityChanges<Id extends string, Entity extends Identified<Id>>(
  kind: EntityKind,
  before: ReadonlyMap<Id, Entity>,
  after: ReadonlyMap<Id, Entity>,
  touchedIds: ReadonlySet<Id>,
  equal: (left: Entity | null, right: Entity | null) => boolean,
): readonly GraphChange[] {
  return [...touchedIds]
    .map((id) => ({ id, before: before.get(id) ?? null, after: after.get(id) ?? null }))
    .filter((change) => !equal(change.before, change.after))
    .sort((left, right) => compareIds(left.id, right.id))
    .map((change) => Object.freeze({ entity: kind, ...change }) as unknown as GraphChange);
}
