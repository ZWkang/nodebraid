import { type ConnectionAnchorIdentity } from '@nodebraid/interaction-api';
import {
  edgeId,
  nodeId,
  type CanvasEdge,
  type CanvasQuery,
  type CanvasNode,
  type EdgeEndpoint,
} from '@nodebraid/kernel';
import { defineCommand, type CommandHandler } from '@nodebraid/plugin-command';
import type { KernelService } from '@nodebraid/plugin-kernel';
import type { PortService } from '@nodebraid/plugin-port';
import type { CreateEdgeInput, CreateEdgeResult } from './contracts';
import { isRecord } from './canvas-value-validation';
import { isConnectionTargetDefined, type PortSnapshot } from '@nodebraid/port-api';
import { StaleConnection, RejectedConnection, type ConnectionRules } from './connection-rule';
import { InteractionError } from './interaction-error';
export const createEdgeCommand = defineCommand<CreateEdgeInput, CreateEdgeResult>('interaction.edge.create');
// Only classify errors produced for this invocation. Application callbacks can rethrow older errors.
export const creationFailures = new WeakMap<CreateEdgeInput, InteractionError>();
/** @internal */
export function createEdgeHandler(
  kernel: KernelService,
  ports: PortService,
  rules?: ConnectionRules,
): CommandHandler<CreateEdgeInput, CreateEdgeResult> {
  return (input, execution) => {
    execution.signal.throwIfAborted();
    const { edge, source, target } = captureCreateEdgeInput(input);
    const record = <E extends InteractionError>(error: E): E => {
      creationFailures.set(input, error);
      return error;
    };
    const stale = (message: string) => record(new StaleConnection(message));
    const nodesForConnection = (query: CanvasQuery) => {
      if (source.role !== 'source' || target.role !== 'target') throwInvalidConnection();
      if (
        edge.source.nodeId !== source.nodeId ||
        edge.target.nodeId !== target.nodeId ||
        edge.source.portId !== source.portId ||
        edge.target.portId !== target.portId ||
        source.nodeId === target.nodeId
      )
        throwInvalidConnection();
      const sourceNode = query.getNode(source.nodeId),
        targetNode = query.getNode(target.nodeId);
      if (!sourceNode || !targetNode) throw stale('Create Edge Command Endpoint Node disappeared.');
      return { sourceNode, targetNode };
    };
    const preflight = (query: CanvasQuery, snapshot?: PortSnapshot, check?: () => void) => {
      const { sourceNode, targetNode } = nodesForConnection(query);
      const defined = (node: CanvasNode, anchor: ConnectionAnchorIdentity) => {
        if (snapshot) return isConnectionTargetDefined(snapshot, anchor);
        const available = ports.isConnectionTargetDefined(node, anchor);
        check?.();
        return available;
      };
      if (!defined(sourceNode, source) || !defined(targetNode, target))
        throw stale('Create Edge Command Port Definition changed.');
      if (query.getEdge(edge.id)) throw stale('Create Edge Command Edge ID is no longer available.');
    };
    const accepted = rules?.evaluate(
      (evidence) => {
        preflight(evidence.view.query, evidence.ports);
        const decision = evidence.decide(edge.source, edge.target);
        if (decision.type === 'deny') throw record(new RejectedConnection(decision.reason));
        return evidence;
      },
      { signal: execution.signal, stale, preflight: (view, check) => preflight(view.query, undefined, check) },
    );
    const commit = kernel.transact(
      (transaction) => {
        accepted?.check();
        preflight(transaction.query, accepted?.ports);
        if (rules) rules.write(() => transaction.edges.add(edge));
        else transaction.edges.add(edge);
        accepted?.check();
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
