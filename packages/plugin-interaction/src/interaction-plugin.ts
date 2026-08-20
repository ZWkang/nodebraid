import type { NodeId, Point } from '@cflow/kernel';
import { commandService } from '@cflow/plugin-command';
import { kernelService } from '@cflow/plugin-kernel';
import { rendererService } from '@cflow/plugin-renderer';
import { sessionService } from '@cflow/plugin-session';
import { definePlugin } from '@cflow/runtime-cordis';

import { computeClickSelection } from './selection-transition';
import type { MoveNodeInput } from './contracts';
import { InteractionError } from './interaction-error';
import { moveNodesCommand } from './move-nodes-command';

interface NodeDragCandidate {
  readonly pointerId: number;
  readonly startScreenPoint: Point;
  readonly startWorldPoint: Point;
  readonly nodes: readonly Readonly<{ nodeId: NodeId; basePosition: Point }>[];
  active: boolean;
  moves?: readonly MoveNodeInput[];
}

interface ViewportPanCandidate {
  readonly pointerId: number;
  readonly startScreenPoint: Point;
  readonly baseViewport: Readonly<{ x: number; y: number; zoom: number }>;
  active: boolean;
  viewport?: Readonly<{ x: number; y: number; zoom: number }>;
}

export const interactionPlugin = definePlugin({
  name: '@cflow/plugin-interaction',
  requires: {
    renderer: rendererService,
    session: sessionService,
    commands: commandService,
    kernel: kernelService,
  },
  setup(context) {
    const renderer = context.services.renderer;
    const session = context.services.session;
    const kernel = context.services.kernel;
    const commands = context.services.commands;
    const projection = renderer.bindInteractionProjection();
    context.own(() => projection.dispose());
    const moveRegistration = commands.register(moveNodesCommand, (input, execution) => {
      execution.signal.throwIfAborted();
      if (input.moves.length === 0) {
        throw new InteractionError('INVALID_MOVE', 'Move Nodes Command requires at least one Node.');
      }
      const seenNodeIds = new Set<string>();
      let previousNodeId: string | undefined;
      for (const move of input.moves) {
        if (seenNodeIds.has(move.nodeId)) {
          throw new InteractionError('INVALID_MOVE', 'Move Nodes Command Node IDs must be unique.');
        }
        seenNodeIds.add(move.nodeId);
        if (previousNodeId !== undefined && previousNodeId > move.nodeId) {
          throw new InteractionError('INVALID_MOVE', 'Move Nodes Command Node IDs must use canonical order.');
        }
        previousNodeId = move.nodeId;
        if (
          !Number.isFinite(move.basePosition.x) ||
          !Number.isFinite(move.basePosition.y) ||
          !Number.isFinite(move.position.x) ||
          !Number.isFinite(move.position.y)
        ) {
          throw new InteractionError('INVALID_MOVE', 'Move Nodes Command positions must be finite.');
        }
      }
      return kernel.transact(
        (transaction) => {
          for (const move of input.moves) {
            const node = transaction.query.getNode(move.nodeId);
            if (!node || node.position.x !== move.basePosition.x || node.position.y !== move.basePosition.y) {
              throw new InteractionError('STALE_GESTURE', 'Move Nodes Command source position is stale.');
            }
          }
          for (const move of input.moves) {
            const node = transaction.query.getNode(move.nodeId);
            if (!node) throw new InteractionError('STALE_GESTURE', 'Move Nodes Command target disappeared.');
            transaction.nodes.replace(move.nodeId, { ...node, position: move.position });
          }
        },
        { origin: 'interaction', commandId: execution.commandId },
      );
    });
    context.own(() => moveRegistration.dispose());

    let pressedPointerId: number | undefined;
    let completeClick: (() => void) | undefined;
    let nodeDragCandidate: NodeDragCandidate | undefined;
    let viewportPanCandidate: ViewportPanCandidate | undefined;
    let spacePressed = false;
    const stopInput = renderer.subscribeInput((input) => {
      if (input.type === 'key.down' || input.type === 'key.up') {
        if (input.code === 'Space') spacePressed = input.type === 'key.down';
        return;
      }
      if (input.type === 'focus.lost') {
        spacePressed = false;
        return;
      }
      if (input.type === 'focus.gained') return;
      if (input.type === 'wheel') {
        if (pressedPointerId !== undefined) return;
        const current = session.getSnapshot().viewport;
        const zoom = Math.max(0.1, Math.min(8, current.zoom * Math.exp(-input.deltaY * 0.002)));
        if (zoom === current.zoom) return;
        session.setViewport({
          x: input.screenPoint.x - input.worldPoint.x * zoom,
          y: input.screenPoint.y - input.worldPoint.y * zoom,
          zoom,
        });
        return;
      }
      if (input.type === 'pointer.down') {
        if (pressedPointerId !== undefined || input.button !== 'primary') return;
        const hit = renderer.hitTest(input.screenPoint);
        if (hit === null) return;
        renderer.focus();
        renderer.capturePointer(input.pointerId);
        pressedPointerId = input.pointerId;
        try {
          if (spacePressed) {
            viewportPanCandidate = {
              pointerId: input.pointerId,
              startScreenPoint: input.screenPoint,
              baseViewport: session.getSnapshot().viewport,
              active: false,
            };
            return;
          }
          const additive = input.modifiers.shift || input.modifiers.meta || input.modifiers.control;
          if (additive) {
            completeClick = () =>
              session.setSelection(computeClickSelection(session.getSnapshot().selection, hit, true));
            return;
          }
          if (hit.type === 'node') {
            const selection = session.getSnapshot().selection;
            const nodeIds = selection.nodeIds.includes(hit.nodeId) ? selection.nodeIds : [hit.nodeId];
            const view = kernel.read();
            nodeDragCandidate = {
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
            viewportPanCandidate = {
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
              completeClick = () =>
                session.setSelection(computeClickSelection(session.getSnapshot().selection, hit, false));
              return;
            }
          }
          session.setSelection(computeClickSelection(session.getSnapshot().selection, hit, false));
        } catch (error) {
          pressedPointerId = undefined;
          completeClick = undefined;
          nodeDragCandidate = undefined;
          viewportPanCandidate = undefined;
          try {
            renderer.releasePointer(input.pointerId);
          } catch (cleanupError) {
            throw new AggregateError([error, cleanupError], 'Interaction Input handling and cleanup both failed.');
          }
          throw error;
        }
        return;
      }
      if (input.type === 'pointer.move' && input.pointerId === pressedPointerId && nodeDragCandidate) {
        const screenDeltaX = input.screenPoint.x - nodeDragCandidate.startScreenPoint.x;
        const screenDeltaY = input.screenPoint.y - nodeDragCandidate.startScreenPoint.y;
        if (!nodeDragCandidate.active && Math.hypot(screenDeltaX, screenDeltaY) < 4) return;
        nodeDragCandidate.active = true;
        completeClick = undefined;
        const worldDeltaX = input.worldPoint.x - nodeDragCandidate.startWorldPoint.x;
        const worldDeltaY = input.worldPoint.y - nodeDragCandidate.startWorldPoint.y;
        const moves = nodeDragCandidate.nodes.map((node) => ({
          nodeId: node.nodeId,
          basePosition: node.basePosition,
          position: {
            x: node.basePosition.x + worldDeltaX,
            y: node.basePosition.y + worldDeltaY,
          },
        }));
        nodeDragCandidate.moves = moves;
        projection.update({
          type: 'node-drag',
          nodes: moves,
        });
        return;
      }
      if (input.type === 'pointer.move' && input.pointerId === pressedPointerId && viewportPanCandidate) {
        const deltaX = input.screenPoint.x - viewportPanCandidate.startScreenPoint.x;
        const deltaY = input.screenPoint.y - viewportPanCandidate.startScreenPoint.y;
        if (!viewportPanCandidate.active && Math.hypot(deltaX, deltaY) < 4) return;
        viewportPanCandidate.active = true;
        completeClick = undefined;
        const viewport = {
          x: viewportPanCandidate.baseViewport.x + deltaX,
          y: viewportPanCandidate.baseViewport.y + deltaY,
          zoom: viewportPanCandidate.baseViewport.zoom,
        };
        viewportPanCandidate.viewport = viewport;
        projection.update({
          type: 'viewport-pan',
          baseViewport: viewportPanCandidate.baseViewport,
          viewport,
        });
        return;
      }
      if (input.type === 'pointer.up' && input.pointerId === pressedPointerId) {
        pressedPointerId = undefined;
        if (nodeDragCandidate?.active) {
          const moves = nodeDragCandidate.moves;
          nodeDragCandidate = undefined;
          completeClick = undefined;
          projection.update(null);
          if (moves) {
            void commands.execute(moveNodesCommand, { moves }).catch((error) => {
              if (error instanceof InteractionError && error.code === 'STALE_GESTURE') {
                context.diagnostics.emit({
                  name: 'cflow.plugin.interaction.gesture.cancelled',
                  level: 'info',
                  attributes: { gestureType: 'node-drag', reason: 'stale' },
                });
                return;
              }
              context.diagnostics.reportFault(error, {
                name: 'cflow.plugin.interaction.command.fault',
                attributes: { gestureType: 'node-drag' },
              });
            });
          }
          return;
        }
        if (viewportPanCandidate?.active) {
          const viewport = viewportPanCandidate.viewport;
          viewportPanCandidate = undefined;
          completeClick = undefined;
          projection.update(null);
          if (viewport) session.setViewport(viewport);
          return;
        }
        nodeDragCandidate = undefined;
        viewportPanCandidate = undefined;
        const complete = completeClick;
        completeClick = undefined;
        complete?.();
      } else if (input.type === 'pointer.cancel' && input.pointerId === pressedPointerId) {
        pressedPointerId = undefined;
        completeClick = undefined;
        if (nodeDragCandidate?.active) projection.update(null);
        if (viewportPanCandidate?.active) projection.update(null);
        nodeDragCandidate = undefined;
        viewportPanCandidate = undefined;
      }
    });
    context.own(stopInput);
  },
});
