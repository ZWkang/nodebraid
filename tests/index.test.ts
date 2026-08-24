import { describe, expect, test } from 'bun:test';

import { name } from '../src';

describe('nodebraid', () => {
  test('exports the package name', () => {
    expect(name).toBe('nodebraid');
  });
});
