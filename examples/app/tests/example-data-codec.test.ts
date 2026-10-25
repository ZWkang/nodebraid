import { expect, test } from 'bun:test';
import { acceptCanvasFragment } from '@nodebraid/core';

import { exampleCanvasFragmentTextCodec } from '../src/example-runtime/clipboard-adapters';
import { exampleDataCodec } from '../src/example-runtime/example-data-codec';

test('Example document data round trips null and the explicit application record', () => {
  for (const value of [null, { label: 'Discover requirements', tags: ['saved', '中文'] }]) {
    expect(exampleDataCodec.decode(exampleDataCodec.encode(value))).toEqual(value);
  }
});

test('Example data rejects values outside the application schema rather than dropping them', () => {
  for (const value of [
    undefined,
    'label',
    new Date(),
    { label: 'name' },
    { label: 'name', tags: [42] },
    { label: 'name', tags: Array(1) },
    { label: 'name', tags: [], extra: true },
    { label: 'name', tags: [], [Symbol('extra')]: true },
  ]) {
    expect(() => exampleDataCodec.encode(value)).toThrow('Example data');
  }
  expect(() => exampleDataCodec.decode('{"label":42,"tags":[]}')).toThrow('Example data');
});

test('Example data validates and serializes the same captured tags', () => {
  const tags = ['saved'];
  let iteration = 0;
  Object.defineProperty(tags, Symbol.iterator, {
    value: function* () {
      iteration += 1;
      yield iteration === 1 ? 'saved' : 42;
    },
  });
  const text = exampleDataCodec.encode({ label: 'Captured', tags });
  expect(JSON.parse(text)).toEqual({ label: 'Captured', tags: ['saved'] });
  expect(exampleDataCodec.decode(text)).toEqual({ label: 'Captured', tags: ['saved'] });
});

test('Clipboard accepts the same business data as the Document file', () => {
  const text = JSON.stringify({
    type: 'nodebraid.examples/canvas-fragment',
    version: 1,
    fragment: {
      type: 'nodebraid.canvas-fragment',
      nodes: [{ id: 'business', type: 'step', position: { x: 1, y: 2 }, data: { label: 'A', tags: ['B'] } }],
      edges: [],
      selection: { nodeIds: ['business'], edgeIds: [] },
    },
  });
  const fragment = acceptCanvasFragment(exampleCanvasFragmentTextCodec.decode(text));
  expect(JSON.parse(exampleCanvasFragmentTextCodec.encode(fragment))).toEqual(JSON.parse(text));
});

test('Clipboard serializes the application data snapshot that passed validation', () => {
  const tags = ['saved'];
  let reads = 0;
  Object.defineProperty(tags, 0, { get: () => (reads++ === 0 ? 'saved' : 42) });
  const fragment = acceptCanvasFragment({
    type: 'nodebraid.canvas-fragment',
    nodes: [{ id: 'business', type: 'step', position: { x: 1, y: 2 }, data: { label: 'A', tags } }],
    edges: [],
    selection: { nodeIds: ['business'], edgeIds: [] },
  });
  const encoded = exampleCanvasFragmentTextCodec.encode(fragment);
  expect(JSON.parse(encoded).fragment.nodes[0].data).toEqual({ label: 'A', tags: ['saved'] });
});
