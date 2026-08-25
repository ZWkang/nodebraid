import type { CanvasEdge, CanvasNode, EdgeId, NodeId } from '@nodebraid/kernel';
import { defineCommand, type CommandHandler } from '@nodebraid/plugin-command';
import type { KernelService } from '@nodebraid/plugin-kernel';

import type { DeleteSelectionInput, DeleteSelectionResult } from './contracts';
import { InteractionError } from './interaction-error';

export const deleteSelectionCommand = defineCommand<DeleteSelectionInput, DeleteSelectionResult>(
  'interaction.selection.delete',
);

/** @internal */
export function createDeleteSelectionHandler(
  kernel: KernelService,
): CommandHandler<DeleteSelectionInput, DeleteSelectionResult> {
  return (input, execution) => {
    execution.signal.throwIfAborted();
    assertDeleteSelectionInput(input);
    const nodeIds = canonicalIds(input.selection.nodeIds);
    const selectedEdgeIds = canonicalIds(input.selection.edgeIds);
    if (nodeIds.length === 0 && selectedEdgeIds.length === 0) return null;

    const evidenceNodes = new Map(input.evidence.nodes.map((node) => [node.id, node]));
    const evidenceEdges = new Map(input.evidence.edges.map((edge) => [edge.id, edge]));
    const selectedNodes = nodeIds.map((id) => requireEvidenceNode(evidenceNodes, id));
    const deletionEdges = new Map<EdgeId, CanvasEdge>();
    for (const edgeId of selectedEdgeIds) {
      const edge = evidenceEdges.get(edgeId);
      if (!edge) throwInvalidDelete('Delete Selection evidence does not contain a selected Edge.');
      deletionEdges.set(edge.id, edge);
    }
    for (const edge of input.evidence.edges) {
      if (nodeIds.includes(edge.source.nodeId) || nodeIds.includes(edge.target.nodeId)) {
        deletionEdges.set(edge.id, edge);
      }
    }
    const edges = [...deletionEdges.values()].sort(compareEntities);

    return kernel.transact(
      (transaction) => {
        for (const node of selectedNodes) {
          if (!canvasNodesEqual(transaction.query.getNode(node.id), node)) throwStaleSelection();
          const currentIncidentIds = transaction.query.getIncidentEdges(node.id).map((edge) => edge.id);
          const evidenceIncidentIds = input.evidence.edges
            .filter((edge) => edge.source.nodeId === node.id || edge.target.nodeId === node.id)
            .map((edge) => edge.id)
            .sort(compareIds);
          if (!arraysEqual(currentIncidentIds, evidenceIncidentIds)) throwStaleSelection();
        }
        for (const edge of edges) {
          if (!canvasEdgesEqual(transaction.query.getEdge(edge.id), edge)) throwStaleSelection();
        }
        for (const edge of edges) transaction.edges.remove(edge.id);
        for (const node of selectedNodes) transaction.nodes.remove(node.id);
      },
      { origin: 'interaction', commandId: execution.commandId },
    );
  };
}

function assertDeleteSelectionInput(value: unknown): asserts value is DeleteSelectionInput {
  if (!isRecord(value) || !isSelection(value.selection) || !isSnapshot(value.evidence)) {
    throwInvalidDelete('Delete Selection Command input is malformed.');
  }
}

function isSelection(value: unknown): value is DeleteSelectionInput['selection'] {
  return isRecord(value) && isIdArray(value.nodeIds) && isIdArray(value.edgeIds);
}

function isSnapshot(value: unknown): value is DeleteSelectionInput['evidence'] {
  return (
    isRecord(value) &&
    Number.isSafeInteger(value.revision) &&
    typeof value.revision === 'number' &&
    value.revision >= 0 &&
    Array.isArray(value.nodes) &&
    value.nodes.every(isCanvasNode) &&
    Array.isArray(value.edges) &&
    value.edges.every(isCanvasEdge)
  );
}

function isCanvasNode(value: unknown): value is CanvasNode {
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

function isCanvasEdge(value: unknown): value is CanvasEdge {
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

function isPoint(value: unknown): value is CanvasNode['position'] {
  return isRecord(value) && typeof value.x === 'number' && typeof value.y === 'number';
}

function isIdArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(isId);
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function requireEvidenceNode(nodes: ReadonlyMap<NodeId, CanvasNode>, id: NodeId): CanvasNode {
  const node = nodes.get(id);
  if (!node) throwInvalidDelete('Delete Selection evidence does not contain a selected Node.');
  return node;
}

function canvasNodesEqual(left: CanvasNode | undefined, right: CanvasNode): boolean {
  return (
    left !== undefined &&
    left.id === right.id &&
    left.type === right.type &&
    left.position.x === right.position.x &&
    left.position.y === right.position.y &&
    left.size?.width === right.size?.width &&
    left.size?.height === right.size?.height &&
    left.parentId === right.parentId &&
    Object.is(left.data, right.data)
  );
}

function canvasEdgesEqual(left: CanvasEdge | undefined, right: CanvasEdge): boolean {
  return (
    left !== undefined &&
    left.id === right.id &&
    left.type === right.type &&
    left.source.nodeId === right.source.nodeId &&
    left.source.portId === right.source.portId &&
    left.target.nodeId === right.target.nodeId &&
    left.target.portId === right.target.portId &&
    Object.is(left.data, right.data)
  );
}

function canonicalIds<Id extends string>(ids: readonly Id[]): readonly Id[] {
  return [...new Set(ids)].sort(compareIds);
}

function compareEntities(left: Readonly<{ id: string }>, right: Readonly<{ id: string }>): number {
  return compareIds(left.id, right.id);
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function arraysEqual<Id extends string>(left: readonly Id[], right: readonly Id[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function throwInvalidDelete(message: string): never {
  throw new InteractionError('INVALID_DELETE', message);
}

function throwStaleSelection(): never {
  throw new InteractionError('STALE_SELECTION', 'Delete Selection target evidence is stale.');
}
