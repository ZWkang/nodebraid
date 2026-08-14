import { describe, expect, test } from 'bun:test';

import { name } from '../src';

describe('cflow', () => {
  test('exports the package name', () => {
    expect(name).toBe('cflow');
  });
});
