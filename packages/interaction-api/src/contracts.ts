import type { NodeId, Point } from '@cflow/kernel';
import type { Viewport } from '@cflow/session-api';

export interface NodeDragProjectionNode {
  readonly nodeId: NodeId;
  readonly basePosition: Point;
  readonly position: Point;
}

export interface NodeDragInteractionProjection {
  readonly type: 'node-drag';
  readonly nodes: readonly NodeDragProjectionNode[];
}

export interface ViewportPanInteractionProjection {
  readonly type: 'viewport-pan';
  readonly baseViewport: Viewport;
  readonly viewport: Viewport;
}

export type InteractionProjection = NodeDragInteractionProjection | ViewportPanInteractionProjection;
