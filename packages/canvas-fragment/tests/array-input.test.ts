import { expect, test } from 'bun:test';
import { edgeId, nodeId } from '@nodebraid/kernel';

import { acceptCanvasFragment, materializeCanvasFragment, type CanvasFragmentNodeIdMapping } from '../src';

function fragmentInput() {
  const id = nodeId('source');
  return {
    type: 'nodebraid.canvas-fragment' as const,
    nodes: [{ id, type: 'task', position: { x: 0, y: 0 }, data: { opaque: true } }],
    edges: [
      {
        id: edgeId('loop'),
        type: 'flow',
        source: { nodeId: id, portId: 'out' },
        target: { nodeId: id, portId: 'in' },
        data: null,
      },
    ],
    selection: { nodeIds: [id], edgeIds: [edgeId('loop')] },
  };
}

function materializationInput() {
  return {
    nodes: [{ sourceId: nodeId('source'), materializedId: nodeId('copy') }],
    edges: [{ sourceId: edgeId('loop'), materializedId: edgeId('copy-loop') }],
  };
}

test('rejects malformed Fragment elements even when the array defines map', () => {
  const input = fragmentInput();
  input.nodes[0]!.position.x = Number.NaN;
  let mapped = false;
  Object.defineProperty(input.nodes, 'map', {
    value() {
      mapped = true;
      return [input.nodes[0]];
    },
  });

  expect(() => acceptCanvasFragment(input)).toThrow(
    expect.objectContaining({ domain: 'canvas-fragment', code: 'INVALID_FRAGMENT' }),
  );
  expect(mapped).toBe(false);
});

test('materializes the actual mapping elements even when the array defines map', () => {
  const mappings = materializationInput();
  let mapped = false;
  Object.defineProperty(mappings.nodes, 'map', {
    value(project: (value: CanvasFragmentNodeIdMapping) => unknown) {
      mapped = true;
      project(mappings.nodes[0]!);
      return [{ sourceId: nodeId('source'), materializedId: 42 }];
    },
  });

  const result = materializeCanvasFragment(fragmentInput(), mappings, { x: 0, y: 0 });

  expect(result.nodes[0]?.id).toBe(nodeId('copy'));
  expect(mapped).toBe(false);
});

test('validates every element within a Proxy array length', () => {
  const input = fragmentInput();
  input.nodes.push({ ...input.nodes[0]!, id: nodeId('invalid'), position: { x: Number.NaN, y: 0 } });
  input.nodes = new Proxy(input.nodes, {
    get(target, key, receiver) {
      return key === 'length' ? '2' : Reflect.get(target, key, receiver);
    },
  });

  expect(() => acceptCanvasFragment(input)).toThrow(
    expect.objectContaining({ domain: 'canvas-fragment', code: 'INVALID_FRAGMENT' }),
  );
});

test('accepts frozen array data without invoking method, iterator or constructor hooks', () => {
  const input = fragmentInput();
  const mappings = materializationInput();
  const hookError = new Error('array hooks must not choose Fragment contents');
  for (const values of [
    input.nodes,
    input.edges,
    input.selection.nodeIds,
    input.selection.edgeIds,
    mappings.nodes,
    mappings.edges,
  ]) {
    for (const key of ['map', 'constructor', Symbol.iterator]) {
      Object.defineProperty(values, key, {
        get() {
          throw hookError;
        },
      });
    }
    Object.freeze(values);
  }

  const accepted = acceptCanvasFragment(input);
  const result = materializeCanvasFragment(input, mappings, { x: 2, y: 3 });

  expect(accepted.nodes[0]?.id).toBe(nodeId('source'));
  expect(result.nodes[0]?.id).toBe(nodeId('copy'));
  expect(result.nodes[0]?.position).toEqual({ x: 2, y: 3 });
  expect(result.nodes[0]?.data).toBe(input.nodes[0]?.data);
  expect(Object.isFrozen(accepted.nodes[0])).toBe(true);
  expect(Object.isFrozen(result.nodes[0])).toBe(true);
});

for (const field of ['nodes', 'edges', 'selectionNodes', 'selectionEdges'] as const) {
  test(`rejects a missing Fragment ${field} element`, () => {
    const input = fragmentInput();
    const arrays = {
      nodes: input.nodes,
      edges: input.edges,
      selectionNodes: input.selection.nodeIds,
      selectionEdges: input.selection.edgeIds,
    };
    delete arrays[field][0];

    expect(() => acceptCanvasFragment(input)).toThrow(
      expect.objectContaining({ domain: 'canvas-fragment', code: 'INVALID_FRAGMENT' }),
    );
  });
}

for (const field of ['nodes', 'edges'] as const) {
  test(`rejects a missing ${field} materialization element`, () => {
    const mappings = materializationInput();
    delete mappings[field][0];

    expect(() => materializeCanvasFragment(fragmentInput(), mappings, { x: 0, y: 0 })).toThrow(
      expect.objectContaining({ domain: 'canvas-fragment', code: 'INVALID_MATERIALIZATION' }),
    );
  });
}

test('preserves an array element read failure', () => {
  const input = fragmentInput();
  const readError = new Error('element read failed');
  Object.defineProperty(input.nodes, '0', {
    get() {
      throw readError;
    },
  });
  let failure: unknown;
  try {
    acceptCanvasFragment(input);
  } catch (error) {
    failure = error;
  }

  expect(failure).toBe(readError);
});
