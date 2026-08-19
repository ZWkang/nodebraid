import type { CanvasSnapshot } from '@cflow/kernel';
import {
  RendererError,
  type CanvasRenderer,
  type RendererDocumentUpdate,
  type RendererInput,
  type RendererInputListener,
  type ScreenPoint,
} from '@cflow/renderer-api';
import type { SessionSnapshot } from '@cflow/session-api';

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
  const inputPolicies = normalizeInputPolicies(config.input);
  readTargetMatrix(target, 'INVALID_TARGET');
  if (targetReservations.has(target) || target.querySelector(':scope > [data-cflow-renderer-svg-root]')) {
    throw new SvgRendererError('TARGET_OCCUPIED', 'SVG Renderer Target is already reserved.');
  }

  const document = target.ownerDocument;
  const addedTabIndex = !target.hasAttribute('tabindex');
  if (addedTabIndex) target.setAttribute('tabindex', '-1');
  const projection = createSvgElement(document, 'g');
  projection.setAttribute('class', 'cflow-renderer-svg');
  projection.setAttribute('data-cflow-renderer-svg-root', '');
  const edgesLayer = createSvgElement(document, 'g');
  edgesLayer.setAttribute('class', 'cflow-renderer-svg__edges');
  const nodesLayer = createSvgElement(document, 'g');
  nodesLayer.setAttribute('class', 'cflow-renderer-svg__nodes');
  projection.append(edgesLayer, nodesLayer);

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
    for (const node of nodesLayer.querySelectorAll<SVGRectElement>('[data-cflow-node-id]')) {
      setSelected(node, selectedNodeIds.has(node.getAttribute('data-cflow-node-id') ?? ''), journal);
    }
    for (const edge of edgesLayer.querySelectorAll<SVGLineElement>('[data-cflow-edge-id]')) {
      setSelected(edge, selectedEdgeIds.has(edge.getAttribute('data-cflow-edge-id') ?? ''), journal);
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
      applySession(acceptedSession, journal, targetMatrix);
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
      applySession(acceptedSession, journal);
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
      emitInput(normalizePointerInput(event, target, acceptedSession));
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
    emitInput(normalizeWheelInput(event, target, acceptedSession));
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
  target.addEventListener('wheel', handleWheel, { passive: false });
  target.addEventListener('keydown', handleKeyboard);
  target.addEventListener('keyup', handleKeyboard);
  target.addEventListener('contextmenu', handleContextMenu);

  const renderer: CanvasRenderer = Object.freeze({
    updateDocument(update: RendererDocumentUpdate): void {
      assertActive();
      const acceptedUpdate = validateRendererDocumentUpdate(update);
      assertNoObservedResizeError();
      if (acceptedUpdate.type === 'reset') {
        if (acceptedSession) validateSessionSnapshot(acceptedSession, acceptedUpdate.view.snapshot);
        const targetMatrix = readTargetMatrix(target, 'TARGET_UNAVAILABLE');
        const nextBaseline = cloneCanvasSnapshot(acceptedUpdate.view.snapshot);
        const journal = new DomMutationJournal(edgesLayer, nodesLayer);
        try {
          renderReset(acceptedUpdate.view, document, edgesLayer, nodesLayer);
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
        projectionOutOfSync = false;
        observedResizeError = undefined;
      } else {
        if (projectionOutOfSync) throwProjectionOutOfSync(acceptedUpdate.commit.before.snapshot.revision);
        const targetMatrix = readTargetMatrix(target, 'TARGET_UNAVAILABLE');
        const session = acceptedSession;
        try {
          applyCommit(
            acceptedUpdate.commit,
            baselineSnapshot,
            session,
            document,
            edgesLayer,
            nodesLayer,
            session ? (journal) => applySession(session, journal, targetMatrix) : undefined,
          );
        } catch (error) {
          if (error instanceof ProjectionRollbackError) projectionOutOfSync = true;
          throw error;
        }
        baselineSnapshot = cloneCanvasSnapshot(acceptedUpdate.commit.after.snapshot);
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
      const journal = new DomMutationJournal(edgesLayer, nodesLayer);
      try {
        applySession(accepted, journal);
      } catch (error) {
        const rollbackErrors = journal.rollback();
        if (rollbackErrors.length > 0) {
          projectionOutOfSync = true;
          throw new ProjectionRollbackError([error, ...rollbackErrors]);
        }
        throw error;
      }
      acceptedSession = accepted;
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
      return hitTestProjection(point, target, baselineSnapshot, acceptedSession, edgeHitTolerance);
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
        attemptCleanup(cleanupErrors, () => target.removeEventListener('wheel', handleWheel));
        attemptCleanup(cleanupErrors, () => target.removeEventListener('keydown', handleKeyboard));
        attemptCleanup(cleanupErrors, () => target.removeEventListener('keyup', handleKeyboard));
        attemptCleanup(cleanupErrors, () => target.removeEventListener('contextmenu', handleContextMenu));
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
