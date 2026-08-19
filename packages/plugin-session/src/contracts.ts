import type { EdgeId, NodeId } from '@cflow/kernel';

export interface SelectionSnapshot {
  readonly nodeIds: readonly NodeId[];
  readonly edgeIds: readonly EdgeId[];
}

export interface SelectionInput {
  readonly nodeIds: readonly NodeId[];
  readonly edgeIds: readonly EdgeId[];
}

export interface Viewport {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export interface SessionSnapshot {
  readonly selection: SelectionSnapshot;
  readonly viewport: Viewport;
}

export interface SessionService {
  getSnapshot(): SessionSnapshot;
  subscribe(listener: () => void): () => void;
  setSelection(selection: SelectionInput): void;
  clearSelection(): void;
  setViewport(viewport: Viewport): void;
}
