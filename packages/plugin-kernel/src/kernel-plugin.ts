import {
  createCanvasKernel,
  type CanvasCommit,
  type TransactionContext,
  type TransactionMetadata,
} from '@cflow/kernel';
import { definePlugin, defineService } from '@cflow/runtime-cordis';

import type { CommitObserver, KernelService } from './contracts';
import { KernelPluginError } from './kernel-plugin-error';
import { reportObserverError } from './observer-error-reporting';

export const kernelService = defineService<KernelService>('kernel');

export const kernelPlugin = definePlugin({
  name: '@cflow/plugin-kernel',
  provides: { kernel: kernelService },
  setup(context) {
    const kernel = createCanvasKernel();
    const observers = new Set<CommitObserver>();
    const commitQueue: CanvasCommit[] = [];
    let dispatching = false;
    let disposed = false;

    const assertActive = (): void => {
      if (disposed) {
        throw new KernelPluginError('SERVICE_DISPOSED', 'Kernel Service Activation has been disposed.');
      }
    };

    const dispatch = (commit: CanvasCommit): void => {
      commitQueue.push(commit);
      if (dispatching) return;
      dispatching = true;
      try {
        for (const queuedCommit of commitQueue) {
          const currentObservers = Array.from(observers);
          for (const observer of currentObservers) {
            try {
              observer(queuedCommit);
            } catch (error) {
              reportObserverError(error);
            }
          }
        }
      } finally {
        commitQueue.length = 0;
        dispatching = false;
      }
    };

    const service: KernelService = Object.freeze({
      read() {
        assertActive();
        return kernel.read();
      },
      transact(
        callback: (transaction: TransactionContext) => void,
        metadata?: TransactionMetadata,
      ): CanvasCommit | null {
        assertActive();
        const commit = kernel.transact(callback, metadata);
        if (commit) dispatch(commit);
        return commit;
      },
      observeCommits(observer: CommitObserver): () => void {
        assertActive();
        observers.add(observer);
        return () => observers.delete(observer);
      },
    });
    context.own(() => {
      disposed = true;
      observers.clear();
      commitQueue.length = 0;
    });
    return { kernel: service };
  },
});
