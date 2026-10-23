import { type ConnectionAnchorIdentity } from '@nodebraid/interaction-api';
import { edgeId, nodeId, type CanvasEdge, type EdgeEndpoint } from '@nodebraid/kernel';
import { defineCommand, type CommandHandler } from '@nodebraid/plugin-command';
import type { KernelService } from '@nodebraid/plugin-kernel';
import type { PortService } from '@nodebraid/plugin-port';
import type { CreateEdgeInput, CreateEdgeResult } from './contracts';
import { isRecord } from './canvas-value-validation';
import { InteractionError } from './interaction-error';
export const createEdgeCommand = defineCommand<CreateEdgeInput, CreateEdgeResult>('interaction.edge.create');
/** @internal */
export function createEdgeHandler(
  kernel: KernelService,
  ports: PortService,
): CommandHandler<CreateEdgeInput, CreateEdgeResult> {
  return (input, execution) => {
    execution.signal.throwIfAborted();
    const { edge, source, target } = captureCreateEdgeInput(input);
    const commit = kernel.transact(
      (transaction) => {
        if (source.role !== 'source' || target.role !== 'target') throwInvalidConnection();
        if (
          edge.source.nodeId !== source.nodeId ||
          edge.target.nodeId !== target.nodeId ||
          edge.source.portId !== source.portId ||
          edge.target.portId !== target.portId ||
          source.nodeId === target.nodeId
        )
          throwInvalidConnection();
        const sourceNode = transaction.query.getNode(source.nodeId),
          targetNode = transaction.query.getNode(target.nodeId);
        if (!sourceNode || !targetNode)
          throw new InteractionError('STALE_GESTURE', 'Create Edge Command Endpoint Node disappeared.');
        if (
          !ports.isConnectionTargetDefined(sourceNode, source) ||
          !ports.isConnectionTargetDefined(targetNode, target)
        )
          throw new InteractionError('STALE_GESTURE', 'Create Edge Command Port Definition changed.');
        if (transaction.query.getEdge(edge.id))
          throw new InteractionError('STALE_GESTURE', 'Create Edge Command Edge ID is no longer available.');
        transaction.edges.add(edge);
      },
      { origin: 'interaction', commandId: execution.commandId },
    );
    if (!commit) throw new Error('Create Edge Command must produce a Canvas Commit.');
    return commit;
  };
}
function captureCreateEdgeInput(value: unknown): CreateEdgeInput {
  if (!isRecord(value)) throwInvalidConnection();
  const edge = captureEdge(value.edge);
  const source = captureConnectionAnchor(value.source);
  const target = captureConnectionAnchor(value.target);
  return { edge, source, target };
}
function captureEdge(value: unknown): CanvasEdge {
  if (!isRecord(value)) throwInvalidConnection();
  const id = value.id;
  if (typeof id !== 'string' || id.length === 0) throwInvalidConnection();
  const type = value.type;
  if (typeof type !== 'string') throwInvalidConnection();
  const source = captureEndpoint(value.source),
    target = captureEndpoint(value.target);
  if (!('data' in value)) throwInvalidConnection();
  return {
    id: edgeId(id),
    type,
    source,
    target,
    // Keep opaque data at the Kernel Writer read phase after Command preflight.
    get data() {
      return value.data;
    },
  };
}
function captureEndpoint(value: unknown): EdgeEndpoint {
  if (!isRecord(value)) throwInvalidConnection();
  const id = value.nodeId;
  if (typeof id !== 'string' || id.length === 0) throwInvalidConnection();
  const portId = value.portId;
  if (portId !== undefined && typeof portId !== 'string') throwInvalidConnection();
  return { nodeId: nodeId(id), ...(portId === undefined ? {} : { portId }) };
}
function captureConnectionAnchor(value: unknown): ConnectionAnchorIdentity {
  if (!isRecord(value)) throwInvalidConnection();
  const id = value.nodeId;
  if (typeof id !== 'string' || id.length === 0) throwInvalidConnection();
  const portId = value.portId;
  if (portId !== undefined && (typeof portId !== 'string' || portId.length === 0)) throwInvalidConnection();
  const role = value.role;
  if (role !== 'source' && role !== 'target') throwInvalidConnection();
  return { nodeId: nodeId(id), ...(portId === undefined ? {} : { portId }), role };
}
function throwInvalidConnection(): never {
  throw new InteractionError('INVALID_CONNECTION', 'Create Edge Command input is invalid.');
}
