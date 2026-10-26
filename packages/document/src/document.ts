import {
  createCanvasKernel,
  edgeId,
  nodeId,
  type CanvasEdge,
  type CanvasNode,
  type CanvasSnapshot,
  type EdgeEndpoint,
} from '@nodebraid/kernel';

import type { CanvasDocumentDataCodec, DecodedCanvasDocument } from './contracts';
import { CanvasDocumentError } from './document-error';

/** Captures the complete graph before invoking the application-owned codec. */
export function serializeCanvasDocument(snapshot: CanvasSnapshot, codec: CanvasDocumentDataCodec): string {
  const capturedCodec = captureCodec(codec);
  const source = requireRecord(snapshot);
  const nodes = source.nodes;
  const edges = source.edges;
  const graph = captureGraph(nodes, edges, false);
  const encode = (data: unknown): string => {
    const text = capturedCodec.encode(data);
    if (typeof text !== 'string') {
      throw new CanvasDocumentError('INVALID_CODEC', 'Document data codec must encode each value as a string.');
    }
    return text;
  };
  return JSON.stringify({
    type: 'nodebraid/document',
    version: 1,
    dataFormat: capturedCodec.format,
    nodes: graph.nodes.map((node) => ({ ...node, data: encode(node.data) })),
    edges: graph.edges.map((edge) => ({ ...edge, data: encode(edge.data) })),
  });
}

/** Validates a complete file without touching any active Canvas Runtime. */
export function deserializeCanvasDocument(text: string, codec: CanvasDocumentDataCodec): DecodedCanvasDocument {
  const capturedCodec = captureCodec(codec);
  if (typeof text !== 'string') invalid('Serialized Document must be text.');
  const envelope = captureRecord(JSON.parse(text), ['type', 'version', 'dataFormat', 'nodes', 'edges']);
  if (envelope.type !== 'nodebraid/document') invalid('Serialized Document type must be nodebraid/document.');
  if (envelope.version !== 1) {
    throw new CanvasDocumentError('UNSUPPORTED_VERSION', 'Serialized Document version must be 1.');
  }
  if (envelope.dataFormat !== capturedCodec.format) {
    throw new CanvasDocumentError('DATA_FORMAT_MISMATCH', 'Serialized Document data format does not match the codec.');
  }
  const graph = captureGraph(envelope.nodes, envelope.edges, true);
  // Only opaque data changes after Kernel validation; the graph's owned shells remain frozen.
  return Object.freeze({
    nodes: Object.freeze(
      graph.nodes.map((node) => Object.freeze({ ...node, data: capturedCodec.decode(node.data as string) })),
    ),
    edges: Object.freeze(
      graph.edges.map((edge) => Object.freeze({ ...edge, data: capturedCodec.decode(edge.data as string) })),
    ),
  });
}

function captureCodec(value: CanvasDocumentDataCodec): CanvasDocumentDataCodec {
  if (typeof value !== 'object' || value === null) {
    throw new CanvasDocumentError('INVALID_CODEC', 'Document data codec must be an object.');
  }
  const format = value.format;
  const encode = value.encode;
  const decode = value.decode;
  if (typeof format !== 'string' || !format.trim() || typeof encode !== 'function' || typeof decode !== 'function') {
    throw new CanvasDocumentError(
      'INVALID_CODEC',
      'Document data codec requires a format and encode/decode functions.',
    );
  }
  return {
    format,
    encode: (data) => Reflect.apply(encode, value, [data]),
    decode: (text) => Reflect.apply(decode, value, [text]),
  };
}

function captureGraph(nodesValue: unknown, edgesValue: unknown, encoded: boolean): DecodedCanvasDocument {
  const nodes = captureArray(nodesValue, (value) => captureNode(value, encoded));
  const edges = captureArray(edgesValue, (value) => captureEdge(value, encoded));
  const kernel = createCanvasKernel();
  kernel.transact((transaction) => {
    for (const node of nodes) transaction.nodes.add(node);
    for (const edge of edges) transaction.edges.add(edge);
  });
  const snapshot = kernel.read().snapshot;
  return { nodes: snapshot.nodes, edges: snapshot.edges };
}

function captureNode(value: unknown, encoded: boolean): CanvasNode {
  const node = captureRecord(
    value,
    ['id', 'type', 'position', 'size', 'parentId', 'data'],
    ['id', 'type', 'position', 'data'],
    encoded,
  );
  const position = captureRecord(node.position, ['x', 'y'], undefined, encoded);
  const x = requireNumber(position.x, 'Node position x');
  const y = requireNumber(position.y, 'Node position y');
  const size = node.size === undefined ? undefined : captureRecord(node.size, ['width', 'height'], undefined, encoded);
  return {
    id: nodeId(requireId(node.id)),
    type: requireString(node.type, 'Node type'),
    position: { x, y },
    ...(size === undefined
      ? {}
      : {
          size: { width: requireNumber(size.width, 'Node width'), height: requireNumber(size.height, 'Node height') },
        }),
    ...(node.parentId === undefined ? {} : { parentId: nodeId(requireId(node.parentId)) }),
    data: encoded ? requireString(node.data, 'Encoded Node data') : node.data,
  };
}

function captureEdge(value: unknown, encoded: boolean): CanvasEdge {
  const edge = captureRecord(value, ['id', 'type', 'source', 'target', 'data'], undefined, encoded);
  return {
    id: edgeId(requireId(edge.id)),
    type: requireString(edge.type, 'Edge type'),
    source: captureEndpoint(edge.source, encoded),
    target: captureEndpoint(edge.target, encoded),
    data: encoded ? requireString(edge.data, 'Encoded Edge data') : edge.data,
  };
}

function captureEndpoint(value: unknown, encoded: boolean): EdgeEndpoint {
  const endpoint = captureRecord(value, ['nodeId', 'portId'], ['nodeId'], encoded);
  return {
    nodeId: nodeId(requireId(endpoint.nodeId)),
    ...(endpoint.portId === undefined ? {} : { portId: requireString(endpoint.portId, 'Endpoint port ID') }),
  };
}

function captureRecord(
  value: unknown,
  allowed: readonly string[],
  required: readonly string[] = allowed,
  fromFile = true,
): Record<string, unknown> {
  const source = requireRecord(value);
  if (fromFile && Reflect.ownKeys(source).some((key) => typeof key !== 'string' || !allowed.includes(key))) {
    invalid('Document contains an unknown field.');
  }
  const keys = allowed.filter((key) => (fromFile ? Object.hasOwn(source, key) : key in source));
  if (required.some((key) => !keys.includes(key))) invalid('Document is missing a required field.');
  const captured: Record<string, unknown> = {};
  for (const key of keys) captured[key] = source[key];
  return captured;
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalid('Document field must be an object.');
  return value as Record<string, unknown>;
}

function captureArray<Value>(value: unknown, capture: (item: unknown) => Value): Value[] {
  if (!Array.isArray(value)) invalid('Document entities must be arrays.');
  // Read actual indexed values; caller-owned iterators, map and species do not control validation.
  const length = +value.length;
  const captured: Value[] = [];
  for (const index of Array.prototype.keys.call({ length })) captured.push(capture(value[index]));
  return captured;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') invalid(`${field} must be a string.`);
  return value;
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== 'number') invalid(`${field} must be a number.`);
  return value;
}

function requireId(value: unknown): string {
  const id = requireString(value, 'Document entity reference');
  if (!id.length) invalid('Document entity references must not be empty.');
  return id;
}

function invalid(message: string): never {
  throw new CanvasDocumentError('INVALID_DOCUMENT', message);
}
