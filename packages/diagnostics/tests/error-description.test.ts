import { expect, test } from 'bun:test';

import { describeError } from '../src';

test('AggregateError member map cannot replace descriptions with raw Errors', () => {
  const original = new Error('actual cleanup failure');
  const aggregate = new AggregateError([original], 'cleanup failed');
  let mapCalls = 0;
  Object.defineProperty(aggregate.errors, 'map', {
    value() {
      mapCalls += 1;
      return [original];
    },
  });

  const description = describeError(aggregate);

  expect(description).toMatchObject({ kind: 'aggregate', errors: [{ kind: 'error', message: original.message }] });
  if (description.kind !== 'aggregate') throw new Error('Expected AggregateError description.');
  expect(description.errors[0]).not.toBe(original);
  expect(Object.isFrozen(description.errors[0])).toBe(true);
  expect(mapCalls).toBe(0);
  expect(JSON.parse(JSON.stringify(description))).toEqual(description);
  expect(Object.isFrozen(original)).toBe(false);
  expect(aggregate.errors[0]).toBe(original);
});

test('AggregateError metadata failures precede indexed member reads', () => {
  const metadataFailure = new Error('parent metadata failed');
  const memberFailure = new Error('member read failed');
  const aggregate = new AggregateError([new Error('child')], 'cleanup failed');
  Object.defineProperty(aggregate, 'name', {
    get(): never {
      throw metadataFailure;
    },
  });
  Object.defineProperty(aggregate.errors, '0', {
    get(): never {
      throw memberFailure;
    },
  });
  let failure: unknown;
  try {
    describeError(aggregate);
  } catch (error) {
    failure = error;
  }
  expect(failure).toBe(metadataFailure);
});

test('AggregateError descriptions ignore collection method, iterator and constructor hooks', () => {
  const aggregate = new AggregateError([new Error('child')], 'cleanup failed');
  let hookReads = 0;
  for (const key of ['map', 'constructor', Symbol.iterator]) {
    Object.defineProperty(aggregate.errors, key, {
      get(): never {
        hookReads += 1;
        throw new Error('collection hook');
      },
    });
  }
  const description = describeError(aggregate);
  expect(description).toMatchObject({ kind: 'aggregate', errors: [{ kind: 'error', message: 'child' }] });
  expect(hookReads).toBe(0);
  expect(JSON.parse(JSON.stringify(description))).toEqual(description);
});

test('AggregateError descriptions preserve holes, inherited members and circular paths', () => {
  const aggregate = new AggregateError([], 'cleanup failed');
  const original = new Error('inherited child');
  original.cause = aggregate;
  aggregate.errors.length = 4;
  Object.setPrototypeOf(aggregate.errors, Object.create(Array.prototype, { 1: { value: original } }));
  aggregate.errors[2] = undefined;
  aggregate.errors[3] = aggregate;

  const description = describeError(aggregate);

  if (description.kind !== 'aggregate') throw new Error('Expected AggregateError description.');
  expect(description.errors.length).toBe(4);
  expect(Object.hasOwn(description.errors, 0)).toBe(false);
  expect(description.errors[1]).toMatchObject({
    kind: 'error',
    message: original.message,
    cause: { kind: 'circular', reference: '$' },
  });
  expect(description.errors[2]).toEqual({ kind: 'unknown', type: 'undefined' });
  expect(description.errors[3]).toEqual({ kind: 'circular', reference: '$' });
  expect(JSON.parse(JSON.stringify(description)).errors[0]).toBeNull();
  expect(Object.hasOwn(aggregate.errors, 1)).toBe(false);
  expect(Object.isFrozen(aggregate.errors)).toBe(false);
});

test('AggregateError traversal uses native integer length semantics for Proxy arrays', () => {
  const aggregate = new AggregateError([], 'cleanup failed');
  aggregate.errors = new Proxy([new Error('first'), new Error('second')], {
    get(target, key, receiver) {
      return key === 'length' ? '2' : Reflect.get(target, key, receiver);
    },
  });
  expect(describeError(aggregate)).toMatchObject({
    kind: 'aggregate',
    errors: [{ message: 'first' }, { message: 'second' }],
  });
});

test('AggregateError indexed read failures retain their original identity', () => {
  const aggregate = new AggregateError([new Error('child')], 'cleanup failed');
  const original = new Error('member read failed');
  Object.defineProperty(aggregate.errors, '0', {
    get(): never {
      throw original;
    },
  });
  let failure: unknown;
  try {
    describeError(aggregate);
  } catch (error) {
    failure = error;
  }
  expect(failure).toBe(original);
});

test('malformed AggregateError collections fail instead of becoming an empty description', () => {
  for (const errors of [null, {}, { length: 0 }, new Set()]) {
    const aggregate = new AggregateError([], 'cleanup failed');
    aggregate.errors = errors as never;
    expect(() => describeError(aggregate)).toThrow(TypeError);
  }
});
