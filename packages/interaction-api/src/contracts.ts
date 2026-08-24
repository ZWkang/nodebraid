import type { NodeId, Point } from '@cflow/kernel';
import type { Viewport } from '@cflow/session-api';

export type ConnectionAnchorRole = 'source' | 'target';

export interface ConnectionAnchorIdentity {
  readonly nodeId: NodeId;
  readonly role: ConnectionAnchorRole;
}

export type ConnectionPreviewTarget =
  | { readonly type: 'none' }
  | {
      readonly type: 'valid' | 'invalid';
      readonly anchor: ConnectionAnchorIdentity;
    };

export interface ConnectionPreviewInteractionProjection {
  readonly type: 'connection-preview';
  readonly source: ConnectionAnchorIdentity;
  readonly pointerWorldPoint: Point;
  readonly target: ConnectionPreviewTarget;
}

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

export type InteractionProjection =
  NodeDragInteractionProjection | ViewportPanInteractionProjection | ConnectionPreviewInteractionProjection;
