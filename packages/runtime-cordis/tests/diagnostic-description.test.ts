import { expect, test } from 'bun:test';
import { describeDiagnosticEvent, type DescribedDiagnosticEvent, type DiagnosticEvent } from '@nodebraid/diagnostics';

import { createPluginHost, definePlugin } from '../src';

test('a real Host Sink describes AggregateError members while preserving the original event error', async () => {
  const original = new Error('actual cleanup failure');
  let toJSONCalls = 0;
  Object.defineProperty(original, 'toJSON', {
    value() {
      toJSONCalls += 1;
      return 'raw Error serialization';
    },
  });
  const aggregate = new AggregateError([original], 'cleanup failed');
  let mapCalls = 0;
  Object.defineProperty(aggregate.errors, 'map', {
    value() {
      mapCalls += 1;
      return [original];
    },
  });
  const received: { raw: DiagnosticEvent; described: DescribedDiagnosticEvent }[] = [];
  let cleaned = 0;
  const host = createPluginHost({
    diagnostics: {
      sink(event) {
        if (event.name === 'example.aggregate.describe')
          received.push({ raw: event, described: describeDiagnosticEvent(event) });
      },
    },
  });
  const installation = host.install(
    definePlugin({
      setup(context) {
        context.own(() => {
          cleaned += 1;
        });
        context.diagnostics.emit({
          name: 'example.aggregate.describe',
          level: 'error',
          attributes: { stage: 'cleanup' },
          error: aggregate,
        });
      },
    }),
  );
  try {
    await installation.whenActive();
    expect(installation.getSnapshot().status).toBe('active');
    expect(received).toHaveLength(1);
    const event = received[0];
    if (!event) throw new Error('Expected the emitted Diagnostic Event.');
    expect(event.raw.error).toBe(aggregate);
    expect(event.described.error).toMatchObject({
      kind: 'aggregate',
      errors: [{ kind: 'error', message: original.message }],
    });
    const { error: _raw, ...envelope } = event.raw;
    const { error: _described, ...describedEnvelope } = event.described;
    expect(describedEnvelope).toEqual(envelope);
    expect(JSON.parse(JSON.stringify(event.described))).toEqual(event.described);
    expect(mapCalls).toBe(0);
    expect(toJSONCalls).toBe(0);
    expect(Object.isFrozen(original)).toBe(false);
    expect(aggregate.errors[0]).toBe(original);
    await installation.dispose();
    expect(cleaned).toBe(1);
  } finally {
    await host.dispose();
  }
});
