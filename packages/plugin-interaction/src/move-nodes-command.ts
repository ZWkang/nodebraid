import { defineCommand, type CommandHandler } from '@cflow/plugin-command';
import type { KernelService } from '@cflow/plugin-kernel';

import type { MoveNodesInput, MoveNodesResult } from './contracts';
import { InteractionError } from './interaction-error';

export const moveNodesCommand = defineCommand<MoveNodesInput, MoveNodesResult>('interaction.nodes.move');

/** @internal */
export function createMoveNodesHandler(kernel: KernelService): CommandHandler<MoveNodesInput, MoveNodesResult> {
  return (input, execution) => {
    execution.signal.throwIfAborted();
    assertMoveNodesInput(input);
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
  };
}

function assertMoveNodesInput(value: unknown): asserts value is MoveNodesInput {
  if (!isRecord(value) || !Array.isArray(value.moves)) throwInvalidMoveInput();
  for (const move of value.moves) {
    if (
      !isRecord(move) ||
      typeof move.nodeId !== 'string' ||
      move.nodeId.length === 0 ||
      !isPoint(move.basePosition) ||
      !isPoint(move.position)
    ) {
      throwInvalidMoveInput();
    }
  }
}

function isPoint(value: unknown): value is Readonly<{ x: number; y: number }> {
  return isRecord(value) && typeof value.x === 'number' && typeof value.y === 'number';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function throwInvalidMoveInput(): never {
  throw new InteractionError('INVALID_MOVE', 'Move Nodes Command input is malformed.');
}
