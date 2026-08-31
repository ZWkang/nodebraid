import type { CanvasEdge, CanvasNode, EdgeId, NodeId, Point } from '@nodebraid/kernel';

import { acceptCanvasFragment } from './accept-canvas-fragment';
import { CanvasFragmentError } from './canvas-fragment-error';
import type {
  CanvasFragment,
  CanvasFragmentEdgeIdMapping,
  CanvasFragmentIdMaterialization,
  CanvasFragmentNodeIdMapping,
  MaterializedCanvasFragment,
} from './contracts';

export function materializeCanvasFragment(
  fragmentValue: CanvasFragment,
  materializationValue: CanvasFragmentIdMaterialization,
  offset: Point,
): MaterializedCanvasFragment {
  const fragment = acceptCanvasFragment(fragmentValue);
  if (!Number.isFinite(offset?.x) || !Number.isFinite(offset?.y)) {
    throwInvalid('Canvas Fragment materialization offset must be finite.');
  }
  const nodeMappings = acceptMappings<NodeId, CanvasFragmentNodeIdMapping>(
    materializationValue?.nodes,
    fragment.nodes.map((node) => node.id),
    'Node',
  );
  const edgeMappings = acceptMappings<EdgeId, CanvasFragmentEdgeIdMapping>(
    materializationValue?.edges,
    fragment.edges.map((edge) => edge.id),
    'Edge',
  );
  const nodeIds = new Map(nodeMappings.map((mapping) => [mapping.sourceId, mapping.materializedId]));
  const edgeIds = new Map(edgeMappings.map((mapping) => [mapping.sourceId, mapping.materializedId]));
  const nodes = fragment.nodes
    .map((node): CanvasNode => {
      const id = requireMappedId(nodeIds, node.id, 'Node');
      const parentId = node.parentId === undefined ? undefined : (nodeIds.get(node.parentId) ?? node.parentId);
      return Object.freeze({
        id,
        type: node.type,
        position: Object.freeze({ x: node.position.x + offset.x, y: node.position.y + offset.y }),
        ...(node.size === undefined ? {} : { size: Object.freeze({ ...node.size }) }),
        ...(parentId === undefined ? {} : { parentId }),
        data: node.data,
      });
    })
    .sort((left, right) => compareIds(left.id, right.id));
  const edges = fragment.edges
    .map((edge): CanvasEdge =>
      Object.freeze({
        id: requireMappedId(edgeIds, edge.id, 'Edge'),
        type: edge.type,
        source: Object.freeze({
          nodeId: requireMappedId(nodeIds, edge.source.nodeId, 'Node'),
          ...(edge.source.portId === undefined ? {} : { portId: edge.source.portId }),
        }),
        target: Object.freeze({
          nodeId: requireMappedId(nodeIds, edge.target.nodeId, 'Node'),
          ...(edge.target.portId === undefined ? {} : { portId: edge.target.portId }),
        }),
        data: edge.data,
      }),
    )
    .sort((left, right) => compareIds(left.id, right.id));
  return Object.freeze({
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    selection: Object.freeze({
      nodeIds: Object.freeze(
        fragment.selection.nodeIds.map((id) => requireMappedId(nodeIds, id, 'Selection Node')).sort(compareIds),
      ),
      edgeIds: Object.freeze(
        fragment.selection.edgeIds.map((id) => requireMappedId(edgeIds, id, 'Selection Edge')).sort(compareIds),
      ),
    }),
  });
}

function acceptMappings<Id extends string, Mapping extends { readonly sourceId: Id; readonly materializedId: Id }>(
  value: unknown,
  sourceIds: readonly Id[],
  entity: 'Node' | 'Edge',
): readonly Mapping[] {
  if (!Array.isArray(value)) throwInvalid(`Canvas Fragment ${entity} ID mapping must be an array.`);
  const expected = new Set(sourceIds);
  const sourceSeen = new Set<Id>();
  const materializedSeen = new Set<Id>();
  const mappings = value.map((mappingValue): Mapping => {
    const mapping = acceptMappingRecord(mappingValue, entity);
    const sourceId = mapping.sourceId as Id;
    const materializedId = mapping.materializedId as Id;
    if (
      typeof sourceId !== 'string' ||
      typeof materializedId !== 'string' ||
      materializedId.length === 0 ||
      !expected.has(sourceId) ||
      sourceSeen.has(sourceId) ||
      materializedSeen.has(materializedId)
    ) {
      throwInvalid(`Canvas Fragment ${entity} ID mapping is invalid.`);
    }
    sourceSeen.add(sourceId);
    materializedSeen.add(materializedId);
    return Object.freeze({ sourceId, materializedId }) as Mapping;
  });
  if (sourceSeen.size !== sourceIds.length) throwInvalid(`Canvas Fragment ${entity} ID mapping is incomplete.`);
  return Object.freeze(mappings.sort((left, right) => compareIds(left.sourceId, right.sourceId)));
}

function acceptMappingRecord(
  value: unknown,
  entity: 'Node' | 'Edge',
): Readonly<{ sourceId: unknown; materializedId: unknown }> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throwInvalid(`Canvas Fragment ${entity} ID mapping is malformed.`);
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== 2 || !keys.includes('sourceId') || !keys.includes('materializedId')) {
    throwInvalid(`Canvas Fragment ${entity} ID mapping is malformed.`);
  }
  const source = Object.getOwnPropertyDescriptor(value, 'sourceId');
  const materialized = Object.getOwnPropertyDescriptor(value, 'materializedId');
  if (!source || !('value' in source) || !materialized || !('value' in materialized)) {
    throwInvalid(`Canvas Fragment ${entity} ID mapping fields must be data properties.`);
  }
  return { sourceId: source.value, materializedId: materialized.value };
}

function requireMappedId<Id extends string>(mapping: ReadonlyMap<Id, Id>, sourceId: Id, entity: string): Id {
  const id = mapping.get(sourceId);
  if (!id) throwInvalid(`Canvas Fragment ${entity} ID mapping is incomplete.`);
  return id;
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function throwInvalid(message: string): never {
  throw new CanvasFragmentError('INVALID_MATERIALIZATION', message);
}
