import { expect, test } from 'bun:test';
import type { DiagnosticFault } from '@nodebraid/diagnostics';
import { createCanvasKernel, nodeId } from '@nodebraid/kernel';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

import {
  createPortContributionPlugin,
  PortError,
  portDiagnosticEvents,
  portPlugin,
  portService,
  type PortService,
} from '../src';

test('domain Plugins contribute canonical Ports and disposal removes them', async () => {
  const host = createPluginHost();
  host.install(portPlugin);
  const source = nodeId('source');
  const kernel = createCanvasKernel();
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: source,
      type: 'task',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 60 },
      data: null,
    });
  });
  let ports!: PortService;
  const consumer = host.install(
    definePlugin({
      requires: { ports: portService },
      setup(context) {
        ports = context.services.ports;
      },
    }),
  );
  const contribution = host.install(
    createPortContributionPlugin({
      id: 'task-ports',
      definePorts(node) {
        return node.type === 'task'
          ? [
              { id: 'out-b', role: 'source' },
              { id: 'in', role: 'target' },
              { id: 'out-a', role: 'source' },
            ]
          : [];
      },
    }),
  );
  await Promise.all([consumer.whenActive(), contribution.whenActive()]);

  expect(ports.snapshot(kernel.read().snapshot)).toEqual({
    documentRevision: 1,
    generation: 1,
    nodes: [
      {
        nodeId: source,
        ports: [
          { id: 'in', role: 'target' },
          { id: 'out-a', role: 'source' },
          { id: 'out-b', role: 'source' },
        ],
      },
    ],
  });

  await contribution.dispose();
  expect(ports.snapshot(kernel.read().snapshot).nodes).toEqual([]);
  await host.dispose();
});

test('Port capability rejects duplicate contribution and per-Node Port identities explicitly', async () => {
  const host = createPluginHost();
  host.install(portPlugin);
  let ports!: PortService;
  const consumer = host.install(
    definePlugin({
      requires: { ports: portService },
      setup(context) {
        ports = context.services.ports;
      },
    }),
  );
  await consumer.whenActive();
  ports.register({ id: 'first', definePorts: () => [{ id: 'same', role: 'source' }] });
  expect(() => ports.register({ id: 'first', definePorts: () => [] })).toThrow(
    new PortError('CONTRIBUTION_ALREADY_REGISTERED', 'Port Contribution ID is already registered.', {
      contributionId: 'first',
    }),
  );
  ports.register({ id: 'second', definePorts: () => [{ id: 'same', role: 'target' }] });
  const kernel = createCanvasKernel();
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: nodeId('node'),
      type: 'task',
      position: { x: 0, y: 0 },
      data: null,
    });
  });
  expect(() => ports.snapshot(kernel.read().snapshot)).toThrow(PortError);
  await host.dispose();
});

test('subscriber faults report explicitly without hiding an accepted registration', async () => {
  const faults: DiagnosticFault[] = [];
  const host = createPluginHost({ diagnostics: { faultReporter: (fault) => faults.push(fault) } });
  host.install(portPlugin);
  let ports!: PortService;
  const consumer = host.install(
    definePlugin({
      requires: { ports: portService },
      setup(context) {
        ports = context.services.ports;
      },
    }),
  );
  await consumer.whenActive();
  const subscriberError = new Error('port subscriber failed');
  ports.subscribe(() => {
    throw subscriberError;
  });

  ports.register({ id: 'accepted', definePorts: () => [] });

  expect(faults).toHaveLength(1);
  expect(faults[0]?.event.name).toBe(portDiagnosticEvents.subscriberFault);
  expect(faults[0]?.error).toBe(subscriberError);
  expect(ports.snapshot(createCanvasKernel().read().snapshot).generation).toBe(1);
  await host.dispose();
  expect(() => ports.snapshot(createCanvasKernel().read().snapshot)).toThrow(
    expect.objectContaining({ domain: 'plugin.port', code: 'SERVICE_DISPOSED' }),
  );
});
