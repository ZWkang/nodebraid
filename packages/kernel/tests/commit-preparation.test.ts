import { expect, test } from 'bun:test';

import { createCanvasKernel, nodeId, type TransactionContext } from '../src';

test.each(['origin', 'commandId'] as const)('a failing %s read cannot publish a Transaction', (field) => {
  const kernel = createCanvasKernel();
  const before = kernel.read();
  const failure = new Error(`${field} failed`);
  const metadata = {
    get [field](): string {
      throw failure;
    },
  };

  expect(() =>
    kernel.transact((transaction) => {
      transaction.nodes.add({
        id: nodeId('staged'),
        type: 'task',
        position: { x: 0, y: 0 },
        data: null,
      });
    }, metadata),
  ).toThrow(failure);
  expect(kernel.read()).toBe(before);
  expect(kernel.read().snapshot.nodes).toEqual([]);
});

test('commit metadata is captured once after Draft capabilities close and before publication', () => {
  const kernel = createCanvasKernel();
  const before = kernel.read();
  let captured!: TransactionContext;
  let originReads = 0;
  let commandReads = 0;
  const commit = kernel.transact(
    (transaction) => {
      captured = transaction;
      transaction.nodes.add({
        id: nodeId('published'),
        type: 'task',
        position: { x: 0, y: 0 },
        data: null,
      });
    },
    {
      get origin() {
        originReads += 1;
        expect(kernel.read()).toBe(before);
        expect(() => captured.query.getNode(nodeId('published'))).toThrow(
          expect.objectContaining({ code: 'TRANSACTION_CLOSED' }),
        );
        expect(() => kernel.transact(() => {})).toThrow(expect.objectContaining({ code: 'TRANSACTION_REENTRANT' }));
        return `origin-${originReads}`;
      },
      get commandId() {
        commandReads += 1;
        return `command-${commandReads}`;
      },
    },
  );

  expect(commit?.changeSet).toMatchObject({
    beforeRevision: 0,
    revision: 1,
    origin: 'origin-1',
    commandId: 'command-1',
  });
  expect({ originReads, commandReads }).toEqual({ originReads: 1, commandReads: 1 });
  expect(commit?.before).toBe(before);
  expect(commit?.after).toBe(kernel.read());
  expect(commit?.after.snapshot.revision).toBe(1);
});

test('a net-zero Transaction does not inspect commit-only metadata', () => {
  const kernel = createCanvasKernel();
  const before = kernel.read();
  expect(
    kernel.transact(() => {}, {
      get origin(): string {
        throw new Error('Net-zero work has no Commit metadata.');
      },
    }),
  ).toBeNull();
  expect(kernel.read()).toBe(before);
});

test.each(['metadata', 'callback result'] as const)('commit preparation rejects reentry from %s', (phase) => {
  const kernel = createCanvasKernel();
  const before = kernel.read();
  const reenter = () =>
    kernel.transact((transaction) => {
      transaction.nodes.add({
        id: nodeId('nested'),
        type: 'task',
        position: { x: 1, y: 1 },
        data: null,
      });
    });

  expect(() =>
    kernel.transact(
      (transaction) => {
        transaction.nodes.add({
          id: nodeId('staged'),
          type: 'task',
          position: { x: 0, y: 0 },
          data: null,
        });
        if (phase === 'callback result') {
          return {
            get then() {
              reenter();
              return undefined;
            },
          };
        }
      },
      phase === 'metadata'
        ? {
            get origin() {
              reenter();
              return 'outer';
            },
          }
        : undefined,
    ),
  ).toThrow(expect.objectContaining({ code: 'TRANSACTION_REENTRANT' }));
  expect(kernel.read()).toBe(before);

  const next = kernel.transact((transaction) => {
    transaction.nodes.add({
      id: nodeId('next'),
      type: 'task',
      position: { x: 2, y: 2 },
      data: null,
    });
  });
  expect(next?.after.snapshot).toEqual({
    revision: 1,
    nodes: [{ id: nodeId('next'), type: 'task', position: { x: 2, y: 2 }, data: null }],
    edges: [],
  });
});
