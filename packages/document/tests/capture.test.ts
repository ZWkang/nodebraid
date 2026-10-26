import { expect, test } from 'bun:test';
import { edgeId, nodeId, type CanvasSnapshot } from '@nodebraid/kernel';

import { deserializeCanvasDocument, serializeCanvasDocument, type CanvasDocumentDataCodec } from '../src';

const codec: CanvasDocumentDataCodec = {
  format: 'test/reference-v1',
  encode: () => 'opaque',
  decode: () => undefined,
};

function snapshot(): CanvasSnapshot {
  return {
    revision: 999,
    nodes: [
      { id: nodeId('z'), type: 'task', position: { x: 1, y: 2 }, data: undefined },
      { id: nodeId('a'), type: 'task', position: { x: 3, y: 4 }, data: null },
    ],
    edges: [
      {
        id: edgeId('z-edge'),
        type: 'flow',
        source: { nodeId: nodeId('z') },
        target: { nodeId: nodeId('a') },
        data: undefined,
      },
      {
        id: edgeId('a-edge'),
        type: 'flow',
        source: { nodeId: nodeId('a'), portId: '' },
        target: { nodeId: nodeId('a') },
        data: null,
      },
    ],
  };
}

test('captures getters once and preserves the graph even when application encoding changes its source', () => {
  const original = snapshot();
  const node = original.nodes[0]!;
  const reads = { nodes: 0, edges: 0, nodeId: 0, position: 0, x: 0, data: 0, format: 0, encode: 0, decode: 0 };
  const position = {
    get x() {
      reads.x++;
      return 1;
    },
    y: 2,
  };
  const value = new Proxy(
    {},
    {
      ownKeys() {
        throw new Error('Opaque data was traversed.');
      },
    },
  );
  const capturedNode = {
    ...node,
    get id() {
      reads.nodeId++;
      return node.id;
    },
    get position() {
      reads.position++;
      return position;
    },
    get data() {
      reads.data++;
      return value;
    },
  };
  const input = {
    get revision(): number {
      throw new Error('A runtime revision is not serialized.');
    },
    get nodes() {
      reads.nodes++;
      return [capturedNode, original.nodes[1]!];
    },
    get edges() {
      reads.edges++;
      return original.edges;
    },
  };
  const changingCodec = {
    get format() {
      reads.format++;
      return 'test/reference-v1';
    },
    get encode() {
      reads.encode++;
      return function (this: typeof changingCodec, data: unknown) {
        expect(this).toBe(changingCodec);
        Object.defineProperty(position, 'x', { value: 999 });
        return data === value ? 'reference' : 'other';
      };
    },
    get decode() {
      reads.decode++;
      return () => value;
    },
  };

  const text = serializeCanvasDocument(input, changingCodec);
  expect(JSON.parse(text).nodes[1].position).toEqual({ x: 1, y: 2 });
  expect(JSON.parse(text).nodes[1].data).toBe('reference');
  expect(reads).toEqual({ nodes: 1, edges: 1, nodeId: 1, position: 1, x: 1, data: 1, format: 1, encode: 1, decode: 1 });
  const restored = deserializeCanvasDocument(text, changingCodec);
  expect(restored.nodes[1]!.data).toBe(value);
});

test('normalizes valid graph ordering and ignores caller array iteration hooks', () => {
  const source = snapshot();
  Object.defineProperties(source.nodes, {
    map: {
      value() {
        throw new Error('Caller map must not run.');
      },
    },
    [Symbol.iterator]: {
      value() {
        throw new Error('Caller iterator must not run.');
      },
    },
  });
  const document = JSON.parse(serializeCanvasDocument(source, codec));
  expect(document.nodes.map((node: { id: string }) => node.id)).toEqual(['a', 'z']);
  expect(document.edges.map((edge: { id: string }) => edge.id)).toEqual(['a-edge', 'z-edge']);
  expect(document.edges[0].source.portId).toBe('');
  const restored = deserializeCanvasDocument(JSON.stringify(document), codec);
  expect(restored.nodes[0]).toHaveProperty('data', undefined);
  expect(serializeCanvasDocument(source, codec)).toBe(JSON.stringify(document));
});

test('rejects sparse arrays and malformed owned export fields instead of losing information', () => {
  const sparse = [snapshot().nodes[0]!];
  delete sparse[0];
  expect(() => serializeCanvasDocument({ ...snapshot(), nodes: sparse }, codec)).toThrow(
    expect.objectContaining({ code: 'INVALID_DOCUMENT' }),
  );
  const source = snapshot();
  const invalid = { ...source.nodes[0]!, position: { x: Infinity, y: 1 } };
  expect(() => serializeCanvasDocument({ ...source, nodes: [invalid, source.nodes[1]!] }, codec)).toThrow(
    expect.objectContaining({ code: 'INVALID_GRAPH' }),
  );
  const extraFields = { ...source, nodes: [{ ...source.nodes[0]!, extra: 'not persisted' }, source.nodes[1]!] };
  expect(JSON.parse(serializeCanvasDocument(extraFields, codec)).nodes[1]).not.toHaveProperty('extra');
});

test('calls the original codec methods with their receiver when their bind property is overridden', () => {
  const decoded = { business: 'original' };
  const applicationCodec: CanvasDocumentDataCodec = {
    format: 'test/method-receiver-v1',
    encode() {
      expect(this).toBe(applicationCodec);
      return 'original';
    },
    decode(text) {
      expect(this).toBe(applicationCodec);
      expect(text).toBe('original');
      return decoded;
    },
  };
  Object.defineProperty(applicationCodec.encode, 'bind', { value: () => () => 'replacement encoder' });
  Object.defineProperty(applicationCodec.decode, 'bind', { value: () => () => ({ business: 'replacement decoder' }) });
  const text = serializeCanvasDocument(snapshot(), applicationCodec);
  const restored = deserializeCanvasDocument(text, applicationCodec);
  expect(JSON.parse(text).nodes[0].data).toBe('original');
  expect(restored.nodes[0]!.data).toBe(decoded);
  expect(restored.edges[0]!.data).toBe(decoded);
});

test('captures typed class getters and extra application fields without requiring own enumerable storage', () => {
  const reads = new Map<string, number>();
  const read = <Value>(name: string, value: Value): Value => {
    reads.set(name, (reads.get(name) ?? 0) + 1);
    return value;
  };
  class Position {
    get x() {
      return read('position.x', 10);
    }
    get y() {
      return read('position.y', 20);
    }
  }
  class Dimensions {
    get width() {
      return read('size.width', 30);
    }
    get height() {
      return read('size.height', 40);
    }
  }
  class NodeValue {
    extraApplicationState = 'not a file field';
    get id() {
      return read('node.id', nodeId('node'));
    }
    get type() {
      return read('node.type', 'task');
    }
    get position() {
      return read('node.position', new Position());
    }
    get size() {
      return read('node.size', new Dimensions());
    }
    get parentId() {
      return read('node.parentId', undefined);
    }
    get data() {
      return read('node.data', 42n);
    }
  }
  class Endpoint {
    constructor(readonly label: string) {}
    get nodeId() {
      return read(`${this.label}.nodeId`, nodeId('node'));
    }
    get portId() {
      return read(`${this.label}.portId`, this.label);
    }
  }
  class EdgeValue {
    get id() {
      return read('edge.id', edgeId('edge'));
    }
    get type() {
      return read('edge.type', 'flow');
    }
    get source() {
      return read('edge.source', new Endpoint('source'));
    }
    get target() {
      return read('edge.target', new Endpoint('target'));
    }
    get data() {
      return read('edge.data', 84n);
    }
  }
  class SnapshotValue implements CanvasSnapshot {
    get revision(): number {
      throw new Error('Runtime revision must not be read.');
    }
    get nodes() {
      return read('snapshot.nodes', [new NodeValue()]);
    }
    get edges() {
      return read('snapshot.edges', [new EdgeValue()]);
    }
  }
  const applicationCodec: CanvasDocumentDataCodec = {
    format: 'test/class-values-v1',
    encode(data) {
      return String(data);
    },
    decode(text) {
      return BigInt(text);
    },
  };
  const text = serializeCanvasDocument(new SnapshotValue(), applicationCodec);
  expect(JSON.parse(text).nodes).toEqual([
    { id: 'node', type: 'task', position: { x: 10, y: 20 }, size: { width: 30, height: 40 }, data: '42' },
  ]);
  expect(JSON.parse(text).edges).toEqual([
    {
      id: 'edge',
      type: 'flow',
      source: { nodeId: 'node', portId: 'source' },
      target: { nodeId: 'node', portId: 'target' },
      data: '84',
    },
  ]);
  expect(new Set(reads.values())).toEqual(new Set([1]));
  expect(deserializeCanvasDocument(text, applicationCodec).nodes[0]!.data).toBe(42n);
});

test('still rejects a genuinely missing required source field', () => {
  const source = snapshot();
  Reflect.deleteProperty(source.nodes[0]!, 'data');
  expect(() => serializeCanvasDocument(source, codec)).toThrow(expect.objectContaining({ code: 'INVALID_DOCUMENT' }));
});

test('Document preserves a first entity getter failure before allocating a virtual array', () => {
  const source = snapshot();
  const failure = new Error('First Document Node getter failed.');
  let indexReads = 0;
  const nodes = new Proxy([...source.nodes], {
    get(target, key, receiver) {
      if (key === 'length') return Infinity;
      if (key === '0') {
        indexReads += 1;
        throw failure;
      }
      return Reflect.get(target, key, receiver);
    },
  });
  let rejected = false,
    caught: unknown;
  try {
    serializeCanvasDocument({ ...source, nodes }, codec);
  } catch (error) {
    rejected = true;
    caught = error;
  }
  expect(rejected).toBe(true);
  expect(caught).toBe(failure);
  expect(indexReads).toBe(1);
});

for (const field of ['nodes', 'edges'] as const) {
  for (const length of [1, 4294967296, Infinity]) {
    test.each(['malformed', 'throwing'] as const)(
      'Document preserves first %s ' + field + ' failure at length ' + String(length),
      (mode) => {
        const source = snapshot(),
          failure = new Error('Original first ' + field + ' failure.');
        const calls: string[] = [];
        let codecCalls = 0;
        const values = new Proxy([...source[field]], {
          get(target, key, receiver) {
            if (key === 'length') {
              expect(receiver).toBe(values);
              calls.push('length');
              return length;
            }
            if (key === '0') {
              expect(receiver).toBe(values);
              calls.push('0');
              if (mode === 'throwing') throw failure;
              return null;
            }
            if (key === '1') throw new Error('A later entity cannot hide the first failure.');
            return Reflect.get(target, key, receiver);
          },
        });
        let rejected = false,
          caught: unknown;
        try {
          serializeCanvasDocument({ ...source, [field]: values } as CanvasSnapshot, {
            ...codec,
            encode(data) {
              codecCalls += 1;
              return codec.encode(data);
            },
          });
        } catch (error) {
          rejected = true;
          caught = error;
        }
        expect(rejected).toBe(true);
        if (mode === 'throwing') expect(caught).toBe(failure);
        else expect(caught).toMatchObject({ domain: 'document', code: 'INVALID_DOCUMENT' });
        expect(calls).toEqual(['length', '0']);
        expect(codecCalls).toBe(0);
      },
    );
  }

  for (const boundary of ['length', 'index'] as const) {
    test.each([undefined, null, false, 0, '', Symbol('Document read'), new Error('Document read')])(
      'Document preserves original ' + field + ' ' + boundary + ' failure %p',
      (failure) => {
        const source = snapshot();
        let reads = 0,
          codecCalls = 0;
        const values = new Proxy([...source[field]], {
          get(target, key, receiver) {
            if (key === (boundary === 'length' ? 'length' : '0')) {
              reads += 1;
              throw failure;
            }
            if (key === 'length') return Infinity;
            return Reflect.get(target, key, receiver);
          },
        });
        let rejected = false,
          caught: unknown;
        try {
          serializeCanvasDocument({ ...source, [field]: values } as CanvasSnapshot, {
            ...codec,
            encode(data) {
              codecCalls += 1;
              return codec.encode(data);
            },
          });
        } catch (error) {
          rejected = true;
          caught = error;
        }
        expect(rejected).toBe(true);
        expect(caught).toBe(failure);
        expect(reads).toBe(1);
        expect(codecCalls).toBe(0);
      },
    );
  }

  test('Document retains native empty lengths and failures for ' + field, () => {
    const empty: CanvasSnapshot = { revision: 0, nodes: [], edges: [] };
    for (const length of [undefined, null, NaN, -Infinity, -1, 0, 0.9, '0.9', 'invalid']) {
      let reads = 0;
      const values = new Proxy([], {
        get(target, key, receiver) {
          if (key === 'length') {
            reads += 1;
            return length;
          }
          return Reflect.get(target, key, receiver);
        },
      });
      const text = serializeCanvasDocument(
        { ...empty, [field]: values },
        {
          ...codec,
          encode() {
            throw new Error('Empty graph must not invoke codec');
          },
        },
      );
      expect(deserializeCanvasDocument(text, codec)).toEqual({ nodes: [], edges: [] });
      expect(reads).toBe(1);
    }
    for (const length of [1n, Symbol('length')]) {
      const values = new Proxy([], {
        get(target, key, receiver) {
          if (key === 'length') return length;
          return Reflect.get(target, key, receiver);
        },
      });
      expect(() => serializeCanvasDocument({ ...empty, [field]: values }, codec)).toThrow(TypeError);
    }
  });

  test('Document captures fractional native length and first indexed values without caller hooks for ' + field, () => {
    const source = snapshot(),
      original = source[field][0];
    let lengthReads = 0,
      coercions = 0,
      firstReads = 0,
      hookReads = 0;
    const values = new Proxy([...source[field]], {
      get(target, key, receiver) {
        if (key === 'length') {
          lengthReads += 1;
          if (lengthReads > 1) throw new Error('Repeated length read');
          return {
            valueOf() {
              coercions += 1;
              if (coercions > 1) throw new Error('Repeated length coercion');
              return 2.9;
            },
          };
        }
        if (key === '0') {
          firstReads += 1;
          if (firstReads > 1) throw new Error('Repeated entity read');
          return original;
        }
        if ([Symbol.iterator, 'map', 'every', 'filter', 'constructor', Symbol.species].includes(key)) {
          hookReads += 1;
          throw new Error('Caller collection hook must not run');
        }
        return Reflect.get(target, key, receiver);
      },
    });
    const file = JSON.parse(serializeCanvasDocument({ ...source, [field]: values } as CanvasSnapshot, codec));
    expect(file.nodes.map((node: { id: string }) => node.id)).toEqual(['a', 'z']);
    expect(file.edges.map((edge: { id: string }) => edge.id)).toEqual(['a-edge', 'z-edge']);
    expect(file.edges[0].source.portId).toBe('');
    expect(deserializeCanvasDocument(JSON.stringify(file), codec).nodes).toHaveLength(2);
    expect(lengthReads).toBe(1);
    expect(coercions).toBe(1);
    expect(firstReads).toBe(1);
    expect(hookReads).toBe(0);
  });
}
