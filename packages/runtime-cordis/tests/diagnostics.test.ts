import { expect, test } from 'bun:test';

import type { DiagnosticEvent, DiagnosticFault } from '@nodebraid/diagnostics';

import { createPluginHost, definePlugin, defineService, runtimeDiagnosticEvents } from '../src';

test('the Runtime diagnostic event catalog has stable searchable names', () => {
  expect(runtimeDiagnosticEvents).toEqual({
    hostCreated: 'nodebraid.runtime.host.created',
    hostDisposing: 'nodebraid.runtime.host.disposing',
    hostDisposed: 'nodebraid.runtime.host.disposed',
    activationStarted: 'nodebraid.runtime.activation.started',
    activationEnded: 'nodebraid.runtime.activation.ended',
    installationStatusChanged: 'nodebraid.runtime.installation.status.changed',
    installationDisposeFailed: 'nodebraid.runtime.installation.dispose.failed',
    installationSubscriberFault: 'nodebraid.runtime.installation.subscriber.fault',
  });
});

test('a Plugin emits an immutable Diagnostic Event scoped to its Host Activation', async () => {
  const events: DiagnosticEvent[] = [];
  const attributes = { phase: 'setup', nested: { count: 1 } };
  const plugin = definePlugin({
    name: 'tracer',
    setup(context) {
      context.diagnostics.emit({
        name: 'example.plugin.ready',
        level: 'info',
        attributes,
      });
      attributes.nested.count = 2;
    },
  });
  const host = createPluginHost({
    diagnostics: {
      hostId: 'canvas',
      sink: (event) => events.push(event),
    },
  });
  const installation = host.install(plugin);

  await installation.whenActive();

  const event = events.find((candidate) => candidate.name === 'example.plugin.ready');
  expect(event).toEqual({
    version: 1,
    id: `canvas.event.${event?.sequence}`,
    sequence: expect.any(Number),
    timestamp: expect.any(Number),
    name: 'example.plugin.ready',
    level: 'info',
    scope: {
      hostId: 'canvas',
      installationId: 'canvas.installation.1',
      activationId: 'canvas.activation.1',
      pluginName: 'tracer',
    },
    attributes: { nested: { count: 1 }, phase: 'setup' },
  });
  expect(Object.isFrozen(event)).toBeTrue();
  expect(Object.isFrozen(event?.scope)).toBeTrue();
  expect(Object.isFrozen(event?.attributes)).toBeTrue();
  expect(Object.isFrozen(event?.attributes.nested)).toBeTrue();

  await host.dispose();
});

test('a Fault Reporter failure stays outside the Plugin lifecycle and preserves both errors', async () => {
  const listenerError = new Error('listener failed');
  const reporterError = new Error('reporter failed');
  const events: DiagnosticEvent[] = [];
  const faults: DiagnosticFault[] = [];
  const queuedReports: Array<() => void> = [];
  const originalQueueMicrotask = Object.getOwnPropertyDescriptor(globalThis, 'queueMicrotask');
  Object.defineProperty(globalThis, 'queueMicrotask', {
    configurable: true,
    value: (callback: () => void) => queuedReports.push(callback),
  });

  try {
    const plugin = definePlugin({
      name: 'faulty-listener-owner',
      setup(context) {
        context.diagnostics.reportFault(listenerError, {
          name: 'example.listener.fault',
          attributes: { listener: 'canvas' },
        });
      },
    });
    const host = createPluginHost({
      diagnostics: {
        hostId: 'fault-host',
        sink: (event) => events.push(event),
        faultReporter: (fault) => {
          faults.push(fault);
          throw reporterError;
        },
      },
    });
    const installation = host.install(plugin);

    await expect(installation.whenActive()).resolves.toBeUndefined();
    expect(installation.getSnapshot()).toEqual({ status: 'active' });
    expect(events.find((event) => event.name === 'example.listener.fault')).toMatchObject({
      level: 'error',
      error: listenerError,
    });
    expect(faults).toHaveLength(1);
    expect(faults[0]?.error).toBe(listenerError);
    expect(queuedReports).toHaveLength(1);

    let scheduledError: unknown;
    try {
      queuedReports[0]?.();
    } catch (error) {
      scheduledError = error;
    }
    expect(scheduledError).toBeInstanceOf(AggregateError);
    expect((scheduledError as AggregateError).errors).toEqual([listenerError, reporterError]);

    await host.dispose();
  } finally {
    if (originalQueueMicrotask) {
      Object.defineProperty(globalThis, 'queueMicrotask', originalQueueMicrotask);
    }
  }
});

test('a Diagnostic Sink failure becomes a non-recursive Fault without failing Plugin setup', async () => {
  const sinkError = new Error('sink failed');
  const faults: DiagnosticFault[] = [];
  let sinkCalls = 0;
  const plugin = definePlugin({
    name: 'diagnostic-producer',
    setup(context) {
      context.diagnostics.emit({
        name: 'example.operation.ready',
        level: 'info',
        attributes: { phase: 'setup' },
      });
    },
  });
  const host = createPluginHost({
    diagnostics: {
      hostId: 'sink-host',
      sink: (event) => {
        if (event.name !== 'example.operation.ready') return;
        sinkCalls += 1;
        throw sinkError;
      },
      faultReporter: (fault) => faults.push(fault),
    },
  });
  const installation = host.install(plugin);

  const activationError = await installation.whenActive().catch((error: unknown) => error);
  expect(activationError).toBeUndefined();
  expect(installation.getSnapshot()).toEqual({ status: 'active' });
  expect(sinkCalls).toBe(1);
  expect(faults).toHaveLength(1);
  expect(faults[0]).toMatchObject({
    error: sinkError,
    event: {
      name: 'nodebraid.diagnostics.sink.fault',
      level: 'error',
      error: sinkError,
      attributes: { eventName: 'example.operation.ready' },
    },
  });

  await host.dispose();
});

test('an asynchronous Diagnostic Sink is reported as an explicit contract failure', async () => {
  const faults: DiagnosticFault[] = [];
  const plugin = definePlugin({
    setup(context) {
      context.diagnostics.emit({ name: 'example.async-sink', level: 'debug' });
    },
  });
  const host = createPluginHost({
    diagnostics: {
      hostId: 'async-sink-host',
      sink: (event) => (event.name === 'example.async-sink' ? (Promise.resolve() as never) : undefined),
      faultReporter: (fault) => faults.push(fault),
    },
  });
  const installation = host.install(plugin);

  await installation.whenActive();

  expect(faults).toHaveLength(1);
  expect(faults[0]).toMatchObject({
    error: {
      name: 'DiagnosticsError',
      domain: 'diagnostics',
      code: 'ASYNC_SINK',
      details: { eventName: 'example.async-sink' },
    },
    event: {
      name: 'nodebraid.diagnostics.sink.fault',
      level: 'error',
    },
  });

  await host.dispose();
});

test('an asynchronous Fault Reporter is exposed without changing Plugin state', async () => {
  const listenerError = new Error('listener failed');
  const queuedReports: Array<() => void> = [];
  const originalQueueMicrotask = Object.getOwnPropertyDescriptor(globalThis, 'queueMicrotask');
  Object.defineProperty(globalThis, 'queueMicrotask', {
    configurable: true,
    value: (callback: () => void) => queuedReports.push(callback),
  });

  try {
    const plugin = definePlugin({
      setup(context) {
        context.diagnostics.reportFault(listenerError, { name: 'example.async-reporter' });
      },
    });
    const host = createPluginHost({
      diagnostics: {
        faultReporter: async () => undefined,
      },
    });
    const installation = host.install(plugin);

    await installation.whenActive();
    await Promise.resolve();

    expect(installation.getSnapshot()).toEqual({ status: 'active' });
    expect(queuedReports).toHaveLength(1);
    let scheduledError: unknown;
    try {
      queuedReports[0]?.();
    } catch (error) {
      scheduledError = error;
    }
    expect(scheduledError).toMatchObject({
      name: 'DiagnosticsError',
      domain: 'diagnostics',
      code: 'ASYNC_FAULT_REPORTER',
      details: { eventName: 'example.async-reporter' },
      cause: listenerError,
    });

    await host.dispose();
  } finally {
    if (originalQueueMicrotask) {
      Object.defineProperty(globalThis, 'queueMicrotask', originalQueueMicrotask);
    }
  }
});

test('an invalid Diagnostic Event fails explicitly even when no Sink is configured', async () => {
  const plugin = definePlugin({
    setup(context) {
      context.diagnostics.emit({ name: '', level: 'info' });
    },
  });
  const host = createPluginHost();
  const installation = host.install(plugin);

  const error = await installation.whenActive().catch((reason: unknown) => reason);

  expect(error).toMatchObject({
    name: 'DiagnosticsError',
    domain: 'diagnostics',
    code: 'INVALID_EVENT',
    details: { field: 'name', value: '' },
  });
  expect(installation.getSnapshot()).toEqual({ status: 'failed', error });

  await host.dispose();
});

test('an invalid reportFault input preserves the original Fault through the final Reporter', async () => {
  const listenerError = new Error('listener failed');
  const faults: DiagnosticFault[] = [];
  const plugin = definePlugin({
    setup(context) {
      context.diagnostics.reportFault(listenerError, { name: '' });
    },
  });
  const host = createPluginHost({
    diagnostics: {
      hostId: 'invalid-fault-host',
      faultReporter: (fault) => faults.push(fault),
    },
  });
  const installation = host.install(plugin);

  await expect(installation.whenActive()).resolves.toBeUndefined();

  expect(installation.getSnapshot()).toEqual({ status: 'active' });
  expect(faults).toHaveLength(1);
  const reportedError = faults[0]?.error;
  expect(reportedError).toBeInstanceOf(AggregateError);
  expect((reportedError as AggregateError).errors).toEqual([
    listenerError,
    expect.objectContaining({
      name: 'DiagnosticsError',
      domain: 'diagnostics',
      code: 'INVALID_EVENT',
    }),
  ]);
  expect(faults[0]?.event).toMatchObject({
    name: 'nodebraid.diagnostics.fault-reporting.fault',
    level: 'error',
    error: reportedError,
    attributes: { attemptedEventName: '', contractCode: 'INVALID_EVENT' },
  });

  await host.dispose();
});

test('an unsafe Diagnostic attribute fails with a structured path and original cause', async () => {
  const plugin = definePlugin({
    setup(context) {
      context.diagnostics.emit({
        name: 'example.invalid-attributes',
        level: 'debug',
        attributes: { callback: (() => undefined) as never },
      });
    },
  });
  const host = createPluginHost();
  const installation = host.install(plugin);

  const error = await installation.whenActive().catch((reason: unknown) => reason);

  expect(error).toMatchObject({
    name: 'DiagnosticsError',
    domain: 'diagnostics',
    code: 'INVALID_DIAGNOSTIC_VALUE',
    details: {
      path: 'attributes.callback',
      issue: 'UNSAFE_TYPE',
      receivedType: 'function',
    },
    cause: expect.any(TypeError),
  });

  await host.dispose();
});

test('an unknown Diagnostic level fails as an invalid event contract', async () => {
  const plugin = definePlugin({
    setup(context) {
      context.diagnostics.emit({
        name: 'example.invalid-level',
        level: 'fatal' as never,
      });
    },
  });
  const host = createPluginHost();
  const installation = host.install(plugin);

  const error = await installation.whenActive().catch((reason: unknown) => reason);

  expect(error).toMatchObject({
    name: 'DiagnosticsError',
    domain: 'diagnostics',
    code: 'INVALID_EVENT',
    details: { field: 'level', value: 'fatal' },
  });

  await host.dispose();
});

test('Plugin Host rejects an empty diagnostic host ID', () => {
  expect(() =>
    createPluginHost({
      diagnostics: { hostId: '' },
    }),
  ).toThrow(
    expect.objectContaining({
      name: 'DiagnosticsError',
      domain: 'diagnostics',
      code: 'INVALID_DIAGNOSTIC_VALUE',
      details: { field: 'hostId', value: '' },
    }),
  );
});

test('Installation subscriber Faults use the Host-scoped diagnostics path', async () => {
  const listenerError = new Error('installation subscriber failed');
  const events: DiagnosticEvent[] = [];
  const faults: DiagnosticFault[] = [];
  const platformErrors: unknown[] = [];
  const statuses: string[] = [];
  const originalReportError = Object.getOwnPropertyDescriptor(globalThis, 'reportError');
  Object.defineProperty(globalThis, 'reportError', {
    configurable: true,
    value: (error: unknown) => platformErrors.push(error),
  });

  try {
    const host = createPluginHost({
      diagnostics: {
        hostId: 'subscriber-host',
        sink: (event) => events.push(event),
        faultReporter: (fault) => faults.push(fault),
      },
    });
    const installation = host.install(definePlugin({ name: 'subscriber-owner', setup() {} }));
    installation.subscribe(() => {
      throw listenerError;
    });
    installation.subscribe(() => statuses.push(installation.getSnapshot().status));

    await installation.whenActive();
    await host.dispose();

    expect(statuses).toEqual(['active', 'disposed']);
    expect(platformErrors).toEqual([]);
    expect(faults).toHaveLength(2);
    expect(faults.map((fault) => fault.error)).toEqual([listenerError, listenerError]);
    expect(
      events
        .filter((event) => event.name === 'nodebraid.runtime.installation.subscriber.fault')
        .map((event) => ({ scope: event.scope, status: event.attributes.status })),
    ).toEqual([
      {
        scope: {
          hostId: 'subscriber-host',
          installationId: 'subscriber-host.installation.1',
          pluginName: 'subscriber-owner',
        },
        status: 'active',
      },
      {
        scope: {
          hostId: 'subscriber-host',
          installationId: 'subscriber-host.installation.1',
          pluginName: 'subscriber-owner',
        },
        status: 'disposed',
      },
    ]);
  } finally {
    if (originalReportError) {
      Object.defineProperty(globalThis, 'reportError', originalReportError);
    } else {
      Reflect.deleteProperty(globalThis, 'reportError');
    }
  }
});

test('an empty Plugin Host emits an ordered lifecycle', async () => {
  const events: DiagnosticEvent[] = [];
  const host = createPluginHost({
    diagnostics: {
      hostId: 'empty-host',
      sink: (event) => events.push(event),
    },
  });

  await host.dispose();

  expect(
    events.map((event) => ({
      id: event.id,
      sequence: event.sequence,
      name: event.name,
      level: event.level,
      scope: event.scope,
    })),
  ).toEqual([
    {
      id: 'empty-host.event.1',
      sequence: 1,
      name: 'nodebraid.runtime.host.created',
      level: 'info',
      scope: { hostId: 'empty-host' },
    },
    {
      id: 'empty-host.event.2',
      sequence: 2,
      name: 'nodebraid.runtime.host.disposing',
      level: 'debug',
      scope: { hostId: 'empty-host' },
    },
    {
      id: 'empty-host.event.3',
      sequence: 3,
      name: 'nodebraid.runtime.host.disposed',
      level: 'info',
      scope: { hostId: 'empty-host' },
    },
  ]);
});

test('Installation status events follow Snapshot replacement and precede subscribers', async () => {
  const events: DiagnosticEvent[] = [];
  const subscriberObservations: Array<Readonly<{ snapshot: string; eventStatus: unknown }>> = [];
  const host = createPluginHost({
    diagnostics: {
      hostId: 'status-host',
      sink: (event) => events.push(event),
    },
  });
  const installation = host.install(definePlugin({ name: 'status-owner', setup() {} }));
  installation.subscribe(() => {
    subscriberObservations.push({
      snapshot: installation.getSnapshot().status,
      eventStatus: events.filter((event) => event.name === 'nodebraid.runtime.installation.status.changed').at(-1)
        ?.attributes.to,
    });
  });

  await installation.whenActive();
  await installation.dispose();

  expect(
    events
      .filter((event) => event.name === 'nodebraid.runtime.installation.status.changed')
      .map((event) => ({ level: event.level, attributes: event.attributes })),
  ).toEqual([
    {
      level: 'debug',
      attributes: { from: 'none', to: 'pending', missingServiceNames: [] },
    },
    {
      level: 'debug',
      attributes: { from: 'pending', to: 'active' },
    },
    {
      level: 'debug',
      attributes: { from: 'active', to: 'disposed' },
    },
  ]);
  expect(subscriberObservations).toEqual([
    { snapshot: 'active', eventStatus: 'active' },
    { snapshot: 'disposed', eventStatus: 'disposed' },
  ]);

  await host.dispose();
});

test('a Plugin Setup failure emits one error status while preserving its identity', async () => {
  const setupError = new Error('setup failed');
  const events: DiagnosticEvent[] = [];
  const host = createPluginHost({
    diagnostics: {
      hostId: 'failed-host',
      sink: (event) => events.push(event),
    },
  });
  const installation = host.install(
    definePlugin({
      name: 'failing-plugin',
      setup() {
        throw setupError;
      },
    }),
  );

  await expect(installation.whenActive()).rejects.toBe(setupError);

  expect(installation.getSnapshot()).toEqual({ status: 'failed', error: setupError });
  expect(
    events
      .filter((event) => event.name === 'nodebraid.runtime.installation.status.changed' && event.level === 'error')
      .map((event) => ({ attributes: event.attributes, error: event.error })),
  ).toEqual([
    {
      attributes: { from: 'pending', to: 'failed', phase: 'setup' },
      error: setupError,
    },
  ]);

  await host.dispose();
});

test('Activation events surround Plugin setup and completed cleanup', async () => {
  const events: DiagnosticEvent[] = [];
  let cleanupCompleted = false;
  let cleanupCompletedWhenEnded = false;
  const host = createPluginHost({
    diagnostics: {
      hostId: 'activation-host',
      sink: (event) => {
        events.push(event);
        if (event.name === 'nodebraid.runtime.activation.ended') {
          cleanupCompletedWhenEnded = cleanupCompleted;
        }
      },
    },
  });
  const installation = host.install(
    definePlugin({
      name: 'activation-owner',
      setup(context) {
        context.diagnostics.emit({ name: 'example.setup.running', level: 'debug' });
        context.own(() => {
          cleanupCompleted = true;
        });
      },
    }),
  );

  await installation.whenActive();
  await installation.dispose();

  expect(
    events
      .filter(
        (event) =>
          event.name === 'nodebraid.runtime.activation.started' ||
          event.name === 'example.setup.running' ||
          event.name === 'nodebraid.runtime.activation.ended',
      )
      .map((event) => ({ name: event.name, scope: event.scope, attributes: event.attributes })),
  ).toEqual([
    {
      name: 'nodebraid.runtime.activation.started',
      scope: {
        hostId: 'activation-host',
        installationId: 'activation-host.installation.1',
        activationId: 'activation-host.activation.1',
        pluginName: 'activation-owner',
      },
      attributes: {},
    },
    {
      name: 'example.setup.running',
      scope: {
        hostId: 'activation-host',
        installationId: 'activation-host.installation.1',
        activationId: 'activation-host.activation.1',
        pluginName: 'activation-owner',
      },
      attributes: {},
    },
    {
      name: 'nodebraid.runtime.activation.ended',
      scope: {
        hostId: 'activation-host',
        installationId: 'activation-host.installation.1',
        activationId: 'activation-host.activation.1',
        pluginName: 'activation-owner',
      },
      attributes: { reason: 'installation-disposed' },
    },
  ]);
  expect(cleanupCompletedWhenEnded).toBeTrue();

  await host.dispose();
});

test('a terminal Installation cleanup failure emits one error event and still disposes', async () => {
  const cleanupError = new Error('cleanup failed');
  const events: DiagnosticEvent[] = [];
  const host = createPluginHost({
    diagnostics: {
      hostId: 'cleanup-host',
      sink: (event) => events.push(event),
    },
  });
  const installation = host.install(
    definePlugin({
      name: 'cleanup-owner',
      setup(context) {
        context.own(() => {
          throw cleanupError;
        });
      },
    }),
  );
  await installation.whenActive();

  const disposalError = await installation.dispose().catch((error: unknown) => error);

  expect(disposalError).toBeInstanceOf(AggregateError);
  expect(installation.getSnapshot()).toEqual({ status: 'disposed' });
  expect(
    events
      .filter((event) => event.name === 'nodebraid.runtime.installation.dispose.failed')
      .map((event) => ({ level: event.level, attributes: event.attributes, error: event.error })),
  ).toEqual([
    {
      level: 'error',
      attributes: { phase: 'cleanup' },
      error: disposalError,
    },
  ]);

  await expect(host.dispose()).resolves.toBeUndefined();
});

test('dependency cleanup records one Error-level Event across Consumer and Provider disposal', async () => {
  const cleanupError = new Error('consumer cleanup failed');
  const catalog = defineService<{ readonly value: string }>('catalog');
  const events: DiagnosticEvent[] = [];
  const provider = definePlugin({
    name: 'catalog-provider',
    provides: { catalog },
    setup() {
      return { catalog: { value: 'ready' } };
    },
  });
  const consumer = definePlugin({
    name: 'catalog-consumer',
    requires: { catalog },
    setup(context) {
      context.own(() => {
        throw cleanupError;
      });
    },
  });
  const host = createPluginHost({
    diagnostics: {
      hostId: 'dependency-cleanup-host',
      sink: (event) => events.push(event),
    },
  });
  const providerInstallation = host.install(provider);
  const consumerInstallation = host.install(consumer);
  await Promise.all([providerInstallation.whenActive(), consumerInstallation.whenActive()]);

  const providerDisposalError = await providerInstallation.dispose().catch((error: unknown) => error);

  expect(providerDisposalError).toBeInstanceOf(AggregateError);
  expect(consumerInstallation.getSnapshot()).toMatchObject({ status: 'failed' });
  expect(
    events
      .filter((event) => event.level === 'error' && errorTreeContains(event.error, cleanupError))
      .map((event) => event.name),
  ).toEqual(['nodebraid.runtime.installation.status.changed']);

  await consumerInstallation.dispose();
  await host.dispose();
});

function errorTreeContains(error: unknown, expected: unknown): boolean {
  if (error === expected) return true;
  return (
    error instanceof AggregateError && error.errors.some((nestedError) => errorTreeContains(nestedError, expected))
  );
}
