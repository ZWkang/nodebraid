import { describe, expect, test } from 'bun:test';

import { NodeBraidError, type DiagnosticEvent, type DiagnosticFault } from '@nodebraid/diagnostics';
import { edgeId, nodeId } from '@nodebraid/kernel';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

import {
  SessionError,
  sessionDiagnosticEvents,
  sessionPlugin,
  sessionService,
  type SelectionInput,
  type SessionService,
} from '../src';

describe('@nodebraid/plugin-session', () => {
  test('publishes the stable Session diagnostic event catalog', () => {
    expect(sessionDiagnosticEvents).toEqual({
      subscriberFault: 'nodebraid.plugin.session.subscriber.fault',
    });
  });

  test('provides a fresh default Session for an Activation', async () => {
    let service: SessionService | undefined;
    const consumer = definePlugin({
      requires: { session: sessionService },
      setup(context) {
        service = context.services.session;
      },
    });
    const host = createPluginHost();
    const kernelInstallation = host.install(kernelPlugin);
    const sessionInstallation = host.install(sessionPlugin);
    const consumerInstallation = host.install(consumer);
    await Promise.all([
      kernelInstallation.whenActive(),
      sessionInstallation.whenActive(),
      consumerInstallation.whenActive(),
    ]);
    if (!service) throw new Error('Expected Session Service to activate.');

    expect(service.getSnapshot()).toEqual({
      selection: { nodeIds: [], edgeIds: [] },
      viewport: { x: 0, y: 0, zoom: 1 },
    });

    await host.dispose();
  });

  test('publishes a canonical immutable Selection and ignores equivalent input', async () => {
    const { host, kernel, session } = await activateSessionServices();
    const firstId = nodeId('a');
    const secondId = nodeId('b');
    const connectionId = edgeId('connection');
    kernel.transact((transaction) => {
      transaction.nodes.add({ id: secondId, type: 'task', position: { x: 20, y: 0 }, data: null });
      transaction.nodes.add({ id: firstId, type: 'task', position: { x: 0, y: 0 }, data: null });
      transaction.edges.add({
        id: connectionId,
        type: 'flow',
        source: { nodeId: firstId },
        target: { nodeId: secondId },
        data: null,
      });
    });
    const nodeIds = [secondId, firstId, firstId];
    const edgeIds = [connectionId, connectionId];
    let notifications = 0;
    session.subscribe(() => {
      notifications += 1;
    });

    session.setSelection({ nodeIds, edgeIds });
    const selected = session.getSnapshot();
    nodeIds.length = 0;
    edgeIds.length = 0;

    expect(selected.selection).toEqual({ nodeIds: [firstId, secondId], edgeIds: [connectionId] });
    expect(Object.isFrozen(selected.selection)).toBeTrue();
    expect(Object.isFrozen(selected.selection.nodeIds)).toBeTrue();
    session.setSelection({ nodeIds: [secondId, firstId], edgeIds: [connectionId] });
    expect(session.getSnapshot()).toBe(selected);
    expect(notifications).toBe(1);

    session.clearSelection();
    expect(session.getSnapshot().selection).toEqual({ nodeIds: [], edgeIds: [] });
    expect(notifications).toBe(2);

    await host.dispose();
  });

  test('rejects every missing Selection entity without changing Session state', async () => {
    const { host, session } = await activateSessionServices();
    const before = session.getSnapshot();
    let notifications = 0;
    session.subscribe(() => {
      notifications += 1;
    });

    try {
      session.setSelection({
        nodeIds: [nodeId('missing-b'), nodeId('missing-a'), nodeId('missing-b')],
        edgeIds: [edgeId('missing-edge')],
      });
      throw new Error('Expected missing Selection entities to fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(SessionError);
      expect(error).toBeInstanceOf(NodeBraidError);
      expect(error).toMatchObject({
        domain: 'plugin.session',
        code: 'SELECTION_ENTITY_NOT_FOUND',
        details: {
          missingNodeIds: [nodeId('missing-a'), nodeId('missing-b')],
          missingEdgeIds: [edgeId('missing-edge')],
        },
      });
    }
    expect(session.getSnapshot()).toBe(before);
    expect(notifications).toBe(0);

    await host.dispose();
  });

  test('publishes only valid normalized Viewport changes', async () => {
    const { host, session } = await activateSessionServices();
    const initial = session.getSnapshot();
    const viewport = { x: -0, y: 24, zoom: 2 };
    let notifications = 0;
    session.subscribe(() => {
      notifications += 1;
    });

    session.setViewport(viewport);
    const changed = session.getSnapshot();
    viewport.y = 99;

    expect(changed.viewport).toEqual({ x: 0, y: 24, zoom: 2 });
    expect(Object.isFrozen(changed.viewport)).toBeTrue();
    expect(changed.selection).toBe(initial.selection);
    session.setViewport({ x: -0, y: 24, zoom: 2 });
    expect(session.getSnapshot()).toBe(changed);
    expect(notifications).toBe(1);

    try {
      session.setViewport({ x: Number.POSITIVE_INFINITY, y: Number.NaN, zoom: 0 });
      throw new Error('Expected invalid Viewport fields to fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(SessionError);
      expect((error as SessionError).code).toBe('INVALID_VIEWPORT');
      expect((error as SessionError).details).toEqual({
        issues: [
          { field: 'x', code: 'EXPECTED_FINITE_NUMBER', receivedNumber: 'positive-infinity' },
          { field: 'y', code: 'EXPECTED_FINITE_NUMBER', receivedNumber: 'nan' },
          { field: 'zoom', code: 'EXPECTED_POSITIVE_NUMBER', value: 0 },
        ],
      });
    }
    expect(session.getSnapshot()).toBe(changed);
    expect(notifications).toBe(1);

    await host.dispose();
  });

  test('reconciles Selection from the exact Kernel Commit after View', async () => {
    const firstId = nodeId('first');
    const secondId = nodeId('second');
    let kernel: KernelService | undefined;
    let session: SessionService | undefined;
    const earlierKernelObserver = definePlugin({
      requires: { kernel: kernelService },
      setup(context) {
        kernel = context.services.kernel;
        context.own(
          kernel.observeCommits((commit) => {
            if (commit.changeSet.revision === 2) {
              kernel?.transact((transaction) => {
                transaction.nodes.remove(secondId);
              });
            }
          }),
        );
      },
    });
    const sessionConsumer = definePlugin({
      requires: { session: sessionService },
      setup(context) {
        session = context.services.session;
      },
    });
    const host = createPluginHost();
    const kernelInstallation = host.install(kernelPlugin);
    const earlierObserverInstallation = host.install(earlierKernelObserver);
    await Promise.all([kernelInstallation.whenActive(), earlierObserverInstallation.whenActive()]);
    if (!kernel) throw new Error('Expected Kernel Service to activate.');
    kernel.transact((transaction) => {
      transaction.nodes.add({ id: firstId, type: 'task', position: { x: 0, y: 0 }, data: null });
      transaction.nodes.add({ id: secondId, type: 'task', position: { x: 20, y: 0 }, data: null });
    });
    const sessionInstallation = host.install(sessionPlugin);
    const consumerInstallation = host.install(sessionConsumer);
    await Promise.all([sessionInstallation.whenActive(), consumerInstallation.whenActive()]);
    if (!session) throw new Error('Expected Session Service to activate.');
    const activeSession = session;
    activeSession.setSelection({ nodeIds: [firstId, secondId], edgeIds: [] });
    const observed: string[][] = [];
    activeSession.subscribe(() => {
      observed.push([...activeSession.getSnapshot().selection.nodeIds]);
    });

    const removal = kernel.transact((transaction) => {
      transaction.nodes.remove(firstId);
    });

    expect(removal?.changeSet.revision).toBe(2);
    expect(activeSession.getSnapshot().selection).toEqual({ nodeIds: [], edgeIds: [] });
    expect(observed).toEqual([[secondId], []]);
    expect(kernel.read().snapshot.revision).toBe(3);

    await host.dispose();
  });

  test('queues reentrant Session mutations until every subscriber sees the current Snapshot', async () => {
    const { host, session } = await activateSessionServices();
    const deliveries: string[] = [];
    let snapshotAfterReentrantCall: number | undefined;
    session.subscribe(() => {
      const x = session.getSnapshot().viewport.x;
      deliveries.push(`first:${x}`);
      if (x === 1) {
        session.setViewport({ x: 2, y: 0, zoom: 1 });
        snapshotAfterReentrantCall = session.getSnapshot().viewport.x;
      }
    });
    session.subscribe(() => {
      deliveries.push(`second:${session.getSnapshot().viewport.x}`);
    });

    session.setViewport({ x: 1, y: 0, zoom: 1 });

    expect(snapshotAfterReentrantCall).toBe(1);
    expect(deliveries).toEqual(['first:1', 'second:1', 'first:2', 'second:2']);
    expect(session.getSnapshot().viewport.x).toBe(2);

    await host.dispose();
  });

  test('owns each subscription independently even when listeners share one function', async () => {
    const { host, session } = await activateSessionServices();
    let calls = 0;
    const listener = () => {
      calls += 1;
    };
    const unsubscribeFirst = session.subscribe(listener);
    const unsubscribeSecond = session.subscribe(listener);

    unsubscribeFirst();
    unsubscribeFirst();
    session.setViewport({ x: 1, y: 0, zoom: 1 });
    expect(calls).toBe(1);

    unsubscribeSecond();
    unsubscribeSecond();
    session.setViewport({ x: 2, y: 0, zoom: 1 });
    expect(calls).toBe(1);

    await host.dispose();
  });

  test('reports subscriber errors without corrupting Session or blocking later subscribers', async () => {
    const listenerError = new Error('Session subscriber failed');
    const events: DiagnosticEvent[] = [];
    const faults: DiagnosticFault[] = [];
    const platformErrors: unknown[] = [];
    const originalReportError = Object.getOwnPropertyDescriptor(globalThis, 'reportError');
    Object.defineProperty(globalThis, 'reportError', {
      configurable: true,
      value: (error: unknown) => platformErrors.push(error),
    });
    const diagnosticsHost = createPluginHost({
      diagnostics: {
        hostId: 'session-host',
        sink: (event) => events.push(event),
        faultReporter: (fault) => faults.push(fault),
      },
    });
    const { host, session } = await activateSessionServices(diagnosticsHost);

    try {
      const laterValues: number[] = [];
      session.subscribe(() => {
        throw listenerError;
      });
      session.subscribe(() => {
        laterValues.push(session.getSnapshot().viewport.x);
      });

      session.setViewport({ x: 1, y: 0, zoom: 1 });

      expect(session.getSnapshot().viewport.x).toBe(1);
      expect(laterValues).toEqual([1]);
      expect(platformErrors).toEqual([]);
      expect(faults.map((fault) => fault.error)).toEqual([listenerError]);
      expect(events.find((event) => event.name === 'nodebraid.plugin.session.subscriber.fault')).toMatchObject({
        level: 'error',
        scope: {
          hostId: 'session-host',
          installationId: 'session-host.installation.2',
          activationId: expect.any(String),
          pluginName: '@nodebraid/plugin-session',
        },
        attributes: {},
        error: listenerError,
      });
    } finally {
      await host.dispose();
      if (originalReportError) {
        Object.defineProperty(globalThis, 'reportError', originalReportError);
      } else {
        Reflect.deleteProperty(globalThis, 'reportError');
      }
    }
  });

  test('schedules an explicit subscriber error when platform reporting is unavailable', async () => {
    const listenerError = new Error('Session subscriber failed without reportError');
    const queuedReports: Array<() => void> = [];
    const originalReportError = Object.getOwnPropertyDescriptor(globalThis, 'reportError');
    const originalQueueMicrotask = Object.getOwnPropertyDescriptor(globalThis, 'queueMicrotask');
    Reflect.deleteProperty(globalThis, 'reportError');
    Object.defineProperty(globalThis, 'queueMicrotask', {
      configurable: true,
      value: (callback: () => void) => queuedReports.push(callback),
    });
    const { host, session } = await activateSessionServices();

    try {
      let laterCalls = 0;
      session.subscribe(() => {
        throw listenerError;
      });
      session.subscribe(() => {
        laterCalls += 1;
      });

      session.setViewport({ x: 1, y: 0, zoom: 1 });
      const scheduledErrors = queuedReports.map((report) => {
        try {
          report();
        } catch (error) {
          return error;
        }
      });

      expect(session.getSnapshot().viewport.x).toBe(1);
      expect(laterCalls).toBe(1);
      expect(scheduledErrors).toEqual([listenerError]);
    } finally {
      await host.dispose();
      if (originalReportError) {
        Object.defineProperty(globalThis, 'reportError', originalReportError);
      }
      if (originalQueueMicrotask) {
        Object.defineProperty(globalThis, 'queueMicrotask', originalQueueMicrotask);
      }
    }
  });

  test('preserves subscriber and reporter failures when platform reporting throws', async () => {
    const listenerError = new Error('Session subscriber failed');
    const reporterError = new Error('Platform reporter failed');
    const queuedReports: Array<() => void> = [];
    const originalReportError = Object.getOwnPropertyDescriptor(globalThis, 'reportError');
    const originalQueueMicrotask = Object.getOwnPropertyDescriptor(globalThis, 'queueMicrotask');
    Object.defineProperty(globalThis, 'reportError', {
      configurable: true,
      value: () => {
        throw reporterError;
      },
    });
    Object.defineProperty(globalThis, 'queueMicrotask', {
      configurable: true,
      value: (callback: () => void) => queuedReports.push(callback),
    });
    const { host, session } = await activateSessionServices();

    try {
      session.subscribe(() => {
        throw listenerError;
      });
      session.setViewport({ x: 1, y: 0, zoom: 1 });
      let scheduledError: unknown;
      try {
        queuedReports[0]?.();
      } catch (error) {
        scheduledError = error;
      }

      expect(scheduledError).toBeInstanceOf(AggregateError);
      expect((scheduledError as AggregateError).errors).toEqual([listenerError, reporterError]);
    } finally {
      await host.dispose();
      if (originalReportError) {
        Object.defineProperty(globalThis, 'reportError', originalReportError);
      } else {
        Reflect.deleteProperty(globalThis, 'reportError');
      }
      if (originalQueueMicrotask) {
        Object.defineProperty(globalThis, 'queueMicrotask', originalQueueMicrotask);
      }
    }
  });

  test('closes old handles and creates a fresh Session when Kernel returns', async () => {
    const services: SessionService[] = [];
    const consumer = definePlugin({
      requires: { session: sessionService },
      setup(context) {
        services.push(context.services.session);
      },
    });
    const host = createPluginHost();
    const firstKernel = host.install(kernelPlugin);
    const sessionInstallation = host.install(sessionPlugin);
    const consumerInstallation = host.install(consumer);
    await Promise.all([firstKernel.whenActive(), sessionInstallation.whenActive(), consumerInstallation.whenActive()]);
    const firstService = services[0];
    if (!firstService) throw new Error('Expected first Session Service Activation.');
    const unsubscribe = firstService.subscribe(() => {});
    firstService.setViewport({ x: 12, y: 6, zoom: 2 });

    await firstKernel.dispose();

    expect(sessionInstallation.getSnapshot().status).toBe('pending');
    expectSessionError(() => firstService.getSnapshot(), 'SERVICE_DISPOSED');
    expectSessionError(() => firstService.subscribe(() => {}), 'SERVICE_DISPOSED');
    expectSessionError(() => firstService.setSelection({ nodeIds: [], edgeIds: [] }), 'SERVICE_DISPOSED');
    expectSessionError(() => firstService.clearSelection(), 'SERVICE_DISPOSED');
    expectSessionError(() => firstService.setViewport({ x: 0, y: 0, zoom: 1 }), 'SERVICE_DISPOSED');
    unsubscribe();
    unsubscribe();

    const nextConsumerActivation = consumerInstallation.whenActive();
    const secondKernel = host.install(kernelPlugin);
    await Promise.all([secondKernel.whenActive(), nextConsumerActivation]);
    const secondService = services[1];
    if (!secondService) throw new Error('Expected second Session Service Activation.');

    expect(secondService).not.toBe(firstService);
    expect(secondService.getSnapshot()).toEqual({
      selection: { nodeIds: [], edgeIds: [] },
      viewport: { x: 0, y: 0, zoom: 1 },
    });

    await host.dispose();
  });

  test('rejects an invalid subscriber before it can enter notification state', async () => {
    const { host, session } = await activateSessionServices();
    const before = session.getSnapshot();

    let subscriberError: unknown;
    try {
      session.subscribe(new Date() as unknown as () => void);
    } catch (error) {
      subscriberError = error;
    }
    expect(subscriberError).toBeInstanceOf(SessionError);
    expect(subscriberError).toMatchObject({
      code: 'INVALID_SUBSCRIBER',
      details: { receivedType: 'object' },
    });
    session.setViewport({ x: 1, y: 0, zoom: 1 });
    expect(session.getSnapshot()).not.toBe(before);

    await host.dispose();
  });

  test('rejects malformed Selection input with structured immutable details', async () => {
    const { host, session } = await activateSessionServices();
    const before = session.getSnapshot();
    const malformed = { nodeIds: null, edgeIds: [42] } as unknown as SelectionInput;

    try {
      session.setSelection(malformed);
      throw new Error('Expected malformed Selection input to fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(SessionError);
      expect((error as SessionError).code).toBe('INVALID_SELECTION');
      expect((error as SessionError).details).toEqual({
        issues: [
          { field: 'nodeIds', code: 'EXPECTED_ARRAY', receivedType: 'null' },
          { field: 'edgeIds', code: 'INVALID_ID', index: 0, receivedType: 'number' },
        ],
      });
      expect(Object.isFrozen((error as SessionError).details)).toBeTrue();
      expect(Object.isFrozen((error as SessionError).details?.issues)).toBeTrue();
    }
    expect(session.getSnapshot()).toBe(before);

    await host.dispose();
  });

  test('rejects sparse Selection arrays as malformed input', async () => {
    const { host, session } = await activateSessionServices();
    const before = session.getSnapshot();
    const sparseNodeIds: SelectionInput['nodeIds'][number][] = [];
    sparseNodeIds.length = 1;

    try {
      session.setSelection({ nodeIds: sparseNodeIds, edgeIds: [] });
      throw new Error('Expected sparse Selection input to fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(SessionError);
      expect((error as SessionError).code).toBe('INVALID_SELECTION');
      expect((error as SessionError).details).toEqual({
        issues: [{ field: 'nodeIds', code: 'INVALID_ID', index: 0, receivedType: 'undefined' }],
      });
    }
    expect(session.getSnapshot()).toBe(before);

    await host.dispose();
  });

  test('rejects malformed Viewport input as a structured Session error', async () => {
    const { host, session } = await activateSessionServices();
    const before = session.getSnapshot();

    try {
      session.setViewport(null as unknown as Parameters<SessionService['setViewport']>[0]);
      throw new Error('Expected malformed Viewport input to fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(SessionError);
      expect((error as SessionError).code).toBe('INVALID_VIEWPORT');
      expect((error as SessionError).details).toEqual({
        issues: [{ field: 'viewport', code: 'EXPECTED_OBJECT', receivedType: 'null' }],
      });
    }
    expect(session.getSnapshot()).toBe(before);

    await host.dispose();
  });
});

function expectSessionError(callback: () => unknown, code: SessionError['code']): void {
  try {
    callback();
    throw new Error(`Expected SessionError ${code}.`);
  } catch (error) {
    expect(error).toBeInstanceOf(SessionError);
    expect((error as SessionError).code).toBe(code);
  }
}

async function activateSessionServices(host: ReturnType<typeof createPluginHost> = createPluginHost()): Promise<{
  readonly host: ReturnType<typeof createPluginHost>;
  readonly kernel: KernelService;
  readonly session: SessionService;
}> {
  let kernel: KernelService | undefined;
  let session: SessionService | undefined;
  const consumer = definePlugin({
    requires: { kernel: kernelService, session: sessionService },
    setup(context) {
      kernel = context.services.kernel;
      session = context.services.session;
    },
  });
  const kernelInstallation = host.install(kernelPlugin);
  const sessionInstallation = host.install(sessionPlugin);
  const consumerInstallation = host.install(consumer);
  await Promise.all([
    kernelInstallation.whenActive(),
    sessionInstallation.whenActive(),
    consumerInstallation.whenActive(),
  ]);
  if (!kernel || !session) throw new Error('Expected Kernel and Session Services to activate.');
  return { host, kernel, session };
}
