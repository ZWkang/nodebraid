import { expect, test } from 'bun:test';
import { createCanvasKernel, edgeId, nodeId } from '@nodebraid/kernel';
import { deserializeCanvasDocument, serializeCanvasDocument, type CanvasDocumentDataCodec } from '../src';

test('round-trips a complete Document and opaque application data without persisting runtime state', () => {
  const decodedData: Map<string, bigint>[] = [];
  const codec: CanvasDocumentDataCodec = {
    format: 'test/bigint-map-v1',
    encode(data) {
      if (!(data instanceof Map)) throw new Error('Expected business map.');
      return String(data.get('count'));
    },
    decode(text) {
      const value = new Map([['count', BigInt(text)]]);
      decodedData.push(value);
      return value;
    },
  };
  const kernel = createCanvasKernel();
  kernel.transact(({ nodes, edges }) => {
    nodes.add({
      id: nodeId('z-parent'),
      type: 'group',
      position: { x: -12, y: 9 },
      size: { width: 300, height: 200 },
      data: new Map([['count', 123n]]),
    });
    nodes.add({
      id: nodeId('a-child'),
      type: 'task',
      position: { x: 20, y: 30 },
      parentId: nodeId('z-parent'),
      data: new Map([['count', 456n]]),
    });
    edges.add({
      id: edgeId('edge'),
      type: 'flow',
      source: { nodeId: nodeId('z-parent'), portId: 'out' },
      target: { nodeId: nodeId('a-child'), portId: 'in' },
      data: new Map([['count', 789n]]),
    });
  });
  const original = kernel.read();
  const text = serializeCanvasDocument(original.snapshot, codec);
  const envelope = JSON.parse(text);
  expect(Object.keys(envelope).sort()).toEqual(['dataFormat', 'edges', 'nodes', 'type', 'version']);
  expect(envelope).toMatchObject({ type: 'nodebraid/document', version: 1, dataFormat: 'test/bigint-map-v1' });
  expect(envelope.nodes.map((node: { id: string }) => node.id)).toEqual(['a-child', 'z-parent']);
  expect(envelope.nodes.map((node: { data: string }) => node.data)).toEqual(['456', '123']);
  const restored = deserializeCanvasDocument(text, codec);
  expect(Object.keys(restored).sort()).toEqual(['edges', 'nodes']);
  expect(restored.nodes).toEqual(original.snapshot.nodes);
  expect(restored.edges).toEqual(original.snapshot.edges);
  expect(restored.nodes[0]!.data).toBe(decodedData[0]);
  expect(restored.edges[0]!.data).toBe(decodedData[2]);
  expect(kernel.read()).toBe(original);
  expect(Object.isFrozen(restored)).toBeTrue();
  expect(Object.isFrozen(restored.nodes)).toBeTrue();
  expect(Object.isFrozen(restored.nodes[0])).toBeTrue();
  expect(Object.isFrozen(restored.nodes[0]!.position)).toBeTrue();
  expect(Object.isFrozen(restored.edges[0]!.source)).toBeTrue();
  expect(Object.isFrozen(decodedData[0])).toBeFalse();
});

const textCodec: CanvasDocumentDataCodec = {
  format: 'test/text-v1',
  encode(data) {
    if (typeof data !== 'string') throw new Error('Expected application text.');
    return data;
  },
  decode: (text) => text,
};

function file() {
  return {
    type: 'nodebraid/document',
    version: 1,
    dataFormat: 'test/text-v1',
    nodes: [{ id: 'node', type: 'task', position: { x: 3, y: 4 }, data: 'value' }],
    edges: [
      {
        id: 'edge',
        type: 'flow',
        source: { nodeId: 'node', portId: 'out' },
        target: { nodeId: 'node' },
        data: 'edge value',
      },
    ],
  };
}

test('supports an empty Document and uses no codec calls when there are no entities', () => {
  const codec: CanvasDocumentDataCodec = {
    format: 'test/empty',
    encode() {
      throw new Error('No entity to encode.');
    },
    decode() {
      throw new Error('No entity to decode.');
    },
  };
  const text = serializeCanvasDocument(createCanvasKernel().read().snapshot, codec);
  expect(deserializeCanvasDocument(text, codec)).toEqual({ nodes: [], edges: [] });
});

test.each([
  ['wrong envelope type', { ...file(), type: 'nodebraid.canvas-fragment' }, 'INVALID_DOCUMENT'],
  ['unknown version', { ...file(), version: 2 }, 'UNSUPPORTED_VERSION'],
  ['wrong data format', { ...file(), dataFormat: 'another-application' }, 'DATA_FORMAT_MISMATCH'],
  ['non-object envelope', null, 'INVALID_DOCUMENT'],
  ['unknown envelope field', { ...file(), revision: 10 }, 'INVALID_DOCUMENT'],
  [
    'missing array',
    { type: 'nodebraid/document', version: 1, dataFormat: 'test/text-v1', edges: [] },
    'INVALID_DOCUMENT',
  ],
  ['non-array nodes', { ...file(), nodes: {} }, 'INVALID_DOCUMENT'],
  ['invalid node type', { ...file(), nodes: [{ ...file().nodes[0], type: false }] }, 'INVALID_DOCUMENT'],
  ['empty node ID', { ...file(), nodes: [{ ...file().nodes[0], id: '' }] }, 'INVALID_DOCUMENT'],
  ['string position', { ...file(), nodes: [{ ...file().nodes[0], position: { x: '3', y: 4 } }] }, 'INVALID_DOCUMENT'],
  ['unknown node field', { ...file(), nodes: [{ ...file().nodes[0], selected: true }] }, 'INVALID_DOCUMENT'],
  ['malformed size', { ...file(), nodes: [{ ...file().nodes[0], size: { width: 1 } }] }, 'INVALID_DOCUMENT'],
  ['invalid parent ID', { ...file(), nodes: [{ ...file().nodes[0], parentId: false }] }, 'INVALID_DOCUMENT'],
  ['malformed edge', { ...file(), edges: [{ ...file().edges[0], target: null }] }, 'INVALID_DOCUMENT'],
  [
    'invalid port ID',
    { ...file(), edges: [{ ...file().edges[0], source: { nodeId: 'node', portId: 3 } }] },
    'INVALID_DOCUMENT',
  ],
  ['non-text data on later edge', { ...file(), edges: [{ ...file().edges[0], data: {} }] }, 'INVALID_DOCUMENT'],
])('rejects %s before interpreting any application data', (_name, value, code) => {
  let interpreted = false;
  expect(() =>
    deserializeCanvasDocument(JSON.stringify(value), {
      ...textCodec,
      decode() {
        interpreted = true;
        return 'decoded';
      },
    }),
  ).toThrow(expect.objectContaining({ domain: 'document', code }));
  expect(interpreted).toBeFalse();
});

test.each([
  ['duplicate Node ID', { ...file(), nodes: [file().nodes[0], file().nodes[0]] }, 'ENTITY_ALREADY_EXISTS'],
  ['duplicate Edge ID', { ...file(), edges: [file().edges[0], file().edges[0]] }, 'ENTITY_ALREADY_EXISTS'],
  ['missing parent', { ...file(), nodes: [{ ...file().nodes[0], parentId: 'missing' }] }, 'INVALID_GRAPH'],
  ['self parent cycle', { ...file(), nodes: [{ ...file().nodes[0], parentId: 'node' }] }, 'INVALID_GRAPH'],
  ['missing endpoint', { ...file(), edges: [{ ...file().edges[0], target: { nodeId: 'missing' } }] }, 'INVALID_GRAPH'],
  ['negative size', { ...file(), nodes: [{ ...file().nodes[0], size: { width: -1, height: 2 } }] }, 'INVALID_GRAPH'],
])('rejects %s through the Kernel complete-graph contract', (_name, value, code) => {
  expect(() => deserializeCanvasDocument(JSON.stringify(value), textCodec)).toThrow(
    expect.objectContaining({ domain: 'kernel', code }),
  );
});

test('rejects malformed JSON and non-finite JSON geometry', () => {
  expect(() => deserializeCanvasDocument('{', textCodec)).toThrow(SyntaxError);
  const text = JSON.stringify(file()).replace('"x":3', '"x":1e309');
  expect(() => deserializeCanvasDocument(text, textCodec)).toThrow(expect.objectContaining({ code: 'INVALID_GRAPH' }));
});

test('preserves original application codec exceptions and rejects non-text encoding', () => {
  const failure = new Error('Business data is unsupported.');
  const snapshot = createCanvasKernel();
  snapshot.transact(({ nodes }) =>
    nodes.add({ id: nodeId('node'), type: 'task', position: { x: 0, y: 0 }, data: 'original' }),
  );
  const view = snapshot.read();
  expect(() =>
    serializeCanvasDocument(view.snapshot, {
      ...textCodec,
      encode() {
        throw failure;
      },
    }),
  ).toThrow(failure);
  expect(() =>
    deserializeCanvasDocument(JSON.stringify(file()), {
      ...textCodec,
      decode() {
        throw failure;
      },
    }),
  ).toThrow(failure);
  try {
    serializeCanvasDocument(view.snapshot, {
      ...textCodec,
      encode() {
        throw failure;
      },
    });
  } catch (error) {
    expect(error).toBe(failure);
  }
  try {
    deserializeCanvasDocument(JSON.stringify(file()), {
      ...textCodec,
      decode() {
        throw failure;
      },
    });
  } catch (error) {
    expect(error).toBe(failure);
  }
  expect(() =>
    serializeCanvasDocument(view.snapshot, {
      ...textCodec,
      encode: (() => undefined) as unknown as CanvasDocumentDataCodec['encode'],
    }),
  ).toThrow(expect.objectContaining({ code: 'INVALID_CODEC' }));
  expect(snapshot.read()).toBe(view);
});

test.each([null, {}, { ...textCodec, format: '' }, { ...textCodec, encode: null }, { ...textCodec, decode: null }])(
  'rejects invalid codec configuration',
  (codec) => {
    expect(() => deserializeCanvasDocument(JSON.stringify(file()), codec as CanvasDocumentDataCodec)).toThrow(
      expect.objectContaining({ code: 'INVALID_CODEC' }),
    );
  },
);
