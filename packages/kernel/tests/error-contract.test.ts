import { expect, test } from 'bun:test';

import { NodeBraidError } from '@nodebraid/diagnostics';

import { KernelError, createCanvasKernel, nodeId } from '../src';

test('Kernel structural failures expose the shared NodeBraid error identity', () => {
  let error: unknown;
  try {
    nodeId('');
  } catch (reason) {
    error = reason;
  }

  expect(error).toBeInstanceOf(KernelError);
  expect(error).toBeInstanceOf(NodeBraidError);
  expect(error).toMatchObject({
    name: 'KernelError',
    domain: 'kernel',
    code: 'INVALID_ID',
    details: { entity: 'node', value: '' },
  });
});

test('Kernel identifier failures classify a JavaScript value without copying it', () => {
  expect(() => nodeId({ secret: 'domain-data' } as never)).toThrow(
    expect.objectContaining({
      name: 'KernelError',
      domain: 'kernel',
      code: 'INVALID_ID',
      details: { entity: 'node', receivedType: 'object' },
    }),
  );
});

test('Change Set direction failures classify an unsafe JavaScript value', () => {
  const kernel = createCanvasKernel();

  expect(() =>
    kernel.transact((transaction) =>
      transaction.applyChangeSet({ beforeRevision: 0, revision: 1, changes: [] } as never, (() => undefined) as never),
    ),
  ).toThrow(
    expect.objectContaining({
      name: 'KernelError',
      domain: 'kernel',
      code: 'INVALID_CHANGE_SET',
      details: { issue: 'INVALID_DIRECTION', receivedType: 'function' },
    }),
  );
});

test('Change Set revision failures classify unsafe JavaScript values', () => {
  const kernel = createCanvasKernel();

  expect(() =>
    kernel.transact((transaction) =>
      transaction.applyChangeSet({ beforeRevision: 1n, revision: 2n, changes: [] } as never, 'forward'),
    ),
  ).toThrow(
    expect.objectContaining({
      name: 'KernelError',
      domain: 'kernel',
      code: 'INVALID_CHANGE_SET',
      details: {
        issue: 'INVALID_REVISIONS',
        beforeRevision: { receivedType: 'bigint' },
        revision: { receivedType: 'bigint' },
      },
    }),
  );
});
