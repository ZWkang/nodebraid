export interface HistorySnapshot {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

export interface HistoryService {
  getSnapshot(): HistorySnapshot;
  subscribe(listener: () => void): () => void;
}
