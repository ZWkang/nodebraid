import { expect, test } from 'bun:test';

import {
  NodeBraidError,
  diagnosticEvents,
  describeDiagnosticEvent,
  describeError,
  describeNonFiniteNumber,
  normalizeDiagnosticAttributes,
  type DiagnosticEvent,
} from '../src';

test('the Diagnostics event catalog has stable searchable names', () => {
  expect(diagnosticEvents).toEqual({
    sinkFault: 'nodebraid.diagnostics.sink.fault',
    faultReportingFault: 'nodebraid.diagnostics.fault-reporting.fault',
  });
});

test('Diagnostic normalization rejects an accessor without invoking it', () => {
  let reads = 0;
  const attributes = {};
  Object.defineProperty(attributes, 'secret', {
    enumerable: true,
    get() {
      reads += 1;
      return 'hidden';
    },
  });

  expect(() => normalizeDiagnosticAttributes(attributes)).toThrow(
    'Diagnostic value at attributes.secret must use a data property; received accessor.',
  );
  expect(reads).toBe(0);
});

test('Diagnostic normalization rejects a Symbol key instead of dropping it', () => {
  const secret = Symbol('secret');
  const attributes = { [secret]: 'hidden' };

  expect(() => normalizeDiagnosticAttributes(attributes)).toThrow(
    'Diagnostic value at attributes must use string keys; received Symbol(secret).',
  );
});

test('describeNonFiniteNumber provides the canonical diagnostic representation', () => {
  expect([
    describeNonFiniteNumber(Number.NaN),
    describeNonFiniteNumber(Number.POSITIVE_INFINITY),
    describeNonFiniteNumber(Number.NEGATIVE_INFINITY),
  ]).toEqual(['nan', 'positive-infinity', 'negative-infinity']);
  expect(() => describeNonFiniteNumber(0)).toThrow('Expected a non-finite number; received 0.');
});

class ExampleError extends NodeBraidError<
  'example',
  'BROKEN',
  Readonly<{ field: string; nested: Readonly<{ count: number }> }>
> {
  override readonly name = 'ExampleError';

  constructor(cause: unknown) {
    super('example', 'BROKEN', 'Example failed.', {
      details: { field: 'selection', nested: { count: 2 } },
      cause,
    });
  }
}

test('a NodeBraid structural error exposes stable identity, cause, and immutable details', () => {
  const cause = new Error('upstream failed');
  const error = new ExampleError(cause);

  expect({
    isError: error instanceof Error,
    name: error.name,
    domain: error.domain,
    code: error.code,
    message: error.message,
    causeIdentity: error.cause === cause,
    details: error.details,
    detailsFrozen: Object.isFrozen(error.details),
    nestedFrozen: Object.isFrozen(error.details.nested),
  }).toEqual({
    isError: true,
    name: 'ExampleError',
    domain: 'example',
    code: 'BROKEN',
    message: 'Example failed.',
    causeIdentity: true,
    details: { field: 'selection', nested: { count: 2 } },
    detailsFrozen: true,
    nestedFrozen: true,
  });
});

test('a NodeBraid structural error rejects an unsafe detail at its exact path', () => {
  expect(
    () =>
      new (class extends NodeBraidError<'example', 'UNSAFE'> {
        constructor() {
          super('example', 'UNSAFE', 'Unsafe details.', {
            details: { nested: { callback: () => undefined } } as never,
          });
        }
      })(),
  ).toThrow('Diagnostic value at details.nested.callback must be JSON-safe; received function.');
});

test('a NodeBraid structural error rejects a non-finite numeric detail', () => {
  expect(
    () =>
      new (class extends NodeBraidError<'example', 'NON_FINITE'> {
        constructor() {
          super('example', 'NON_FINITE', 'Non-finite details.', {
            details: { coordinate: Number.NaN },
          });
        }
      })(),
  ).toThrow('Diagnostic value at details.coordinate must be finite; received NaN.');
});

test('a NodeBraid structural error rejects class instances instead of traversing them', () => {
  class Token {
    readonly name = 'kernel';
  }

  expect(
    () =>
      new (class extends NodeBraidError<'example', 'INSTANCE'> {
        constructor() {
          super('example', 'INSTANCE', 'Instance details.', {
            details: { token: new Token() } as never,
          });
        }
      })(),
  ).toThrow('Diagnostic value at details.token must be a plain record; received Token.');
});

test('a NodeBraid structural error rejects a circular detail at the first back-reference', () => {
  const details: Record<string, unknown> = {};
  details.self = details;

  expect(
    () =>
      new (class extends NodeBraidError<'example', 'CIRCULAR'> {
        constructor() {
          super('example', 'CIRCULAR', 'Circular details.', { details: details as never });
        }
      })(),
  ).toThrow('Diagnostic value at details.self must not be circular; first seen at details.');
});

test('describeError returns a JSON-ready NodeBraid error with its original cause', () => {
  const error = new ExampleError(new Error('upstream failed'));
  const description = describeError(error);

  expect(description).toEqual({
    kind: 'nodebraid',
    name: 'ExampleError',
    message: 'Example failed.',
    stack: expect.any(String),
    domain: 'example',
    code: 'BROKEN',
    details: { field: 'selection', nested: { count: 2 } },
    cause: {
      kind: 'error',
      name: 'Error',
      message: 'upstream failed',
      stack: expect.any(String),
    },
  });
  expect(JSON.parse(JSON.stringify(description))).toEqual(description);
});

test('describeError preserves nested AggregateError stages', () => {
  const error = new AggregateError(
    [new Error('first disposer failed'), new AggregateError([new Error('child failed')], 'Child cleanup failed.')],
    'Host cleanup failed.',
  );

  expect(describeError(error)).toEqual({
    kind: 'aggregate',
    name: 'AggregateError',
    message: 'Host cleanup failed.',
    stack: expect.any(String),
    errors: [
      {
        kind: 'error',
        name: 'Error',
        message: 'first disposer failed',
        stack: expect.any(String),
      },
      {
        kind: 'aggregate',
        name: 'AggregateError',
        message: 'Child cleanup failed.',
        stack: expect.any(String),
        errors: [
          {
            kind: 'error',
            name: 'Error',
            message: 'child failed',
            stack: expect.any(String),
          },
        ],
      },
    ],
  });
});

test('describeError represents a circular cause as an explicit reference', () => {
  const error = new Error('cause loop');
  error.cause = error;

  expect(describeError(error)).toEqual({
    kind: 'error',
    name: 'Error',
    message: 'cause loop',
    stack: expect.any(String),
    cause: { kind: 'circular', reference: '$' },
  });
});

test('describeError preserves a safe primitive thrown value', () => {
  expect(describeError('boom')).toEqual({
    kind: 'unknown',
    type: 'string',
    value: 'boom',
  });
});

test('describeDiagnosticEvent replaces the raw error with its JSON-ready description', () => {
  const rawError = new ExampleError(new Error('upstream failed'));
  const event: DiagnosticEvent = Object.freeze({
    version: 1,
    id: 'canvas.event.4',
    sequence: 4,
    timestamp: 123,
    name: 'nodebraid.runtime.installation.status.changed',
    level: 'error',
    scope: Object.freeze({ hostId: 'canvas', installationId: 'canvas.installation.2' }),
    attributes: Object.freeze({ from: 'active', to: 'failed' }),
    error: rawError,
  });

  const description = describeDiagnosticEvent(event);

  expect(description).toEqual({
    ...event,
    error: {
      kind: 'nodebraid',
      name: 'ExampleError',
      message: 'Example failed.',
      stack: expect.any(String),
      domain: 'example',
      code: 'BROKEN',
      details: { field: 'selection', nested: { count: 2 } },
      cause: {
        kind: 'error',
        name: 'Error',
        message: 'upstream failed',
        stack: expect.any(String),
      },
    },
  });
  expect(description.error).not.toBe(rawError);
  expect(JSON.parse(JSON.stringify(description))).toEqual(description);
});
