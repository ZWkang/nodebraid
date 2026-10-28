import type { PluginDiagnostics } from '@nodebraid/diagnostics';
import {
  createWorldRect,
  type ConnectionAnchorIdentity,
  type ConnectionPreviewTarget,
  type WorldRect,
} from '@nodebraid/interaction-api';
import type { CanvasNode, NodeId, Point } from '@nodebraid/kernel';
import { commandService, type CommandRegistration, type CommandService } from '@nodebraid/plugin-command';
import { kernelService } from '@nodebraid/plugin-kernel';
import { createNodeCommand } from '@nodebraid/plugin-node-editing';
import { portService, type PortService } from '@nodebraid/plugin-port';
import { rendererService } from '@nodebraid/plugin-renderer';
import { sessionService, type Viewport } from '@nodebraid/plugin-session';
import type { HitResult } from '@nodebraid/renderer-api';
import type { PluginContext } from '@nodebraid/runtime-cordis';

import { computeClickSelection } from './selection-transition';
import { computeBoxSelection } from './box-selection';
import type {
  ConnectionMaterializer,
  DeleteSelectionInput,
  EffectiveInteractionConfig,
  MoveNodeInput,
} from './contracts';
import { createEdgeCommand, createEdgeHandler } from './create-edge-command';
import { createDeleteSelectionHandler, deleteSelectionCommand } from './delete-selection-command';
import { interactionDiagnosticEvents } from './diagnostic-events';
import { InteractionError } from './interaction-error';
import { createMoveNodesHandler, moveNodesCommand } from './move-nodes-command';
import type { InteractionShortcutService } from './shortcut-contracts';
import { createShortcutRuntime } from './shortcut-runtime';
import type { NodeMaterializer, NodePlacementResult, NodePlacementService } from './node-placement';

type InteractionRequirements = {
  readonly renderer: typeof rendererService;
  readonly session: typeof sessionService;
  readonly commands: typeof commandService;
  readonly kernel: typeof kernelService;
  readonly ports: typeof portService;
};

interface SelectionGesture {
  readonly type: 'selection';
  readonly pointerId: number;
  completeClick?: () => void;
}

interface NodeDragGesture {
  readonly type: 'node-drag';
  readonly pointerId: number;
  readonly startScreenPoint: Point;
  readonly startWorldPoint: Point;
  readonly nodes: readonly Readonly<{ nodeId: NodeId; basePosition: Point }>[];
  active: boolean;
  moves?: readonly MoveNodeInput[];
  completeClick?: () => void;
}

interface ViewportPanGesture {
  readonly type: 'viewport-pan';
  readonly pointerId: number;
  readonly startScreenPoint: Point;
  readonly baseViewport: Viewport;
  active: boolean;
  viewport?: Viewport;
}

interface BoxSelectionGesture {
  readonly type: 'box-selection';
  readonly pointerId: number;
  readonly startScreenPoint: Point;
  readonly startWorldPoint: Point;
  readonly baseViewport: Viewport;
  readonly additive: boolean;
  active: boolean;
  rect?: WorldRect;
  completeClick: () => void;
}

interface ConnectionGesture {
  readonly type: 'connection';
  readonly pointerId: number;
  readonly source: ConnectionAnchorIdentity;
  pointerWorldPoint: Point;
  target: ConnectionPreviewTarget;
}

interface NodePlacementRequest {
  readonly materializeNode: NodeMaterializer;
  readonly resolve: (result: NodePlacementResult) => void;
  readonly reject: (error: unknown) => void;
  phase: 'armed' | 'materializing' | 'committing' | 'settled';
}

interface NodePlacementGesture {
  readonly type: 'node-placement';
  readonly pointerId: number;
  readonly request: NodePlacementRequest;
  readonly startScreenPoint: Point;
  readonly baseViewport: Viewport;
  eligible: boolean;
}

type ActiveGesture =
  | SelectionGesture
  | NodeDragGesture
  | ViewportPanGesture
  | BoxSelectionGesture
  | ConnectionGesture
  | NodePlacementGesture;
type GestureCancellationReason =
  'lifecycle' | 'pointer-cancel' | 'stale' | 'escape' | 'invalid-target' | 'cancelled' | 'replaced';

/** @internal */
export function activateInteractionRuntime(
  context: PluginContext<InteractionRequirements>,
  config: EffectiveInteractionConfig,
): { readonly shortcuts: InteractionShortcutService; readonly placement: NodePlacementService } {
  const renderer = context.services.renderer;
  const session = context.services.session;
  const kernel = context.services.kernel;
  const commands = context.services.commands;
  const ports = context.services.ports;
  let closing = false;
  let activeGesture: ActiveGesture | undefined;
  let placementRequest: NodePlacementRequest | undefined;
  let spacePressed = false;
  const rejectedPointerIds = new Set<number>();
  let moveRegistration: CommandRegistration | undefined;
  let createEdgeRegistration: CommandRegistration | undefined;
  let deleteSelectionRegistration: CommandRegistration | undefined;
  let stopKernel = (): void => undefined;
  let stopSession = (): void => undefined;
  let stopPorts = (): void => undefined;
  let stopInput = (): void => undefined;
  const projection = renderer.bindInteractionProjection();
  const shortcutRuntime = createShortcutRuntime({
    commands,
    diagnostics: context.diagnostics,
    getActiveGestureType: () => activeGesture?.type,
  });
  context.own(() => shortcutRuntime.dispose());

  const reapplyGestureProjection = (gesture: ActiveGesture): void => {
    if (gesture.type === 'node-drag' && gesture.active && gesture.moves) {
      projection.update({ type: 'node-drag', nodes: gesture.moves });
    } else if (gesture.type === 'viewport-pan' && gesture.active && gesture.viewport) {
      projection.update({
        type: 'viewport-pan',
        baseViewport: gesture.baseViewport,
        viewport: gesture.viewport,
      });
    } else if (gesture.type === 'connection') {
      projection.update({
        type: 'connection-preview',
        source: gesture.source,
        pointerWorldPoint: gesture.pointerWorldPoint,
        target: gesture.target,
      });
    } else if (gesture.type === 'box-selection' && gesture.active && gesture.rect) {
      projection.update({ type: 'box-selection', rect: gesture.rect });
    }
  };

  const cancelGesture = (gesture: ActiveGesture, reason: GestureCancellationReason, releasePointer: boolean): void => {
    if (activeGesture !== gesture) return;
    activeGesture = undefined;
    const errors: unknown[] = [];
    const attempt = (operation: () => void): void => {
      try {
        operation();
      } catch (error) {
        errors.push(error);
      }
    };
    if (hasPreview(gesture)) attempt(() => projection.update(null));
    if (releasePointer) attempt(() => renderer.releasePointer(gesture.pointerId));
    attempt(() => emitGestureCancellation(context.diagnostics, gesture.type, reason));
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) throw new AggregateError(errors, 'Interaction Gesture cancellation failed.');
  };

  const failPlacement = (request: NodePlacementRequest, error: unknown): void => {
    if (placementRequest === request) placementRequest = undefined;
    if (request.phase === 'settled') {
      context.diagnostics.reportFault(error, { name: interactionDiagnosticEvents.nodePlacementFault });
      return;
    }
    request.phase = 'settled';
    request.reject(error);
  };

  const finishPlacementCancellation = (request: NodePlacementRequest, reason: GestureCancellationReason): void => {
    try {
      if (activeGesture?.type === 'node-placement' && activeGesture.request === request) {
        cancelGesture(activeGesture, reason, true);
      }
    } catch (error) {
      request.phase = 'settled';
      request.reject(error);
      throw error;
    }
    request.phase = 'settled';
    request.resolve({ type: 'cancelled' });
  };

  const cancelPlacement = (request: NodePlacementRequest, reason: GestureCancellationReason): void => {
    if (placementRequest !== request || request.phase === 'committing') return;
    placementRequest = undefined;
    finishPlacementCancellation(request, reason);
  };

  const placement: NodePlacementService = Object.freeze({
    begin(materializeNode: NodeMaterializer) {
      if (closing) throw new InteractionError('PLACEMENT_DISPOSED', 'Node Placement Service is disposed.');
      if (typeof materializeNode !== 'function') {
        throw new InteractionError('INVALID_NODE_PLACEMENT', 'Node materializer must be a function.');
      }
      if (activeGesture && activeGesture.type !== 'node-placement') {
        throw new InteractionError('PLACEMENT_BUSY', 'An active Pointer Gesture must finish before Node placement.');
      }
      const previous = placementRequest;
      let resolve!: NodePlacementRequest['resolve'];
      let reject!: NodePlacementRequest['reject'];
      const result = new Promise<NodePlacementResult>((onResolve, onReject) => {
        resolve = onResolve;
        reject = onReject;
      });
      const request: NodePlacementRequest = { materializeNode, resolve, reject, phase: 'armed' };
      placementRequest = request;
      try {
        if (previous && previous.phase !== 'committing') finishPlacementCancellation(previous, 'replaced');
        if (placementRequest === request) renderer.focus();
      } catch (error) {
        failPlacement(request, error);
      }
      return Object.freeze({ result, cancel: () => cancelPlacement(request, 'cancelled') });
    },
  });

  const commitPlacement = (request: NodePlacementRequest, worldPoint: Point): void => {
    if (placementRequest !== request || closing) return;
    const selection = session.getSnapshot().selection;
    request.phase = 'materializing';
    let node: CanvasNode;
    try {
      node = request.materializeNode(
        Object.freeze({ worldPoint: Object.freeze({ x: worldPoint.x, y: worldPoint.y }) }),
      );
    } catch (error) {
      failPlacement(request, error);
      return;
    }
    if (placementRequest !== request || closing) return;
    request.phase = 'committing';
    void commands.execute(createNodeCommand, { node }).then(
      (commit) => {
        try {
          const created = commit.changeSet.changes.find((change) => change.entity === 'node' && change.before === null);
          if (!created || created.entity !== 'node' || !created.after) {
            throw new Error('Create Node Command must return its created Node.');
          }
          if (
            !closing &&
            placementRequest === request &&
            session.getSnapshot().selection === selection &&
            kernel.read().query.getNode(created.id) === created.after
          ) {
            session.setSelection({ nodeIds: [created.id], edgeIds: [] });
          }
          if (placementRequest === request) placementRequest = undefined;
          request.phase = 'settled';
          request.resolve({ type: 'created', nodeId: created.id, commit });
        } catch (error) {
          failPlacement(request, error);
        }
      },
      (error: unknown) => failPlacement(request, error),
    );
  };

  context.signal.addEventListener('abort', () => {
    closing = true;
  });
  context.own(async () => {
    closing = true;
    const waitingPlacement = placementRequest;
    placementRequest = undefined;
    if (waitingPlacement && waitingPlacement.phase !== 'committing') {
      waitingPlacement.phase = 'settled';
      waitingPlacement.resolve({ type: 'cancelled' });
    }
    const gesture = activeGesture;
    const cleanupErrors: unknown[] = [];
    const attempt = (cleanup: () => void): void => {
      try {
        cleanup();
      } catch (error) {
        cleanupErrors.push(error);
      }
    };
    attempt(stopInput);
    attempt(stopSession);
    attempt(stopPorts);
    attempt(stopKernel);
    attempt(() => projection.dispose());
    if (gesture) attempt(() => renderer.releasePointer(gesture.pointerId));
    activeGesture = undefined;
    spacePressed = false;
    rejectedPointerIds.clear();
    if (gesture) {
      attempt(() => emitGestureCancellation(context.diagnostics, gesture.type, 'lifecycle'));
    }
    if (moveRegistration) {
      try {
        await moveRegistration.dispose();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (createEdgeRegistration) {
      try {
        await createEdgeRegistration.dispose();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (deleteSelectionRegistration) {
      try {
        await deleteSelectionRegistration.dispose();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (cleanupErrors.length > 0) {
      throw new AggregateError(cleanupErrors, 'Interaction Runtime cleanup failed.');
    }
  });

  moveRegistration = commands.register(moveNodesCommand, createMoveNodesHandler(kernel));
  createEdgeRegistration = commands.register(createEdgeCommand, createEdgeHandler(kernel, ports));
  deleteSelectionRegistration = commands.register(deleteSelectionCommand, createDeleteSelectionHandler(kernel));
  stopKernel = kernel.observeCommits((commit) => {
    if (closing || !activeGesture) return;
    const gesture = activeGesture;
    if (gesture.type === 'node-drag') {
      const stale = gesture.nodes.some((evidence) => {
        const node = commit.after.query.getNode(evidence.nodeId);
        return !node || node.position.x !== evidence.basePosition.x || node.position.y !== evidence.basePosition.y;
      });
      if (stale) cancelGesture(gesture, 'stale', true);
      else reapplyGestureProjection(gesture);
    } else if (gesture.type === 'viewport-pan') {
      reapplyGestureProjection(gesture);
    } else if (gesture.type === 'connection') {
      if (!connectionAnchorAvailable(ports, gesture.source, commit.after.query.getNode(gesture.source.nodeId))) {
        cancelGesture(gesture, 'stale', true);
      } else {
        if (
          gesture.target.type !== 'none' &&
          !connectionAnchorAvailable(
            ports,
            gesture.target.anchor,
            commit.after.query.getNode(gesture.target.anchor.nodeId),
          )
        ) {
          gesture.target = { type: 'none' };
        }
        reapplyGestureProjection(gesture);
      }
    } else if (gesture.type === 'box-selection') {
      reapplyGestureProjection(gesture);
    }
  });
  stopPorts = ports.subscribe(() => {
    if (closing || !activeGesture) return;
    const gesture = activeGesture;
    if (gesture.type === 'connection') {
      const view = kernel.read();
      if (!connectionAnchorAvailable(ports, gesture.source, view.query.getNode(gesture.source.nodeId))) {
        cancelGesture(gesture, 'stale', true);
        return;
      }
      if (
        gesture.target.type !== 'none' &&
        !connectionAnchorAvailable(ports, gesture.target.anchor, view.query.getNode(gesture.target.anchor.nodeId))
      ) {
        gesture.target = { type: 'none' };
      }
    }
    reapplyGestureProjection(gesture);
  });
  stopSession = session.subscribe(() => {
    if (closing || !activeGesture) return;
    const gesture = activeGesture;
    if (gesture.type === 'viewport-pan' || gesture.type === 'box-selection' || gesture.type === 'node-placement') {
      if (!viewportsEqual(session.getSnapshot().viewport, gesture.baseViewport)) {
        try {
          cancelGesture(gesture, 'stale', true);
        } catch (error) {
          if (gesture.type === 'node-placement') failPlacement(gesture.request, error);
          throw error;
        }
      } else {
        reapplyGestureProjection(gesture);
      }
    } else if (gesture.type === 'node-drag' || gesture.type === 'connection') {
      reapplyGestureProjection(gesture);
    }
  });
  stopInput = renderer.subscribeInput(
    (input) => {
      if (closing) return;
      if (input.type === 'key.down' || input.type === 'key.up') {
        if (input.type === 'key.down' && input.code === 'Escape' && placementRequest?.phase !== 'committing') {
          if (placementRequest) {
            cancelPlacement(placementRequest, 'escape');
            return;
          }
        }
        const shortcutDisposition = shortcutRuntime.handleInput(input);
        if (shortcutDisposition) return shortcutDisposition;
        if (input.type === 'key.down' && (input.key === 'Delete' || input.code === 'Delete')) {
          if (activeGesture) {
            context.diagnostics.emit({
              name: interactionDiagnosticEvents.inputRejected,
              level: 'info',
              attributes: {
                inputType: 'key.down',
                gestureType: activeGesture.type,
                reason: 'active-gesture',
              },
            });
            return;
          }
          const selection = session.getSnapshot().selection;
          if (selection.nodeIds.length === 0 && selection.edgeIds.length === 0) return;
          executeDeleteSelection(
            commands,
            context.diagnostics,
            { selection, evidence: kernel.read().snapshot },
            () => closing,
          );
          return;
        }
        if (input.code === 'Space') spacePressed = input.type === 'key.down';
        if (
          input.type === 'key.down' &&
          input.code === 'Escape' &&
          (activeGesture?.type === 'connection' || activeGesture?.type === 'box-selection')
        ) {
          cancelGesture(activeGesture, 'escape', true);
        }
        return;
      }
      if (input.type === 'focus.lost') {
        spacePressed = false;
        return;
      }
      if (input.type === 'focus.gained') return;
      if (input.type === 'wheel') {
        if (activeGesture) {
          context.diagnostics.emit({
            name: interactionDiagnosticEvents.inputRejected,
            level: 'info',
            attributes: {
              inputType: 'wheel',
              gestureType: activeGesture.type,
              reason: 'active-gesture',
            },
          });
          return;
        }
        const current = session.getSnapshot().viewport;
        const zoom = Math.max(
          config.minZoom,
          Math.min(config.maxZoom, current.zoom * Math.exp(-input.deltaY * config.wheelZoomSensitivity)),
        );
        if (zoom === current.zoom) return;
        session.setViewport({
          x: input.screenPoint.x - input.worldPoint.x * zoom,
          y: input.screenPoint.y - input.worldPoint.y * zoom,
          zoom,
        });
        return;
      }
      if (input.type === 'pointer.move' && rejectedPointerIds.has(input.pointerId)) return;
      if (
        (input.type === 'pointer.up' || input.type === 'pointer.cancel') &&
        rejectedPointerIds.delete(input.pointerId)
      ) {
        return;
      }
      if (input.type === 'pointer.down') {
        if (activeGesture) {
          if (input.pointerId !== activeGesture.pointerId && !rejectedPointerIds.has(input.pointerId)) {
            rejectedPointerIds.add(input.pointerId);
            context.diagnostics.emit({
              name: interactionDiagnosticEvents.pointerRejected,
              level: 'info',
              attributes: {
                inputType: 'pointer.down',
                gestureType: activeGesture.type,
                reason: 'additional-pointer',
              },
            });
          }
          return;
        }
        if (input.button !== 'primary' && input.button !== 'auxiliary') return;
        let hit: HitResult | null;
        try {
          hit = renderer.hitTest(input.screenPoint);
        } catch (error) {
          if (placementRequest?.phase === 'armed' && input.button === 'primary' && !spacePressed) {
            failPlacement(placementRequest, error);
            return;
          }
          throw error;
        }
        if (hit === null) return;
        if (placementRequest?.phase === 'armed' && input.button === 'primary' && !spacePressed) {
          const request = placementRequest;
          try {
            renderer.focus();
            if (closing || placementRequest !== request) return;
            renderer.capturePointer(input.pointerId);
            if (closing || placementRequest !== request) {
              renderer.releasePointer(input.pointerId);
              return;
            }
            activeGesture = {
              type: 'node-placement',
              pointerId: input.pointerId,
              request,
              startScreenPoint: input.screenPoint,
              baseViewport: session.getSnapshot().viewport,
              eligible: hit.type === 'canvas',
            };
          } catch (error) {
            try {
              renderer.releasePointer(input.pointerId);
            } catch (cleanupError) {
              failPlacement(
                request,
                new AggregateError([error, cleanupError], 'Node placement and capture cleanup failed.'),
              );
              return;
            }
            failPlacement(request, error);
          }
          return;
        }
        const additive = input.modifiers.shift || input.modifiers.meta || input.modifiers.control;
        const connectionHit = toConnectionAnchor(hit);
        if (connectionHit?.role === 'source' && config.connection && !additive && input.pointerType !== 'mouse') {
          context.diagnostics.emit({
            name: interactionDiagnosticEvents.inputRejected,
            level: 'info',
            attributes: { inputType: 'pointer.down', gestureType: 'connection', reason: 'unsupported-pointer' },
          });
          return;
        }
        renderer.focus();
        renderer.capturePointer(input.pointerId);
        const selectionGesture: SelectionGesture = { type: 'selection', pointerId: input.pointerId };
        activeGesture = selectionGesture;
        try {
          if (input.button === 'auxiliary' || spacePressed) {
            activeGesture = {
              type: 'viewport-pan',
              pointerId: input.pointerId,
              startScreenPoint: input.screenPoint,
              baseViewport: session.getSnapshot().viewport,
              active: false,
            };
            return;
          }
          if (connectionHit?.role === 'source' && config.connection && !additive && input.button === 'primary') {
            const gesture: ConnectionGesture = {
              type: 'connection',
              pointerId: input.pointerId,
              source: connectionHit,
              pointerWorldPoint: input.worldPoint,
              target: { type: 'none' },
            };
            activeGesture = gesture;
            reapplyGestureProjection(gesture);
            return;
          }
          if (hit.type === 'canvas') {
            activeGesture = {
              type: 'box-selection',
              pointerId: input.pointerId,
              startScreenPoint: input.screenPoint,
              startWorldPoint: input.worldPoint,
              baseViewport: session.getSnapshot().viewport,
              additive,
              active: false,
              completeClick: () =>
                session.setSelection(computeClickSelection(session.getSnapshot().selection, hit, additive)),
            };
            return;
          }
          if (additive) {
            selectionGesture.completeClick = () =>
              session.setSelection(computeClickSelection(session.getSnapshot().selection, hit, true));
            return;
          }
          if (hit.type === 'node') {
            const selection = session.getSnapshot().selection;
            const nodeIds = selection.nodeIds.includes(hit.nodeId) ? selection.nodeIds : [hit.nodeId];
            const view = kernel.read();
            activeGesture = {
              type: 'node-drag',
              pointerId: input.pointerId,
              startScreenPoint: input.screenPoint,
              startWorldPoint: input.worldPoint,
              nodes: nodeIds.map((nodeId) => {
                const node = view.query.getNode(nodeId);
                if (!node) throw new Error('Node Drag candidate must exist in the current Canvas View.');
                return { nodeId, basePosition: node.position };
              }),
              active: false,
            };
          }
          if (hit.type === 'node' || hit.type === 'port') {
            const selection = session.getSnapshot().selection;
            if (
              selection.nodeIds.includes(hit.nodeId) &&
              (selection.nodeIds.length > 1 || selection.edgeIds.length > 0)
            ) {
              const completeClick = () =>
                session.setSelection(computeClickSelection(session.getSnapshot().selection, hit, false));
              if (activeGesture.type === 'node-drag' || activeGesture.type === 'selection') {
                activeGesture.completeClick = completeClick;
              }
              return;
            }
          }
          session.setSelection(computeClickSelection(session.getSnapshot().selection, hit, false));
        } catch (error) {
          activeGesture = undefined;
          try {
            renderer.releasePointer(input.pointerId);
          } catch (cleanupError) {
            throw new AggregateError([error, cleanupError], 'Interaction Input handling and cleanup both failed.');
          }
          throw error;
        }
        return;
      }
      const gesture = activeGesture;
      if (input.type === 'pointer.move' && gesture && input.pointerId === gesture.pointerId) {
        if (gesture.type === 'node-placement') {
          if (!isPlacementClick(gesture.startScreenPoint, input.screenPoint, config.dragThreshold)) {
            gesture.eligible = false;
          }
        } else if (gesture.type === 'node-drag') {
          if (
            !gesture.active &&
            isBelowDragThreshold(gesture.startScreenPoint, input.screenPoint, config.dragThreshold)
          ) {
            return;
          }
          gesture.active = true;
          gesture.completeClick = undefined;
          const worldDeltaX = input.worldPoint.x - gesture.startWorldPoint.x;
          const worldDeltaY = input.worldPoint.y - gesture.startWorldPoint.y;
          gesture.moves = gesture.nodes.map((node) => ({
            nodeId: node.nodeId,
            basePosition: node.basePosition,
            position: {
              x: node.basePosition.x + worldDeltaX,
              y: node.basePosition.y + worldDeltaY,
            },
          }));
          reapplyGestureProjection(gesture);
        } else if (gesture.type === 'viewport-pan') {
          const deltaX = input.screenPoint.x - gesture.startScreenPoint.x;
          const deltaY = input.screenPoint.y - gesture.startScreenPoint.y;
          if (
            !gesture.active &&
            isBelowDragThreshold(gesture.startScreenPoint, input.screenPoint, config.dragThreshold)
          ) {
            return;
          }
          gesture.active = true;
          gesture.viewport = {
            x: gesture.baseViewport.x + deltaX,
            y: gesture.baseViewport.y + deltaY,
            zoom: gesture.baseViewport.zoom,
          };
          reapplyGestureProjection(gesture);
        } else if (gesture.type === 'connection') {
          updateConnectionGesture(gesture, input.worldPoint, renderer.hitTest(input.screenPoint));
          reapplyGestureProjection(gesture);
        } else if (gesture.type === 'box-selection') {
          if (
            !gesture.active &&
            isBelowDragThreshold(gesture.startScreenPoint, input.screenPoint, config.dragThreshold)
          ) {
            return;
          }
          const rect = createWorldRect(gesture.startWorldPoint, input.worldPoint);
          gesture.active = true;
          gesture.rect = rect;
          reapplyGestureProjection(gesture);
        }
        return;
      }
      if (input.type === 'pointer.up' && gesture && input.pointerId === gesture.pointerId) {
        if (gesture.type === 'node-placement') {
          activeGesture = undefined;
          try {
            renderer.releasePointer(gesture.pointerId);
            if (
              gesture.eligible &&
              input.button === 'primary' &&
              isPlacementClick(gesture.startScreenPoint, input.screenPoint, config.dragThreshold) &&
              viewportsEqual(session.getSnapshot().viewport, gesture.baseViewport) &&
              renderer.hitTest(input.screenPoint)?.type === 'canvas'
            ) {
              commitPlacement(gesture.request, input.worldPoint);
            }
          } catch (error) {
            failPlacement(gesture.request, error);
          }
          return;
        }
        if (gesture.type === 'connection') {
          activeGesture = undefined;
          const terminalErrors: unknown[] = [];
          try {
            updateConnectionGesture(gesture, input.worldPoint, renderer.hitTest(input.screenPoint));
          } catch (error) {
            terminalErrors.push(error);
          }
          for (const cleanup of [() => projection.update(null), () => renderer.releasePointer(gesture.pointerId)]) {
            try {
              cleanup();
            } catch (error) {
              terminalErrors.push(error);
            }
          }
          if (terminalErrors.length === 1) throw terminalErrors[0];
          if (terminalErrors.length > 1)
            throw new AggregateError(terminalErrors, 'Connection Gesture terminal failed.');
          if (gesture.target.type === 'valid' && config.connection) {
            executeCreateEdge(commands, context.diagnostics, config.connection.materializeEdge, gesture, () => closing);
          } else {
            emitGestureCancellation(context.diagnostics, 'connection', 'invalid-target');
          }
          return;
        }
        activeGesture = undefined;
        if (gesture.type === 'node-drag' && gesture.active) {
          projection.update(null);
          if (gesture.moves) executeMoveNodes(commands, context.diagnostics, gesture.moves, () => closing);
        } else if (gesture.type === 'viewport-pan' && gesture.active) {
          projection.update(null);
          if (gesture.viewport) session.setViewport(gesture.viewport);
        } else if (gesture.type === 'box-selection' && gesture.active) {
          projection.update(null);
          const rect = createWorldRect(gesture.startWorldPoint, input.worldPoint);
          session.setSelection(
            computeBoxSelection(session.getSnapshot().selection, kernel.read().snapshot.nodes, rect, gesture.additive),
          );
        } else if (gesture.type !== 'viewport-pan') {
          gesture.completeClick?.();
        }
      } else if (input.type === 'pointer.cancel' && gesture && input.pointerId === gesture.pointerId) {
        try {
          cancelGesture(gesture, 'pointer-cancel', true);
        } catch (error) {
          if (gesture.type === 'node-placement') failPlacement(gesture.request, error);
          throw error;
        }
      }
    },
    (input) => {
      if (
        input.type === 'key.down' &&
        input.code === 'Escape' &&
        placementRequest &&
        placementRequest.phase !== 'committing'
      ) {
        return { defaultAction: 'prevent' };
      }
      return input.type === 'key.down' || input.type === 'key.up'
        ? shortcutRuntime.decideDisposition(input)
        : undefined;
    },
  );
  return { shortcuts: shortcutRuntime.service, placement };
}

function hasPreview(gesture: ActiveGesture): boolean {
  return (
    gesture.type === 'connection' ||
    ((gesture.type === 'node-drag' || gesture.type === 'viewport-pan' || gesture.type === 'box-selection') &&
      gesture.active)
  );
}

function isBelowDragThreshold(start: Point, current: Point, threshold: number): boolean {
  return Math.hypot(current.x - start.x, current.y - start.y) < threshold;
}

function isPlacementClick(start: Point, current: Point, threshold: number): boolean {
  const distance = Math.hypot(current.x - start.x, current.y - start.y);
  return distance === 0 || distance < threshold;
}

function updateConnectionGesture(gesture: ConnectionGesture, pointerWorldPoint: Point, hit: HitResult | null): void {
  gesture.pointerWorldPoint = pointerWorldPoint;
  if (!isConnectionAnchorHit(hit)) {
    gesture.target = { type: 'none' };
    return;
  }
  if (hit.role !== 'target') {
    gesture.target = { type: 'none' };
    return;
  }
  const anchor = toConnectionAnchor(hit);
  if (!anchor) {
    gesture.target = { type: 'none' };
    return;
  }
  gesture.target = hit.nodeId !== gesture.source.nodeId ? { type: 'valid', anchor } : { type: 'invalid', anchor };
}

function isConnectionAnchorHit(hit: unknown): hit is Readonly<{
  type: 'connection-anchor' | 'port';
  nodeId: NodeId;
  portId?: string;
  role: 'source' | 'target';
}> {
  return (
    typeof hit === 'object' &&
    hit !== null &&
    (Reflect.get(hit, 'type') === 'connection-anchor' || Reflect.get(hit, 'type') === 'port') &&
    typeof Reflect.get(hit, 'nodeId') === 'string' &&
    (Reflect.get(hit, 'type') !== 'port' ||
      (typeof Reflect.get(hit, 'portId') === 'string' && (Reflect.get(hit, 'portId') as string).length > 0)) &&
    (Reflect.get(hit, 'role') === 'source' || Reflect.get(hit, 'role') === 'target')
  );
}

function toConnectionAnchor(hit: HitResult | null): ConnectionAnchorIdentity | undefined {
  if (!isConnectionAnchorHit(hit)) return undefined;
  return Object.freeze({
    nodeId: hit.nodeId,
    ...(hit.type === 'port' ? { portId: hit.portId } : {}),
    role: hit.role,
  });
}

function connectionAnchorAvailable(
  ports: PortService,
  anchor: ConnectionAnchorIdentity,
  node: CanvasNode | undefined,
): boolean {
  return node !== undefined && ports.isConnectionTargetDefined(node, anchor);
}

function emitGestureCancellation(
  diagnostics: PluginDiagnostics,
  gestureType: ActiveGesture['type'],
  reason: GestureCancellationReason,
): void {
  diagnostics.emit({
    name: interactionDiagnosticEvents.gestureCancelled,
    level: 'info',
    attributes: { gestureType, reason },
  });
}

function executeMoveNodes(
  commands: CommandService,
  diagnostics: PluginDiagnostics,
  moves: readonly MoveNodeInput[],
  isClosing: () => boolean,
): void {
  void commands.execute(moveNodesCommand, { moves }).catch((error) => {
    if (isClosing()) return;
    if (error instanceof InteractionError && error.code === 'STALE_GESTURE') {
      emitGestureCancellation(diagnostics, 'node-drag', 'stale');
      return;
    }
    diagnostics.reportFault(error, {
      name: interactionDiagnosticEvents.commandFault,
      attributes: { gestureType: 'node-drag' },
    });
  });
}

function executeCreateEdge(
  commands: CommandService,
  diagnostics: PluginDiagnostics,
  materializeEdge: ConnectionMaterializer,
  gesture: ConnectionGesture,
  isClosing: () => boolean,
): void {
  if (gesture.target.type !== 'valid') return;
  const source = Object.freeze({
    nodeId: gesture.source.nodeId,
    ...(gesture.source.portId === undefined ? {} : { portId: gesture.source.portId }),
  });
  const target = Object.freeze({
    nodeId: gesture.target.anchor.nodeId,
    ...(gesture.target.anchor.portId === undefined ? {} : { portId: gesture.target.anchor.portId }),
  });
  let edge;
  try {
    edge = materializeEdge(Object.freeze({ source, target }));
  } catch (error) {
    diagnostics.reportFault(error, {
      name: interactionDiagnosticEvents.connectionMaterializerFault,
      attributes: { gestureType: 'connection' },
    });
    return;
  }
  void commands
    .execute(createEdgeCommand, {
      edge,
      source: gesture.source,
      target: gesture.target.anchor,
    })
    .catch((error) => {
      if (isClosing()) return;
      if (error instanceof InteractionError && error.code === 'STALE_GESTURE') {
        emitGestureCancellation(diagnostics, 'connection', 'stale');
        return;
      }
      diagnostics.reportFault(error, {
        name: interactionDiagnosticEvents.commandFault,
        attributes: { gestureType: 'connection' },
      });
    });
}

function executeDeleteSelection(
  commands: CommandService,
  diagnostics: PluginDiagnostics,
  input: DeleteSelectionInput,
  isClosing: () => boolean,
): void {
  void commands.execute(deleteSelectionCommand, input).catch((error) => {
    if (isClosing()) return;
    diagnostics.reportFault(error, {
      name: interactionDiagnosticEvents.commandFault,
      attributes: { commandId: deleteSelectionCommand.id },
    });
  });
}

function viewportsEqual(left: Viewport, right: Viewport): boolean {
  return left.x === right.x && left.y === right.y && left.zoom === right.zoom;
}
