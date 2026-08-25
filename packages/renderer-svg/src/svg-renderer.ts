import type { InteractionProjection } from '@nodebraid/interaction-api';
import type { CanvasSnapshot } from '@nodebraid/kernel';
import {
  RendererError,
  type CanvasRenderer,
  type RendererDocumentUpdate,
  type RendererInput,
  type RendererInputListener,
  type ScreenPoint,
} from '@nodebraid/renderer-api';
import type { SessionSnapshot } from '@nodebraid/session-api';

import type { SvgRendererConfig } from './contracts';
import { hitTestProjection } from './hit-test';
import {
  applyDomEventPolicy,
  assertActivePointer,
  normalizeKeyboardInput,
  normalizePointerInput,
  normalizeWheelInput,
  releaseNativePointerCapture,
} from './input-normalization';
import {
  cloneCanvasSnapshot,
  cloneSessionSnapshot,
  validateRendererDocumentUpdate,
  validateSessionSnapshot,
} from './renderer-state';
import { normalizeInputPolicies, validateConfig } from './svg-config';
import {
  applyCommit,
  applyBoxSelection,
  applyConnectionPreview,
  applyNodeDragProjection,
  clearConnectionPreview,
  clearBoxSelection,
  createSvgElement,
  DomMutationJournal,
  ProjectionRollbackError,
  renderReset,
  setElementAttribute,
  setSelected,
} from './svg-projection';
import { SvgRendererError } from './svg-renderer-error';
import { type AffineMatrix, formatSvgMatrix, readTargetMatrix } from './target-mapping';

const targetReservations = new WeakSet<SVGSVGElement>();

export function createSvgRenderer(config: Readonly<SvgRendererConfig>): CanvasRenderer {
  const target = validateConfig(config);
  const edgeHitTolerance = config.edgeHitTolerance ?? 4;
  const connectionAnchorHitTolerance = config.connectionAnchorHitTolerance ?? 8;
  const inputPolicies = normalizeInputPolicies(config.input);
  readTargetMatrix(target, 'INVALID_TARGET');
  if (targetReservations.has(target) || target.querySelector(':scope > [data-nodebraid-renderer-svg-root]')) {
    throw new SvgRendererError('TARGET_OCCUPIED', 'SVG Renderer Target is already reserved.');
  }

  const document = target.ownerDocument;
  const addedTabIndex = !target.hasAttribute('tabindex');
  if (addedTabIndex) target.setAttribute('tabindex', '-1');
  const projection = createSvgElement(document, 'g');
  projection.setAttribute('class', 'nodebraid-renderer-svg');
  projection.setAttribute('data-nodebraid-renderer-svg-root', '');
  const edgesLayer = createSvgElement(document, 'g');
  edgesLayer.setAttribute('class', 'nodebraid-renderer-svg__edges');
  const nodesLayer = createSvgElement(document, 'g');
  nodesLayer.setAttribute('class', 'nodebraid-renderer-svg__nodes');
  const interactionLayer = createSvgElement(document, 'g');
  interactionLayer.setAttribute('class', 'nodebraid-renderer-svg__interaction');
  projection.append(edgesLayer, nodesLayer, interactionLayer);

  targetReservations.add(target);
  try {
    target.append(projection);
  } catch (error) {
    targetReservations.delete(target);
    if (addedTabIndex) target.removeAttribute('tabindex');
    throw error;
  }

  let disposed = false;
  let acceptedSession: SessionSnapshot | undefined;
  let acceptedInteraction: InteractionProjection | null = null;
  let baselineSnapshot: CanvasSnapshot | undefined;
  let projectionOutOfSync = false;
  let observedResizeError: unknown;
  let disposePromise: Promise<void> | undefined;
  const inputListeners = new Set<RendererInputListener>();
  const inputQueue: RendererInput[] = [];
  const activePointerIds = new Set<number>();
  const capturedPointerIds = new Set<number>();
  let inputDraining = false;

  const assertActive = (): void => {
    if (disposed) throw new RendererError('RENDERER_DISPOSED', 'SVG Renderer Instance has been disposed.');
  };

  const throwProjectionOutOfSync = (receivedRevision?: number): never => {
    throw new RendererError('DOCUMENT_OUT_OF_SYNC', 'SVG Renderer requires reset after DOM rollback failure.', {
      issue: 'PROJECTION_ROLLBACK_FAILED',
      expectedRevision: baselineSnapshot?.revision ?? null,
      ...(receivedRevision === undefined ? {} : { receivedRevision }),
    });
  };

  const assertProjectionSynchronized = (): void => {
    if (projectionOutOfSync) throwProjectionOutOfSync();
  };

  const applySession = (
    snapshot: SessionSnapshot,
    journal?: DomMutationJournal,
    acceptedTargetMatrix?: AffineMatrix,
  ): void => {
    const { x, y, zoom } = snapshot.viewport;
    const localToUser = acceptedTargetMatrix ?? readTargetMatrix(target, 'TARGET_UNAVAILABLE');
    const selectedNodeIds = new Set<string>(snapshot.selection.nodeIds);
    const selectedEdgeIds = new Set<string>(snapshot.selection.edgeIds);
    for (const node of nodesLayer.querySelectorAll<SVGRectElement>('[data-nodebraid-node-id]')) {
      setSelected(node, selectedNodeIds.has(node.getAttribute('data-nodebraid-node-id') ?? ''), journal);
    }
    for (const edge of edgesLayer.querySelectorAll<SVGLineElement>('[data-nodebraid-edge-id]')) {
      setSelected(edge, selectedEdgeIds.has(edge.getAttribute('data-nodebraid-edge-id') ?? ''), journal);
    }
    const matrix: AffineMatrix = {
      a: localToUser.a * zoom,
      b: localToUser.b * zoom,
      c: localToUser.c * zoom,
      d: localToUser.d * zoom,
      e: localToUser.a * x + localToUser.c * y + localToUser.e,
      f: localToUser.b * x + localToUser.d * y + localToUser.f,
    };
    setElementAttribute(projection, 'transform', formatSvgMatrix(matrix), journal);
  };

  const refreshProjectionMapping = (): AffineMatrix => {
    assertProjectionSynchronized();
    const targetMatrix = readTargetMatrix(target, 'TARGET_UNAVAILABLE');
    if (!acceptedSession) return targetMatrix;
    const journal = new DomMutationJournal(edgesLayer, nodesLayer);
    try {
      applySession(createEffectiveSession(acceptedSession, acceptedInteraction), journal, targetMatrix);
      return targetMatrix;
    } catch (error) {
      const rollbackErrors = journal.rollback();
      if (rollbackErrors.length > 0) {
        projectionOutOfSync = true;
        throw new ProjectionRollbackError([error, ...rollbackErrors]);
      }
      throw error;
    }
  };

  const window = target.ownerDocument.defaultView;
  if (!window?.ResizeObserver) {
    projection.remove();
    targetReservations.delete(target);
    if (addedTabIndex) target.removeAttribute('tabindex');
    throw new SvgRendererError('INVALID_TARGET', 'SVG Renderer Target environment requires ResizeObserver.');
  }
  const resizeObserver = new window.ResizeObserver(() => {
    if (disposed || !acceptedSession || projectionOutOfSync) return;
    const journal = new DomMutationJournal(edgesLayer, nodesLayer);
    try {
      applySession(createEffectiveSession(acceptedSession, acceptedInteraction), journal);
      if (isTargetUnavailableError(observedResizeError)) observedResizeError = undefined;
    } catch (error) {
      const rollbackErrors = journal.rollback();
      const nextError = rollbackErrors.length === 0 ? error : new ProjectionRollbackError([error, ...rollbackErrors]);
      observedResizeError =
        observedResizeError === undefined || isTargetUnavailableError(observedResizeError)
          ? nextError
          : new AggregateError(
              [observedResizeError, nextError],
              'Multiple SVG Renderer ResizeObserver updates failed.',
            );
      if (rollbackErrors.length > 0) projectionOutOfSync = true;
    }
  });
  resizeObserver.observe(target);

  const assertNoObservedResizeError = (): void => {
    if (observedResizeError === undefined) return;
    const error = observedResizeError;
    if (isTargetUnavailableError(error)) {
      try {
        readTargetMatrix(target, 'TARGET_UNAVAILABLE');
      } catch {
        throw error;
      }
      observedResizeError = undefined;
      return;
    }
    observedResizeError = undefined;
    throw error;
  };

  const emitInput = (input: RendererInput): void => {
    inputQueue.push(input);
    if (inputDraining) return;
    inputDraining = true;
    const errors: unknown[] = [];
    try {
      while (inputQueue.length > 0) {
        const next = inputQueue.shift();
        if (!next) continue;
        for (const listener of Array.from(inputListeners)) {
          try {
            listener(next);
          } catch (error) {
            errors.push(error);
          }
        }
      }
    } finally {
      inputDraining = false;
    }
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) throw new AggregateError(errors, 'SVG Renderer Input listeners failed.');
  };
  const handlePointer = (event: PointerEvent): void => {
    if (disposed) return;
    const endsPointer = event.type === 'pointerup' || event.type === 'pointercancel';
    let handlingFailed = false;
    let handlingError: unknown;
    try {
      assertNoObservedResizeError();
      assertProjectionSynchronized();
      applyDomEventPolicy(event, inputPolicies.pointer);
      if (!baselineSnapshot || !acceptedSession) {
        throw new RendererError('INVALID_SESSION_SNAPSHOT', 'SVG Renderer Input requires Document and Session state.', {
          issue: 'RENDERER_STATE_INCOMPLETE',
        });
      }
      refreshProjectionMapping();
      if (event.type === 'pointerdown') activePointerIds.add(event.pointerId);
      emitInput(normalizePointerInput(event, target, createEffectiveSession(acceptedSession, acceptedInteraction)));
    } catch (error) {
      handlingFailed = true;
      handlingError = error;
    }
    let cleanupFailed = false;
    let cleanupError: unknown;
    if (endsPointer) {
      try {
        releaseNativePointerCapture(target, event.pointerId, capturedPointerIds);
      } catch (error) {
        cleanupFailed = true;
        cleanupError = error;
      } finally {
        activePointerIds.delete(event.pointerId);
      }
    }
    if (handlingFailed && cleanupFailed) {
      throw new AggregateError([handlingError, cleanupError], 'SVG Renderer Pointer handling and cleanup both failed.');
    }
    if (handlingFailed) throw handlingError;
    if (cleanupFailed) throw cleanupError;
  };
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'] as const) {
    target.addEventListener(type, handlePointer);
  }
  const handleLostPointerCapture = (event: PointerEvent): void => {
    if (disposed || !capturedPointerIds.has(event.pointerId)) return;
    capturedPointerIds.delete(event.pointerId);
    if (!activePointerIds.has(event.pointerId)) return;
    try {
      assertNoObservedResizeError();
      assertProjectionSynchronized();
      if (!baselineSnapshot || !acceptedSession) {
        throw new RendererError('INVALID_SESSION_SNAPSHOT', 'SVG Renderer Input requires Document and Session state.', {
          issue: 'RENDERER_STATE_INCOMPLETE',
        });
      }
      refreshProjectionMapping();
      emitInput(
        normalizePointerInput(
          event,
          target,
          createEffectiveSession(acceptedSession, acceptedInteraction),
          'pointer.cancel',
        ),
      );
    } finally {
      activePointerIds.delete(event.pointerId);
    }
  };
  target.addEventListener('lostpointercapture', handleLostPointerCapture);
  const handleWheel = (event: WheelEvent): void => {
    if (disposed) return;
    assertNoObservedResizeError();
    assertProjectionSynchronized();
    applyDomEventPolicy(event, inputPolicies.wheel);
    if (!baselineSnapshot || !acceptedSession) {
      throw new RendererError('INVALID_SESSION_SNAPSHOT', 'SVG Renderer Input requires Document and Session state.', {
        issue: 'RENDERER_STATE_INCOMPLETE',
      });
    }
    refreshProjectionMapping();
    emitInput(normalizeWheelInput(event, target, createEffectiveSession(acceptedSession, acceptedInteraction)));
  };
  const handleKeyboard = (event: KeyboardEvent): void => {
    if (disposed) return;
    assertNoObservedResizeError();
    assertProjectionSynchronized();
    applyDomEventPolicy(event, inputPolicies.keyboard);
    if (target.ownerDocument.activeElement !== target) return;
    if (!baselineSnapshot || !acceptedSession) {
      throw new RendererError('INVALID_SESSION_SNAPSHOT', 'SVG Renderer Input requires Document and Session state.', {
        issue: 'RENDERER_STATE_INCOMPLETE',
      });
    }
    refreshProjectionMapping();
    emitInput(normalizeKeyboardInput(event));
  };
  const handleContextMenu = (event: MouseEvent): void => {
    if (disposed) return;
    assertNoObservedResizeError();
    assertProjectionSynchronized();
    applyDomEventPolicy(event, inputPolicies.contextMenu);
  };
  const handleFocus = (event: FocusEvent): void => {
    if (disposed) return;
    assertNoObservedResizeError();
    assertProjectionSynchronized();
    emitInput(Object.freeze({ type: event.type === 'focus' ? 'focus.gained' : 'focus.lost' }));
  };
  target.addEventListener('wheel', handleWheel, { passive: false });
  target.addEventListener('keydown', handleKeyboard);
  target.addEventListener('keyup', handleKeyboard);
  target.addEventListener('contextmenu', handleContextMenu);
  target.addEventListener('focus', handleFocus);
  target.addEventListener('blur', handleFocus);

  const renderer: CanvasRenderer = Object.freeze({
    updateDocument(update: RendererDocumentUpdate): void {
      assertActive();
      const acceptedUpdate = validateRendererDocumentUpdate(update);
      assertNoObservedResizeError();
      if (acceptedUpdate.type === 'reset') {
        if (acceptedSession) validateSessionSnapshot(acceptedSession, acceptedUpdate.view.snapshot);
        const targetMatrix = readTargetMatrix(target, 'TARGET_UNAVAILABLE');
        const nextBaseline = cloneCanvasSnapshot(acceptedUpdate.view.snapshot);
        const journal = new DomMutationJournal(edgesLayer, nodesLayer, interactionLayer);
        try {
          renderReset(acceptedUpdate.view, document, edgesLayer, nodesLayer, interactionLayer);
          if (acceptedSession) applySession(acceptedSession, journal, targetMatrix);
        } catch (error) {
          const rollbackErrors = journal.rollback();
          if (rollbackErrors.length > 0) {
            projectionOutOfSync = true;
            throw new ProjectionRollbackError([error, ...rollbackErrors]);
          }
          throw error;
        }
        baselineSnapshot = nextBaseline;
        acceptedInteraction = null;
        projectionOutOfSync = false;
        observedResizeError = undefined;
      } else {
        if (projectionOutOfSync) throwProjectionOutOfSync(acceptedUpdate.commit.before.snapshot.revision);
        const targetMatrix = readTargetMatrix(target, 'TARGET_UNAVAILABLE');
        const session = acceptedSession;
        const nextInteraction = isInteractionCompatibleWithDocument(
          acceptedInteraction,
          acceptedUpdate.commit.after.snapshot,
        )
          ? acceptedInteraction
          : null;
        try {
          applyCommit(
            acceptedUpdate.commit,
            baselineSnapshot,
            session,
            document,
            edgesLayer,
            nodesLayer,
            interactionLayer,
            (journal) => {
              if (session) applySession(createEffectiveSession(session, nextInteraction), journal, targetMatrix);
              if (acceptedInteraction?.type === 'node-drag' && nextInteraction === null) {
                applyNodeDragProjection(
                  {
                    type: 'node-drag',
                    nodes: acceptedUpdate.commit.after.snapshot.nodes.map((node) => ({
                      nodeId: node.id,
                      basePosition: node.position,
                      position: node.position,
                    })),
                  },
                  acceptedUpdate.commit.after.snapshot,
                  edgesLayer,
                  nodesLayer,
                  journal,
                );
              }
              if (nextInteraction?.type === 'node-drag') {
                applyNodeDragProjection(
                  nextInteraction,
                  acceptedUpdate.commit.after.snapshot,
                  edgesLayer,
                  nodesLayer,
                  journal,
                );
              } else if (nextInteraction?.type === 'connection-preview') {
                applyConnectionPreview(
                  nextInteraction,
                  acceptedUpdate.commit.after.snapshot,
                  interactionLayer,
                  journal,
                );
              } else if (acceptedInteraction?.type === 'connection-preview') {
                clearConnectionPreview(interactionLayer);
              } else if (nextInteraction?.type === 'box-selection') {
                applyBoxSelection(nextInteraction, interactionLayer, journal);
              } else if (acceptedInteraction?.type === 'box-selection') {
                clearBoxSelection(interactionLayer);
              }
            },
          );
        } catch (error) {
          if (error instanceof ProjectionRollbackError) projectionOutOfSync = true;
          throw error;
        }
        baselineSnapshot = cloneCanvasSnapshot(acceptedUpdate.commit.after.snapshot);
        acceptedInteraction = nextInteraction;
      }
    },
    updateSession(snapshot: SessionSnapshot): void {
      assertActive();
      assertNoObservedResizeError();
      assertProjectionSynchronized();
      if (!baselineSnapshot) {
        throw new RendererError('INVALID_SESSION_SNAPSHOT', 'SVG Renderer Session requires a Document Baseline.', {
          issue: 'DOCUMENT_BASELINE_MISSING',
        });
      }
      validateSessionSnapshot(snapshot, baselineSnapshot);
      const accepted = cloneSessionSnapshot(snapshot);
      const nextInteraction =
        acceptedInteraction?.type === 'viewport-pan' &&
        (accepted.viewport.x !== acceptedInteraction.baseViewport.x ||
          accepted.viewport.y !== acceptedInteraction.baseViewport.y ||
          accepted.viewport.zoom !== acceptedInteraction.baseViewport.zoom)
          ? null
          : acceptedInteraction;
      const journal = new DomMutationJournal(edgesLayer, nodesLayer, interactionLayer);
      try {
        applySession(createEffectiveSession(accepted, nextInteraction), journal);
      } catch (error) {
        const rollbackErrors = journal.rollback();
        if (rollbackErrors.length > 0) {
          projectionOutOfSync = true;
          throw new ProjectionRollbackError([error, ...rollbackErrors]);
        }
        throw error;
      }
      acceptedSession = accepted;
      acceptedInteraction = nextInteraction;
    },
    updateInteraction(projection: InteractionProjection | null): void {
      assertActive();
      assertNoObservedResizeError();
      assertProjectionSynchronized();
      if (!baselineSnapshot || !acceptedSession) {
        throw new RendererError(
          'INVALID_SESSION_SNAPSHOT',
          'SVG Renderer Interaction Projection requires Document and Session state.',
          { issue: 'RENDERER_STATE_INCOMPLETE' },
        );
      }
      if (projection !== null) {
        assertInteractionProjectionType(projection);
        assertInteractionProjectionBaseline(projection, baselineSnapshot, acceptedSession);
      }
      const accepted = projection === null ? null : cloneInteractionProjection(projection);
      const journal = new DomMutationJournal(edgesLayer, nodesLayer, interactionLayer);
      try {
        if (acceptedInteraction?.type === 'node-drag') {
          applyNodeDragProjection(
            {
              type: 'node-drag',
              nodes: baselineSnapshot.nodes.map((node) => ({
                nodeId: node.id,
                basePosition: node.position,
                position: node.position,
              })),
            },
            baselineSnapshot,
            edgesLayer,
            nodesLayer,
            journal,
          );
        } else if (acceptedInteraction?.type === 'viewport-pan') {
          applySession(acceptedSession, journal);
        } else if (acceptedInteraction?.type === 'connection-preview' && accepted?.type !== 'connection-preview') {
          clearConnectionPreview(interactionLayer);
        } else if (acceptedInteraction?.type === 'box-selection' && accepted?.type !== 'box-selection') {
          clearBoxSelection(interactionLayer);
        }
        if (accepted?.type === 'viewport-pan') {
          applySession({ selection: acceptedSession.selection, viewport: accepted.viewport }, journal);
        } else if (accepted?.type === 'node-drag') {
          applyNodeDragProjection(accepted, baselineSnapshot, edgesLayer, nodesLayer, journal);
        } else if (accepted?.type === 'connection-preview') {
          applyConnectionPreview(accepted, baselineSnapshot, interactionLayer, journal);
        } else if (accepted?.type === 'box-selection') {
          applyBoxSelection(accepted, interactionLayer, journal);
        }
      } catch (error) {
        const rollbackErrors = journal.rollback();
        if (rollbackErrors.length > 0) {
          projectionOutOfSync = true;
          throw new ProjectionRollbackError([error, ...rollbackErrors]);
        }
        throw error;
      }
      acceptedInteraction = accepted;
    },
    subscribeInput(listener: RendererInputListener): () => void {
      assertActive();
      assertNoObservedResizeError();
      assertProjectionSynchronized();
      if (typeof listener !== 'function') {
        throw new RendererError('INVALID_INPUT_SUBSCRIBER', 'SVG Renderer Input listener must be a function.');
      }
      inputListeners.add(listener);
      let subscribed = true;
      return () => {
        if (!subscribed) return;
        subscribed = false;
        inputListeners.delete(listener);
      };
    },
    hitTest(point: ScreenPoint) {
      assertActive();
      assertNoObservedResizeError();
      assertProjectionSynchronized();
      if (!baselineSnapshot || !acceptedSession) {
        throw new RendererError(
          'INVALID_SESSION_SNAPSHOT',
          'SVG Renderer Hit Test requires Document and Session state.',
          {
            issue: 'RENDERER_STATE_INCOMPLETE',
          },
        );
      }
      refreshProjectionMapping();
      return hitTestProjection(
        point,
        target,
        createEffectiveSnapshot(baselineSnapshot, acceptedInteraction),
        createEffectiveSession(acceptedSession, acceptedInteraction),
        edgeHitTolerance,
        connectionAnchorHitTolerance,
      );
    },
    capturePointer(pointerId: number): void {
      assertActive();
      assertNoObservedResizeError();
      assertProjectionSynchronized();
      assertActivePointer(pointerId, activePointerIds);
      if (capturedPointerIds.has(pointerId)) return;
      target.setPointerCapture(pointerId);
      capturedPointerIds.add(pointerId);
    },
    releasePointer(pointerId: number): void {
      assertActive();
      assertNoObservedResizeError();
      assertProjectionSynchronized();
      assertActivePointer(pointerId, activePointerIds);
      releaseNativePointerCapture(target, pointerId, capturedPointerIds);
    },
    focus(): void {
      assertActive();
      assertNoObservedResizeError();
      assertProjectionSynchronized();
      readTargetMatrix(target, 'TARGET_UNAVAILABLE');
      target.focus({ preventScroll: true });
      if (target.ownerDocument.activeElement !== target) {
        throw new SvgRendererError('TARGET_UNAVAILABLE', 'SVG Renderer Target could not receive Focus.');
      }
    },
    dispose(): Promise<void> {
      if (disposePromise) return disposePromise;
      disposed = true;
      inputQueue.length = 0;
      inputListeners.clear();
      disposePromise = Promise.resolve().then(() => {
        const cleanupErrors: unknown[] = [];
        for (const pointerId of Array.from(capturedPointerIds)) {
          attemptCleanup(cleanupErrors, () => releaseNativePointerCapture(target, pointerId, capturedPointerIds));
        }
        activePointerIds.clear();
        for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'] as const) {
          attemptCleanup(cleanupErrors, () => target.removeEventListener(type, handlePointer));
        }
        attemptCleanup(cleanupErrors, () => target.removeEventListener('lostpointercapture', handleLostPointerCapture));
        attemptCleanup(cleanupErrors, () => target.removeEventListener('wheel', handleWheel));
        attemptCleanup(cleanupErrors, () => target.removeEventListener('keydown', handleKeyboard));
        attemptCleanup(cleanupErrors, () => target.removeEventListener('keyup', handleKeyboard));
        attemptCleanup(cleanupErrors, () => target.removeEventListener('contextmenu', handleContextMenu));
        attemptCleanup(cleanupErrors, () => target.removeEventListener('focus', handleFocus));
        attemptCleanup(cleanupErrors, () => target.removeEventListener('blur', handleFocus));
        attemptCleanup(cleanupErrors, () => resizeObserver.disconnect());
        attemptCleanup(cleanupErrors, () => projection.remove());
        if (addedTabIndex) attemptCleanup(cleanupErrors, () => target.removeAttribute('tabindex'));
        if (cleanupErrors.length > 0) throw new AggregateError(cleanupErrors, 'SVG Renderer cleanup failed.');
        targetReservations.delete(target);
      });
      return disposePromise;
    },
  });

  return renderer;
}

function attemptCleanup(errors: unknown[], cleanup: () => void): void {
  try {
    cleanup();
  } catch (error) {
    errors.push(error);
  }
}

function isTargetUnavailableError(error: unknown): error is SvgRendererError {
  return error instanceof SvgRendererError && error.code === 'TARGET_UNAVAILABLE';
}

function createEffectiveSnapshot(baseline: CanvasSnapshot, interaction: InteractionProjection | null): CanvasSnapshot {
  if (interaction?.type !== 'node-drag') return baseline;
  const candidates = new Map(interaction.nodes.map((candidate) => [candidate.nodeId, candidate.position]));
  return {
    revision: baseline.revision,
    nodes: baseline.nodes.map((node) => {
      const position = candidates.get(node.id);
      return position ? { ...node, position } : node;
    }),
    edges: baseline.edges,
  };
}

function createEffectiveSession(session: SessionSnapshot, interaction: InteractionProjection | null): SessionSnapshot {
  return interaction?.type === 'viewport-pan'
    ? { selection: session.selection, viewport: interaction.viewport }
    : session;
}

function cloneInteractionProjection(projection: InteractionProjection): InteractionProjection {
  if (projection.type === 'viewport-pan') {
    return Object.freeze({
      type: 'viewport-pan',
      baseViewport: Object.freeze({ ...projection.baseViewport }),
      viewport: Object.freeze({ ...projection.viewport }),
    });
  }
  if (projection.type === 'connection-preview') {
    return Object.freeze({
      type: 'connection-preview',
      source: Object.freeze({ ...projection.source }),
      pointerWorldPoint: Object.freeze({ ...projection.pointerWorldPoint }),
      target:
        projection.target.type === 'none'
          ? Object.freeze({ type: 'none' as const })
          : Object.freeze({
              type: projection.target.type,
              anchor: Object.freeze({ ...projection.target.anchor }),
            }),
    });
  }
  if (projection.type === 'box-selection') {
    return Object.freeze({ type: 'box-selection', rect: Object.freeze({ ...projection.rect }) });
  }
  return Object.freeze({
    type: 'node-drag',
    nodes: Object.freeze(
      projection.nodes.map((candidate) =>
        Object.freeze({
          nodeId: candidate.nodeId,
          basePosition: Object.freeze({ ...candidate.basePosition }),
          position: Object.freeze({ ...candidate.position }),
        }),
      ),
    ),
  });
}

function assertInteractionProjectionBaseline(
  projection: InteractionProjection,
  document: CanvasSnapshot,
  session: SessionSnapshot,
): void {
  if (projection.type === 'viewport-pan') {
    assertInteractionViewport('baseViewport', projection.baseViewport);
    assertInteractionViewport('viewport', projection.viewport);
    if (viewportsEqual(projection.baseViewport, session.viewport)) return;
    throw new RendererError('INTERACTION_OUT_OF_SYNC', 'Interaction Projection Viewport Baseline is stale.', {
      issue: 'VIEWPORT_MISMATCH',
    });
  }
  if (projection.type === 'connection-preview') {
    assertInteractionPoint('pointerWorldPoint', projection.pointerWorldPoint);
    assertConnectionAnchorBaseline(projection.source, 'source', document);
    if (projection.target.type !== 'none') {
      assertConnectionAnchorBaseline(projection.target.anchor, 'target', document);
    }
    return;
  }
  if (projection.type === 'box-selection') {
    for (const field of ['x', 'y', 'width', 'height'] as const) {
      const value = projection.rect[field];
      if (Number.isFinite(value) && ((field !== 'width' && field !== 'height') || value > 0)) continue;
      throw new RendererError('INVALID_INTERACTION_PROJECTION', 'Box Selection rect must be finite and non-empty.', {
        issue: 'INVALID_BOX_SELECTION_RECT',
        field: `rect.${field}`,
      });
    }
    return;
  }
  if (projection.nodes.length === 0) {
    throw new RendererError(
      'INVALID_INTERACTION_PROJECTION',
      'Node Drag Interaction Projection requires at least one Node.',
      { issue: 'EMPTY_NODE_DRAG' },
    );
  }
  const nodes = new Map(document.nodes.map((node) => [node.id, node]));
  const seenNodeIds = new Set<string>();
  let previousNodeId: string | undefined;
  for (const candidate of projection.nodes) {
    if (seenNodeIds.has(candidate.nodeId)) {
      throw new RendererError('INVALID_INTERACTION_PROJECTION', 'Interaction Projection Node IDs must be unique.', {
        issue: 'DUPLICATE_NODE',
      });
    }
    seenNodeIds.add(candidate.nodeId);
    if (previousNodeId !== undefined && previousNodeId > candidate.nodeId) {
      throw new RendererError(
        'INVALID_INTERACTION_PROJECTION',
        'Interaction Projection Node IDs must use canonical order.',
        { issue: 'NON_CANONICAL_NODE_ORDER' },
      );
    }
    previousNodeId = candidate.nodeId;
    for (const [field, value] of [
      ['basePosition.x', candidate.basePosition.x],
      ['basePosition.y', candidate.basePosition.y],
      ['position.x', candidate.position.x],
      ['position.y', candidate.position.y],
    ] as const) {
      if (Number.isFinite(value)) continue;
      throw new RendererError(
        'INVALID_INTERACTION_PROJECTION',
        'Interaction Projection Node positions must be finite.',
        { issue: 'INVALID_NODE_POSITION', field },
      );
    }
    const node = nodes.get(candidate.nodeId);
    if (node && node.position.x === candidate.basePosition.x && node.position.y === candidate.basePosition.y) {
      continue;
    }
    throw new RendererError('INTERACTION_OUT_OF_SYNC', 'Interaction Projection Node Baseline is stale.', {
      issue: 'NODE_POSITION_MISMATCH',
    });
  }
}

function assertConnectionAnchorBaseline(
  anchor: Readonly<{ nodeId: string; role: 'source' | 'target' }>,
  role: 'source' | 'target',
  document: CanvasSnapshot,
): void {
  if (anchor.role !== role) {
    throw new RendererError('INVALID_INTERACTION_PROJECTION', 'Connection Anchor role is invalid.', {
      issue: 'INVALID_CONNECTION_ANCHOR_ROLE',
    });
  }
  const node = document.nodes.find((candidate) => candidate.id === anchor.nodeId);
  if (node?.size && node.size.width > 0 && node.size.height > 0) return;
  throw new RendererError('INTERACTION_OUT_OF_SYNC', 'Connection Anchor Node is unavailable.', {
    issue: 'CONNECTION_ANCHOR_UNAVAILABLE',
  });
}

function assertInteractionPoint(field: string, point: Readonly<{ x: number; y: number }>): void {
  for (const coordinate of ['x', 'y'] as const) {
    if (Number.isFinite(point[coordinate])) continue;
    throw new RendererError('INVALID_INTERACTION_PROJECTION', 'Interaction Projection Point must be finite.', {
      issue: 'INVALID_POINT',
      field: `${field}.${coordinate}`,
    });
  }
}

function assertInteractionViewport(prefix: 'baseViewport' | 'viewport', viewport: SessionSnapshot['viewport']): void {
  for (const field of ['x', 'y', 'zoom'] as const) {
    const value = viewport[field];
    if (Number.isFinite(value) && (field !== 'zoom' || value > 0)) continue;
    throw new RendererError(
      'INVALID_INTERACTION_PROJECTION',
      'Interaction Projection Viewport values must be finite with positive zoom.',
      { issue: 'INVALID_VIEWPORT', field: `${prefix}.${field}` },
    );
  }
}

function assertInteractionProjectionType(value: unknown): asserts value is InteractionProjection {
  if (
    !isRecord(value) ||
    (value.type !== 'node-drag' &&
      value.type !== 'viewport-pan' &&
      value.type !== 'connection-preview' &&
      value.type !== 'box-selection')
  ) {
    throw new RendererError('INVALID_INTERACTION_PROJECTION', 'Interaction Projection type is invalid.', {
      issue: 'INVALID_PROJECTION_TYPE',
    });
  }
  if (value.type === 'connection-preview') {
    if (!isConnectionAnchor(value.source) || !isRecord(value.pointerWorldPoint) || !isRecord(value.target)) {
      throwInvalidInteractionProjectionStructure('connection-preview');
    }
    if (
      value.target.type !== 'none' &&
      ((value.target.type !== 'valid' && value.target.type !== 'invalid') || !isConnectionAnchor(value.target.anchor))
    ) {
      throwInvalidInteractionProjectionStructure('target');
    }
    return;
  }
  if (value.type === 'box-selection') {
    if (!isRecord(value.rect)) throwInvalidInteractionProjectionStructure('rect');
    return;
  }
  if (value.type === 'node-drag') {
    if (!Array.isArray(value.nodes)) throwInvalidInteractionProjectionStructure('nodes');
    for (let index = 0; index < value.nodes.length; index += 1) {
      const candidate = value.nodes[index];
      if (!isRecord(candidate)) throwInvalidInteractionProjectionStructure(`nodes[${index}]`);
      if (typeof candidate.nodeId !== 'string' || candidate.nodeId.length === 0) {
        throwInvalidInteractionProjectionStructure(`nodes[${index}].nodeId`);
      }
      if (!isRecord(candidate.basePosition)) {
        throwInvalidInteractionProjectionStructure(`nodes[${index}].basePosition`);
      }
      if (!isRecord(candidate.position)) {
        throwInvalidInteractionProjectionStructure(`nodes[${index}].position`);
      }
    }
    return;
  }
  if (!isRecord(value.baseViewport)) throwInvalidInteractionProjectionStructure('baseViewport');
  if (!isRecord(value.viewport)) throwInvalidInteractionProjectionStructure('viewport');
}

function isConnectionAnchor(value: unknown): value is Readonly<{
  nodeId: string;
  role: 'source' | 'target';
}> {
  return (
    isRecord(value) &&
    typeof value.nodeId === 'string' &&
    value.nodeId.length > 0 &&
    (value.role === 'source' || value.role === 'target')
  );
}

function throwInvalidInteractionProjectionStructure(field: string): never {
  throw new RendererError('INVALID_INTERACTION_PROJECTION', 'Interaction Projection structure is invalid.', {
    issue: 'INVALID_PROJECTION_STRUCTURE',
    field,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function viewportsEqual(left: SessionSnapshot['viewport'], right: SessionSnapshot['viewport']): boolean {
  return left.x === right.x && left.y === right.y && left.zoom === right.zoom;
}

function isInteractionCompatibleWithDocument(
  interaction: InteractionProjection | null,
  document: CanvasSnapshot,
): boolean {
  if (interaction?.type === 'connection-preview') {
    const referencedNodeIds = [
      interaction.source.nodeId,
      ...(interaction.target.type === 'none' ? [] : [interaction.target.anchor.nodeId]),
    ];
    return referencedNodeIds.every((nodeId) => {
      const node = document.nodes.find((candidate) => candidate.id === nodeId);
      return node?.size !== undefined && node.size.width > 0 && node.size.height > 0;
    });
  }
  if (interaction?.type !== 'node-drag') return true;
  const nodes = new Map(document.nodes.map((node) => [node.id, node]));
  return interaction.nodes.every((candidate) => {
    const node = nodes.get(candidate.nodeId);
    return (
      node !== undefined && node.position.x === candidate.basePosition.x && node.position.y === candidate.basePosition.y
    );
  });
}
