import type { CanvasCommit, NodeId, Point } from '@cflow/kernel';

export interface InteractionConfig {
  readonly dragThreshold?: number;
  readonly wheelZoomSensitivity?: number;
  readonly minZoom?: number;
  readonly maxZoom?: number;
}

export interface EffectiveInteractionConfig {
  readonly dragThreshold: number;
  readonly wheelZoomSensitivity: number;
  readonly minZoom: number;
  readonly maxZoom: number;
}

export interface MoveNodeInput {
  readonly nodeId: NodeId;
  readonly basePosition: Point;
  readonly position: Point;
}

export interface MoveNodesInput {
  readonly moves: readonly MoveNodeInput[];
}

export type MoveNodesResult = CanvasCommit | null;
