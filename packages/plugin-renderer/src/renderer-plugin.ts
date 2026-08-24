import type { CanvasCommit, CanvasView } from '@nodebraid/kernel';
import type { InteractionProjection } from '@nodebraid/interaction-api';
import { kernelService } from '@nodebraid/plugin-kernel';
import { sessionService, type SessionSnapshot } from '@nodebraid/plugin-session';
import {
  RendererError,
  type RendererFactory,
  type RendererInputListener,
  type ScreenPoint,
} from '@nodebraid/renderer-api';
import { definePlugin, defineService } from '@nodebraid/runtime-cordis';

import type { InteractionProjectionBinding, RendererService } from './contracts';
import { rendererDiagnosticEvents } from './diagnostic-events';
import { RendererPluginError } from './renderer-plugin-error';

export const rendererService = defineService<RendererService>('renderer');

type PendingRendererUpdate =
  | { readonly type: 'commit'; readonly commit: CanvasCommit }
  | { readonly type: 'session'; readonly snapshot: SessionSnapshot };

export function createRendererPlugin<Config>(factory: RendererFactory<Config>) {
  if (typeof factory !== 'function') throw new TypeError('Renderer Factory must be a function.');

  return definePlugin({
    name: '@nodebraid/plugin-renderer',
    requires: { kernel: kernelService, session: sessionService },
    provides: { renderer: rendererService },
    async setup(context, config: Config) {
      const kernel = context.services.kernel;
      const session = context.services.session;
      const renderer = await factory(config);
      context.own(() => renderer.dispose());
      context.signal.throwIfAborted();

      let disposed = false;
      let syncFailure: RendererPluginError | undefined;
      let draining = false;
      let deliveredView: CanvasView | undefined;
      let deliveredSession: SessionSnapshot | undefined;
      // A reset may jump ahead of Commit callbacks already queued by Kernel dispatch.
      let resetThroughRevision: number | undefined;
      const pendingUpdates: PendingRendererUpdate[] = [];
      const inputSubscriptions = new Set<() => void>();
      let interactionBindingActive = false;
      let stopKernel = (): void => undefined;
      let stopSession = (): void => undefined;

      const assertActive = (): void => {
        if (disposed) {
          throw new RendererPluginError('SERVICE_DISPOSED', 'Renderer Service Activation has been disposed.');
        }
      };

      const assertOperational = (): void => {
        assertActive();
        if (syncFailure) throw syncFailure;
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
          throw new RendererError('DOCUMENT_OUT_OF_SYNC', 'Renderer Commit is not contiguous with its Baseline.', {
            expectedRevision,
            receivedRevision,
          });
        }
        renderer.updateDocument({ type: 'commit', commit });
        deliveredView = commit.after;
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
        if (draining || disposed || syncFailure) return;
        draining = true;
        try {
          while (deliverNextUpdate()) {
            // Keep draining until the first pending cross-channel dependency is unresolved.
          }
        } catch (error) {
          pendingUpdates.length = 0;
          reportSyncFault(error);
          try {
            resetToCurrentState(true);
          } catch (recoveryError) {
            syncFailure = new RendererPluginError(
              'SYNC_FAILED',
              'Renderer synchronization and its single full recovery both failed.',
              {},
              {
                cause: new AggregateError([error, recoveryError], 'Renderer synchronization and recovery both failed.'),
              },
            );
            reportSyncFault(syncFailure);
          }
        } finally {
          draining = false;
        }
      };

      const enqueueUpdate = (update: PendingRendererUpdate): void => {
        if (syncFailure) return;
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
        bindInteractionProjection(): InteractionProjectionBinding {
          assertOperational();
          if (interactionBindingActive) {
            throw new RendererPluginError(
              'INTERACTION_ALREADY_BOUND',
              'Renderer Service already has an Interaction Projection Binding.',
            );
          }
          interactionBindingActive = true;
          let bindingDisposed = false;
          return Object.freeze({
            update(projection: InteractionProjection | null): void {
              assertOperational();
              if (bindingDisposed) {
                throw new RendererPluginError(
                  'INTERACTION_BINDING_DISPOSED',
                  'Interaction Projection Binding has been disposed.',
                );
              }
              renderer.updateInteraction(projection);
            },
            dispose(): void {
              if (bindingDisposed) return;
              bindingDisposed = true;
              renderer.updateInteraction(null);
              interactionBindingActive = false;
            },
          });
        },
        subscribeInput(listener: RendererInputListener): () => void {
          assertOperational();
          if (typeof listener !== 'function') {
            throw new RendererError('INVALID_INPUT_SUBSCRIBER', 'Renderer Input listener must be a function.', {
              receivedType: describeReceivedType(listener),
            });
          }
          let active = true;
          const stopRenderer = renderer.subscribeInput((input) => {
            if (!active || disposed || syncFailure) return;
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
          assertOperational();
          return renderer.hitTest(point);
        },
        capturePointer(pointerId: number) {
          assertOperational();
          renderer.capturePointer(pointerId);
        },
        releasePointer(pointerId: number) {
          assertOperational();
          renderer.releasePointer(pointerId);
        },
        focus() {
          assertOperational();
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
