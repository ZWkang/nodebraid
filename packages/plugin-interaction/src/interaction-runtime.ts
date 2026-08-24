import type { PluginDiagnostics } from '@nodebraid/diagnostics';
import type { ConnectionAnchorIdentity, ConnectionPreviewTarget } from '@nodebraid/interaction-api';
import type { NodeId, Point } from '@nodebraid/kernel';
import { commandService, type CommandRegistration, type CommandService } from '@nodebraid/plugin-command';
import { kernelService } from '@nodebraid/plugin-kernel';
import { rendererService } from '@nodebraid/plugin-renderer';
import { sessionService, type Viewport } from '@nodebraid/plugin-session';
import type { HitResult } from '@nodebraid/renderer-api';
import type { PluginContext } from '@nodebraid/runtime-cordis';

import { computeClickSelection } from './selection-transition';
import type { ConnectionMaterializer, EffectiveInteractionConfig, MoveNodeInput } from './contracts';
import { createEdgeCommand, createEdgeHandler } from './create-edge-command';
import { interactionDiagnosticEvents } from './diagnostic-events';
import { InteractionError } from './interaction-error';
import { createMoveNodesHandler, moveNodesCommand } from './move-nodes-command';

type InteractionRequirements = {
  readonly renderer: typeof rendererService;
  readonly session: typeof sessionService;
  readonly commands: typeof commandService;
  readonly kernel: typeof kernelService;
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

interface ConnectionGesture {
  readonly type: 'connection';
  readonly pointerId: number;
  readonly source: ConnectionAnchorIdentity;
  pointerWorldPoint: Point;
  target: ConnectionPreviewTarget;
}

type ActiveGesture = SelectionGesture | NodeDragGesture | ViewportPanGesture | ConnectionGesture;
type GestureCancellationReason = 'lifecycle' | 'pointer-cancel' | 'stale' | 'escape' | 'invalid-target';

/** @internal */
export function activateInteractionRuntime(
  context: PluginContext<InteractionRequirements>,
  config: EffectiveInteractionConfig,
): void {
  const renderer = context.services.renderer;
  const session = context.services.session;
  const kernel = context.services.kernel;
  const commands = context.services.commands;
  let closing = false;
  let activeGesture: ActiveGesture | undefined;
  let spacePressed = false;
  const rejectedPointerIds = new Set<number>();
  let moveRegistration: CommandRegistration | undefined;
  let createEdgeRegistration: CommandRegistration | undefined;
  let stopKernel = (): void => undefined;
  let stopSession = (): void => undefined;
  let stopInput = (): void => undefined;
  const projection = renderer.bindInteractionProjection();

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

  context.signal.addEventListener('abort', () => {
    closing = true;
  });
  context.own(async () => {
    closing = true;
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
    if (cleanupErrors.length > 0) {
      throw new AggregateError(cleanupErrors, 'Interaction Runtime cleanup failed.');
    }
  });

  moveRegistration = commands.register(moveNodesCommand, createMoveNodesHandler(kernel));
  createEdgeRegistration = commands.register(createEdgeCommand, createEdgeHandler(kernel));
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
      const sourceExists = commit.after.query.getNode(gesture.source.nodeId) !== undefined;
      if (!sourceExists) {
        cancelGesture(gesture, 'stale', true);
      } else {
        if (gesture.target.type !== 'none' && !commit.after.query.getNode(gesture.target.anchor.nodeId)) {
          gesture.target = { type: 'none' };
        }
        reapplyGestureProjection(gesture);
      }
    }
  });
  stopSession = session.subscribe(() => {
    if (closing || !activeGesture) return;
    const gesture = activeGesture;
    if (gesture.type === 'viewport-pan') {
      if (!viewportsEqual(session.getSnapshot().viewport, gesture.baseViewport)) {
        cancelGesture(gesture, 'stale', true);
      } else {
        reapplyGestureProjection(gesture);
      }
    } else if (gesture.type === 'node-drag' || gesture.type === 'connection') {
      reapplyGestureProjection(gesture);
    }
  });
  stopInput = renderer.subscribeInput((input) => {
    if (closing) return;
    if (input.type === 'key.down' || input.type === 'key.up') {
      if (input.code === 'Space') spacePressed = input.type === 'key.down';
      if (input.type === 'key.down' && input.code === 'Escape' && activeGesture?.type === 'connection') {
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
      const hit = renderer.hitTest(input.screenPoint);
      if (hit === null) return;
      const additive = input.modifiers.shift || input.modifiers.meta || input.modifiers.control;
      if (
        hit.type === 'connection-anchor' &&
        hit.role === 'source' &&
        config.connection &&
        !additive &&
        input.pointerType !== 'mouse'
      ) {
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
        if (
          hit.type === 'connection-anchor' &&
          hit.role === 'source' &&
          config.connection &&
          !additive &&
          input.button === 'primary'
        ) {
          const gesture: ConnectionGesture = {
            type: 'connection',
            pointerId: input.pointerId,
            source: { nodeId: hit.nodeId, role: 'source' },
            pointerWorldPoint: input.worldPoint,
            target: { type: 'none' },
          };
          activeGesture = gesture;
          reapplyGestureProjection(gesture);
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
        } else if (hit.type === 'canvas') {
          activeGesture = {
            type: 'viewport-pan',
            pointerId: input.pointerId,
            startScreenPoint: input.screenPoint,
            baseViewport: session.getSnapshot().viewport,
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
      if (gesture.type === 'node-drag') {
        const screenDeltaX = input.screenPoint.x - gesture.startScreenPoint.x;
        const screenDeltaY = input.screenPoint.y - gesture.startScreenPoint.y;
        if (!gesture.active && Math.hypot(screenDeltaX, screenDeltaY) < config.dragThreshold) return;
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
        if (!gesture.active && Math.hypot(deltaX, deltaY) < config.dragThreshold) return;
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
      }
      return;
    }
    if (input.type === 'pointer.up' && gesture && input.pointerId === gesture.pointerId) {
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
        if (terminalErrors.length > 1) throw new AggregateError(terminalErrors, 'Connection Gesture terminal failed.');
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
      } else if (gesture.type !== 'viewport-pan') {
        gesture.completeClick?.();
      }
    } else if (input.type === 'pointer.cancel' && gesture && input.pointerId === gesture.pointerId) {
      cancelGesture(gesture, 'pointer-cancel', true);
    }
  });
}

function hasPreview(gesture: ActiveGesture): boolean {
  return gesture.type === 'connection' || (gesture.type !== 'selection' && gesture.active);
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
  const anchor = { nodeId: hit.nodeId, role: hit.role } as const;
  gesture.target = hit.nodeId !== gesture.source.nodeId ? { type: 'valid', anchor } : { type: 'invalid', anchor };
}

function isConnectionAnchorHit(
  hit: unknown,
): hit is Readonly<{ type: 'connection-anchor'; nodeId: NodeId; role: 'source' | 'target' }> {
  return (
    typeof hit === 'object' &&
    hit !== null &&
    Reflect.get(hit, 'type') === 'connection-anchor' &&
    typeof Reflect.get(hit, 'nodeId') === 'string' &&
    (Reflect.get(hit, 'role') === 'source' || Reflect.get(hit, 'role') === 'target')
  );
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
  const source = Object.freeze({ nodeId: gesture.source.nodeId });
  const target = Object.freeze({ nodeId: gesture.target.anchor.nodeId });
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

function viewportsEqual(left: Viewport, right: Viewport): boolean {
  return left.x === right.x && left.y === right.y && left.zoom === right.zoom;
}
