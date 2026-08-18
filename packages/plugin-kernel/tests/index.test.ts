import { describe, expect, test } from 'bun:test';

import { edgeId, nodeId, type CanvasCommit } from '@cflow/kernel';
import { createPluginHost, definePlugin } from '@cflow/runtime-cordis';

import { KernelPluginError, kernelPlugin, kernelService, type KernelService } from '../src';

describe('@cflow/plugin-kernel', () => {
  test('provides one revision-zero Kernel Service for an Activation', async () => {
    let service: KernelService | undefined;
    const consumer = definePlugin({
      requires: { kernel: kernelService },
      setup(context) {
        service = context.services.kernel;
      },
    });
    const host = createPluginHost();
    const providerInstallation = host.install(kernelPlugin);
    const consumerInstallation = host.install(consumer);

    await Promise.all([providerInstallation.whenActive(), consumerInstallation.whenActive()]);

    expect(service?.read().snapshot).toEqual({ revision: 0, nodes: [], edges: [] });
    const commit = service?.transact((transaction) => {
      transaction.nodes.add({
        id: nodeId('task'),
        type: 'task',
        position: { x: 0, y: 0 },
        data: null,
      });
    });

    expect(commit?.changeSet.revision).toBe(1);
    expect(service?.read()).toBe(commit?.after);

    await host.dispose();
  });

  test('synchronously observes only successful net-changing Transactions', async () => {
    let service: KernelService | undefined;
    const consumer = definePlugin({
      requires: { kernel: kernelService },
      setup(context) {
        service = context.services.kernel;
      },
    });
    const host = createPluginHost();
    host.install(kernelPlugin);
    const consumerInstallation = host.install(consumer);
    await consumerInstallation.whenActive();
    if (!service) throw new Error('Expected Kernel Service to activate.');
    const activeService = service;

    const observed: CanvasCommit[] = [];
    const unsubscribe = activeService.observeCommits((commit) => observed.push(commit));
    const committed = activeService.transact((transaction) => {
      transaction.nodes.add({
        id: nodeId('observed'),
        type: 'task',
        position: { x: 0, y: 0 },
        data: null,
      });
    });

    if (!committed) throw new Error('Expected Transaction to commit.');
    expect(observed).toEqual([committed]);
    expect(activeService.transact(() => {})).toBeNull();
    const callbackError = new Error('Transaction failed');
    expect(() =>
      activeService.transact(() => {
        throw callbackError;
      }),
    ).toThrow(callbackError);
    expect(() =>
      activeService.transact((transaction) => {
        transaction.edges.add({
          id: edgeId('invalid'),
          type: 'flow',
          source: { nodeId: nodeId('missing-source') },
          target: { nodeId: nodeId('missing-target') },
          data: null,
        });
      }),
    ).toThrow();
    expect(observed).toEqual([committed]);

    unsubscribe();
    unsubscribe();
    activeService.transact((transaction) => {
      transaction.nodes.remove(nodeId('observed'));
    });
    expect(observed).toEqual([committed]);

    await host.dispose();
  });

  test('reports Observer errors without rolling back or blocking later Observers', async () => {
    const observerError = new Error('Observer failed');
    const reportedErrors: unknown[] = [];
    const originalReportError = Object.getOwnPropertyDescriptor(globalThis, 'reportError');
    Object.defineProperty(globalThis, 'reportError', {
      configurable: true,
      value: (error: unknown) => reportedErrors.push(error),
    });
    const host = createPluginHost();

    try {
      let service: KernelService | undefined;
      const consumer = definePlugin({
        requires: { kernel: kernelService },
        setup(context) {
          service = context.services.kernel;
        },
      });
      host.install(kernelPlugin);
      const consumerInstallation = host.install(consumer);
      await consumerInstallation.whenActive();
      if (!service) throw new Error('Expected Kernel Service to activate.');

      const laterRevisions: number[] = [];
      service.observeCommits(() => {
        throw observerError;
      });
      service.observeCommits((commit) => laterRevisions.push(commit.changeSet.revision));
      const commit = service.transact((transaction) => {
        transaction.nodes.add({
          id: nodeId('survives-observer-error'),
          type: 'task',
          position: { x: 0, y: 0 },
          data: null,
        });
      });

      expect(commit?.changeSet.revision).toBe(1);
      expect(service.read().snapshot.revision).toBe(1);
      expect(laterRevisions).toEqual([1]);
      expect(reportedErrors).toEqual([observerError]);
    } finally {
      await host.dispose();
      if (originalReportError) {
        Object.defineProperty(globalThis, 'reportError', originalReportError);
      } else {
        Reflect.deleteProperty(globalThis, 'reportError');
      }
    }
  });

  test('schedules an explicit Observer error when platform reporting is unavailable', async () => {
    const observerError = new Error('Observer failed without reportError');
    const queuedReports: Array<() => void> = [];
    const originalReportError = Object.getOwnPropertyDescriptor(globalThis, 'reportError');
    const originalQueueMicrotask = Object.getOwnPropertyDescriptor(globalThis, 'queueMicrotask');
    Reflect.deleteProperty(globalThis, 'reportError');
    Object.defineProperty(globalThis, 'queueMicrotask', {
      configurable: true,
      value: (callback: () => void) => queuedReports.push(callback),
    });
    const host = createPluginHost();

    try {
      let service: KernelService | undefined;
      const consumer = definePlugin({
        requires: { kernel: kernelService },
        setup(context) {
          service = context.services.kernel;
        },
      });
      host.install(kernelPlugin);
      const consumerInstallation = host.install(consumer);
      await consumerInstallation.whenActive();
      if (!service) throw new Error('Expected Kernel Service to activate.');

      service.observeCommits(() => {
        throw observerError;
      });
      const commit = service.transact((transaction) => {
        transaction.nodes.add({
          id: nodeId('reported-asynchronously'),
          type: 'task',
          position: { x: 0, y: 0 },
          data: null,
        });
      });
      const scheduledErrors = queuedReports.map((report) => {
        try {
          report();
        } catch (error) {
          return error;
        }
      });

      expect(commit?.changeSet.revision).toBe(1);
      expect(scheduledErrors).toEqual([observerError]);
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

  test('queues reentrant Commits until every Observer sees the current revision', async () => {
    let service: KernelService | undefined;
    const consumer = definePlugin({
      requires: { kernel: kernelService },
      setup(context) {
        service = context.services.kernel;
      },
    });
    const host = createPluginHost();
    host.install(kernelPlugin);
    const consumerInstallation = host.install(consumer);
    await consumerInstallation.whenActive();
    if (!service) throw new Error('Expected Kernel Service to activate.');
    const activeService = service;

    const deliveries: string[] = [];
    activeService.observeCommits((commit) => {
      const revision = commit.changeSet.revision;
      deliveries.push(`first:${revision}`);
      if (revision < 3) {
        activeService.transact((transaction) => {
          transaction.nodes.add({
            id: nodeId(`reentrant-${revision}`),
            type: 'task',
            position: { x: 10, y: 10 },
            data: null,
          });
        });
      }
    });
    activeService.observeCommits((commit) => {
      deliveries.push(`second:${commit.changeSet.revision}`);
    });

    activeService.transact((transaction) => {
      transaction.nodes.add({
        id: nodeId('initial'),
        type: 'task',
        position: { x: 0, y: 0 },
        data: null,
      });
    });

    expect(deliveries).toEqual(['first:1', 'second:1', 'first:2', 'second:2', 'first:3', 'second:3']);
    expect(activeService.read().snapshot.revision).toBe(3);

    await host.dispose();
  });

  test('stops Consumers before closing the Service and reinstalls a fresh Kernel', async () => {
    const services: KernelService[] = [];
    const cleanupRevisions: number[] = [];
    const deliveries: string[] = [];
    let activation = 0;
    const consumer = definePlugin({
      requires: { kernel: kernelService },
      setup(context) {
        activation += 1;
        const currentActivation = activation;
        const service = context.services.kernel;
        services.push(service);
        const unsubscribe = service.observeCommits((commit) => {
          deliveries.push(`${currentActivation}:${commit.changeSet.revision}`);
        });
        context.own(() => {
          cleanupRevisions.push(service.read().snapshot.revision);
          unsubscribe();
        });
      },
    });
    const host = createPluginHost();
    const firstProvider = host.install(kernelPlugin);
    const consumerInstallation = host.install(consumer);
    await Promise.all([firstProvider.whenActive(), consumerInstallation.whenActive()]);
    const firstService = services[0];
    if (!firstService) throw new Error('Expected first Kernel Service Activation.');

    firstService.transact((transaction) => {
      transaction.nodes.add({
        id: nodeId('first-activation'),
        type: 'task',
        position: { x: 0, y: 0 },
        data: null,
      });
    });
    await firstProvider.dispose();

    expect(cleanupRevisions).toEqual([1]);
    expect(consumerInstallation.getSnapshot().status).toBe('pending');
    expect(() => firstService.read()).toThrow(KernelPluginError);
    try {
      firstService.read();
    } catch (error) {
      expect((error as KernelPluginError).code).toBe('SERVICE_DISPOSED');
    }
    expect(() => firstService.transact(() => {})).toThrow(KernelPluginError);
    expect(() => firstService.observeCommits(() => {})).toThrow(KernelPluginError);

    const nextConsumerActivation = consumerInstallation.whenActive();
    const secondProvider = host.install(kernelPlugin);
    await Promise.all([secondProvider.whenActive(), nextConsumerActivation]);
    const secondService = services[1];
    if (!secondService) throw new Error('Expected second Kernel Service Activation.');

    expect(secondService).not.toBe(firstService);
    expect(secondService.read().snapshot.revision).toBe(0);
    secondService.transact((transaction) => {
      transaction.nodes.add({
        id: nodeId('second-activation'),
        type: 'task',
        position: { x: 0, y: 0 },
        data: null,
      });
    });
    expect(deliveries).toEqual(['1:1', '2:1']);

    await host.dispose();
  });
});
