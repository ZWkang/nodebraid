import { expect, test } from 'bun:test';

import * as core from '../src';

test('the Core facade exports generic Layout seams without concrete Providers', () => {
  const exports = core as Readonly<Record<string, unknown>>;

  expect({
    createLayoutInput: typeof exports.createLayoutInput,
    defineLayoutEngine: typeof exports.defineLayoutEngine,
    createLayoutPlugin: typeof exports.createLayoutPlugin,
    LayoutError: typeof exports.LayoutError,
    dagreProviderLeaked: 'dagreLayoutEngine' in exports,
    elkProviderLeaked: 'elkLayoutEngine' in exports,
  }).toEqual({
    createLayoutInput: 'function',
    defineLayoutEngine: 'function',
    createLayoutPlugin: 'function',
    LayoutError: 'function',
    dagreProviderLeaked: false,
    elkProviderLeaked: false,
  });
});
