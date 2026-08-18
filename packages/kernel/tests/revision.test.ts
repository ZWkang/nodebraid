import { expect, test } from 'bun:test';

import { incrementRevision } from '../src/revision';

test('revision increment refuses to leave the safe-integer range', () => {
  expect(incrementRevision(0)).toBe(1);
  expect(incrementRevision(Number.MAX_SAFE_INTEGER - 1)).toBe(Number.MAX_SAFE_INTEGER);
  expect(incrementRevision(Number.MAX_SAFE_INTEGER)).toBeNull();
});
