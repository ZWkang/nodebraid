import { describeNonFiniteNumber, type DiagnosticAttributes } from '@cflow/diagnostics';

import type { CanvasEdge, CanvasNode, GraphIssue, ParentCycleIssue } from './contracts';
import type { EdgeId, NodeId } from './identifiers';
import { compareIds } from './ordering';

export function validateGraph(
  nodes: ReadonlyMap<NodeId, CanvasNode>,
  edges: ReadonlyMap<EdgeId, CanvasEdge>,
): GraphIssue[] {
  const issues: GraphIssue[] = [];
  for (const node of nodes.values()) {
    for (const coordinate of ['x', 'y'] as const) {
      const value = node.position[coordinate];
      if (!Number.isFinite(value)) {
        issues.push(Object.freeze({ code: 'INVALID_POSITION', nodeId: node.id, coordinate, value }));
      }
    }
    if (node.size !== undefined) {
      for (const dimension of ['width', 'height'] as const) {
        const value = node.size[dimension];
        if (!Number.isFinite(value) || value < 0) {
          issues.push(Object.freeze({ code: 'INVALID_SIZE', nodeId: node.id, dimension, value }));
        }
      }
    }
    if (node.parentId !== undefined && !nodes.has(node.parentId)) {
      issues.push(Object.freeze({ code: 'MISSING_PARENT', nodeId: node.id, parentId: node.parentId }));
    }
  }
  for (const edge of edges.values()) {
    for (const endpoint of ['source', 'target'] as const) {
      const nodeId = edge[endpoint].nodeId;
      if (!nodes.has(nodeId)) {
        issues.push(Object.freeze({ code: 'MISSING_EDGE_ENDPOINT', edgeId: edge.id, endpoint, nodeId }));
      }
    }
  }
  issues.push(...findParentCycles(nodes));
  return issues.sort(compareGraphIssues);
}

export function describeGraphIssues(issues: readonly GraphIssue[]): readonly DiagnosticAttributes[] {
  return issues.map((issue): DiagnosticAttributes => {
    switch (issue.code) {
      case 'MISSING_EDGE_ENDPOINT':
        return {
          code: issue.code,
          edgeId: issue.edgeId,
          endpoint: issue.endpoint,
          nodeId: issue.nodeId,
        };
      case 'MISSING_PARENT':
        return { code: issue.code, nodeId: issue.nodeId, parentId: issue.parentId };
      case 'PARENT_CYCLE':
        return { code: issue.code, nodeIds: issue.nodeIds };
      case 'INVALID_POSITION':
        return {
          code: issue.code,
          nodeId: issue.nodeId,
          coordinate: issue.coordinate,
          receivedNumber: describeNonFiniteNumber(issue.value),
        };
      case 'INVALID_SIZE':
        return {
          code: issue.code,
          nodeId: issue.nodeId,
          dimension: issue.dimension,
          ...(Number.isFinite(issue.value)
            ? { value: issue.value }
            : { receivedNumber: describeNonFiniteNumber(issue.value) }),
        };
    }
  });
}

function findParentCycles(nodes: ReadonlyMap<NodeId, CanvasNode>): ParentCycleIssue[] {
  const completed = new Set<NodeId>();
  const cycles: ParentCycleIssue[] = [];
  for (const startId of [...nodes.keys()].sort(compareIds)) {
    if (completed.has(startId)) continue;
    const path: NodeId[] = [];
    const pathIndexes = new Map<NodeId, number>();
    let currentId: NodeId | undefined = startId;
    while (currentId !== undefined && nodes.has(currentId) && !completed.has(currentId)) {
      const cycleStart = pathIndexes.get(currentId);
      if (cycleStart !== undefined) {
        const nodeIds = Object.freeze(path.slice(cycleStart).sort(compareIds));
        cycles.push(Object.freeze({ code: 'PARENT_CYCLE', nodeIds }));
        break;
      }
      pathIndexes.set(currentId, path.length);
      path.push(currentId);
      currentId = nodes.get(currentId)?.parentId;
    }
    for (const nodeId of path) completed.add(nodeId);
  }
  return cycles;
}

function compareGraphIssues(left: GraphIssue, right: GraphIssue): number {
  const codeOrder = graphIssueOrder[left.code] - graphIssueOrder[right.code];
  if (codeOrder !== 0) return codeOrder;
  switch (left.code) {
    case 'MISSING_EDGE_ENDPOINT':
      if (right.code !== left.code) return 0;
      return compareIds(left.edgeId, right.edgeId) || compareIds(left.endpoint, right.endpoint);
    case 'MISSING_PARENT':
      if (right.code !== left.code) return 0;
      return compareIds(left.nodeId, right.nodeId);
    case 'PARENT_CYCLE':
      if (right.code !== left.code) return 0;
      return compareIds(left.nodeIds.join('\u0000'), right.nodeIds.join('\u0000'));
    case 'INVALID_POSITION':
      if (right.code !== left.code) return 0;
      return compareIds(left.nodeId, right.nodeId) || compareIds(left.coordinate, right.coordinate);
    case 'INVALID_SIZE':
      if (right.code !== left.code) return 0;
      return (
        compareIds(left.nodeId, right.nodeId) ||
        sizeDimensionOrder[left.dimension] - sizeDimensionOrder[right.dimension]
      );
  }
}

const graphIssueOrder: Readonly<Record<GraphIssue['code'], number>> = Object.freeze({
  MISSING_EDGE_ENDPOINT: 0,
  MISSING_PARENT: 1,
  PARENT_CYCLE: 2,
  INVALID_POSITION: 3,
  INVALID_SIZE: 4,
});

const sizeDimensionOrder = Object.freeze({ width: 0, height: 1 });
