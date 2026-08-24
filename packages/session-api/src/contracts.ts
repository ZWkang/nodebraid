import type { EdgeId, NodeId } from '@nodebraid/kernel';

export interface SelectionSnapshot {
  /** Canonical membership only; array order is deterministic and has no primary-selection meaning. */
  readonly nodeIds: readonly NodeId[];
  readonly edgeIds: readonly EdgeId[];
}

export interface Viewport {
  /** Logical screen offset; browser Providers interpret these values as CSS pixels. */
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

/** Immutable local view state with no Document revision or mutation capability. */
export interface SessionSnapshot {
  readonly selection: SelectionSnapshot;
  readonly viewport: Viewport;
}
