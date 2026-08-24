import { defineCommand, type CommandHandler } from '@cflow/plugin-command';
import type { KernelService } from '@cflow/plugin-kernel';

import type { CreateEdgeInput, CreateEdgeResult } from './contracts';
import { InteractionError } from './interaction-error';

export const createEdgeCommand = defineCommand<CreateEdgeInput, CreateEdgeResult>('interaction.edge.create');

/** @internal */
export function createEdgeHandler(kernel: KernelService): CommandHandler<CreateEdgeInput, CreateEdgeResult> {
  return (input, execution) => {
    execution.signal.throwIfAborted();
    assertCreateEdgeInput(input);
    const commit = kernel.transact(
      (transaction) => {
        if (input.source.role !== 'source' || input.target.role !== 'target') throwInvalidConnection();
        if (
          input.edge.source.nodeId !== input.source.nodeId ||
          input.edge.target.nodeId !== input.target.nodeId ||
          input.edge.source.portId !== undefined ||
          input.edge.target.portId !== undefined ||
          input.source.nodeId === input.target.nodeId
        ) {
          throwInvalidConnection();
        }
        if (!transaction.query.getNode(input.source.nodeId) || !transaction.query.getNode(input.target.nodeId)) {
          throw new InteractionError('STALE_GESTURE', 'Create Edge Command Endpoint Node disappeared.');
        }
        if (transaction.query.getEdge(input.edge.id)) {
          throw new InteractionError('STALE_GESTURE', 'Create Edge Command Edge ID is no longer available.');
        }
        transaction.edges.add(input.edge);
      },
      { origin: 'interaction', commandId: execution.commandId },
    );
    if (!commit) throw new Error('Create Edge Command must produce a Canvas Commit.');
    return commit;
  };
}

function assertCreateEdgeInput(value: unknown): asserts value is CreateEdgeInput {
  if (
    !isRecord(value) ||
    !isCanvasEdge(value.edge) ||
    !isConnectionAnchor(value.source) ||
    !isConnectionAnchor(value.target)
  ) {
    throwInvalidConnection();
  }
}

function isCanvasEdge(value: unknown): value is CreateEdgeInput['edge'] {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.type === 'string' &&
    'data' in value &&
    isEndpoint(value.source) &&
    isEndpoint(value.target)
  );
}

function isEndpoint(value: unknown): value is CreateEdgeInput['edge']['source'] {
  return (
    isRecord(value) &&
    typeof value.nodeId === 'string' &&
    value.nodeId.length > 0 &&
    (value.portId === undefined || typeof value.portId === 'string')
  );
}

function isConnectionAnchor(value: unknown): value is CreateEdgeInput['source'] {
  return (
    isRecord(value) &&
    typeof value.nodeId === 'string' &&
    value.nodeId.length > 0 &&
    (value.role === 'source' || value.role === 'target')
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function throwInvalidConnection(): never {
  throw new InteractionError('INVALID_CONNECTION', 'Create Edge Command input is invalid.');
}
