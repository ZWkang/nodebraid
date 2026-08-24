import { expect, test } from 'bun:test';

import { NodeBraidError } from '@nodebraid/diagnostics';

import { LayoutError } from '../src';

test('Layout structural failures expose the shared NodeBraid error identity', () => {
  const error = new LayoutError('INVALID_REQUEST', 'Layout Request is invalid.', {
    issue: 'INVALID_MODE',
  });

  expect(error).toBeInstanceOf(NodeBraidError);
  expect(error).toMatchObject({
    name: 'LayoutError',
    domain: 'layout',
    code: 'INVALID_REQUEST',
    details: { issue: 'INVALID_MODE' },
  });
});
