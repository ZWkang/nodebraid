import type { ConnectionAnchorIdentity } from '@nodebraid/interaction-api';
import type { CanvasNode, CanvasSnapshot, EdgeEndpoint, NodeId, Point } from '@nodebraid/kernel';
import {
  getNodePortSnapshot,
  getPortDefinition,
  hasPortDefinitions,
  type PortRole,
  type PortSnapshot,
} from '@nodebraid/port-api';
import { RendererError } from '@nodebraid/renderer-api';

export interface SvgPortGeometry {
  readonly nodeId: NodeId;
  readonly portId: string;
  readonly role: PortRole;
  readonly worldPoint: Point;
}

export function getNodePortGeometries(node: CanvasNode, ports: PortSnapshot): readonly SvgPortGeometry[] {
  const snapshot = getNodePortSnapshot(ports, node.id);
  if (!snapshot || !node.size || node.size.width <= 0 || node.size.height <= 0) return [];
  return snapshot.ports.map((definition) => {
    const rolePorts = snapshot.ports.filter((candidate) => candidate.role === definition.role);
    const index = rolePorts.findIndex((candidate) => candidate.id === definition.id);
    return Object.freeze({
      nodeId: node.id,
      portId: definition.id,
      role: definition.role,
      worldPoint: Object.freeze({
        x: definition.role === 'source' ? node.position.x + node.size!.width : node.position.x,
        y: node.position.y + (node.size!.height * (index + 1)) / (rolePorts.length + 1),
      }),
    });
  });
}

export function resolveConnectionAnchorPoint(
  document: CanvasSnapshot,
  ports: PortSnapshot,
  anchor: ConnectionAnchorIdentity,
): Point {
  const node = document.nodes.find((candidate) => candidate.id === anchor.nodeId);
  if (!node?.size || node.size.width <= 0 || node.size.height <= 0) {
    throw new RendererError('INTERACTION_OUT_OF_SYNC', 'Connection Anchor Node is unavailable.', {
      issue: 'CONNECTION_ANCHOR_UNAVAILABLE',
    });
  }
  if (anchor.portId === undefined) {
    if (hasPortDefinitions(ports, anchor.nodeId)) {
      throw new RendererError('INTERACTION_OUT_OF_SYNC', 'Node-level Connection Anchor is unavailable.', {
        issue: 'NODE_ANCHOR_REPLACED_BY_PORTS',
      });
    }
    return Object.freeze({
      x: anchor.role === 'source' ? node.position.x + node.size.width : node.position.x,
      y: node.position.y + node.size.height / 2,
    });
  }
  const definition = getPortDefinition(ports, anchor.nodeId, anchor.portId);
  if (!definition || definition.role !== anchor.role) {
    throw new RendererError('INTERACTION_OUT_OF_SYNC', 'Connection Port is unavailable.', {
      issue: 'CONNECTION_PORT_UNAVAILABLE',
    });
  }
  const geometry = getNodePortGeometries(node, ports).find((candidate) => candidate.portId === anchor.portId);
  if (!geometry) throw new Error('Accepted Port Definition must have SVG Geometry.');
  return geometry.worldPoint;
}

export function resolveEdgeEndpointPoint(
  nodesById: ReadonlyMap<NodeId, CanvasNode>,
  ports: PortSnapshot,
  endpoint: EdgeEndpoint,
  role: PortRole,
  edgeId: string,
): Point {
  const node = nodesById.get(endpoint.nodeId);
  if (!node?.size) {
    throw new RendererError('INVALID_DOCUMENT_UPDATE', 'SVG Edge endpoints require sized Nodes.', {
      issue: 'MISSING_NODE_SIZE',
      edgeId,
    });
  }
  if (endpoint.portId === undefined) {
    return Object.freeze({
      x: node.position.x + node.size.width / 2,
      y: node.position.y + node.size.height / 2,
    });
  }
  const definition = getPortDefinition(ports, endpoint.nodeId, endpoint.portId);
  if (!definition || definition.role !== role) {
    throw new RendererError('INVALID_DOCUMENT_UPDATE', 'SVG Edge Port Geometry is unavailable.', {
      issue: 'UNAVAILABLE_PORT_GEOMETRY',
      edgeId,
      endpoint: role,
      portId: endpoint.portId,
    });
  }
  const geometry = getNodePortGeometries(node, ports).find((candidate) => candidate.portId === endpoint.portId);
  if (!geometry) throw new Error('Accepted Port Definition must have SVG Geometry.');
  return geometry.worldPoint;
}
