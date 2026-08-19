import { expect, test } from 'bun:test';

import { CFlowError } from '@cflow/diagnostics';

test('@cflow/diagnostics exposes the CFlowError seam by package name', () => {
  expect(CFlowError.name).toBe('CFlowError');
});
