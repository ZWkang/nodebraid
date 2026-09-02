import type { CanvasNode, CanvasSnapshot } from '@nodebraid/kernel';
import type { PortDefinition, PortSnapshot } from '@nodebraid/port-api';

export interface PortContribution {
  readonly id: string;
  readonly definePorts: (node: CanvasNode) => readonly PortDefinition[];
}

export interface PortRegistration {
  dispose(): void;
}

export interface PortService {
  register(contribution: PortContribution): PortRegistration;
  snapshot(document: CanvasSnapshot): PortSnapshot;
  subscribe(listener: () => void): () => void;
}
