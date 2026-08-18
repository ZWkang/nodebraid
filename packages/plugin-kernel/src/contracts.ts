import type { CanvasCommit, CanvasView, TransactionContext, TransactionMetadata } from '@cflow/kernel';

export interface KernelService {
  read(): CanvasView;
  transact(callback: (transaction: TransactionContext) => void, metadata?: TransactionMetadata): CanvasCommit | null;
  observeCommits(observer: CommitObserver): () => void;
}

export type CommitObserver = (commit: CanvasCommit) => void;
