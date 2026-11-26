import type { ConnectionRule, NodeId } from '@nodebraid/core';

export const exampleConnectionRule: ConnectionRule = ({ source, target, view }) => {
  const query = view.query;
  if (query.getNode(source.nodeId)?.type !== query.getNode(target.nodeId)?.type)
    return { type: 'deny', reason: { code: 'TYPE_MISMATCH', message: 'Connect nodes of the same type.' } };
  if (query.getIncomingEdges(target.nodeId).filter((edge) => edge.target.portId === target.portId).length >= 2)
    return { type: 'deny', reason: { code: 'INPUT_FULL', message: 'This input already has two connections.' } };
  const seen = new Set<NodeId>(),
    pending = [target.nodeId];
  while (pending.length) {
    const id = pending.pop()!;
    if (id === source.nodeId)
      return { type: 'deny', reason: { code: 'CYCLE', message: 'This connection would create a cycle.' } };
    if (seen.has(id)) continue;
    seen.add(id);
    for (const edge of query.getOutgoingEdges(id)) pending.push(edge.target.nodeId);
  }
  return { type: 'allow' };
};
