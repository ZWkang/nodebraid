import { expect, test } from 'bun:test';

import { NodeBraidError } from '@nodebraid/diagnostics';

test('@nodebraid/diagnostics exposes the NodeBraidError seam by package name', () => {
  expect(NodeBraidError.name).toBe('NodeBraidError');
});
