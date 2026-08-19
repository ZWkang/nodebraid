import type { CanvasCommit, CanvasView } from '@cflow/kernel';
import { kernelService } from '@cflow/plugin-kernel';
import { sessionService, type SessionSnapshot } from '@cflow/plugin-session';
import { RendererError, type RendererFactory, type RendererInputListener, type ScreenPoint } from '@cflow/renderer-api';
import { definePlugin, defineService } from '@cflow/runtime-cordis';

import type { RendererService } from './contracts';
import { rendererDiagnosticEvents } from './diagnostic-events';
import { RendererPluginError } from './renderer-plugin-error';

export const rendererService = defineService<RendererService>('renderer');

type PendingRendererUpdate =
  | { readonly type: 'commit'; readonly commit: CanvasCommit }
  | { readonly type: 'session'; readonly snapshot: SessionSnapshot };

export function createRendererPlugin<Config>(factory: RendererFactory<Config>) {
  if (typeof factory !== 'function') throw new TypeError('Renderer Factory must be a function.');

  return definePlugin({
    name: '@cflow/plugin-renderer',
    requires: { kernel: kernelService, session: sessionService },
    provides: { renderer: rendererService },
    async setup(context, config: Config) {
      const kernel = context.services.kernel;
      const session = context.services.session;
      const renderer = await factory(config);
      context.own(() => renderer.dispose());
      context.signal.throwIfAborted();

      let disposed = false;
      let draining = false;
      let deliveredView: CanvasView | undefined;
      let deliveredSession: SessionSnapshot | undefined;
      // A reset may jump ahead of Commit callbacks already queued by Kernel dispatch.
      let resetThroughRevision: number | undefined;
      const pendingUpdates: PendingRendererUpdate[] = [];
      const inputSubscriptions = new Set<() => void>();
      let stopKernel = (): void => undefined;
      let stopSession = (): void => undefined;

      const assertActive = (): void => {
        if (disposed) {
          throw new RendererPluginError('SERVICE_DISPOSED', 'Renderer Service Activation has been disposed.');
        }
      };

      const reportSyncFault = (error: unknown): void => {
        context.diagnostics.reportFault(error, { name: rendererDiagnosticEvents.syncFault });
      };

      const resetToCurrentState = (subsumesQueuedCommits = false): void => {
        const view = kernel.read();
        const snapshot = session.getSnapshot();
        assertSessionResolvable(snapshot, view);
        renderer.updateDocument({ type: 'reset', view });
        renderer.updateSession(snapshot);
        deliveredView = view;
        deliveredSession = snapshot;
        resetThroughRevision = subsumesQueuedCommits ? view.snapshot.revision : undefined;
      };

      const deliverCommit = (commit: CanvasCommit): void => {
        const currentView = deliveredView;
        if (!currentView) throw new Error('Renderer Document Baseline has not been established.');
        const expectedRevision = currentView.snapshot.revision;
        if (resetThroughRevision !== undefined) {
          if (commit.after.snapshot.revision <= resetThroughRevision) return;
          resetThroughRevision = undefined;
        }
        const receivedRevision = commit.before.snapshot.revision;
        if (receivedRevision !== expectedRevision) {
          reportSyncFault(
            new RendererError('DOCUMENT_OUT_OF_SYNC', 'Renderer Commit is not contiguous with its Baseline.', {
              expectedRevision,
              receivedRevision,
            }),
          );
          pendingUpdates.length = 0;
          resetToCurrentState(true);
          return;
        }
        try {
          renderer.updateDocument({ type: 'commit', commit });
          deliveredView = commit.after;
        } catch (error) {
          if (error instanceof RendererError && error.code === 'DOCUMENT_OUT_OF_SYNC') {
            reportSyncFault(error);
            pendingUpdates.length = 0;
            resetToCurrentState(true);
            return;
          }
          throw error;
        }
      };

      const deliverSession = (snapshot: SessionSnapshot): void => {
        renderer.updateSession(snapshot);
        deliveredSession = snapshot;
      };

      const findSessionBeforeNextCommit = (): number => {
        // A deleting Commit waits until Selection no longer references the entity it removes.
        const view = deliveredView;
        if (!view) return -1;
        for (let index = 1; index < pendingUpdates.length; index += 1) {
          const update = pendingUpdates[index]!;
          if (update.type === 'commit') return -1;
          if (isSessionResolvable(update.snapshot, view)) return index;
        }
        return -1;
      };

      const findCommitForPendingSession = (): number => {
        // Selection of a newly added entity waits until that entity's Commit reaches Renderer.
        const currentSession = deliveredSession;
        if (!currentSession) return -1;
        for (let index = 1; index < pendingUpdates.length; index += 1) {
          const update = pendingUpdates[index]!;
          if (update.type !== 'commit') continue;
          return isSessionResolvable(currentSession, update.commit.after) ? index : -1;
        }
        return -1;
      };

      const deliverNextUpdate = (): boolean => {
        const currentView = deliveredView;
        const currentSession = deliveredSession;
        const first = pendingUpdates[0];
        if (!first || !currentView || !currentSession) return false;

        if (first.type === 'session') {
          if (isSessionResolvable(first.snapshot, currentView)) {
            pendingUpdates.shift();
            deliverSession(first.snapshot);
            return true;
          }
          const commitIndex = findCommitForPendingSession();
          if (commitIndex < 0) return false;
          const [commitUpdate] = pendingUpdates.splice(commitIndex, 1);
          if (!commitUpdate || commitUpdate.type !== 'commit') return false;
          deliverCommit(commitUpdate.commit);
          return true;
        }

        if (isSessionResolvable(currentSession, first.commit.after)) {
          pendingUpdates.shift();
          deliverCommit(first.commit);
          return true;
        }
        const sessionIndex = findSessionBeforeNextCommit();
        if (sessionIndex < 0) return false;
        const [sessionUpdate] = pendingUpdates.splice(sessionIndex, 1);
        if (!sessionUpdate || sessionUpdate.type !== 'session') return false;
        deliverSession(sessionUpdate.snapshot);
        return true;
      };

      const drainUpdates = (): void => {
        if (draining || disposed) return;
        draining = true;
        try {
          while (deliverNextUpdate()) {
            // Keep draining until the first pending cross-channel dependency is unresolved.
          }
        } catch (error) {
          pendingUpdates.length = 0;
          reportSyncFault(error);
        } finally {
          draining = false;
        }
      };

      const enqueueUpdate = (update: PendingRendererUpdate): void => {
        pendingUpdates.push(update);
        drainUpdates();
      };

      stopKernel = kernel.observeCommits((commit) => {
        if (!disposed) enqueueUpdate({ type: 'commit', commit });
      });
      stopSession = session.subscribe(() => {
        if (!disposed) enqueueUpdate({ type: 'session', snapshot: session.getSnapshot() });
      });

      context.own(() => {
        if (disposed) return;
        disposed = true;
        pendingUpdates.length = 0;
        const cleanupErrors: unknown[] = [];
        for (const stop of [stopSession, stopKernel, ...inputSubscriptions]) {
          try {
            stop();
          } catch (error) {
            cleanupErrors.push(error);
          }
        }
        inputSubscriptions.clear();
        if (cleanupErrors.length > 0) {
          throw new AggregateError(cleanupErrors, 'Renderer Runtime subscription cleanup failed.');
        }
      });

      resetToCurrentState();

      const service: RendererService = Object.freeze({
        subscribeInput(listener: RendererInputListener): () => void {
          assertActive();
          if (typeof listener !== 'function') {
            throw new RendererError('INVALID_INPUT_SUBSCRIBER', 'Renderer Input listener must be a function.', {
              receivedType: describeReceivedType(listener),
            });
          }
          let active = true;
          const stopRenderer = renderer.subscribeInput((input) => {
            if (!active || disposed) return;
            try {
              listener(input);
            } catch (error) {
              context.diagnostics.reportFault(error, {
                name: rendererDiagnosticEvents.inputListenerFault,
                attributes: { inputType: input.type },
              });
            }
          });
          const stop = (): void => {
            if (!active) return;
            active = false;
            inputSubscriptions.delete(stop);
            stopRenderer();
          };
          inputSubscriptions.add(stop);
          return stop;
        },
        hitTest(point: ScreenPoint) {
          assertActive();
          return renderer.hitTest(point);
        },
        capturePointer(pointerId: number) {
          assertActive();
          renderer.capturePointer(pointerId);
        },
        releasePointer(pointerId: number) {
          assertActive();
          renderer.releasePointer(pointerId);
        },
        focus() {
          assertActive();
          renderer.focus();
        },
      });

      return { renderer: service };
    },
  });
}

function isSessionResolvable(snapshot: SessionSnapshot, view: CanvasView): boolean {
  return (
    snapshot.selection.nodeIds.every((id) => view.query.getNode(id) !== undefined) &&
    snapshot.selection.edgeIds.every((id) => view.query.getEdge(id) !== undefined)
  );
}

function assertSessionResolvable(snapshot: SessionSnapshot, view: CanvasView): void {
  if (isSessionResolvable(snapshot, view)) return;
  throw new RendererError(
    'INVALID_SESSION_SNAPSHOT',
    'Renderer Session Snapshot references entities outside the current Document.',
    { documentRevision: view.snapshot.revision },
  );
}

function describeReceivedType(value: unknown): string {
  return value === null ? 'null' : typeof value;
}
