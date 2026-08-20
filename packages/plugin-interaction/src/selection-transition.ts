import type { HitResult } from '@cflow/renderer-api';
import type { SelectionInput, SelectionSnapshot } from '@cflow/plugin-session';

export function computeClickSelection(current: SelectionSnapshot, hit: HitResult, additive: boolean): SelectionInput {
  if (hit.type === 'canvas') return additive ? current : { nodeIds: [], edgeIds: [] };
  if (hit.type === 'edge') {
    if (!additive) return { nodeIds: [], edgeIds: [hit.edgeId] };
    const selected = current.edgeIds.includes(hit.edgeId);
    return {
      nodeIds: current.nodeIds,
      edgeIds: selected ? current.edgeIds.filter((edgeId) => edgeId !== hit.edgeId) : [...current.edgeIds, hit.edgeId],
    };
  }
  const nodeId = hit.nodeId;
  if (!additive) return { nodeIds: [nodeId], edgeIds: [] };
  const selected = current.nodeIds.includes(nodeId);
  return {
    nodeIds: selected ? current.nodeIds.filter((selectedId) => selectedId !== nodeId) : [...current.nodeIds, nodeId],
    edgeIds: current.edgeIds,
  };
}
