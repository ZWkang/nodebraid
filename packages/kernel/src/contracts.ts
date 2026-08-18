import type { EdgeId, NodeId } from './identifiers';

export interface InvalidPositionIssue {
  readonly code: 'INVALID_POSITION';
  readonly nodeId: NodeId;
  readonly coordinate: 'x' | 'y';
  readonly value: number;
}

export interface MissingEdgeEndpointIssue {
  readonly code: 'MISSING_EDGE_ENDPOINT';
  readonly edgeId: EdgeId;
  readonly endpoint: 'source' | 'target';
  readonly nodeId: NodeId;
}

export interface MissingParentIssue {
  readonly code: 'MISSING_PARENT';
  readonly nodeId: NodeId;
  readonly parentId: NodeId;
}

export interface ParentCycleIssue {
  readonly code: 'PARENT_CYCLE';
  readonly nodeIds: readonly NodeId[];
}

export interface InvalidSizeIssue {
  readonly code: 'INVALID_SIZE';
  readonly nodeId: NodeId;
  readonly dimension: 'width' | 'height';
  readonly value: number;
}

export type GraphIssue =
  InvalidPositionIssue | MissingEdgeEndpointIssue | MissingParentIssue | ParentCycleIssue | InvalidSizeIssue;

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface EdgeEndpoint {
  readonly nodeId: NodeId;
  readonly portId?: string;
}

export interface CanvasNode {
  readonly id: NodeId;
  readonly type: string;
  readonly position: Point;
  readonly size?: Size;
  /** Parent relationships express graph containment, not Renderer scene ownership. */
  readonly parentId?: NodeId;
  /** Domain data is opaque and must be treated as an immutable value by the caller. */
  readonly data: unknown;
}

export interface CanvasEdge {
  readonly id: EdgeId;
  readonly type: string;
  readonly source: EdgeEndpoint;
  readonly target: EdgeEndpoint;
  readonly data: unknown;
}

export interface CanvasSnapshot {
  /** A local, monotonically increasing projection version, not a persistence schema version. */
  readonly revision: number;
  readonly nodes: readonly CanvasNode[];
  readonly edges: readonly CanvasEdge[];
}

/** Read-only graph access shared by a committed Canvas View and a live Transaction Draft. */
export interface CanvasQuery {
  getNode(id: NodeId): CanvasNode | undefined;
  getEdge(id: EdgeId): CanvasEdge | undefined;
  getIncomingEdges(nodeId: NodeId): readonly CanvasEdge[];
  getOutgoingEdges(nodeId: NodeId): readonly CanvasEdge[];
  getIncidentEdges(nodeId: NodeId): readonly CanvasEdge[];
  getChildren(parentId: NodeId): readonly CanvasNode[];
}

export interface CanvasView {
  /** Snapshot and Query always describe the same committed revision. */
  readonly snapshot: CanvasSnapshot;
  readonly query: CanvasQuery;
}

/** Strict writes keep add, replace, and remove failure modes unambiguous. */
export interface EntityWriter<Id, Entity extends { readonly id: Id }> {
  add(entity: Entity): void;
  replace(id: Id, entity: Entity): void;
  remove(id: Id): void;
}

export type ChangeDirection = 'forward' | 'reverse';

export interface TransactionContext {
  /** Reads the current Draft and becomes unusable when the Transaction callback ends. */
  readonly query: CanvasQuery;
  readonly nodes: EntityWriter<NodeId, CanvasNode>;
  readonly edges: EntityWriter<EdgeId, CanvasEdge>;
  /** Replays through the same write path; it never restores an old revision number. */
  applyChangeSet(changeSet: ChangeSet, direction: ChangeDirection): void;
}

export interface TransactionMetadata {
  readonly origin?: string;
  readonly commandId?: string;
}

export type GraphChange =
  | {
      readonly entity: 'node';
      readonly id: NodeId;
      readonly before: CanvasNode | null;
      readonly after: CanvasNode | null;
    }
  | {
      readonly entity: 'edge';
      readonly id: EdgeId;
      readonly before: CanvasEdge | null;
      readonly after: CanvasEdge | null;
    };

export interface ChangeSet {
  readonly beforeRevision: number;
  readonly revision: number;
  readonly origin?: string;
  readonly commandId?: string;
  readonly changes: readonly GraphChange[];
}

/** Complete evidence for one atomic commit, suitable for Runtime propagation. */
export interface CanvasCommit {
  readonly before: CanvasView;
  readonly after: CanvasView;
  readonly changeSet: ChangeSet;
}

export interface CanvasKernel {
  /** Returns the same Canvas View root reference until a net-changing Transaction commits. */
  read(): CanvasView;
  /** Runs synchronously and returns null when the final Draft has no net change. */
  transact(callback: (transaction: TransactionContext) => void, metadata?: TransactionMetadata): CanvasCommit | null;
}
