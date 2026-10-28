import type { CanvasCommit, CanvasNode } from '@nodebraid/kernel';

export interface CreateNodeInput {
  readonly node: CanvasNode;
}

export interface UpdateNodeDataInput {
  /** The exact Node read when editing began; any committed replacement makes it stale. */
  readonly expectedNode: CanvasNode;
  readonly data: unknown;
}

export type CreateNodeResult = CanvasCommit;
export type UpdateNodeDataResult = CanvasCommit | null;
