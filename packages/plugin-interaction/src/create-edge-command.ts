import { defineCommand, type CommandHandler } from '@nodebraid/plugin-command';
import type { KernelService } from '@nodebraid/plugin-kernel';
import type { PortService } from '@nodebraid/plugin-port';
import { getPortDefinition, hasPortDefinitions, type PortSnapshot } from '@nodebraid/port-api';

import type { CreateEdgeInput, CreateEdgeResult } from './contracts';
import { isCanvasEdge, isRecord } from './canvas-value-validation';
import { InteractionError } from './interaction-error';

export const createEdgeCommand = defineCommand<CreateEdgeInput, CreateEdgeResult>('interaction.edge.create');

/** @internal */
export function createEdgeHandler(
  kernel: KernelService,
  ports: PortService,
): CommandHandler<CreateEdgeInput, CreateEdgeResult> {
  return (input, execution) => {
    execution.signal.throwIfAborted();
    assertCreateEdgeInput(input);
    const portSnapshot = ports.snapshot(kernel.read().snapshot);
    const commit = kernel.transact(
      (transaction) => {
        if (input.source.role !== 'source' || input.target.role !== 'target') throwInvalidConnection();
        if (
          input.edge.source.nodeId !== input.source.nodeId ||
          input.edge.target.nodeId !== input.target.nodeId ||
          input.edge.source.portId !== input.source.portId ||
          input.edge.target.portId !== input.target.portId ||
          input.source.nodeId === input.target.nodeId
        ) {
          throwInvalidConnection();
        }
        if (!transaction.query.getNode(input.source.nodeId) || !transaction.query.getNode(input.target.nodeId)) {
          throw new InteractionError('STALE_GESTURE', 'Create Edge Command Endpoint Node disappeared.');
        }
        if (
          !connectionAnchorAvailable(input.source, portSnapshot) ||
          !connectionAnchorAvailable(input.target, portSnapshot)
        ) {
          throw new InteractionError('STALE_GESTURE', 'Create Edge Command Port Definition changed.');
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

function isConnectionAnchor(value: unknown): value is CreateEdgeInput['source'] {
  return (
    isRecord(value) &&
    typeof value.nodeId === 'string' &&
    value.nodeId.length > 0 &&
    (value.portId === undefined || (typeof value.portId === 'string' && value.portId.length > 0)) &&
    (value.role === 'source' || value.role === 'target')
  );
}

function connectionAnchorAvailable(anchor: CreateEdgeInput['source'], ports: PortSnapshot): boolean {
  if (anchor.portId === undefined) return !hasPortDefinitions(ports, anchor.nodeId);
  return getPortDefinition(ports, anchor.nodeId, anchor.portId)?.role === anchor.role;
}

function throwInvalidConnection(): never {
  throw new InteractionError('INVALID_CONNECTION', 'Create Edge Command input is invalid.');
}
