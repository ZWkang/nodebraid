import type { NodeId, Point } from '@nodebraid/kernel';
import type { ConnectionTargetReference } from '@nodebraid/port-api';
import type { Viewport } from '@nodebraid/session-api';

export type ConnectionAnchorRole = 'source' | 'target';

export interface ConnectionAnchorIdentity extends ConnectionTargetReference {
  readonly role: ConnectionAnchorRole;
}

export interface ConnectionFeedbackReason {
  readonly origin: 'structure' | 'rule';
  readonly code: string;
  readonly message: string;
}
export type ConnectionFeedbackTarget =
  | { readonly type: 'none' }
  | { readonly type: 'valid'; readonly anchor: ConnectionAnchorIdentity }
  | { readonly type: 'invalid'; readonly anchor: ConnectionAnchorIdentity; readonly reason: ConnectionFeedbackReason };

export type ConnectionPreviewTarget =
  | Exclude<ConnectionFeedbackTarget, { type: 'invalid' }>
  | { readonly type: 'invalid'; readonly anchor: ConnectionAnchorIdentity; readonly reason?: ConnectionFeedbackReason };

export type ConnectionFeedbackSnapshot =
  | { readonly type: 'idle' }
  | { readonly type: 'preview'; readonly source: ConnectionAnchorIdentity; readonly target: ConnectionFeedbackTarget }
  | {
      readonly type: 'rejected';
      readonly source: ConnectionAnchorIdentity;
      readonly target: ConnectionAnchorIdentity;
      readonly reason: ConnectionFeedbackReason;
    };

export interface ConnectionPreviewInteractionProjection {
  readonly type: 'connection-preview';
  readonly source: ConnectionAnchorIdentity;
  readonly pointerWorldPoint: Point;
  readonly target: ConnectionPreviewTarget;
}

export interface WorldRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface BoxSelectionInteractionProjection {
  readonly type: 'box-selection';
  readonly rect: WorldRect;
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
  | NodeDragInteractionProjection
  | ViewportPanInteractionProjection
  | ConnectionPreviewInteractionProjection
  | BoxSelectionInteractionProjection;
