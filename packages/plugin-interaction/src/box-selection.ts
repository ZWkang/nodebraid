import type { WorldRect } from '@nodebraid/interaction-api';
import type { CanvasNode } from '@nodebraid/kernel';
import type { SelectionInput, SelectionSnapshot } from '@nodebraid/plugin-session';

export function computeBoxSelection(
  current: SelectionSnapshot,
  nodes: readonly CanvasNode[],
  rect: WorldRect,
  additive: boolean,
): SelectionInput {
  const intersectingNodeIds = nodes
    .filter((node) => node.size && rectanglesIntersect(rect, { ...node.position, ...node.size }))
    .map((node) => node.id)
    .sort(compareIds);
  if (!additive) return { nodeIds: intersectingNodeIds, edgeIds: [] };
  return {
    nodeIds: [...new Set([...current.nodeIds, ...intersectingNodeIds])].sort(compareIds),
    edgeIds: current.edgeIds,
  };
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function rectanglesIntersect(left: WorldRect, right: WorldRect): boolean {
  return (
    left.x <= right.x + right.width &&
    left.x + left.width >= right.x &&
    left.y <= right.y + right.height &&
    left.y + left.height >= right.y
  );
}
