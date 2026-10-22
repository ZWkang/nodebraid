import {
  CanvasFragmentError,
  captureCanvasFragment,
  materializeCanvasFragment,
  type CanvasFragmentIdMaterialization,
} from '@nodebraid/canvas-fragment';
import type { CanvasEdge, EdgeId, NodeId } from '@nodebraid/kernel';
import { defineCommand, type CommandHandler } from '@nodebraid/plugin-command';
import type { KernelService } from '@nodebraid/plugin-kernel';
import type { SessionService } from '@nodebraid/plugin-session';

import type { CreateDuplicateSelectionPluginOptions, DuplicateSelectionResult } from './contracts';
import { DuplicateSelectionError } from './duplicate-selection-error';

export const duplicateSelectionCommand = defineCommand<void, DuplicateSelectionResult>('selection.duplicate');

export function createDuplicateSelectionHandler(
  kernel: KernelService,
  session: SessionService,
  options: Readonly<Required<CreateDuplicateSelectionPluginOptions>>,
): CommandHandler<void, DuplicateSelectionResult> {
  return (_input, execution) => {
    execution.signal.throwIfAborted();
    const selection = session.getSnapshot().selection;
    const sourceView = kernel.read();
    const fragment = captureCanvasFragment(sourceView, selection);
    if (!fragment) return null;
    const nodeIds = fragment.selection.nodeIds;
    const sourceNodes = fragment.nodes;
    const sourceEdges = fragment.edges;
    const materializerInput = Object.freeze({
      nodeIds: Object.freeze(nodeIds),
      edgeIds: Object.freeze(sourceEdges.map((edge) => edge.id)),
    });
    const rawMaterialization = options.materializeIds(materializerInput);
    if (isThenable(rawMaterialization)) throwInvalidMaterialization('Duplicate ID Materializer must be synchronous.');
    let duplicates;
    try {
      duplicates = materializeCanvasFragment(fragment, translateMaterialization(rawMaterialization), options.offset);
    } catch (error) {
      if (error instanceof CanvasFragmentError && error.code === 'INVALID_MATERIALIZATION') {
        throwInvalidMaterialization(error.message);
      }
      throw error;
    }
    execution.signal.throwIfAborted();
    if (session.getSnapshot().selection !== selection) throwStaleDuplicate();

    const commit = kernel.transact(
      (transaction) => {
        if (session.getSnapshot().selection !== selection) throwStaleDuplicate();
        for (const node of sourceNodes) {
          if (transaction.query.getNode(node.id) !== node) throwStaleDuplicate();
        }
        const currentInternalEdgeIds = collectInternalEdges(transaction.query, nodeIds).map((edge) => edge.id);
        if (
          !arraysEqual(
            currentInternalEdgeIds,
            sourceEdges.map((edge) => edge.id),
          )
        )
          throwStaleDuplicate();
        for (const edge of sourceEdges) {
          if (transaction.query.getEdge(edge.id) !== edge) throwStaleDuplicate();
        }
        for (const node of duplicates.nodes) {
          if (transaction.query.getNode(node.id)) throwInvalidMaterialization('Duplicate Node ID is unavailable.');
          transaction.nodes.add(node);
        }
        for (const edge of duplicates.edges) {
          if (transaction.query.getEdge(edge.id)) throwInvalidMaterialization('Duplicate Edge ID is unavailable.');
          transaction.edges.add(edge);
        }
      },
      { origin: 'duplicate-selection', commandId: execution.commandId },
    );
    if (!commit) throw new Error('Duplicate Selection must create a Canvas Commit.');
    let currentSelection;
    try {
      currentSelection = session.getSnapshot().selection;
    } catch (error) {
      throwSelectionUpdateFailed(commit.changeSet.revision, error);
    }
    if (currentSelection !== selection) throwSelectionUpdateFailed(commit.changeSet.revision);
    try {
      session.setSelection(duplicates.selection);
    } catch (error) {
      throwSelectionUpdateFailed(commit.changeSet.revision, error);
    }
    return commit;
  };
}

function translateMaterialization(value: unknown): CanvasFragmentIdMaterialization {
  if (!isRecord(value)) {
    throwInvalidMaterialization('Duplicate ID Materialization is malformed.');
  }
  const nodes = value.nodes;
  if (!Array.isArray(nodes)) throwInvalidMaterialization('Duplicate ID Materialization is malformed.');
  const edges = value.edges;
  if (!Array.isArray(edges)) throwInvalidMaterialization('Duplicate ID Materialization is malformed.');
  return Object.freeze({
    nodes: Object.freeze(
      Array.from({ length: nodes.length }, (_, index) => translateMapping<NodeId>(nodes[index], 'Node')),
    ),
    edges: Object.freeze(
      Array.from({ length: edges.length }, (_, index) => translateMapping<EdgeId>(edges[index], 'Edge')),
    ),
  });
}

function translateMapping<Id extends string>(
  value: unknown,
  entity: 'Node' | 'Edge',
): Readonly<{ sourceId: Id; materializedId: Id }> {
  if (!isRecord(value)) throwInvalidMaterialization(`Duplicate ${entity} ID mapping is malformed.`);
  const sourceId = readDataProperty(value, 'sourceId', entity);
  const materializedId = readDataProperty(value, 'duplicateId', entity);
  return Object.freeze({ sourceId, materializedId }) as Readonly<{ sourceId: Id; materializedId: Id }>;
}

function readDataProperty(record: object, key: string, entity: 'Node' | 'Edge'): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !('value' in descriptor)) {
    throwInvalidMaterialization(`Duplicate ${entity} ID mapping fields must be data properties.`);
  }
  return descriptor.value;
}

function collectInternalEdges(
  query: Readonly<{ getIncidentEdges(nodeId: NodeId): readonly CanvasEdge[] }>,
  nodeIds: readonly NodeId[],
): readonly CanvasEdge[] {
  const nodeIdSet = new Set(nodeIds);
  const edges = new Map<EdgeId, CanvasEdge>();
  for (const nodeId of nodeIds) {
    for (const edge of query.getIncidentEdges(nodeId)) {
      if (nodeIdSet.has(edge.source.nodeId) && nodeIdSet.has(edge.target.nodeId)) edges.set(edge.id, edge);
    }
  }
  return [...edges.values()].sort((left, right) => compareIds(left.id, right.id));
}

function arraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isThenable(value: unknown): boolean {
  return (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    typeof Reflect.get(value, 'then') === 'function'
  );
}

function throwInvalidMaterialization(message: string): never {
  throw new DuplicateSelectionError('INVALID_MATERIALIZATION', message);
}

function throwStaleDuplicate(): never {
  throw new DuplicateSelectionError('STALE_DUPLICATE', 'Duplicate Selection evidence is stale.');
}

function throwSelectionUpdateFailed(committedRevision: number, cause?: unknown): never {
  throw new DuplicateSelectionError(
    'SELECTION_UPDATE_FAILED',
    'Duplicate Selection committed but could not apply its result Selection.',
    { committedRevision },
    { cause },
  );
}
