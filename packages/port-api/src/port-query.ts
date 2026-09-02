import type { NodeId } from '@nodebraid/kernel';

import type { NodePortSnapshot, PortDefinition, PortSnapshot } from './contracts';

export function getNodePortSnapshot(snapshot: PortSnapshot, nodeId: NodeId): NodePortSnapshot | undefined {
  return snapshot.nodes.find((candidate) => candidate.nodeId === nodeId);
}

export function getPortDefinition(snapshot: PortSnapshot, nodeId: NodeId, portId: string): PortDefinition | undefined {
  return getNodePortSnapshot(snapshot, nodeId)?.ports.find((candidate) => candidate.id === portId);
}

export function hasPortDefinitions(snapshot: PortSnapshot, nodeId: NodeId): boolean {
  return (getNodePortSnapshot(snapshot, nodeId)?.ports.length ?? 0) > 0;
}
