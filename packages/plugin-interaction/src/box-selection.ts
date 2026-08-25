import type { WorldRect } from '@nodebraid/interaction-api';
import type { CanvasNode, Point } from '@nodebraid/kernel';
import type { SelectionInput, SelectionSnapshot } from '@nodebraid/plugin-session';

export function worldRectBetween(start: Point, end: Point): WorldRect {
  return Object.freeze({
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  });
}

export function computeBoxSelection(
  current: SelectionSnapshot,
  nodes: readonly CanvasNode[],
  rect: WorldRect,
  additive: boolean,
): SelectionInput {
  const intersectingNodeIds = nodes
    .filter((node) => node.size && rectanglesIntersect(rect, { ...node.position, ...node.size }))
    .map((node) => node.id);
  if (!additive) return { nodeIds: intersectingNodeIds, edgeIds: [] };
  return {
    nodeIds: [...new Set([...current.nodeIds, ...intersectingNodeIds])],
    edgeIds: current.edgeIds,
  };
}

function rectanglesIntersect(left: WorldRect, right: WorldRect): boolean {
  return (
    left.x <= right.x + right.width &&
    left.x + left.width >= right.x &&
    left.y <= right.y + right.height &&
    left.y + left.height >= right.y
  );
}
