import { edgeId, nodeId, type CanvasEdge, type CanvasNode, type EdgeId, type NodeId } from '@nodebraid/kernel';
import { defineCommand, type CommandHandler } from '@nodebraid/plugin-command';
import type { KernelService } from '@nodebraid/plugin-kernel';

import type { DeleteSelectionInput, DeleteSelectionResult } from './contracts';
import { isCanvasEdge, isCanvasNode, isRecord } from './canvas-value-validation';
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
    const { selection, evidence } = captureDeleteSelectionInput(input);
    const nodeIds = canonicalIds(selection.nodeIds);
    const selectedEdgeIds = canonicalIds(selection.edgeIds);
    if (nodeIds.length === 0 && selectedEdgeIds.length === 0) return null;

    const evidenceNodes = new Map(evidence.nodes.map((node) => [node.id, node]));
    const evidenceEdges = new Map(evidence.edges.map((edge) => [edge.id, edge]));
    const selectedNodes = nodeIds.map((id) => requireEvidenceNode(evidenceNodes, id));
    const deletionEdges = new Map<EdgeId, CanvasEdge>();
    for (const edgeId of selectedEdgeIds) {
      const edge = evidenceEdges.get(edgeId);
      if (!edge) throwInvalidDelete('Delete Selection evidence does not contain a selected Edge.');
      deletionEdges.set(edge.id, edge);
    }
    for (const edge of evidence.edges) {
      if (nodeIds.includes(edge.source.nodeId) || nodeIds.includes(edge.target.nodeId)) {
        deletionEdges.set(edge.id, edge);
      }
    }
    const edges = [...deletionEdges.values()].sort(compareEntities);

    return kernel.transact(
      (transaction) => {
        for (const node of selectedNodes) {
          if (transaction.query.getNode(node.id) !== node) throwStaleSelection();
          const currentIncidentIds = transaction.query.getIncidentEdges(node.id).map((edge) => edge.id);
          const evidenceIncidentIds = evidence.edges
            .filter((edge) => edge.source.nodeId === node.id || edge.target.nodeId === node.id)
            .map((edge) => edge.id)
            .sort(compareIds);
          if (!arraysEqual(currentIncidentIds, evidenceIncidentIds)) throwStaleSelection();
        }
        for (const edge of edges) {
          if (transaction.query.getEdge(edge.id) !== edge) throwStaleSelection();
        }
        for (const edge of edges) transaction.edges.remove(edge.id);
        for (const node of selectedNodes) transaction.nodes.remove(node.id);
      },
      { origin: 'interaction', commandId: execution.commandId },
    );
  };
}

function captureDeleteSelectionInput(value: unknown): DeleteSelectionInput {
  if (!isRecord(value)) throwInvalidDeleteInput();
  const selection = value.selection;
  if (!isRecord(selection)) throwInvalidDeleteInput();
  const nodeIds = captureSelectionIds(selection.nodeIds, nodeId);
  const edgeIds = captureSelectionIds(selection.edgeIds, edgeId);
  const evidence = captureSnapshot(value.evidence);
  return { selection: { nodeIds, edgeIds }, evidence };
}

function captureSelectionIds<Id extends string>(value: unknown, createId: (id: string) => Id): readonly Id[] {
  return captureArray(value, (id): id is string => typeof id === 'string' && id.length > 0).map(createId);
}

function captureArray<Value>(value: unknown, isValue: (value: unknown) => value is Value): readonly Value[] {
  if (!Array.isArray(value)) throwInvalidDeleteInput();
  const length = +value.length;
  const captured: Value[] = [];
  for (const index of Array.prototype.keys.call({ length })) {
    const entry: unknown = value[index];
    if (!isValue(entry)) throwInvalidDeleteInput();
    captured.push(entry);
  }
  return captured;
}

function throwInvalidDeleteInput(): never {
  throwInvalidDelete('Delete Selection Command input is malformed.');
}

function captureSnapshot(value: unknown): DeleteSelectionInput['evidence'] {
  if (!isRecord(value)) throwInvalidDeleteInput();
  const revision = value.revision;
  if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 0) throwInvalidDeleteInput();
  const nodes = captureArray(value.nodes, isCanvasNode);
  const edges = captureArray(value.edges, isCanvasEdge);
  return { revision, nodes, edges };
}

function requireEvidenceNode(nodes: ReadonlyMap<NodeId, CanvasNode>, id: NodeId): CanvasNode {
  const node = nodes.get(id);
  if (!node) throwInvalidDelete('Delete Selection evidence does not contain a selected Node.');
  return node;
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
