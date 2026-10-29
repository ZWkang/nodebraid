import type { CanvasCommit, CanvasNode, NodeId, Point } from '@nodebraid/kernel';
import { defineService } from '@nodebraid/runtime-cordis';

export interface NodeMaterializationInput {
  readonly worldPoint: Point;
}

export type NodeMaterializer = (input: NodeMaterializationInput) => CanvasNode;

export type NodePlacementResult =
  { readonly type: 'created'; readonly nodeId: NodeId; readonly commit: CanvasCommit } | { readonly type: 'cancelled' };

export interface NodePlacement {
  /** Settles once with creation, cancellation or the original failure. */
  readonly result: Promise<NodePlacementResult>;
  /** Cancels only this request before its creation Command starts. */
  cancel(): void;
}

export interface NodePlacementService {
  /** Replaces a waiting request; an existing ordinary Pointer Gesture must finish first. */
  begin(materializeNode: NodeMaterializer): NodePlacement;
}

export const nodePlacementService = defineService<NodePlacementService>('interaction.node-placement');
