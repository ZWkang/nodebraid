import { expect, test } from 'bun:test';

import * as core from '../src';

test('Core facade exports Basic Canvas Composition without a concrete Renderer', () => {
  const exports = core as Readonly<Record<string, unknown>>;

  expect({
    createBasicCanvasPlugin: typeof exports.createBasicCanvasPlugin,
    concreteSvgRendererLeaked: 'createSvgRenderer' in exports,
  }).toEqual({
    createBasicCanvasPlugin: 'function',
    concreteSvgRendererLeaked: false,
  });
});
