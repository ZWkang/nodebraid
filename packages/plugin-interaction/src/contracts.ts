import type { ConnectionAnchorIdentity } from '@nodebraid/interaction-api';
import type { CanvasCommit, CanvasEdge, EdgeEndpoint, NodeId, Point } from '@nodebraid/kernel';

export interface ConnectionMaterializationInput {
  readonly source: EdgeEndpoint;
  readonly target: EdgeEndpoint;
}

export type ConnectionMaterializer = (input: ConnectionMaterializationInput) => CanvasEdge;

export interface ConnectionConfig {
  readonly materializeEdge: ConnectionMaterializer;
}

export interface InteractionConfig {
  readonly dragThreshold?: number;
  readonly wheelZoomSensitivity?: number;
  readonly minZoom?: number;
  readonly maxZoom?: number;
  readonly connection?: ConnectionConfig;
}

export interface EffectiveInteractionConfig {
  readonly dragThreshold: number;
  readonly wheelZoomSensitivity: number;
  readonly minZoom: number;
  readonly maxZoom: number;
  readonly connection?: ConnectionConfig;
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

export interface CreateEdgeInput {
  readonly edge: CanvasEdge;
  readonly source: ConnectionAnchorIdentity;
  readonly target: ConnectionAnchorIdentity;
}

export type CreateEdgeResult = CanvasCommit;
