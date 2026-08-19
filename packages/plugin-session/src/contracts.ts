import type { EdgeId, NodeId } from '@cflow/kernel';
import type { SessionSnapshot, Viewport } from '@cflow/session-api';

export type { SelectionSnapshot, SessionSnapshot, Viewport } from '@cflow/session-api';

export interface SelectionInput {
  readonly nodeIds: readonly NodeId[];
  readonly edgeIds: readonly EdgeId[];
}

export interface SessionService {
  getSnapshot(): SessionSnapshot;
  subscribe(listener: () => void): () => void;
  setSelection(selection: SelectionInput): void;
  clearSelection(): void;
  setViewport(viewport: Viewport): void;
}
