import { nodeId, type Point } from '@nodebraid/kernel';
import { defineCommand, type CommandHandler } from '@nodebraid/plugin-command';
import type { KernelService } from '@nodebraid/plugin-kernel';

import type { MoveNodeInput, MoveNodesInput, MoveNodesResult } from './contracts';
import { isRecord } from './canvas-value-validation';
import { InteractionError } from './interaction-error';

export const moveNodesCommand = defineCommand<MoveNodesInput, MoveNodesResult>('interaction.nodes.move');

/** @internal */
export function createMoveNodesHandler(kernel: KernelService): CommandHandler<MoveNodesInput, MoveNodesResult> {
  return (input, execution) => {
    execution.signal.throwIfAborted();
    const moves = captureMoveNodesInput(input);
    if (moves.length === 0) {
      throw new InteractionError('INVALID_MOVE', 'Move Nodes Command requires at least one Node.');
    }
    const seenNodeIds = new Set<string>();
    let previousNodeId: string | undefined;
    for (const move of moves) {
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
        for (const move of moves) {
          const node = transaction.query.getNode(move.nodeId);
          if (!node || node.position.x !== move.basePosition.x || node.position.y !== move.basePosition.y) {
            throw new InteractionError('STALE_GESTURE', 'Move Nodes Command source position is stale.');
          }
        }
        for (const move of moves) {
          const node = transaction.query.getNode(move.nodeId);
          if (!node) throw new InteractionError('STALE_GESTURE', 'Move Nodes Command target disappeared.');
          transaction.nodes.replace(move.nodeId, { ...node, position: move.position });
        }
      },
      { origin: 'interaction', commandId: execution.commandId },
    );
  };
}

function captureMoveNodesInput(value: unknown): readonly MoveNodeInput[] {
  if (!isRecord(value)) throwInvalidMoveInput();
  const moves = value.moves;
  if (!Array.isArray(moves)) throwInvalidMoveInput();
  const length = +moves.length;
  const captured: MoveNodeInput[] = [];
  // Keep native length coercion and lazy indices without trusting caller traversal hooks.
  for (const index of Array.prototype.keys.call({ length })) {
    const move: unknown = moves[index];
    if (!isRecord(move)) throwInvalidMoveInput();
    const id = move.nodeId;
    if (typeof id !== 'string' || id.length === 0) throwInvalidMoveInput();
    const basePosition = captureMovePoint(move.basePosition);
    const position = captureMovePoint(move.position);
    captured.push({ nodeId: nodeId(id), basePosition, position });
  }
  return captured;
}

function captureMovePoint(value: unknown): Point {
  if (!isRecord(value)) throwInvalidMoveInput();
  const x = value.x;
  if (typeof x !== 'number') throwInvalidMoveInput();
  const y = value.y;
  if (typeof y !== 'number') throwInvalidMoveInput();
  return { x, y };
}

function throwInvalidMoveInput(): never {
  throw new InteractionError('INVALID_MOVE', 'Move Nodes Command input is malformed.');
}
