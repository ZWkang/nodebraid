import type { EdgeId, NodeId, Point, Size } from '@cflow/kernel';

export type LayoutMode = 'full' | 'incremental';

export interface LayoutInputNode {
  readonly id: NodeId;
  readonly position: Point;
  readonly size: Size;
  readonly fixed: boolean;
}

export interface LayoutInputEdge {
  readonly id: EdgeId;
  readonly sourceNodeId: NodeId;
  readonly targetNodeId: NodeId;
}

export interface LayoutInput {
  readonly revision: number;
  readonly mode: LayoutMode;
  readonly nodes: readonly LayoutInputNode[];
  readonly edges: readonly LayoutInputEdge[];
}

export interface LayoutInputOptions {
  readonly mode: LayoutMode;
  readonly fixedNodeIds: readonly NodeId[];
}

export interface LayoutPosition {
  readonly id: NodeId;
  readonly position: Point;
}

export interface LayoutProposal {
  readonly sourceRevision: number;
  readonly positions: readonly LayoutPosition[];
}

export interface LayoutCapabilities {
  readonly incremental: boolean;
  readonly fixedNodes: boolean;
  readonly selfLoops: boolean;
}

export interface LayoutComputeContext {
  readonly signal: AbortSignal;
}

export interface LayoutEngine<Config> {
  readonly id: string;
  readonly capabilities: LayoutCapabilities;
  compute(input: LayoutInput, config: Config, context: LayoutComputeContext): Promise<LayoutProposal>;
}

export interface LayoutEngineDefinition<Config> {
  readonly id: string;
  readonly capabilities: LayoutCapabilities;
  readonly compute: (
    input: LayoutInput,
    config: Config,
    context: LayoutComputeContext,
  ) => LayoutProposal | PromiseLike<LayoutProposal>;
}
