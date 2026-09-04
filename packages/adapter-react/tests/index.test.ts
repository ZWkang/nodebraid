import { expect, test } from 'bun:test';

import { useHistorySnapshot, useKernelView, useRuntimeMount, useSessionSnapshot } from '../src';

test('exports the React Adapter hooks through its public entrypoint', () => {
  expect(useRuntimeMount).toBeFunction();
  expect(useKernelView).toBeFunction();
  expect(useSessionSnapshot).toBeFunction();
  expect(useHistorySnapshot).toBeFunction();
});
