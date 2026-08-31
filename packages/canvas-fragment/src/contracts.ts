import type { CanvasEdge, CanvasNode, EdgeId, NodeId } from '@nodebraid/kernel';

export interface CanvasFragmentSelection {
  readonly nodeIds: readonly NodeId[];
  readonly edgeIds: readonly EdgeId[];
}

export interface CanvasFragment {
  readonly type: 'nodebraid.canvas-fragment';
  readonly nodes: readonly CanvasNode[];
  readonly edges: readonly CanvasEdge[];
  readonly selection: CanvasFragmentSelection;
}

export interface CanvasFragmentNodeIdMapping {
  readonly sourceId: NodeId;
  readonly materializedId: NodeId;
}

export interface CanvasFragmentEdgeIdMapping {
  readonly sourceId: EdgeId;
  readonly materializedId: EdgeId;
}

export interface CanvasFragmentIdMaterialization {
  readonly nodes: readonly CanvasFragmentNodeIdMapping[];
  readonly edges: readonly CanvasFragmentEdgeIdMapping[];
}

export interface MaterializedCanvasFragment {
  readonly nodes: readonly CanvasNode[];
  readonly edges: readonly CanvasEdge[];
  readonly selection: CanvasFragmentSelection;
}
