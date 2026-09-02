import type { NodeId } from '@nodebraid/kernel';

export type PortRole = 'source' | 'target';

export interface PortDefinition {
  readonly id: string;
  readonly role: PortRole;
}

export interface NodePortSnapshot {
  readonly nodeId: NodeId;
  readonly ports: readonly PortDefinition[];
}

export interface PortSnapshot {
  readonly documentRevision: number;
  readonly generation: number;
  readonly nodes: readonly NodePortSnapshot[];
}
