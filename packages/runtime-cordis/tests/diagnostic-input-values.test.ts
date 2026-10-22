import { expect, test } from 'bun:test';

import {
  DiagnosticsError,
  type DiagnosticEvent,
  type DiagnosticFault,
  type DiagnosticLevel,
  type DiagnosticSink,
  type PluginDiagnostics,
} from '@nodebraid/diagnostics';

import { createPluginHost, definePlugin } from '../src';

test('Host diagnostics retains the Host ID accepted during validation', async () => {
  const events: DiagnosticEvent[] = [];
  let reads = 0;
  const host = createPluginHost({
    diagnostics: {
      get hostId() {
        return ++reads <= 3 ? 'accepted-host' : '';
      },
      sink: (event) => {
        events.push(event);
      },
    },
  });
  try {
    expect(events[0]?.scope.hostId).toBe('accepted-host');
    expect(reads).toBe(1);
    expect(Object.isFrozen(events[0]?.scope)).toBeTrue();
  } finally {
    await host.dispose();
  }
  expect(events.every((event) => event.scope.hostId === 'accepted-host')).toBeTrue();
});

test('a Diagnostic Event retains the name accepted during validation', async () => {
  const harness = await observeDiagnostics();
  let reads = 0;
  try {
    harness.diagnostics.emit({
      get name() {
        return ++reads <= 2 ? 'accepted.event' : '';
      },
      level: 'info',
    });
    expect(harness.events.at(-1)?.name).toBe('accepted.event');
    expect(reads).toBe(1);
  } finally {
    await harness.host.dispose();
  }
});

test('a Diagnostic Event retains the level accepted during validation', async () => {
  const harness = await observeDiagnostics();
  let reads = 0;
  try {
    harness.diagnostics.emit({
      name: 'accepted.level',
      get level(): DiagnosticLevel {
        return ++reads === 1 ? 'info' : ('fatal' as never);
      },
    });
    expect(harness.events.at(-1)?.level).toBe('info');
    expect(reads).toBe(1);
  } finally {
    await harness.host.dispose();
  }
});

for (const [value, details] of [
  ['', { field: 'hostId', value: '' }],
  [null, { field: 'hostId', receivedType: 'null' }],
  [42, { field: 'hostId', receivedType: 'number' }],
  [{}, { field: 'hostId', receivedType: 'object' }],
] as const) {
  test(`Host diagnostics rejects the first invalid Host ID: ${JSON.stringify(value)}`, () => {
    let reads = 0;
    const error = thrownBy(() =>
      createPluginHost({
        diagnostics: {
          get hostId() {
            return (++reads === 1 ? value : 'later-valid-host') as string;
          },
          get sink(): never {
            throw new Error('Host ID must fail before reading the Sink.');
          },
        },
      }),
    );
    expect(error).toBeInstanceOf(DiagnosticsError);
    expect(error).toMatchObject({ code: 'INVALID_DIAGNOSTIC_VALUE', details });
    expect(reads).toBe(1);
  });
}

test('an omitted captured Host ID still creates a stable default Host scope', async () => {
  const events: DiagnosticEvent[] = [];
  let reads = 0;
  const host = createPluginHost({
    diagnostics: {
      get hostId() {
        reads++;
        return undefined;
      },
      sink: (event) => {
        events.push(event);
      },
    },
  });
  await host.dispose();
  const hostId = events[0]?.scope.hostId;
  expect(hostId).toMatch(/^nodebraid\.host\.\d+$/);
  expect(events.every((event) => event.scope.hostId === hostId)).toBeTrue();
  expect(reads).toBe(1);
});

test('Host diagnostics preserves the original Host ID read failure', () => {
  const marker = new Error('Host ID read');
  expect(
    thrownBy(() =>
      createPluginHost({
        diagnostics: {
          get hostId(): never {
            throw marker;
          },
        },
      }),
    ),
  ).toBe(marker);
});

for (const [value, details] of [
  ['', { field: 'name', value: '' }],
  [null, { field: 'name', receivedType: 'null' }],
  [{}, { field: 'name', receivedType: 'object' }],
] as const) {
  test(`a Diagnostic Event rejects its first invalid name: ${JSON.stringify(value)}`, async () => {
    const harness = await observeDiagnostics();
    let reads = 0;
    try {
      const error = thrownBy(() =>
        harness.diagnostics.emit({
          get name() {
            return (++reads === 1 ? value : 'later.valid') as string;
          },
          get level(): never {
            throw new Error('Name must fail before reading the level.');
          },
        }),
      );
      expect(error).toMatchObject({ code: 'INVALID_EVENT', details });
      expect(reads).toBe(1);
    } finally {
      await harness.host.dispose();
    }
  });
}

for (const [value, details] of [
  ['fatal', { field: 'level', value: 'fatal' }],
  [null, { field: 'level', receivedType: 'null' }],
  [42, { field: 'level', receivedType: 'number' }],
] as const) {
  test(`a Diagnostic Event rejects its first invalid level: ${JSON.stringify(value)}`, async () => {
    const harness = await observeDiagnostics();
    let reads = 0;
    try {
      const error = thrownBy(() =>
        harness.diagnostics.emit({
          name: 'invalid.level',
          get level() {
            return (++reads === 1 ? value : 'info') as never;
          },
          get attributes(): never {
            throw new Error('Level must fail before reading attributes.');
          },
        }),
      );
      expect(error).toMatchObject({ code: 'INVALID_EVENT', details });
      expect(reads).toBe(1);
    } finally {
      await harness.host.dispose();
    }
  });
}

test('a Diagnostic Event retains its normalized attributes and original error', async () => {
  const harness = await observeDiagnostics();
  const attributes = { nested: { value: 7 } };
  const marker = new Error('event failure');
  let attributeReads = 0;
  let errorReads = 0;
  try {
    harness.diagnostics.emit({
      name: 'owned.values',
      level: 'error',
      get attributes() {
        if (++attributeReads > 1) throw new Error('Attributes were consumed again.');
        return attributes;
      },
      get error() {
        if (++errorReads > 1) throw new Error('Error was consumed again.');
        return marker;
      },
    });
    attributes.nested.value = 99;
    const event = harness.events.at(-1);
    expect(event?.attributes).toEqual({ nested: { value: 7 } });
    expect(event?.error).toBe(marker);
    expect(Object.isFrozen(event)).toBeTrue();
    expect(Object.isFrozen(event?.attributes.nested)).toBeTrue();
    expect({ attributeReads, errorReads }).toEqual({ attributeReads: 1, errorReads: 1 });
  } finally {
    await harness.host.dispose();
  }
});

for (const field of ['name', 'level', 'attributes', 'error'] as const) {
  test(`a Diagnostic Event preserves the original ${field} read failure`, async () => {
    const harness = await observeDiagnostics();
    const marker = new Error(`${field} read`);
    try {
      const previous = harness.events.at(-1)!;
      const input = { name: 'read.failure', level: 'info' as const };
      Object.defineProperty(input, field, {
        enumerable: true,
        get() {
          throw marker;
        },
      });
      expect(thrownBy(() => harness.diagnostics.emit(input))).toBe(marker);
      expect(harness.events.at(-1)).toBe(previous);
      harness.diagnostics.emit({ name: 'after.failure', level: 'debug' });
      expect(harness.events.at(-1)?.sequence).toBe(previous.sequence + 1);
    } finally {
      await harness.host.dispose();
    }
  });
}

test('Sink failure context retains the accepted Event name after the callback changes the input', async () => {
  const marker = new Error('Sink failure');
  const input = { name: 'accepted.sink', level: 'info' as const };
  const harness = await observeDiagnostics((event) => {
    if (event.name === 'accepted.sink') {
      input.name = '';
      throw marker;
    }
  });
  try {
    harness.diagnostics.emit(input);
    expect(harness.events.at(-1)?.name).toBe('accepted.sink');
    expect(harness.faults).toHaveLength(1);
    expect(harness.faults[0]?.error).toBe(marker);
    expect(harness.faults[0]?.event.attributes).toEqual({ eventName: 'accepted.sink' });
  } finally {
    await harness.host.dispose();
  }
});

test('an asynchronous Sink retains the accepted name for both explicit failures', async () => {
  const marker = new Error('asynchronous Sink rejection');
  const input = { name: 'accepted.async-sink', level: 'info' as const };
  let rejectSink!: (error: unknown) => void;
  const pending = new Promise<void>((_resolve, reject) => {
    rejectSink = reject;
  });
  const harness = await observeDiagnostics((event) => {
    if (event.name === 'accepted.async-sink') return pending;
  });
  try {
    harness.diagnostics.emit(input);
    input.name = '';
    rejectSink(marker);
    await Promise.resolve();
    expect(harness.faults).toHaveLength(2);
    expect(harness.faults[0]?.error).toMatchObject({
      code: 'ASYNC_SINK',
      details: { eventName: 'accepted.async-sink' },
    });
    expect(harness.faults[1]?.error).toBe(marker);
    expect(harness.faults.every((fault) => fault.event.attributes.eventName === 'accepted.async-sink')).toBeTrue();
  } finally {
    await harness.host.dispose();
  }
});

test('disabled ordinary diagnostics validates inputs without consuming the optional error', async () => {
  let diagnostics!: PluginDiagnostics;
  const host = createPluginHost();
  await host
    .install(
      definePlugin({
        setup(context) {
          diagnostics = context.diagnostics;
        },
      }),
    )
    .whenActive();
  let errorReads = 0;
  try {
    diagnostics.emit({
      name: 'disabled.event',
      level: 'info',
      get error(): never {
        errorReads++;
        throw new Error('A disabled ordinary event must not consume the error.');
      },
    });
    expect(errorReads).toBe(0);
    expect(thrownBy(() => diagnostics.emit({ name: '', level: 'info' }))).toMatchObject({ code: 'INVALID_EVENT' });
  } finally {
    await host.dispose();
  }
});

test('invalid Fault attributes retain the accepted name and original Fault at the Reporter', async () => {
  const harness = await observeDiagnostics();
  const original = new Error('original callback Fault');
  const reread = new Error('Event name consumed after acceptance');
  let reads = 0;
  try {
    harness.diagnostics.reportFault(original, {
      get name() {
        if (++reads > 1) throw reread;
        return 'accepted.fault';
      },
      attributes: { invalid: NaN },
    });
    expect(reads).toBe(1);
    expect(harness.faults).toHaveLength(1);
    const reported = harness.faults[0]!;
    expect(reported.error).toBeInstanceOf(AggregateError);
    expect((reported.error as AggregateError).errors).toEqual([
      original,
      expect.objectContaining({ code: 'INVALID_DIAGNOSTIC_VALUE' }),
    ]);
    expect(reported.event.error).toBe(reported.error);
    expect(reported.event.attributes).toEqual({
      attemptedEventName: 'accepted.fault',
      contractCode: 'INVALID_DIAGNOSTIC_VALUE',
    });
  } finally {
    await harness.host.dispose();
  }
});

test('invalid Fault names retain their first captured value in failure diagnostics', async () => {
  const harness = await observeDiagnostics();
  const original = new Error('callback Fault');
  let reads = 0;
  try {
    harness.diagnostics.reportFault(original, {
      get name() {
        return ++reads === 1 ? '' : 'later.valid';
      },
    });
    expect(reads).toBe(1);
    expect(harness.faults).toHaveLength(1);
    expect((harness.faults[0]?.error as AggregateError).errors[0]).toBe(original);
    expect(harness.faults[0]?.event.attributes).toEqual({
      attemptedEventName: '',
      contractCode: 'INVALID_EVENT',
    });
  } finally {
    await harness.host.dispose();
  }
});

for (const field of ['name', 'attributes'] as const) {
  test(`a Fault ${field} read failure reaches the Reporter alongside the original Fault`, async () => {
    const harness = await observeDiagnostics();
    const original = new Error('callback Fault');
    const marker = new Error(`${field} read`);
    let reads = 0;
    try {
      const input = { name: 'fault.read' };
      Object.defineProperty(input, field, {
        enumerable: true,
        get() {
          reads++;
          throw marker;
        },
      });
      harness.diagnostics.reportFault(original, input);
      expect(reads).toBe(1);
      expect(harness.faults).toHaveLength(1);
      expect((harness.faults[0]?.error as AggregateError).errors).toEqual([original, marker]);
      expect(harness.faults[0]?.event.attributes).toEqual({
        ...(field === 'name' ? { attemptedEventType: 'undefined' } : { attemptedEventName: 'fault.read' }),
        contractCode: 'UNKNOWN_CONTRACT_FAILURE',
      });
    } finally {
      await harness.host.dispose();
    }
  });
}

function thrownBy(action: () => void): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the public operation to throw.');
}

async function observeDiagnostics(sink?: DiagnosticSink) {
  const events: DiagnosticEvent[] = [];
  const faults: DiagnosticFault[] = [];
  let diagnostics!: PluginDiagnostics;
  const host = createPluginHost({
    diagnostics: {
      hostId: 'event-input-values',
      sink: (event) => {
        events.push(event);
        return sink?.(event);
      },
      faultReporter: (fault) => {
        faults.push(fault);
      },
    },
  });
  await host
    .install(
      definePlugin({
        setup(context) {
          diagnostics = context.diagnostics;
        },
      }),
    )
    .whenActive();
  return { host, diagnostics, events, faults };
}
